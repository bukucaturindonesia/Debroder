import { NextResponse } from "next/server";
import { z } from "zod";
import { instantServiceSelectionSchema } from "@/lib/instant-custom";
import { resolveReadyStockSelectionPricing } from "@/lib/supabase/products";

const requestSchema = z.object({
  productId: z.string().uuid(),
  variantSizeId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  pricingQuantity: z.number().int().min(1).max(500),
  instantServices: z.array(instantServiceSelectionSchema).max(10).default([])
}).refine((value) => value.pricingQuantity >= value.quantity, {
  message: "Total quantity tidak boleh lebih kecil dari quantity pilihan.",
  path: ["pricingQuantity"]
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { status: "unavailable", code: "PRICING_INPUT_INVALID", message: "Konfigurasi harga tidak valid." },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const result = await resolveReadyStockSelectionPricing(parsed.data);
    return NextResponse.json(result, {
      status: result.status === "unavailable" ? 409 : 200,
      headers: { "cache-control": "no-store" }
    });
  } catch {
    return NextResponse.json(
      { status: "unavailable", code: "PRICING_PRODUCT_UNAVAILABLE", message: "Harga belum dapat divalidasi. Coba lagi." },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "15" } }
    );
  }
}
