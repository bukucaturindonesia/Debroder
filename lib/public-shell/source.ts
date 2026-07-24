export type PublicShellSourceStatus = "ready" | "empty" | "unavailable";

export type PublicShellSourceSlice<T> = {
  status: PublicShellSourceStatus;
  data: T;
};

export type PublicShellProductRow = {
  id: string;
  nama: string;
  kategori: string;
  subcategory: string | null;
  slug: string | null;
  link_url: string | null;
  product_category_id: string | null;
  status: "draft" | "active" | "archived" | null;
  status_aktif: boolean;
  label_new: boolean | null;
  label_promo: boolean | null;
  label_best_seller: boolean | null;
  sales_count: number | null;
  stock: number | null;
  uses_configurator: boolean | null;
  product_type: "standard_product" | "configurable_product" | "production_service" | null;
  pricing_mode: "fixed_price" | "variant_based" | "configurator_based" | "custom_quote" | null;
  color_tags: string[] | null;
  intent_tags: string[] | null;
  collection_tags: string[] | null;
  material_tags: string[] | null;
};

export type PublicShellVariantRow = {
  id: string;
  product_id: string;
  status: "active" | "inactive" | "out_of_stock" | null;
  is_active: boolean;
  color_name: string | null;
  variant_name: string | null;
};

export type PublicShellVariantSizeRow = {
  variant_id: string;
  status: "active" | "inactive" | "out_of_stock" | null;
  is_active: boolean;
  stock: number | null;
  stock_quantity: number | null;
};

export type PublicShellCategoryRow = {
  id: string | null;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  collection_section_order: number | null;
  public_label: string | null;
};

export type PublicShellContactRow = {
  email: string | null;
  whatsapp_utama: string | null;
  whatsapp_link: string | null;
  facebook: string | null;
  instagram: string | null;
};

export type PublicShellStoreRow = {
  nama_store: string;
  urutan: number;
  status_aktif: boolean;
};

export type PublicShellSource = {
  products: PublicShellSourceSlice<readonly PublicShellProductRow[]>;
  variants: PublicShellSourceSlice<readonly PublicShellVariantRow[]>;
  variantSizes: PublicShellSourceSlice<readonly PublicShellVariantSizeRow[]>;
  categories: PublicShellSourceSlice<readonly PublicShellCategoryRow[]>;
  contact: PublicShellSourceSlice<PublicShellContactRow | null>;
  stores: PublicShellSourceSlice<readonly PublicShellStoreRow[]>;
};
