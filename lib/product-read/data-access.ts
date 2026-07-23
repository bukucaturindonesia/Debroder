import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase";
import type {
  ProductReadSlice,
  ProductReadSource,
  ProductRow,
  ProductSizeGuideRow,
  ProductVariantImageRow,
  ProductVariantRow,
  ProductVariantSizeRow
} from "./source";

const PRODUCT_SELECT = "id,name,nama,kategori,deskripsi,short_detail,description,subcategory,compare_price,specifications,gallery_urls,label_new,label_promo,label_best_seller,seo_title,seo_description,og_image_url,canonical_url,focal_x,focal_y,focal_zoom,target_ratio,focal_points,sales_count,badge,gambar_url,image_url,image_alt,collection_tags,intent_tags,color_tags,size_tags,material_tags,brand,object_fit,object_position,whatsapp_link,link_url,price,harga,base_price,price_label,slug,stock,product_category_id,product_subcategory_id,size_guide_id,product_type,pricing_mode,sku,has_variants,uses_configurator,minimum_order_qty,urutan,status,status_aktif,created_at,updated_at";
const VARIANT_SELECT = "id,product_id,name,slug,hex_code,status,variant_name,color_name,color_hex,sku,price_adjustment,image_url,images,object_fit,object_position,is_active,sort_order";
const SIZE_SELECT = "id,variant_id,size_name,sku,stock,stock_quantity,size_id,status,price_adjustment,is_active,sort_order";
const IMAGE_SELECT = "id,variant_id,image_url,image_role,alt_text,object_fit,object_position,focal_x,focal_y,focal_zoom,target_ratio,is_cover,sort_order";
const GUIDE_SELECT = "id,product_id,product_category_id,product_subcategory_id,title,description,rows,notes,is_active,sort_order";

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

  return {
    variants: listSlice(variants),
    variantSizes: sizeResult.error || !sizeResult.data
      ? unavailable([])
      : listSlice(sizeResult.data as ProductVariantSizeRow[]),
    variantImages: imageResult.error || !imageResult.data
      ? unavailable([])
      : listSlice(imageResult.data as ProductVariantImageRow[]),
    sizeGuides: guideResult.error || !guideResult.data
      ? unavailable([])
      : listSlice(guideResult.data as ProductSizeGuideRow[])
  };
}

export async function readActiveProductSource(): Promise<ProductReadSource> {
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
    .eq("status", "active")
    .order("urutan", { ascending: true });

  if (error || !data) {
    return {
      products: unavailable([]),
      variants: unavailable([]),
      variantSizes: unavailable([]),
      variantImages: unavailable([]),
      sizeGuides: unavailable([])
    };
  }

  const products = data as ProductRow[];
  return {
    products: listSlice(products),
    ...(await hydrateProductRelations(products))
  };
}

export async function readProductBySlugSource(slug: string): Promise<ProductReadSource> {
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

  const products = data ? [data as ProductRow] : [];
  return {
    products: listSlice(products),
    ...(await hydrateProductRelations(products))
  };
}
