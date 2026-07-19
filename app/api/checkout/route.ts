import { createHash, randomUUID } from "node:crypto";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";
import {
  CheckoutBodyError,
  createCheckoutAbuseHashes,
  readCheckoutJsonBody,
  type CheckoutAbuseDecision
} from "@/lib/checkout-abuse-protection";
import { deriveCheckoutTrackingToken } from "@/lib/order-tracking";
import { listCustomCategoryCatalogsByIds } from "@/lib/custom-commerce/data";
import { priceCustomProject } from "@/lib/custom-commerce/pricing";
import type { CustomProjectSnapshot } from "@/lib/custom-commerce/types";
import { getAdminSupabaseEnv } from "@/lib/env";
import { getAdminSupabaseClient } from "@/lib/supabase/client";
import { publicApiErrorResponse, safePublicResponse } from "@/lib/public-api-error";

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


export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("idempotencyKey")?.trim() ?? "";
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key)) {
      return safePublicResponse({ code: "CHECKOUT_RECOVERY_INVALID", error: "Data pemulihan checkout tidak valid." }, 400);
    }
    const client = getAdminSupabaseClient();
    const env = getAdminSupabaseEnv();
    if (!client || !env) {
      return safePublicResponse({ code: "CHECKOUT_UNAVAILABLE", error: "Layanan checkout belum tersedia." }, 503);
    }
    const { data, error } = await client
      .from("orders")
      .select("order_number,status,public_access_token_hash,public_access_token_expires_at")
      .eq("public_idempotency_key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return safePublicResponse({ found: false }, 404);

    const trackingToken = deriveCheckoutTrackingToken(key, env.serviceRoleKey);
    if (data.public_access_token_hash !== sha256(trackingToken)) {
      return safePublicResponse({ code: "CHECKOUT_RECOVERY_CONFLICT", error: "Checkout lama tidak dapat dipulihkan dengan aman." }, 409);
    }
    if (data.public_access_token_expires_at && new Date(data.public_access_token_expires_at).getTime() <= Date.now()) {
      return safePublicResponse({ code: "CHECKOUT_RECOVERY_EXPIRED", error: "Tautan checkout lama telah kedaluwarsa." }, 410);
    }
    return safePublicResponse({
      found: true,
      orderNumber: data.order_number,
      status: data.status,
      confirmationUrl: `/order-confirmation/${encodeURIComponent(trackingToken)}`,
      trackingUrl: `/track-order/${encodeURIComponent(data.order_number)}?token=${encodeURIComponent(trackingToken)}`,
      trackingToken
    });
  } catch (error) {
    return publicApiErrorResponse(error, "checkout recovery", {
      code: "CHECKOUT_RECOVERY_FAILED",
      message: "Checkout lama belum dapat dipulihkan. Coba lagi.",
      status: 503
    });
  }
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

    const pricedProjects: CustomProjectSnapshot[] = [];
    for (const entry of body.customProjects) {
      const categoryIds = Array.from(new Set(entry.project.items.map((item) => item.categoryId)));
      const catalogs = await listCustomCategoryCatalogsByIds(categoryIds);
      if (catalogs.length !== categoryIds.length) {
        return jsonResponse({ code: "CHECKOUT_ITEM_UNAVAILABLE", error: "Sebagian katalog custom sudah berubah. Muat ulang konfigurasi." }, 409);
      }
      const pricing = priceCustomProject(entry.project, catalogs);
      if (pricing.issues.length) {
        return jsonResponse({ code: "CHECKOUT_CUSTOM_INVALID", error: pricing.issues[0] }, 409);
      }
      const uploadsValid = await validateProjectUploads(client, entry.project);
      if (!uploadsValid) {
        return jsonResponse({ code: "CHECKOUT_UPLOAD_INVALID", error: "Referensi file custom tidak valid atau sudah dihapus." }, 409);
      }
      pricedProjects.push({ ...entry.project, pricing });
    }

    const rpcName = pricedProjects.length ? "create_public_custom_checkout_order" : "create_public_checkout_order";
    const rpcPayload = {
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
      })),
      ...(pricedProjects.length ? {
        p_custom_projects: pricedProjects,
        p_shipping_address_snapshot: body.fulfillment.addressSnapshot ?? null
      } : {})
    };
    const { data, error } = await client.rpc(rpcName, rpcPayload);

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
    return publicApiErrorResponse(error, "checkout creation", {
      code: "CHECKOUT_UNAVAILABLE",
      message: "Checkout gagal diproses. Keranjang Anda tetap tersimpan.",
      status: 503
    });
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

async function validateProjectUploads(client: NonNullable<ReturnType<typeof getAdminSupabaseClient>>, project: { sessionToken: string; items: Array<{ uploads: Array<{ id: string; storage_path: string }> }> }) {
  const uploads = project.items.flatMap((item) => item.uploads);
  if (!uploads.length) return true;
  const ids = Array.from(new Set(uploads.map((upload) => upload.id)));
  if (ids.length !== uploads.length) return false;
  const { data, error } = await client
    .from("customer_uploads")
    .select("id,storage_path,status,session_token")
    .in("id", ids)
    .eq("session_token", project.sessionToken)
    .in("status", ["uploaded", "linked"]);
  if (error || !data || data.length !== ids.length) return false;
  const byId = new Map(data.map((row) => [String(row.id), row]));
  return uploads.every((upload) => String(byId.get(upload.id)?.storage_path ?? "") === upload.storage_path);
}
