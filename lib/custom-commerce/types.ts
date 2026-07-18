import type {
  CustomerUploadRef,
  CustomService,
  PimProduct
} from "@/lib/types";

export type CustomEntryType = "project_builder" | "jersey_configurator";
export type CustomPriceDisplayMode = "final" | "estimated" | "quotation";
export type CustomFlowMode = "preset" | "free";
export type CustomPriceStatus = "final" | "estimated" | "quotation_required";

export type CustomCategory = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  entryType: CustomEntryType;
  targetRoute: string | null;
  supportsQuickCustom: boolean;
  supportsFullCustom: boolean;
  priceDisplayMode: CustomPriceDisplayMode;
  minimumOrderDisplay: string;
  leadTimeDisplay: string;
  sourceProductCategoryId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  updatedAt: string | null;
};

export type CustomPreset = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  mockupUrl: string | null;
  mockupAlt: string | null;
  defaultProductId: string | null;
  configurationDefaults: Record<string, unknown>;
  priceDisplayMode: CustomPriceDisplayMode | null;
  minimumOrderDisplay: string | null;
  leadTimeDisplay: string | null;
  sortOrder: number;
};

export type CustomPlacement = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  priceAdjustment: number;
  sortOrder: number;
};

export type CustomPrintSize = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  widthMm: number | null;
  heightMm: number | null;
  priceAdjustment: number;
  sortOrder: number;
};

export type CustomServiceCompatibility = {
  id: string;
  serviceId: string;
  categoryId: string | null;
  productId: string | null;
  placementId: string | null;
  printSizeId: string | null;
};

export type CustomPersonalizationRule = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  pricingType: "fixed_per_item" | "fixed_per_order" | "estimated" | "manual_quote";
  unitPrice: number | null;
  flatPrice: number | null;
  estimatedMinPrice: number | null;
  estimatedMaxPrice: number | null;
  quoteRequired: boolean;
  sortOrder: number;
};

export type CustomCatalog = {
  categories: CustomCategory[];
};

export type CustomCategoryCatalog = {
  category: CustomCategory;
  products: PimProduct[];
  presets: CustomPreset[];
  services: CustomService[];
  placements: CustomPlacement[];
  printSizes: CustomPrintSize[];
  compatibility: CustomServiceCompatibility[];
  personalizationRules: CustomPersonalizationRule[];
};

export type CustomVariantAllocation = {
  id: string;
  variantId: string;
  variantSizeId: string;
  variantName: string;
  colorHex: string;
  sizeName: string;
  sku: string;
  quantity: number;
  designPackageId: string | null;
};

export type CustomDesignService = {
  id: string;
  serviceId: string;
  placementId: string | null;
  printSizeId: string | null;
  note: string;
  uploadIds: string[];
};

export type CustomDesignPackage = {
  id: string;
  name: string;
  services: CustomDesignService[];
};

export type CustomPersonalization = {
  ruleId: string | null;
  mode: "same_for_all" | "per_item";
  sharedValue: string;
  entries: string[];
};

export type CustomProjectItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  productId: string;
  productName: string;
  productSlug: string;
  allocations: CustomVariantAllocation[];
  designPackages: CustomDesignPackage[];
  personalization: CustomPersonalization;
  uploads: CustomerUploadRef[];
  note: string;
  leadTime: string;
};

export type CustomProject = {
  version: 1;
  id: string;
  mode: CustomFlowMode;
  presetId: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sessionToken: string;
  items: CustomProjectItem[];
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomPricingLine = {
  key: string;
  label: string;
  displayLabel: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  kind: "product" | "service" | "placement" | "print_size" | "personalization";
  componentType: "product_base" | "method_fee" | "print_size" | "placement" | "personalization";
  sourceRuleId: string;
  calculationBasis: "pim_tier" | "per_item" | "per_order" | "estimated" | "quotation";
  allocationId?: string;
  designPackageId?: string;
  productId?: string;
  variantId?: string;
  variantSizeId?: string;
  sku?: string;
  serviceId?: string;
  serviceSlug?: string;
  serviceName?: string;
  pricingRuleId?: string;
  placementId?: string;
  placementName?: string;
  printSizeId?: string;
  printSizeName?: string;
};

export type CustomProjectPricing = {
  projectId: string;
  status: CustomPriceStatus;
  totalQuantity: number;
  finalTotal: number | null;
  estimatedMinTotal: number | null;
  estimatedMaxTotal: number | null;
  lines: CustomPricingLine[];
  issues: string[];
  pricedAt: string;
};

export type CustomProjectSnapshot = CustomProject & {
  pricing: CustomProjectPricing;
};

export type CustomCheckoutProject = {
  project: CustomProject;
  clientPricing?: CustomProjectPricing;
};
