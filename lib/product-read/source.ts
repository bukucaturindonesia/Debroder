export type ProductReadStatus = "ready" | "empty" | "unavailable";

export type ProductReadSlice<T> = {
  status: ProductReadStatus;
  data: T;
};

export type ProductRow = {
  id: string;
  name: string | null;
  nama: string;
  kategori: string;
  deskripsi: string;
  short_detail: string | null;
  description: string | null;
  subcategory: string | null;
  compare_price: number | string | null;
  specifications: string[] | null;
  gallery_urls: string[] | null;
  label_new: boolean | null;
  label_promo: boolean | null;
  label_best_seller: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  focal_x: number | null;
  focal_y: number | null;
  focal_zoom: number | null;
  target_ratio: string | null;
  focal_points: Record<string, { focal_x: number; focal_y: number; zoom: number; target_ratio: string }> | null;
  sales_count: number | null;
  badge: string | null;
  gambar_url: string | null;
  image_url: string | null;
  image_alt: string | null;
  collection_tags: string[] | null;
  intent_tags: string[] | null;
  color_tags: string[] | null;
  size_tags: string[] | null;
  size_chart?: string[] | null;
  bulk_order_note?: string | null;
  material_tags: string[] | null;
  brand: string | null;
  object_fit: "cover" | "contain" | null;
  object_position: string | null;
  whatsapp_link: string | null;
  link_url: string | null;
  price: number | string | null;
  harga: number | string | null;
  base_price: number | string | null;
  price_label: string | null;
  slug: string | null;
  stock: number | null;
  product_category_id: string | null;
  product_subcategory_id: string | null;
  size_guide_id: string | null;
  product_type: "standard_product" | "configurable_product" | "production_service" | null;
  pricing_mode: "fixed_price" | "variant_based" | "configurator_based" | "custom_quote" | null;
  sku: string | null;
  has_variants: boolean | null;
  uses_configurator: boolean | null;
  minimum_order_qty: number | null;
  urutan: number | null;
  status: "draft" | "active" | "archived" | null;
  status_aktif: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  name: string | null;
  slug: string | null;
  hex_code: string | null;
  status: "active" | "inactive" | "out_of_stock" | null;
  variant_name: string | null;
  color_name: string | null;
  color_hex: string | null;
  sku: string | null;
  price_adjustment: number | string | null;
  image_url: string | null;
  images: string[] | null;
  object_fit: "cover" | "contain" | null;
  object_position: string | null;
  is_active: boolean;
  sort_order: number | null;
};

export type ProductVariantSizeRow = {
  id: string;
  variant_id: string;
  size_name: string;
  sku: string | null;
  stock: number | null;
  stock_quantity: number | null;
  size_id: string | null;
  status: "active" | "inactive" | "out_of_stock" | null;
  price_adjustment: number | string | null;
  is_active: boolean;
  sort_order: number | null;
};

export type ProductVariantImageRow = {
  id: string;
  variant_id: string;
  image_url: string;
  image_role: "front" | "back" | "detail" | "lifestyle" | null;
  alt_text: string | null;
  object_fit: "cover" | "contain" | null;
  object_position: string | null;
  focal_x: number | null;
  focal_y: number | null;
  focal_zoom: number | null;
  target_ratio: string | null;
  is_cover: boolean | null;
  sort_order: number | null;
};

export type ProductSizeGuideRow = {
  id: string;
  product_id: string | null;
  product_category_id: string | null;
  product_subcategory_id: string | null;
  title: string;
  description: string | null;
  rows: Array<Record<string, string | number>> | null;
  notes: string[] | null;
  is_active: boolean;
  sort_order: number | null;
};

export type ProductReadSource = {
  products: ProductReadSlice<readonly ProductRow[]>;
  variants: ProductReadSlice<readonly ProductVariantRow[]>;
  variantSizes: ProductReadSlice<readonly ProductVariantSizeRow[]>;
  variantImages: ProductReadSlice<readonly ProductVariantImageRow[]>;
  sizeGuides: ProductReadSlice<readonly ProductSizeGuideRow[]>;
};
