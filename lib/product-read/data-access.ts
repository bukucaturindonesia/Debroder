import "server-only";

import { unstable_cache } from "next/cache";
import { PUBLIC_CACHE_REVALIDATE_SECONDS, PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { createSupabaseServerClient } from "@/lib/supabase";
import { readInventoryAvailabilityByVariantSizeIds } from "@/lib/supabase/products";
import { projectVariantSizeInventoryAvailability } from "./inventory";
import type {
  ProductReadSlice,
  ProductReadSource,
  ProductRow,
  ProductSizeGuideRow,
  ProductVariantImageRow,
  ProductVariantRow,
  ProductVariantSizeRow
} from "./source";

const PRODUCT_SELECT = "id,name,nama,kategori,deskripsi,short_detail,description,subcategory,badge,gambar_url,image_url,image_alt,collection_tags,intent_tags,color_tags,size_tags,material_tags,brand,price,harga,base_price,slug,product_category_id,product_subcategory_id,size_guide_id,product_type,pricing_mode,sales_mode,tier_scope,sku,has_variants,uses_configurator,minimum_order_qty,public_description,status,status_aktif,created_at,updated_at";
const VARIANT_SELECT = "id,product_id,name,slug,hex_code,status,variant_name,color_name,color_hex,sku,price_adjustment,is_active,sort_order";
const SIZE_SELECT = "id,variant_id,size_name,sku,stock,stock_quantity,size_id,status,price_adjustment,is_active,sort_order";
const IMAGE_SELECT = "id,variant_id,image_url,image_role,alt_text,is_cover,sort_order";
const GUIDE_SELECT = "id,product_id,product_category_id,product_subcategory_id,title,description,rows,notes,is_active,sort_order";

export const PUBLIC_CATALOG_PRODUCT_LIMIT = 120;

export type ActiveProductSourceOptions = {
  productCategoryId?: string;
  category?: string;
  excludeProductId?: string;
  limit?: number;
};

function unavailable<T>(data: T): ProductReadSlice<T> {
  return { status: "unavailable", data };
}

function listSlice<T>(data: readonly T[] | null | undefined): ProductReadSlice<readonly T[]> {
  const rows = data || [];
  return { status: rows.length ? "ready" : "empty", data: rows };
}

async function hydrateProductRelations(products: readonly ProductRow[]): Promise<Omit<ProductReadSource, "products">> {
  const client = createSupabaseServerClient();
  if (!client) {
    return {
      variants: unavailable([]),
      variantSizes: unavailable([]),
      variantImages: unavailable([]),
      sizeGuides: unavailable([])
    };
  }

  const productIds = products.map((product) => product.id).filter(Boolean);
  if (!productIds.length) {
    return {
      variants: { status: "empty", data: [] },
      variantSizes: { status: "empty", data: [] },
      variantImages: { status: "empty", data: [] },
      sizeGuides: { status: "empty", data: [] }
    };
  }

  const [variantResult, guideResult] = await Promise.all([
    client
      .from("product_variants")
      .select(VARIANT_SELECT)
      .in("product_id", productIds)
      .eq("status", "active")
      .order("sort_order", { ascending: true }),
    client
      .from("product_size_guides")
      .select(GUIDE_SELECT)
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
  ]);

  if (variantResult.error || !variantResult.data) {
    return {
      variants: unavailable([]),
      variantSizes: unavailable([]),
      variantImages: unavailable([]),
      sizeGuides: guideResult.error || !guideResult.data
        ? unavailable([])
        : listSlice(guideResult.data as ProductSizeGuideRow[])
    };
  }

  const variants = variantResult.data as ProductVariantRow[];
  const variantIds = variants.map((variant) => variant.id).filter(Boolean);
  if (!variantIds.length) {
    return {
      variants: listSlice(variants),
      variantSizes: { status: "empty", data: [] },
      variantImages: { status: "empty", data: [] },
      sizeGuides: guideResult.error || !guideResult.data
        ? unavailable([])
        : listSlice(guideResult.data as ProductSizeGuideRow[])
    };
  }

  const [sizeResult, imageResult] = await Promise.all([
    client
      .from("product_variant_sizes")
      .select(SIZE_SELECT)
      .in("variant_id", variantIds)
      .eq("status", "active")
      .order("sort_order", { ascending: true }),
    client
      .from("product_variant_images")
      .select(IMAGE_SELECT)
      .in("variant_id", variantIds)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true })
  ]);
  const variantSizes = sizeResult.error || !sizeResult.data
    ? null
    : projectVariantSizeInventoryAvailability(
        sizeResult.data as ProductVariantSizeRow[],
        await readInventoryAvailabilityByVariantSizeIds(
          (sizeResult.data as ProductVariantSizeRow[]).map((size) => size.id)
        )
      );

  return {
    variants: listSlice(variants),
    variantSizes: !variantSizes
      ? unavailable([])
      : listSlice(variantSizes),
    variantImages: imageResult.error || !imageResult.data
      ? unavailable([])
      : listSlice(imageResult.data as ProductVariantImageRow[]),
    sizeGuides: guideResult.error || !guideResult.data
      ? unavailable([])
      : listSlice(guideResult.data as ProductSizeGuideRow[])
  };
}

