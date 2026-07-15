import { createHash, randomUUID } from "node:crypto";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";
import {
  CheckoutBodyError,
  createCheckoutAbuseHashes,
  readCheckoutJsonBody,
  type CheckoutAbuseDecision
} from "@/lib/checkout-abuse-protection";
import { deriveCheckoutTrackingToken } from "@/lib/order-tracking";
import { getAdminSupabaseEnv } from "@/lib/env";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonResponse(body: unknown, status: number, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store",
      ...headers
    }
  });
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return jsonResponse({ code: "CHECKOUT_INVALID_REQUEST", error: "Data checkout tidak valid." }, 400);
    }

    const body = parsePublicCheckoutRequest(await readCheckoutJsonBody(request));
    if (!body) return jsonResponse({ code: "CHECKOUT_INVALID_REQUEST", error: "Data checkout tidak valid." }, 400);

    const client = getAdminSupabaseClient();
    const adminEnv = getAdminSupabaseEnv();
    if (!client || !adminEnv) {
      return jsonResponse({ code: "CHECKOUT_UNAVAILABLE", error: "Layanan checkout belum tersedia." }, 503);
    }

    const hashes = createCheckoutAbuseHashes(request, body, adminEnv.serviceRoleKey);
    const { data: guardData, error: guardError } = await client.rpc("enforce_public_checkout_abuse_guard", {
      p_idempotency_key_hash: hashes.idempotencyKeyHash,
      p_payload_hash: hashes.payloadHash,
      p_fingerprint_hash: hashes.fingerprintHash,
      p_phone_hash: hashes.phoneHash,
      p_request_id: randomUUID()
    });

    if (guardError || !guardData) {
      console.error("Checkout abuse guard unavailable", { code: guardError?.code });
      return jsonResponse({ code: "CHECKOUT_UNAVAILABLE", error: "Layanan checkout belum tersedia." }, 503);
    }

    const guard = guardData as CheckoutAbuseDecision;
    if (!guard.allowed) {
      if (guard.code === "idempotency_payload_conflict") {
        return jsonResponse({ code: "CHECKOUT_IDEMPOTENCY_CONFLICT", error: "Kunci checkout sudah digunakan untuk data berbeda." }, 409);
      }
      const retryAfter = Math.max(1, Number(guard.retry_after_seconds ?? 600));
      return jsonResponse(
        { code: "CHECKOUT_RATE_LIMITED", error: "Terlalu banyak percobaan checkout. Coba lagi nanti." },
        429,
        { "retry-after": String(retryAfter) }
      );
    }

    const derivedTrackingToken = deriveCheckoutTrackingToken(body.idempotencyKey, adminEnv.serviceRoleKey);
    const { data: existingOrder, error: existingOrderError } = await client
      .from("orders")
      .select("public_access_token_hash")
      .eq("public_idempotency_key", body.idempotencyKey)
      .maybeSingle();
    if (existingOrderError) {
      console.error("Checkout retry lookup failed", { code: existingOrderError.code });
      return jsonResponse({ code: "CHECKOUT_UNAVAILABLE", error: "Layanan checkout belum tersedia." }, 503);
    }

    const storedHash = typeof existingOrder?.public_access_token_hash === "string" ? existingOrder.public_access_token_hash : "";
    const trackingToken = !storedHash || storedHash === sha256(derivedTrackingToken)
      ? derivedTrackingToken
      : storedHash === sha256(body.accessToken)
        ? body.accessToken
        : "";
    if (!trackingToken) {
      return jsonResponse({ code: "CHECKOUT_IDEMPOTENCY_CONFLICT", error: "Kunci checkout tidak cocok dengan order sebelumnya." }, 409);
    }

    const { data, error } = await client.rpc("create_public_checkout_order", {
      p_idempotency_key: body.idempotencyKey,
      p_access_token_hash: sha256(trackingToken),
      p_whatsapp_confirmation_hash: sha256(body.confirmationCode),
      p_customer_name: body.customer.name,
      p_customer_phone: body.customer.phone,
      p_customer_email: body.customer.email ?? null,
      p_delivery_method: body.fulfillment.method,
      p_shipping_address: body.fulfillment.address ?? null,
      p_pickup_location_id: body.fulfillment.pickupLocationId ?? null,
      p_payment_method: body.fulfillment.paymentMethod,
      p_customer_notes: body.customer.notes ?? null,
      p_items: body.items.map((item) => ({
        variant_size_id: item.variantSizeId,
        quantity: item.quantity,
        note: item.note ?? ""
      }))
    });

    if (error) {
      console.error("Checkout domain RPC rejected", { code: error.code });
      return checkoutDomainError(error.message);
    }

    const result = data as { order_id?: string; order_number?: string; status?: string } | null;
    if (!result?.order_number) {
      console.error("Checkout domain RPC returned incomplete result");
      return jsonResponse({ code: "CHECKOUT_UNAVAILABLE", error: "Order belum dapat dibuat." }, 503);
    }

    return jsonResponse({
      orderId: result.order_id,
      orderNumber: result.order_number,
      status: result.status,
      confirmationUrl: `/order-confirmation/${encodeURIComponent(trackingToken)}`,
      trackingUrl: `/track-order/${encodeURIComponent(result.order_number)}?token=${encodeURIComponent(trackingToken)}`,
      trackingToken
    }, 201);
  } catch (error) {
    if (error instanceof CheckoutBodyError) {
      return jsonResponse(
        {
          code: error.code,
          error: error.status === 413 ? "Ukuran data checkout terlalu besar." : "Data checkout tidak valid."
        },
        error.status
      );
    }
    console.error("Checkout route failed", { error: error instanceof Error ? error.name : "unknown" });
    return jsonResponse({ code: "CHECKOUT_UNAVAILABLE", error: "Checkout gagal diproses." }, 503);
  }
}

function checkoutDomainError(message: string) {
  if (/stok/i.test(message)) {
    return jsonResponse({ code: "CHECKOUT_STOCK_UNAVAILABLE", error: "Stok salah satu item tidak mencukupi." }, 409);
  }
  if (/maksimal dua/i.test(message)) {
    return jsonResponse({ code: "CHECKOUT_DUPLICATE_ACTIVE_ORDER", error: "Masih ada terlalu banyak pesanan aktif untuk nomor tersebut." }, 409);
  }
  if (/tidak lagi aktif|quotation|configurator/i.test(message)) {
    return jsonResponse({ code: "CHECKOUT_ITEM_UNAVAILABLE", error: "Salah satu item tidak tersedia untuk checkout langsung." }, 409);
  }
  if (/quantity|keranjang|pelanggan|whatsapp|email|fulfillment|pickup|pembayaran|alamat|token|kunci checkout/i.test(message)) {
    return jsonResponse({ code: "CHECKOUT_INVALID_REQUEST", error: "Data checkout tidak valid." }, 400);
  }
  return jsonResponse({ code: "CHECKOUT_UNAVAILABLE", error: "Order belum dapat dibuat." }, 503);
}
