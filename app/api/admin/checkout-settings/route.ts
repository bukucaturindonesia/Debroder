import { z } from "zod";
import { requirePhase13Actor, Phase13AuthError } from "@/lib/phase13-auth";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { readCheckoutJsonBody } from "@/lib/checkout-abuse-protection";
import { assertFastStaging } from "@/lib/fast-checkout/server";
import { readQuote, signQuote } from "@/lib/fast-checkout/quote";
import type { FastQuote } from "@/lib/fast-checkout/contracts";
import {
  midtransConfig,
  RajaOngkirClient,
} from "@/lib/fast-checkout/providers";
const schema = z
  .object({
    origin_id: z.number().int().positive(),
    origin_label: z.string().min(3).max(500),
    origin_token: z.string().max(8000).optional(),
    couriers: z
      .array(z.string().regex(/^[a-z]{2,20}$/))
      .min(1)
      .max(5),
    pickup_enabled: z.boolean(),
    pickup_location_ids: z.array(z.uuid()).max(20),
    payment_enabled: z.boolean(),
  })
  .strict();
function failure(error: unknown) {
  const guest = adminGuestErrorResponse(error);
  if (guest) return guest;
  return Response.json(
    { error: "Pengaturan belum dapat diproses." },
    {
      status:
        error instanceof Phase13AuthError
          ? error.status
          : error instanceof z.ZodError
            ? 400
            : 503,
    },
  );
}
export async function GET(request: Request) {
  try {
    await requirePhase13Actor(request, "settings.read");
    assertFastStaging();
    const client = getAdminSupabaseClient();
    if (!client) throw new Error();
    const q = new URL(request.url).searchParams.get("q");
    if (q) {
      const secret = process.env.FAST_CHECKOUT_SIGNING_SECRET;
      if (!secret || secret.length < 32) throw new Error();
      const found = await new RajaOngkirClient(
        process.env.RAJAONGKIR_API_KEY || "",
      ).destinations(q);
      return Response.json(
        {
          destinations: found.map((destination) => ({
            ...destination,
            token: signQuote(
              {
                version: 1,
                destination,
                issuedAt: Date.now(),
                expiresAt: Date.now() + 900000,
              } as FastQuote,
              secret,
            ),
          })),
        },
        { headers: { "cache-control": "private, no-store" } },
      );
    }
    const settings = await client
      .from("fast_checkout_settings")
      .select("*")
      .eq("id", true)
      .single();
    if (settings.error) throw new Error();
    const products = await client
      .from("products")
      .select(
        "id,name,shipping_weight_grams,shipping_length_cm,shipping_width_cm,shipping_height_cm",
      )
      .order("name")
      .limit(200);
    if (products.error) throw new Error();
    const stores = await client
      .from("stores")
      .select("id,nama_store,alamat")
      .eq("status_aktif", true);
    if (stores.error) throw new Error();
    let paymentConfigured = false;
    try {
      midtransConfig();
      paymentConfigured = true;
    } catch {
      /* status only */
    }
    const review = await client
      .from("fast_payment_attempts")
      .select(
        "id,order_id,provider_order_id,status,reconciliation_note,updated_at",
      )
      .in("status", ["creating", "review"])
      .order("updated_at", { ascending: false })
      .limit(20);
    if (review.error) throw new Error();
    return Response.json(
      {
        settings: settings.data,
        products: products.data,
        stores: stores.data,
        reconciliation: review.data,
        integration: {
          mode:
            process.env.MIDTRANS_ENV === "sandbox"
              ? "Sandbox"
              : "Belum tersedia",
          paymentConfigured,
          shippingConfigured: Boolean(process.env.RAJAONGKIR_API_KEY),
        },
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "settings.manage");
    assertFastStaging();
    if (
      !["owner", "superadmin", "super_admin"].includes(actor.role) ||
      !actor.allStoreAccess
    )
      throw new Phase13AuthError(403, "Akses pengaturan global diperlukan");
    const body = await readCheckoutJsonBody(request);
    if (body && typeof body === "object" && "productId" in body) {
      const p = z
        .object({
          productId: z.uuid(),
          weight: z.number().int().positive().max(1000000),
          length: z.number().int().positive().max(1000),
          width: z.number().int().positive().max(1000),
          height: z.number().int().positive().max(1000),
        })
        .strict()
        .parse(body);
      const result = await actor.adminClient.rpc(
        "fast_product_shipping_update_v1",
        {
          p_product_id: p.productId,
          p_weight: p.weight,
          p_length: p.length,
          p_width: p.width,
          p_height: p.height,
          p_actor_id: actor.user.id,
        },
      );
      if (result.error) throw new Error();
    } else {
      const p = schema.parse(body);
      const current = await actor.adminClient
        .from("fast_checkout_settings")
        .select("origin_id,origin_label")
        .eq("id", true)
        .single();
      if (current.error) throw new Error();
      if (
        p.origin_id !== current.data.origin_id ||
        p.origin_label !== current.data.origin_label
      ) {
        const secret = process.env.FAST_CHECKOUT_SIGNING_SECRET;
        if (!secret) throw new Error();
        const verified = readQuote(p.origin_token || "", secret).destination;
        if (verified.id !== p.origin_id || verified.label !== p.origin_label)
          return Response.json(
            { error: "Pilih lokasi asal dari hasil pencarian." },
            { status: 400 },
          );
      }
      if (p.pickup_location_ids.length) {
        const stores = await actor.adminClient
          .from("stores")
          .select("id")
          .eq("status_aktif", true)
          .in("id", p.pickup_location_ids);
        if (
          stores.error ||
          stores.data?.length !== new Set(p.pickup_location_ids).size
        )
          return Response.json(
            { error: "Lokasi pickup tidak aktif." },
            { status: 400 },
          );
      }
      if (p.payment_enabled) midtransConfig();
      const { origin_token, ...persisted } = p;
      void origin_token;
      const result = await actor.adminClient.rpc("fast_settings_update_v1", {
        p_settings: persisted,
        p_actor_id: actor.user.id,
      });
      if (result.error) throw new Error();
    }
    return Response.json(
      { saved: true },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
