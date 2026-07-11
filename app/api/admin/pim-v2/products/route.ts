import { NextResponse } from "next/server";
import type { Product } from "@/lib/types";
import { isAdminRequest } from "@/lib/admin-auth";
import { parseProductPayload } from "@/lib/product-parser";
import { validatePublishProduct } from "@/lib/product-validation";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized.", issues: [] }, { status: 401 });
  }

  const body: unknown = await request.json();
  const product = parseBodyProduct(body);

  if (!product) {
    return NextResponse.json(
      { error: "Invalid product payload.", issues: [] },
      { status: 400 }
    );
  }

  const issues = validatePublishProduct(product);
  if (issues.some((issue) => issue.severity === "error")) {
    return NextResponse.json(
      { error: "Validation failed.", issues },
      { status: 422 }
    );
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "Supabase admin environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        issues: []
      },
      { status: 503 }
    );
  }

  try {
    const savedProduct = await upsertProduct(product);
    return NextResponse.json({ ok: true, product_id: savedProduct.id, issues: [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PIM V2 save failed with an unknown error.",
        issues: []
      },
      { status: 500 }
    );
  }
}

async function upsertProduct(product: Product): Promise<{ id: string }> {
  const client = getAdminSupabaseClient();

  if (!client) {
    throw new Error("Supabase admin client is unavailable.");
  }

  const { data, error } = await client
    .from("products")
    .upsert(
      {
        id: product.id.startsWith("prod-") ? undefined : product.id,
        name: product.name,
        slug: product.slug,
        product_category_id: product.productCategoryId,
        base_price: product.basePrice,
        description: product.description,
        status: product.status,
        sku: product.sku
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save product: ${error.message}`);
  }

  const productId = readSavedId(data);

  for (const variant of product.variants) {
    const { data: variantData, error: variantError } = await client
      .from("product_variants")
      .upsert(
        {
          id: variant.id.startsWith("var-") ? undefined : variant.id,
          product_id: productId,
          name: variant.name,
          slug: variant.slug,
          hex_code: variant.hexCode,
          sku: variant.sku,
          sort_order: variant.sortOrder,
          is_default: variant.isDefault,
          status: variant.status,
          price_adjustment: variant.priceAdjustment
        },
        { onConflict: "sku" }
      )
      .select("id")
      .single();

    if (variantError) {
      throw new Error(`Failed to save variant ${variant.sku}: ${variantError.message}`);
    }

    const variantId = readSavedId(variantData);

    for (const image of variant.images) {
      const { error: imageError } = await client
        .from("product_variant_images")
        .upsert(
          {
            id: image.id.startsWith("img-") ? undefined : image.id,
            variant_id: variantId,
            image_url: image.imageUrl,
            image_role: image.imageRole,
            sort_order: image.sortOrder,
            alt_text: image.altText
          },
          { onConflict: "variant_id,image_role" }
        );

      if (imageError) {
        throw new Error(
          `Failed to save image ${image.imageRole}: ${imageError.message}`
        );
      }
    }

    for (const variantSize of variant.sizes) {
      const { error: sizeError } = await client
        .from("product_variant_sizes")
        .upsert(
          {
            id: variantSize.id.startsWith("vsize-") ? undefined : variantSize.id,
            variant_id: variantId,
            size_id: variantSize.sizeId,
            sku: variantSize.sku,
            stock_quantity: variantSize.stockQuantity,
            price_adjustment: variantSize.priceAdjustment,
            status: variantSize.status
          },
          { onConflict: "sku" }
        );

      if (sizeError) {
        throw new Error(
          `Failed to save sellable SKU ${variantSize.sku}: ${sizeError.message}`
        );
      }
    }
  }

  await syncProductPriceRules(product, productId);

  return { id: productId };
}

async function syncProductPriceRules(product: Product, productId: string) {
  const client = getAdminSupabaseClient();

  if (!client) {
    throw new Error("Supabase admin client is unavailable.");
  }

  const { error: deleteTierError } = await client
    .from("product_price_tiers")
    .delete()
    .eq("product_id", productId);

  if (deleteTierError) {
    throw new Error(`Failed to replace price tiers: ${deleteTierError.message}`);
  }

  const tierRows = (product.priceTiers ?? []).map((tier) => ({
    product_id: productId,
    min_quantity: tier.minQuantity,
    max_quantity: tier.maxQuantity,
    unit_price: tier.unitPrice,
    quote_required: tier.quoteRequired,
    status: tier.status,
    sort_order: tier.sortOrder
  }));

  if (tierRows.length > 0) {
    const { error: tierError } = await client
      .from("product_price_tiers")
      .insert(tierRows);

    if (tierError) {
      throw new Error(`Failed to save price tiers: ${tierError.message}`);
    }
  }

  if (product.minimumRule) {
    const { error: minimumError } = await client
      .from("product_minimum_rules")
      .upsert(
        {
          product_id: productId,
          minimum_quantity: product.minimumRule.minimumQuantity,
          minimum_for_tier_quantity: product.minimumRule.minimumForTierQuantity,
          quotation_quantity: product.minimumRule.quotationQuantity,
          status: product.minimumRule.status
        },
        { onConflict: "product_id" }
      );

    if (minimumError) {
      throw new Error(`Failed to save minimum order rule: ${minimumError.message}`);
    }
  }
}

function parseBodyProduct(value: unknown): Product | null {
  if (!isRecord(value)) {
    return null;
  }

  return parseProductPayload(value.product);
}

function readSavedId(value: unknown): string {
  if (isRecord(value) && typeof value.id === "string") {
    return value.id;
  }

  throw new Error("Supabase response did not include a saved id.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