async function readActiveProductSourceUncached(
  options: ActiveProductSourceOptions = {}
): Promise<ProductReadSource> {
  const client = createSupabaseServerClient();
  if (!client) {
    return {
      products: unavailable([]),
      variants: unavailable([]),
      variantSizes: unavailable([]),
      variantImages: unavailable([]),
      sizeGuides: unavailable([])
    };
  }

  let productsQuery = client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (options.productCategoryId) {
    productsQuery = productsQuery.eq("product_category_id", options.productCategoryId);
  }
  if (options.category) {
    productsQuery = productsQuery.eq("kategori", options.category);
  }
  if (options.excludeProductId) {
    productsQuery = productsQuery.neq("id", options.excludeProductId);
  }

  const limit = Math.min(
    Math.max(options.limit ?? PUBLIC_CATALOG_PRODUCT_LIMIT, 1),
    PUBLIC_CATALOG_PRODUCT_LIMIT
  );
  const { data, error } = await productsQuery.limit(limit);

  if (error || !data) {
    return {
      products: unavailable([]),
      variants: unavailable([]),
      variantSizes: unavailable([]),
      variantImages: unavailable([]),
      sizeGuides: unavailable([])
    };
  }

  const products = data as unknown as ProductRow[];
  return {
    products: listSlice(products),
    ...(await hydrateProductRelations(products))
  };
}

const readActiveProductSourceCached = unstable_cache(
  (options: ActiveProductSourceOptions = {}) => readActiveProductSourceUncached(options),
  ["public-active-product-source-v1"],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.catalog, PUBLIC_CACHE_TAGS.product]
  }
);

export function readActiveProductSource(
  options: ActiveProductSourceOptions = {}
): Promise<ProductReadSource> {
  return readActiveProductSourceCached(options);
}

async function readProductBySlugSourceUncached(slug: string): Promise<ProductReadSource> {
  const client = createSupabaseServerClient();
  if (!client) {
    return {
      products: unavailable([]),
      variants: unavailable([]),
      variantSizes: unavailable([]),
      variantImages: unavailable([]),
      sizeGuides: unavailable([])
    };
  }

  const { data, error } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return {
      products: unavailable([]),
      variants: unavailable([]),
      variantSizes: unavailable([]),
      variantImages: unavailable([]),
      sizeGuides: unavailable([])
    };
  }

  const products = data ? [data as unknown as ProductRow] : [];
  return {
    products: listSlice(products),
    ...(await hydrateProductRelations(products))
  };
}

const readProductBySlugSourceCached = unstable_cache(
  (slug: string) => readProductBySlugSourceUncached(slug),
  ["public-product-by-slug-v1"],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.product]
  }
);

export function readProductBySlugSource(slug: string): Promise<ProductReadSource> {
  return readProductBySlugSourceCached(slug);
}
