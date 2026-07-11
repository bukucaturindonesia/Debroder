import { NextResponse } from "next/server";
import type { RevalidationInput } from "@/lib/types";
import { revalidateCartItems } from "@/lib/supabase/products";

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const items = parseRevalidationInputs(body);

  if (!items) {
    return NextResponse.json(
      { error: "Invalid cart revalidation payload." },
      { status: 400 }
    );
  }

  const results = await revalidateCartItems(items);
  return NextResponse.json({ items: results });
}

function parseRevalidationInputs(value: unknown): RevalidationInput[] | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }

  const inputs: RevalidationInput[] = [];

  for (const item of value.items) {
    if (!isRecord(item)) {
      return null;
    }

    const productVariantSizeId = item.product_variant_size_id;
    const quantity = item.quantity;
    const unitPrice = item.unit_price;
    const productId = item.product_id;
    const priceTierId = item.price_tier_id;

    if (
      typeof productVariantSizeId !== "string" ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      typeof unitPrice !== "number" ||
      !Number.isInteger(unitPrice)
    ) {
      return null;
    }

    inputs.push({
      product_variant_size_id: productVariantSizeId,
      quantity,
      unit_price: unitPrice,
      product_id: typeof productId === "string" ? productId : undefined,
      price_tier_id: typeof priceTierId === "string" ? priceTierId : null
    });
  }

  return inputs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
