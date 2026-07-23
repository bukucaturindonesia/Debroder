import "server-only";

import { publicCmsStatusFilter } from "@/lib/cms-workflow";
import { createSupabaseServerClient } from "@/lib/supabase";
import type {
  PublicShellCategoryRow,
  PublicShellContactRow,
  PublicShellProductRow,
  PublicShellSource,
  PublicShellSourceSlice,
  PublicShellStoreRow,
  PublicShellVariantRow,
  PublicShellVariantSizeRow
} from "./source";

function unavailable<T>(data: T): PublicShellSourceSlice<T> {
  return { status: "unavailable", data };
}

function availableList<T>(data: readonly T[] | null | undefined): PublicShellSourceSlice<readonly T[]> {
  const rows = data || [];
  return { status: rows.length ? "ready" : "empty", data: rows };
}

async function readProductsAndVariants(): Promise<Pick<PublicShellSource, "products" | "variants" | "variantSizes">> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      products: unavailable([]),
      variants: unavailable([]),
      variantSizes: unavailable([])
    };
  }

  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id,nama,kategori,subcategory,slug,link_url,product_category_id,status,status_aktif,label_new,label_promo,label_best_seller,sales_count,stock,uses_configurator,product_type,pricing_mode,color_tags,intent_tags,collection_tags,material_tags")
    .eq("status", "active")
    .eq("status_aktif", true)
    .order("urutan", { ascending: true });

  if (productError || !productData) {
    return {
      products: unavailable([]),
      variants: unavailable([]),
      variantSizes: unavailable([])
    };
  }

  const products = productData as PublicShellProductRow[];
  const productIds = products.map((product) => product.id).filter(Boolean);
  if (!productIds.length) {
    return {
      products: availableList(products),
      variants: { status: "empty", data: [] },
      variantSizes: { status: "empty", data: [] }
    };
  }

  const { data: variantData, error: variantError } = await supabase
    .from("product_variants")
    .select("id,product_id,status,is_active,color_name,variant_name")
    .in("product_id", productIds)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (variantError || !variantData) {
    return {
      products: availableList(products),
      variants: unavailable([]),
      variantSizes: unavailable([])
    };
  }

  const variants = variantData as PublicShellVariantRow[];
  const variantIds = variants.map((variant) => variant.id).filter(Boolean);
  if (!variantIds.length) {
    return {
      products: availableList(products),
      variants: availableList(variants),
      variantSizes: { status: "empty", data: [] }
    };
  }

  const { data: sizeData, error: sizeError } = await supabase
    .from("product_variant_sizes")
    .select("variant_id,status,is_active,stock,stock_quantity")
    .in("variant_id", variantIds)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  return {
    products: availableList(products),
    variants: availableList(variants),
    variantSizes: sizeError || !sizeData
      ? unavailable([])
      : availableList(sizeData as PublicShellVariantSizeRow[])
  };
}

async function readCategories(): Promise<PublicShellSource["categories"]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return unavailable([]);

  const { data, error } = await supabase
    .from("product_categories")
    .select("id,name,slug,is_active,sort_order,collection_section_order,public_label")
    .eq("is_active", true)
    .order("collection_section_order", { ascending: true })
    .order("sort_order", { ascending: true });

  return error || !data
    ? unavailable([])
    : availableList(data as PublicShellCategoryRow[]);
}

async function readContact(): Promise<PublicShellSource["contact"]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return unavailable(null);

  const { data, error } = await supabase
    .from("contact_settings")
    .select("email,whatsapp_utama,whatsapp_link,facebook,instagram")
    .eq("status_aktif", true)
    .or(publicCmsStatusFilter())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return unavailable(null);
  return data
    ? { status: "ready", data: data as PublicShellContactRow }
    : { status: "empty", data: null };
}

async function readStores(): Promise<PublicShellSource["stores"]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return unavailable([]);

  const { data, error } = await supabase
    .from("stores")
    .select("nama_store,urutan,status_aktif")
    .eq("status_aktif", true)
    .or(publicCmsStatusFilter())
    .order("urutan", { ascending: true })
    .limit(4);

  return error || !data
    ? unavailable([])
    : availableList(data as PublicShellStoreRow[]);
}

export async function readPublicShellSource(): Promise<PublicShellSource> {
  const [catalog, categories, contact, stores] = await Promise.all([
    readProductsAndVariants(),
    readCategories(),
    readContact(),
    readStores()
  ]);

  return {
    ...catalog,
    categories,
    contact,
    stores
  };
}
