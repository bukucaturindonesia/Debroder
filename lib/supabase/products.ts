import { sampleProducts } from "@/data/sample-products";
import type {
  PimProduct as Product,
  PimProductCategory as ProductCategory,
  ProductMinimumRule,
  ProductPriceTier,
  ProductSize,
  PimProductVariant as ProductVariant,
  PimProductVariantImage as ProductVariantImage,
  PimProductVariantSize as ProductVariantSize,
  RevalidationInput,
  RevalidationResult
} from "@/lib/types";
import { calculateTieredUnitPrice } from "@/lib/bulk-ordering";
import { getPublicSupabaseClient } from "@/lib/supabase/client";

const PRODUCT_SELECT = `
  id,
  name,
  slug,
  product_category_id,
  base_price,
  description,
  status,
  sku,
  product_price_tiers (
    id,
    product_id,
    min_quantity,
    max_quantity,
    unit_price,
    quote_required,
    status,
    sort_order
  ),
  product_minimum_rules (
    id,
    product_id,
    minimum_quantity,
    minimum_for_tier_quantity,
    quotation_quantity,
    status
  ),
  product_categories (
    id,
    name,
    slug,
    description,
    status,
    sort_order
  ),
  product_variants (
    id,
    product_id,
    name,
    slug,
    hex_code,
    sku,
    sort_order,
    is_default,
    status,
    price_adjustment,
    product_variant_images (
      id,
      variant_id,
      image_url,
      image_role,
      sort_order,
      alt_text
    ),
    product_variant_sizes (
      id,
      variant_id,
      size_id,
      sku,
      stock_quantity,
      price_adjustment,
      status,
      product_size_master!product_variant_sizes_size_id_fkey (
        id,
        name,
        slug,
        sort_order,
        is_active
      )
    )
  )
`;

