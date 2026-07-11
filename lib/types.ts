export type ProductStatus = "draft" | "active" | "archived";
export type VariantStatus = "active" | "inactive" | "out_of_stock";
export type SizeStatus = "active" | "inactive";
export type ImageRole = "front" | "back" | "detail" | "lifestyle";
export type CustomServiceStatus = "active" | "inactive" | "archived";
export type ServicePricingType =
  | "fixed_per_item"
  | "fixed_per_order"
  | "tiered"
  | "estimated"
  | "manual_quote";
export type QuotationStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "quoted"
  | "expired"
  | "cancelled";
export type UploadStatus = "uploaded" | "linked" | "deleted";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: "active" | "inactive";
  sortOrder: number;
}

export interface ProductSize {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  status: SizeStatus;
  priceAdjustment: number;
}

export interface ProductVariantImage {
  id: string;
  variantId: string;
  imageUrl: string;
  imageRole: ImageRole;
  sortOrder: number;
  altText?: string | null;
}

export interface ProductVariantSize {
  id: string;
  variantId: string;
  sizeId: string;
  sku: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: VariantStatus;
  size: ProductSize;
}

export interface ProductVariant {
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
  images: ProductVariantImage[];
  sizes: ProductVariantSize[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  productCategoryId: string;
  category?: ProductCategory | null;
  basePrice: number;
  description?: string | null;
  status: ProductStatus;
  sku?: string | null;
  variants: ProductVariant[];
  priceTiers?: ProductPriceTier[];
  minimumRule?: ProductMinimumRule | null;
}

export interface ProductPriceTier {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number | null;
  quoteRequired: boolean;
  status: "active" | "inactive" | "archived";
  sortOrder: number;
}

export interface ProductMinimumRule {
  id: string;
  productId: string;
  minimumQuantity: number;
  minimumForTierQuantity: number | null;
  quotationQuantity: number | null;
  status: "active" | "inactive" | "archived";
}

export interface CustomService {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  status: CustomServiceStatus;
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
}

export interface ServicePricingRule {
  id: string;
  serviceId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number | null;
  flatPrice: number | null;
  quoteRequired: boolean;
  status: "active" | "inactive" | "archived";
  sortOrder: number;
}

export interface PriceTierSnapshot {
  tier_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number | null;
  quote_required: boolean;
}

export interface ServiceAllocation {
  service_id: string;
  service_slug: string;
  service_name: string;
  pricing_type: ServicePricingType;
  quantity: number;
  unit_price: number | null;
  flat_price: number | null;
  estimated_min_price: number | null;
  estimated_max_price: number | null;
  quote_required: boolean;
  note?: string;
}

export interface CustomerUploadRef {
  id?: string;
  file_name: string;
  storage_path?: string;
  mime_type: string;
  file_size: number;
  signed_url?: string;
  status?: UploadStatus;
}

export interface BulkMatrixCell {
  product_variant_id: string;
  product_variant_size_id: string;
  warna: string;
  ukuran: string;
  sku: string;
  stock_quantity: number;
  quantity: number;
}

export interface ProductConfigurationSnapshot {
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
}

export interface QuotationDraftSnapshot extends ProductConfigurationSnapshot {
  status: QuotationStatus;
}

export interface QuotationDraftListItem {
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
}

export interface CartItem {
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
  price_tier?: PriceTierSnapshot | null;
  line_note?: string;
  services?: ServiceAllocation[];
  upload_refs?: CustomerUploadRef[];
  estimated_service_total?: number;
  final_service_total?: number;
  requires_review?: boolean;
}

export interface CartState {
  version: 1;
  items: CartItem[];
  updated_at: string;
}

export interface RevalidationInput {
  product_variant_size_id: string;
  quantity: number;
  unit_price: number;
  product_id?: string;
  price_tier_id?: string | null;
}

export type RevalidationStatus =
  | "ok"
  | "price_changed"
  | "stock_changed"
  | "unavailable";

export interface RevalidationResult {
  product_variant_size_id: string;
  status: RevalidationStatus;
  latest_unit_price: number | null;
  stock_available: number;
  message: string | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}
