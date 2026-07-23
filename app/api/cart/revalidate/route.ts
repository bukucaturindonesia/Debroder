import { NextResponse } from "next/server";
import type { RevalidationInput } from "@/lib/types";
import { revalidateCartItems } from "@/lib/supabase/products";
import {
  MAX_CART_LINES,
  MAX_CART_LINE_QUANTITY,
  MAX_CART_TOTAL_QUANTITY
} from "@/lib/cart-v5";

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
  if (value.items.length > MAX_CART_LINES) return null;

  const inputs: RevalidationInput[] = [];
  const variantSizeIds = new Set<string>();
  let totalQuantity = 0;

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
      quantity < 1 ||
      quantity > MAX_CART_LINE_QUANTITY ||
      typeof unitPrice !== "number" ||
      !Number.isSafeInteger(unitPrice) ||
      unitPrice < 0 ||
      variantSizeIds.has(productVariantSizeId)
    ) {
      return null;
    }
    variantSizeIds.add(productVariantSizeId);
    totalQuantity += quantity;
    if (totalQuantity > MAX_CART_TOTAL_QUANTITY) return null;

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