export async function listProducts(): Promise<Product[]> {
  const client = getPublicSupabaseClient();

  if (!client) {
    return sampleProducts;
  }

  const { data, error } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .order("name");

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return asRecordArray(data).map(mapProductRow);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const client = getPublicSupabaseClient();

  if (!client) {
    return sampleProducts.find((product) => product.slug === slug) ?? null;
  }

  const { data, error } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load product ${slug}: ${error.message}`);
  }

  return isRecord(data) ? mapProductRow(data) : null;
}

export async function revalidateCartItems(
  inputs: RevalidationInput[]
): Promise<RevalidationResult[]> {
  const products = await listProducts();
  const latestItems = inputs.map((input) => ({
    input,
    latest: findVariantSizeById(products, input.product_variant_size_id)
  }));
  const quantityByProductId = new Map<string, number>();

  for (const item of latestItems) {
    if (!item.latest) {
      continue;
    }

    quantityByProductId.set(
      item.latest.product.id,
      (quantityByProductId.get(item.latest.product.id) ?? 0) + item.input.quantity
    );
  }

  return latestItems.map(({ input, latest }) => {
    if (!latest) {
      return {
        product_variant_size_id: input.product_variant_size_id,
        status: "unavailable",
        latest_unit_price: null,
        stock_available: 0,
        message: "Kombinasi produk tidak lagi tersedia."
      };
    }

    const latestUnitPrice = calculateTieredUnitPrice(
      latest.product,
      latest.variant,
      latest.variantSize,
      quantityByProductId.get(latest.product.id) ?? input.quantity
    );

    if (
      latest.variant.status !== "active" ||
      latest.variantSize.status !== "active" ||
      latest.variantSize.size.status !== "active"
    ) {
      return {
        product_variant_size_id: input.product_variant_size_id,
        status: "unavailable",
        latest_unit_price: latestUnitPrice,
        stock_available: latest.variantSize.stockQuantity,
        message: "Kombinasi produk sudah tidak aktif."
      };
    }

    if (input.quantity > latest.variantSize.stockQuantity) {
      return {
        product_variant_size_id: input.product_variant_size_id,
        status: "stock_changed",
        latest_unit_price: latestUnitPrice,
        stock_available: latest.variantSize.stockQuantity,
        message: `Stok ${latest.variant.name} ukuran ${latest.variantSize.size.name} hanya tersisa ${latest.variantSize.stockQuantity} pcs.`
      };
    }

    if (input.unit_price !== latestUnitPrice) {
      return {
        product_variant_size_id: input.product_variant_size_id,
        status: "price_changed",
        latest_unit_price: latestUnitPrice,
        stock_available: latest.variantSize.stockQuantity,
        message: "Harga produk telah berubah."
      };
    }

    return {
      product_variant_size_id: input.product_variant_size_id,
      status: "ok",
      latest_unit_price: latestUnitPrice,
      stock_available: latest.variantSize.stockQuantity,
      message: null
    };
  });
}

function findVariantSizeById(
  products: Product[],
  productVariantSizeId: string
):
  | {
      product: Product;
      variant: ProductVariant;
      variantSize: ProductVariantSize;
    }
  | null {
  for (const product of products) {
    for (const variant of product.variants) {
      const variantSize = variant.sizes.find(
        (candidate) => candidate.id === productVariantSizeId
      );

      if (variantSize) {
        return { product, variant, variantSize };
      }
    }
  }

  return null;
}

function mapProductRow(row: Record<string, unknown>): Product {
  const variants = asRecordArray(row.product_variants)
    .map(mapVariantRow)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const priceTiers = asRecordArray(row.product_price_tiers)
    .map(mapProductPriceTierRow)
    .sort((a, b) => a.minQuantity - b.minQuantity || a.sortOrder - b.sortOrder);

  return {
    id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    productCategoryId: asString(row.product_category_id),
    category: mapCategoryRow(takeFirstRecord(row.product_categories)),
    basePrice: asNumber(row.base_price),
    description: asNullableString(row.description),
    status: asProductStatus(row.status),
    sku: asNullableString(row.sku),
    variants,
    priceTiers,
    minimumRule: mapProductMinimumRuleRow(takeFirstRecord(row.product_minimum_rules))
  };
}

function mapProductPriceTierRow(row: Record<string, unknown>): ProductPriceTier {
  return {
    id: asString(row.id),
    productId: asString(row.product_id),
    minQuantity: asNumber(row.min_quantity),
    maxQuantity: asNullableNumber(row.max_quantity),
    unitPrice: asNullableNumber(row.unit_price),
    quoteRequired: asBoolean(row.quote_required),
    status: asLifecycleStatus(row.status),
    sortOrder: asNumber(row.sort_order)
  };
}

function mapProductMinimumRuleRow(
  row: Record<string, unknown> | null
): ProductMinimumRule | null {
  if (!row) {
    return null;
  }

  return {
    id: asString(row.id),
    productId: asString(row.product_id),
    minimumQuantity: asNumber(row.minimum_quantity),
    minimumForTierQuantity: asNullableNumber(row.minimum_for_tier_quantity),
    quotationQuantity: asNullableNumber(row.quotation_quantity),
    status: asLifecycleStatus(row.status)
  };
}

function mapCategoryRow(row: Record<string, unknown> | null): ProductCategory | null {
  if (!row) {
    return null;
  }

  return {
    id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    description: asNullableString(row.description),
    status: asString(row.status) === "inactive" ? "inactive" : "active",
    sortOrder: asNumber(row.sort_order)
  };
}

function mapVariantRow(row: Record<string, unknown>): ProductVariant {
  const images = asRecordArray(row.product_variant_images)
    .map(mapImageRow)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const sizes = asRecordArray(row.product_variant_sizes)
    .map(mapVariantSizeRow)
    .sort((a, b) => a.size.sortOrder - b.size.sortOrder);

  return {
    id: asString(row.id),
    productId: asString(row.product_id),
    name: asString(row.name),
    slug: asString(row.slug),
    hexCode: asString(row.hex_code),
    sku: asString(row.sku),
    sortOrder: asNumber(row.sort_order),
    isDefault: asBoolean(row.is_default),
    status: asVariantStatus(row.status),
    priceAdjustment: asNumber(row.price_adjustment),
    images,
    sizes
  };
}

function mapImageRow(row: Record<string, unknown>): ProductVariantImage {
  return {
    id: asString(row.id),
    variantId: asString(row.variant_id),
    imageUrl: asString(row.image_url),
    imageRole: asImageRole(row.image_role),
    sortOrder: asNumber(row.sort_order),
    altText: asNullableString(row.alt_text)
  };
}

function mapVariantSizeRow(row: Record<string, unknown>): ProductVariantSize {
  const sizeRow = takeFirstRecord(row.product_size_master);

  if (!sizeRow) {
    throw new Error(`Variant size ${asString(row.id)} is missing size master data.`);
  }

  return {
    id: asString(row.id),
    variantId: asString(row.variant_id),
    sizeId: asString(row.size_id),
    sku: asString(row.sku),
    stockQuantity: asNumber(row.stock_quantity),
    priceAdjustment: asNumber(row.price_adjustment),
    status: asVariantStatus(row.status),
    size: mapSizeRow(sizeRow)
  };
}

function mapSizeRow(row: Record<string, unknown>): ProductSize {
  return {
    id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    sortOrder: asNumber(row.sort_order),
    status: asBoolean(row.is_active) ? "active" : "inactive",
    priceAdjustment: 0
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function takeFirstRecord(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find(isRecord) ?? null;
  }

  return null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function asLifecycleStatus(value: unknown): "active" | "inactive" | "archived" {
  if (value === "inactive" || value === "archived") {
    return value;
  }

  return "active";
}

function asProductStatus(value: unknown): Product["status"] {
  return value === "draft" || value === "archived" ? value : "active";
}

function asVariantStatus(value: unknown): ProductVariant["status"] {
  if (value === "inactive" || value === "out_of_stock") {
    return value;
  }

  return "active";
}

function asImageRole(value: unknown): ProductVariantImage["imageRole"] {
  if (value === "back" || value === "detail" || value === "lifestyle") {
    return value;
  }

  return "front";
}
