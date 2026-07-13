export type ProductType = "standard_product" | "configurable_product" | "production_service";

export type PricingMode = "fixed_price" | "variant_based" | "configurator_based" | "custom_quote";

export type CmsStatus = "draft" | "scheduled" | "published" | "archived";

export type CmsRevisionAction =
  | "draft_saved"
  | "published"
  | "scheduled"
  | "schedule_cancelled"
  | "archived"
  | "restored";

export type CmsRevisionRecord = {
  id?: string;
  content_type: string;
  content_id: string;
  action: CmsRevisionAction;
  status: CmsStatus;
  data: Record<string, unknown>;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  publish_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CmsWorkflowFields = {
  status?: CmsStatus;
  publish_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  updated_by?: string | null;
};

export type Product = {
  id?: string;
  nama: string;
  kategori: string;
  deskripsi: string;
  short_detail?: string;
  description?: string;
  subcategory?: string;
  compare_price?: number | string | null;
  specifications?: string[];
  gallery_urls?: string[];
  label_new?: boolean;
  label_promo?: boolean;
  label_best_seller?: boolean;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  focal_points?: Record<string, FocalPoint>;
  sales_count?: number;
  badge: string;
  gambar_url: string;
  image_url?: string;
  image_alt?: string;
  collection_tags?: string[];
  intent_tags?: string[];
  color_tags?: string[];
  size_tags?: string[];
  size_chart?: string[];
  bulk_order_note?: string | null;
  material_tags?: string[];
  brand?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  whatsapp_link: string;
  link_url?: string;
  price?: number | string | null;
  harga?: number | string | null;
  base_price?: number | string | null;
  price_label?: string | null;
  slug?: string;
  featured?: boolean;
  trending?: boolean;
  fresh_drop?: boolean;
  stock?: number;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  size_guide_id?: string | null;
  product_type?: ProductType;
  pricing_mode?: PricingMode;
  sku?: string | null;
  has_variants?: boolean;
  uses_configurator?: boolean;
  minimum_order_qty?: number;
  required_services?: string[];
  config_schema?: Record<string, unknown>;
  admin_notes?: string;
  public_description?: string | null;
  variants?: ProductVariant[];
  size_guide?: ProductSizeGuide | null;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductCategory = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  show_in_collection?: boolean;
  collection_limit?: number;
  collection_sort?: "sort_order" | "newest" | "best_seller" | "promo";
  collection_section_order?: number;
  category_kind?: "product" | "service";
  public_label?: string | null;
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type FocalPoint = {
  focal_x: number;
  focal_y: number;
  zoom: number;
  target_ratio: string;
};

export type Service = {
  id?: string;
  nama: string;
  slug: string;
  deskripsi: string;
  image_url: string;
  image_alt?: string;
  category_key?: string;
  detail_body?: string;
  available_sizes?: string[];
  faq_items?: string[];
  production_estimate?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  harga_mulai?: number | string | null;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ServiceCategory = {
  id?: string;
  nama_kategori: string;
  deskripsi: string;
  gambar_url: string;
  image_alt?: string;
  category_key?: string;
  slug?: string;
  gallery_urls?: string[];
  color_options?: string[];
  collar_options?: string[];
  sleeve_options?: string[];
  material_options?: string[];
  size_chart?: string[];
  faq_items?: string[];
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  link_slug: string;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Store = CmsWorkflowFields & {
  id?: string;
  nama_store: string;
  layanan_utama: string;
  alamat: string;
  whatsapp: string;
  whatsapp_link: string;
  maps_link: string;
  jam_operasional?: string;
  image_url?: string;
  image_alt?: string;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HeroBanner = CmsWorkflowFields & {
  id?: string;
  badge?: string;
  headline: string;
  subheadline: string;
  title?: string;
  subtitle?: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  cta_text?: string;
  cta_link?: string;
  image_url: string;
  image_alt?: string;
  mobile_image_url?: string;
  hero_video_url?: string;
  video_url?: string;
  desktop_video_url?: string;
  mobile_video_url?: string;
  object_position?: string;
  mobile_object_position?: string;
  object_fit?: "cover" | "contain";
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
  mobile_focal_zoom?: number | null;
  mobile_target_ratio?: string;
  text_position?: "left" | "center" | "right";
  urutan?: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AboutContent = {
  id?: string;
  label: string;
  title: string;
  body: string;
  highlights: string[];
  status_aktif: boolean;
  updated_at?: string;
};

export type Testimonial = CmsWorkflowFields & {
  id?: string;
  nama: string;
  sumber: string;
  isi_testimoni: string;
  urutan?: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ContactSettings = CmsWorkflowFields & {
  id?: string;
  email: string;
  whatsapp_utama: string;
  whatsapp_link?: string;
  whatsapp_apparel: string;
  whatsapp_express: string;
  facebook?: string;
  instagram: string;
  copyright_text?: string;
  status_aktif?: boolean;
  updated_at?: string;
};

export type InstagramBanner = CmsWorkflowFields & {
  id?: string;
  title: string;
  image_url: string;
  image_alt?: string;
  mobile_image_url?: string;
  link_url: string;
  object_position?: string;
  mobile_object_position?: string;
  object_fit?: "cover" | "contain";
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
  mobile_focal_zoom?: number | null;
  mobile_target_ratio?: string;
  media_type?: "image" | "video";
  video_url?: string | null;
  mobile_video_url?: string | null;
  eyebrow?: string;
  subtitle?: string;
  cta_label?: string;
  text_position?: "left" | "center" | "right";
  urutan?: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PageHeroContent = CmsWorkflowFields & {
  id?: string;
  page_key: string;
  label: string;
  title: string;
  subtitle: string;
  image_url: string;
  image_alt?: string;
  mobile_image_url?: string;
  object_position: string;
  mobile_object_position?: string;
  object_fit?: "cover" | "contain";
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
  mobile_focal_zoom?: number | null;
  mobile_target_ratio?: string;
  primary_cta_label?: string;
  primary_cta_url?: string;
  secondary_cta_label?: string;
  secondary_cta_url?: string;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type OrderStep = CmsWorkflowFields & {
  id?: string;
  title: string;
  description?: string;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TrustAboutContent = CmsWorkflowFields & {
  id?: string;
  trust_items: string[];
  about_body: string;
  image_url?: string | null;
  mobile_image_url?: string | null;
  video_url?: string | null;
  cta_label?: string;
  cta_url?: string;
  text_position?: "left" | "center" | "right";
  urutan?: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductFilter = CmsWorkflowFields & {
  id?: string;
  filter_type: "collection" | "color" | "size" | "material" | "brand" | "price";
  name: string;
  slug: string;
  color_hex?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HomepageSectionItem = CmsWorkflowFields & {
  id: string;
  section_id: string;
  product_id?: string | null;
  service_id?: string | null;
  custom_label?: string;
  custom_title?: string;
  custom_subtitle?: string;
  custom_button_label?: string;
  custom_link_url?: string;
  custom_image_url?: string;
  custom_mobile_image_url?: string | null;
  custom_image_alt?: string | null;
  custom_object_fit?: "cover" | "contain";
  custom_object_position?: string;
  is_active: boolean;
  sort_order: number;
  product?: Product | null;
  service?: Service | null;
  created_at?: string;
  updated_at?: string;
};

export type HomepageSection = CmsWorkflowFields & {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  items: HomepageSectionItem[];
  created_at?: string;
  updated_at?: string;
};

export type LandingPageSettings = {
  showPlainCategorySection: boolean;
};

export type LandingSection = CmsWorkflowFields & {
  id?: string;
  section_key: string;
  title: string;
  subtitle: string;
  is_visible: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  video_url?: string | null;
  cta_label?: string;
  cta_url?: string;
  text_position?: "left" | "center" | "right";
  created_at?: string;
  updated_at?: string;
};

export type CmsBanner = CmsWorkflowFields & {
  id?: string;
  name: string;
  media_type: "image" | "video";
  desktop_media_url: string;
  mobile_media_url?: string | null;
  poster_url?: string | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_url: string;
  text_position?: "left" | "center" | "right";
  experience_key?: "landing" | "jersey" | string;
  section_type?:
    | "wide_campaign"
    | "split_campaign"
    | "poster_carousel"
    | "custom_cta"
    | "team_package_campaign"
    | "order_steps"
    | "closing_campaign"
    | string;
  section_key?: string;
  secondary_cta_label?: string;
  secondary_cta_url?: string;
  image_alt?: string;
  object_position?: string;
  mobile_object_position?: string;
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
  mobile_focal_zoom?: number | null;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};


export type ProductSubcategory = {
  id?: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  public_label?: string | null;
  is_active: boolean;
  sort_order: number;
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductionService = {
  id?: string;
  name: string;
  slug: string;
  service_type: "production_service" | "required_service" | "addon_service";
  description?: string;
  base_price?: number | string;
  pricing_mode: "fixed_price" | "meter_based" | "area_based" | "quantity_based" | "custom_quote";
  unit_label?: string;
  required_for_product_types?: ProductType[];
  is_required_default?: boolean;
  is_active: boolean;
  sort_order: number;
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductColorMaster = {
  id?: string;
  name: string;
  slug: string;
  color_hex: string;
  color_group: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductSizeMaster = {
  id?: string;
  name: string;
  slug: string;
  size_group: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductSizeGuide = {
  id?: string;
  product_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  title: string;
  description?: string;
  rows: Array<Record<string, string | number>>;
  notes?: string[];
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductVariant = {
  id?: string;
  product_id: string;
  variant_name?: string;
  color_name?: string;
  color_hex?: string;
  sku?: string | null;
  price_adjustment?: number | string;
  image_url?: string | null;
  images?: string[];
  object_fit?: "cover" | "contain";
  object_position?: string;
  is_active: boolean;
  sort_order: number;
  admin_notes?: string;
  sizes?: ProductVariantSize[];
  variant_images?: ProductVariantImage[];
  created_at?: string;
  updated_at?: string;
};

export type ProductVariantSize = {
  id?: string;
  variant_id: string;
  size_name: string;
  sku?: string | null;
  stock: number;
  price_adjustment?: number | string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductVariantImage = {
  id?: string;
  variant_id: string;
  image_url: string;
  image_role?: "front" | "back" | "detail" | "lifestyle";
  alt_text?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  focal_x?: number;
  focal_y?: number;
  focal_zoom?: number;
  target_ratio?: string;
  is_cover?: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type JerseyPackage = {
  id?: string;
  name: string;
  slug: string;
  base_price: number | string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
};

export type JerseyMaterial = {
  id?: string;
  name: string;
  slug: string;
  price_adjustment: number | string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
};

export type JerseyCollarGroup = {
  id?: string;
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: boolean;
};

export type JerseyCollar = {
  id?: string;
  group_id?: string | null;
  group_name?: string | null;
  group_slug?: string | null;
  name: string;
  slug: string;
  price_adjustment: number | string;
  image_url?: string | null;
  icon_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type JerseyAddon = {
  id?: string;
  name: string;
  slug: string;
  price_adjustment: number | string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
};

export type JerseyRequiredService = {
  id?: string;
  service_id?: string | null;
  service_name: string;
  service_slug: string;
  is_active?: boolean;
  sort_order?: number;
};

export type JerseyConfiguratorSettings = {
  minimum_order_qty: number;
  price_formula?: string;
};

export type JerseyConfiguratorData = {
  packages: JerseyPackage[];
  materials: JerseyMaterial[];
  collarGroups: JerseyCollarGroup[];
  collars: JerseyCollar[];
  addons: JerseyAddon[];
  requiredServices: JerseyRequiredService[];
  settings: JerseyConfiguratorSettings;
};

export type PublicContent = {
  hero: HeroBanner;
  heroes: HeroBanner[];
  about: AboutContent;
  instagramBanner: InstagramBanner | null;
  pageHeroes: PageHeroContent[];
  categories: ServiceCategory[];
  productCategories: ProductCategory[];
  services: Service[];
  products: Product[];
  productFilters: ProductFilter[];
  homepageSections: HomepageSection[];
  landingSettings: LandingPageSettings;
  landingSections: LandingSection[];
  campaignBanners: CmsBanner[];
  jerseySections: CmsBanner[];
  stores: Store[];
  orderSteps: OrderStep[];
  trustAbout: TrustAboutContent;
  testimonials: Testimonial[];
  contact: ContactSettings;
  jerseyConfigurator: JerseyConfiguratorData;
};

// v1.1 ordering/PIM domain. Kept separate from the legacy CMS Product model.
export type LifecycleStatus = "active" | "inactive" | "archived";
export type VariantStatus = "active" | "inactive" | "out_of_stock";
export type SizeStatus = "active" | "inactive";
export type ImageRole = "front" | "back" | "detail" | "lifestyle";

export type PimProduct = {
  id: string;
  name: string;
  slug: string;
  productCategoryId: string;
  category: PimProductCategory | null;
  basePrice: number;
  description: string | null;
  status: "draft" | "active" | "archived";
  sku: string | null;
  variants: PimProductVariant[];
  priceTiers: ProductPriceTier[];
  minimumRule: ProductMinimumRule | null;
};

export type PimProductCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "inactive";
  sortOrder: number;
};

export type ProductPriceTier = {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number | null;
  quoteRequired: boolean;
  status: LifecycleStatus;
  sortOrder: number;
};

export type ProductMinimumRule = {
  id: string;
  productId: string;
  minimumQuantity: number;
  minimumForTierQuantity: number | null;
  quotationQuantity: number | null;
  status: LifecycleStatus;
};

export type ProductSize = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  status: SizeStatus;
  priceAdjustment: number;
};

export type PimProductVariant = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  hexCode: string;
  sku: string;
  sortOrder: number;
  isDefault: boolean;
  status: VariantStatus;
  priceAdjustment: number;
  images: PimProductVariantImage[];
  sizes: PimProductVariantSize[];
};

export type PimProductVariantImage = {
  id: string;
  variantId: string;
  imageUrl: string;
  imageRole: ImageRole;
  sortOrder: number;
  altText: string | null;
};

export type PimProductVariantSize = {
  id: string;
  variantId: string;
  sizeId: string;
  sku: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: VariantStatus;
  size: ProductSize;
};

export type ServicePricingType =
  | "fixed_per_item"
  | "fixed_per_order"
  | "tiered"
  | "estimated"
  | "manual_quote";

export type ServicePricingRule = {
  id: string;
  serviceId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number | null;
  flatPrice: number | null;
  quoteRequired: boolean;
  status: LifecycleStatus;
  sortOrder: number;
};

export type CustomService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: LifecycleStatus;
  pricingType: ServicePricingType;
  basePrice: number;
  estimatedMinPrice: number | null;
  estimatedMaxPrice: number | null;
  minimumQuantity: number;
  maximumQuantity: number | null;
  requiresUpload: boolean;
  requiresNotes: boolean;
  requiresReview: boolean;
  allowedFileTypes: string[];
  isStackable: boolean;
  exclusiveGroup: string | null;
  sortOrder: number;
  pricingRules?: ServicePricingRule[];
};

export type CustomerUploadRef = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  signed_url?: string;
  status: "uploaded" | "linked" | "deleted";
};

export type ServiceAllocation = {
  service_id: string;
  service_slug: string;
  service_name: string;
  quantity: number;
  pricing_type: ServicePricingType;
  unit_price: number | null;
  flat_price: number | null;
  estimated_min_price: number | null;
  estimated_max_price: number | null;
  quote_required: boolean;
  note?: string;
};

export type CartItem = {
  product_id: string;
  product_variant_id: string;
  product_variant_size_id: string;
  nama_produk: string;
  product_slug: string;
  warna: string;
  color_slug: string;
  hex_code: string;
  ukuran: string;
  sku: string;
  quantity: number;
  base_price: number;
  variant_price_adjustment: number;
  size_price_adjustment: number;
  unit_price: number;
  thumbnail: string | null;
  stock_snapshot: number;
  added_at: string;
  services?: ServiceAllocation[];
  line_note?: string;
  requires_review?: boolean;
  price_tier?: {
    tier_id: string;
    min_quantity: number;
    max_quantity: number | null;
    unit_price: number | null;
    quote_required: boolean;
  } | null;
  upload_refs?: CustomerUploadRef[];
  estimated_service_total?: number;
  final_service_total?: number;
};

export type CartState = { version: 1; items: CartItem[]; updated_at: string };
export type ValidationIssue = { field: string; message: string; severity: "error" | "warning" };
export type RevalidationInput = {
  product_variant_size_id: string;
  quantity: number;
  unit_price: number;
  product_id?: string;
  price_tier_id: string | null;
};
export type RevalidationResult = {
  product_variant_size_id: string;
  status: "ok" | "unavailable" | "stock_changed" | "price_changed";
  latest_unit_price: number | null;
  stock_available: number;
  message: string | null;
};

export type ProductConfigurationSnapshot = {
  product_id: string;
  product_slug: string;
  product_name: string;
  items: CartItem[];
  note: string;
  upload_refs: CustomerUploadRef[];
  total_quantity: number;
  estimated_product_total: number;
  estimated_service_total: number;
  estimated_grand_total: number;
  requires_review: boolean;
  created_at: string;
  updated_at: string;
};

export type QuotationStatus = "draft" | "submitted" | "reviewing" | "quoted" | "expired" | "cancelled";
export type QuotationDraftListItem = {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  contactName: string | null;
  contactWhatsapp: string | null;
  totalQuantity: number;
  finalTotal: number;
  estimatedTotal: number;
  requiresReview: boolean;
  configurationSnapshot: ProductConfigurationSnapshot;
  createdAt: string;
  updatedAt: string;
};
