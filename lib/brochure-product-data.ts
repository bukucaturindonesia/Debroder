import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase";
import {
  brochureProductWithPim,
  brochureProducts,
  type BrochureProduct,
  type BrochureProductRecord,
  type BrochureProductVariant
} from "@/src/data/products";

const PRODUCT_SELECT = "id,name,nama,slug,description,deskripsi,image_url,gambar_url,image_alt,base_price,sku,material_tags,gsm";
const VARIANT_SELECT = "id,product_id,name,slug,hex_code,status,variant_name,color_name,color_hex,is_active,is_default,sort_order";
const SIZE_SELECT = "id,variant_id,size_name,size_id,status,is_active,sort_order";
const IMAGE_SELECT = "id,variant_id,image_url,image_role,alt_text,is_cover,sort_order";

type Row = Record<string, unknown>;

export async function readBrochureProducts(): Promise<BrochureProduct[]> {
  const client = createSupabaseServerClient();
  if (!client) return brochureProducts.map((product) => ({ ...product }));

  const { data, error } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .in("slug", brochureProducts.map((product) => product.slug));

  if (error || !data) {
    console.error("Brochure PIM product read failed", { code: error?.code || "empty_response" });
    return brochureProducts.map((product) => ({ ...product }));
  }

  const productRows = data as unknown as (BrochureProductRecord & { id: string; slug: string })[];
  const activeProducts = productRows.filter((row) => brochureProducts.some((product) => product.slug === row.slug));
  const variantsByProduct = await readVariants(client, activeProducts.map((row) => row.id));
  const rowsBySlug = new Map(activeProducts.map((row) => [row.slug, row]));

  return brochureProducts.map((product) => {
    const row = rowsBySlug.get(product.slug);
    return brochureProductWithPim(product, row || null, row ? variantsByProduct.get(row.id) || [] : []);
  });
}

export async function readBrochureProduct(slug: string): Promise<BrochureProduct | null> {
  const fallback = brochureProducts.find((product) => product.slug === slug);
  if (!fallback) return null;
  return (await readBrochureProducts()).find((item) => item.slug === fallback.slug) || fallback;
}

async function readVariants(
  client: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  productIds: string[]
) {
  const variantsByProduct = new Map<string, BrochureProductVariant[]>();
  if (!productIds.length) return variantsByProduct;

  const { data, error } = await client
    .from("product_variants")
    .select(VARIANT_SELECT)
    .in("product_id", productIds)
    .eq("status", "active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("Brochure PIM variant read failed", { code: error?.code || "empty_response" });
    return variantsByProduct;
  }

  const variants = data as unknown as Row[];
  const variantIds = variants.map((variant) => text(variant.id)).filter(Boolean);
  const [sizesByVariant, imagesByVariant] = await Promise.all([
    readSizes(client, variantIds),
    readImages(client, variantIds)
  ]);

  for (const variant of variants) {
    const id = text(variant.id);
    const productId = text(variant.product_id);
    const name = text(variant.color_name) || text(variant.variant_name) || text(variant.name);
    if (!id || !productId || !name) continue;
    const record: BrochureProductVariant = {
      id,
      name,
      colorHex: validHex(variant.color_hex),
      imageUrl: imagesByVariant.get(id) || null,
      sizes: sizesByVariant.get(id) || []
    };
    const current = variantsByProduct.get(productId) || [];
    current.push(record);
    variantsByProduct.set(productId, current);
  }

  for (const variantsForProduct of variantsByProduct.values()) {
    variantsForProduct.sort((left, right) => {
      const leftRow = variants.find((row) => row.id === left.id);
      const rightRow = variants.find((row) => row.id === right.id);
      return Number(rightRow?.is_default === true) - Number(leftRow?.is_default === true)
        || Number(leftRow?.sort_order || 0) - Number(rightRow?.sort_order || 0);
    });
  }

  return variantsByProduct;
}

async function readSizes(
  client: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  variantIds: string[]
) {
  const result = new Map<string, string[]>();
  if (!variantIds.length) return result;
  const { data, error } = await client
    .from("product_variant_sizes")
    .select(SIZE_SELECT)
    .in("variant_id", variantIds)
    .eq("status", "active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("Brochure PIM size read failed", { code: error?.code || "empty_response" });
    return result;
  }

  for (const row of data as unknown as Row[]) {
    const variantId = text(row.variant_id);
    const name = text(row.size_name);
    if (!variantId || !name) continue;
    const sizes = result.get(variantId) || [];
    if (!sizes.includes(name)) sizes.push(name);
    result.set(variantId, sizes);
  }
  return result;
}

async function readImages(
  client: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  variantIds: string[]
) {
  const result = new Map<string, string>();
  if (!variantIds.length) return result;
  const { data, error } = await client
    .from("product_variant_images")
    .select(IMAGE_SELECT)
    .in("variant_id", variantIds)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("Brochure PIM image read failed", { code: error?.code || "empty_response" });
    return result;
  }

  for (const row of data as unknown as Row[]) {
    const variantId = text(row.variant_id);
    const imageUrl = text(row.image_url);
    if (variantId && imageUrl && !result.has(variantId)) result.set(variantId, imageUrl);
  }
  return result;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validHex(value: unknown) {
  const hex = text(value);
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
}
