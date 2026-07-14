import type {
  CartItem,
  CustomService,
  PimProduct as Product,
  ProductMinimumRule,
  ProductPriceTier,
  PimProductVariant as ProductVariant,
  PimProductVariantSize as ProductVariantSize,
  ServiceAllocation,
  ValidationIssue
} from "@/lib/types";
import { calculateUnitPrice } from "@/lib/product-utils";

export const defaultCustomServices: CustomService[] = [
  {
    id: "svc-sablon-dtf",
    slug: "sablon-dtf",
    name: "Sablon DTF",
    description: "Aplikasi desain full color untuk kaos dan merchandise.",
    status: "active",
    pricingType: "estimated",
    basePrice: 18000,
    estimatedMinPrice: 15000,
    estimatedMaxPrice: 35000,
    minimumQuantity: 1,
    maximumQuantity: null,
    requiresUpload: true,
    requiresNotes: true,
    requiresReview: true,
    allowedFileTypes: ["png", "jpg", "jpeg", "pdf", "svg", "ai", "eps", "zip"],
    isStackable: false,
    exclusiveGroup: "print-method",
    sortOrder: 10
  },
  {
    id: "svc-bordir-komputer",
    slug: "bordir-komputer",
    name: "Bordir Komputer",
    description: "Cocok untuk logo, nama tim, dan identitas brand premium.",
    status: "active",
    pricingType: "estimated",
    basePrice: 25000,
    estimatedMinPrice: 20000,
    estimatedMaxPrice: 50000,
    minimumQuantity: 1,
    maximumQuantity: null,
    requiresUpload: true,
    requiresNotes: true,
    requiresReview: true,
    allowedFileTypes: ["png", "jpg", "jpeg", "pdf", "svg", "ai", "eps", "zip"],
    isStackable: false,
    exclusiveGroup: "print-method",
    sortOrder: 20
  },
  {
    id: "svc-cetak-sublim",
    slug: "cetak-sublim",
    name: "Cetak Sublim",
    description: "Cetak sublim untuk jersey dan apparel berbahan polyester.",
    status: "active",
    pricingType: "estimated",
    basePrice: 25000,
    estimatedMinPrice: 20000,
    estimatedMaxPrice: 60000,
    minimumQuantity: 1,
    maximumQuantity: null,
    requiresUpload: true,
    requiresNotes: true,
    requiresReview: true,
    allowedFileTypes: ["png", "jpg", "jpeg", "pdf", "zip"],
    isStackable: false,
    exclusiveGroup: "print-method",
    sortOrder: 30
  },
  {
    id: "svc-logo",
    slug: "tambah-logo",
    name: "Tambah Logo",
    description: "Logo tambahan pada posisi tertentu.",
    status: "active",
    pricingType: "fixed_per_item",
    basePrice: 8000,
    estimatedMinPrice: null,
    estimatedMaxPrice: null,
    minimumQuantity: 1,
    maximumQuantity: null,
    requiresUpload: true,
    requiresNotes: true,
    requiresReview: false,
    allowedFileTypes: ["png", "jpg", "jpeg", "pdf", "svg", "ai", "eps", "zip"],
    isStackable: true,
    exclusiveGroup: null,
    sortOrder: 40
  },
  {
    id: "svc-nama",
    slug: "tambah-nama",
    name: "Tambah Nama",
    description: "Nama individual untuk tiap item.",
    status: "active",
    pricingType: "fixed_per_item",
    basePrice: 12000,
    estimatedMinPrice: null,
    estimatedMaxPrice: null,
    minimumQuantity: 1,
    maximumQuantity: null,
    requiresUpload: false,
    requiresNotes: true,
    requiresReview: false,
    allowedFileTypes: ["png", "jpg", "jpeg", "pdf"],
    isStackable: true,
    exclusiveGroup: null,
    sortOrder: 50
  },
  {
    id: "svc-nomor",
    slug: "tambah-nomor",
    name: "Tambah Nomor",
    description: "Nomor punggung atau penanda unit.",
    status: "active",
    pricingType: "fixed_per_item",
    basePrice: 15000,
    estimatedMinPrice: null,
    estimatedMaxPrice: null,
    minimumQuantity: 1,
    maximumQuantity: null,
    requiresUpload: false,
    requiresNotes: true,
    requiresReview: false,
    allowedFileTypes: ["png", "jpg", "jpeg", "pdf"],
    isStackable: true,
    exclusiveGroup: null,
    sortOrder: 60
  },
  {
    id: "svc-packaging",
    slug: "packaging-khusus",
    name: "Packaging Khusus",
    description: "Kemasan terpisah untuk event, komunitas, atau corporate gift.",
    status: "active",
    pricingType: "fixed_per_order",
    basePrice: 35000,
    estimatedMinPrice: null,
    estimatedMaxPrice: null,
    minimumQuantity: 1,
    maximumQuantity: null,
    requiresUpload: false,
    requiresNotes: false,
    requiresReview: false,
    allowedFileTypes: ["png", "jpg", "jpeg", "pdf"],
    isStackable: true,
    exclusiveGroup: null,
    sortOrder: 70
  }
];

export interface BulkPricingSummary {
  totalQuantity: number;
  tier: ProductPriceTier | null;
  nextTier: ProductPriceTier | null;
  minimumRule: ProductMinimumRule | null;
  issues: ValidationIssue[];
  estimatedProductTotal: number;
  estimatedServiceTotal: number;
  estimatedGrandTotal: number;
  requiresReview: boolean;
}

export function getActivePriceTiers(product: Product): ProductPriceTier[] {
  return getActivePriceTiersFromList(product.priceTiers ?? []);
}

export function getActivePriceTiersFromList(
  tiers: ProductPriceTier[]
): ProductPriceTier[] {
  return tiers
    .filter((tier) => tier.status === "active")
    .sort((a, b) => a.minQuantity - b.minQuantity || a.sortOrder - b.sortOrder);
}

export function getActiveMinimumRule(
  product: Product
): ProductMinimumRule | null {
  return product.minimumRule?.status === "active" ? product.minimumRule : null;
}

export function getProductTotalQuantity(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function resolveProductPriceTier(
  product: Product,
  totalQuantity: number
): ProductPriceTier | null {
  return resolvePriceTier(product.priceTiers ?? [], totalQuantity);
}

export function resolvePriceTier(
  tiers: ProductPriceTier[],
  totalQuantity: number
): ProductPriceTier | null {
  const activeTiers = getActivePriceTiersFromList(tiers);
  return (
    activeTiers.find(
      (tier) =>
        totalQuantity >= tier.minQuantity &&
        (tier.maxQuantity === null || totalQuantity <= tier.maxQuantity)
    ) ?? null
  );
}

export function getNextPriceTier(
  product: Product,
  totalQuantity: number
): ProductPriceTier | null {
  return (
    getActivePriceTiers(product).find(
      (tier) => tier.minQuantity > totalQuantity
    ) ?? null
  );
}

export function calculateTieredUnitPrice(
  product: Product,
  variant: ProductVariant,
  variantSize: ProductVariantSize,
  totalQuantity: number
): number {
  const tier = resolveProductPriceTier(product, totalQuantity);
  const tierBasePrice = tier?.unitPrice ?? product.basePrice;
  return tierBasePrice + variant.priceAdjustment + getVariantSizeAdjustment(variantSize);
}

export function applyProductTierToItems(
  product: Product,
  items: CartItem[]
): CartItem[] {
  const totalQuantity = getProductTotalQuantity(items);
  const tier = resolveProductPriceTier(product, totalQuantity);
  const tierBasePrice = tier?.unitPrice ?? product.basePrice;
  const tierSnapshot = tier
    ? {
        tier_id: tier.id,
        min_quantity: tier.minQuantity,
        max_quantity: tier.maxQuantity,
        unit_price: tier.unitPrice,
        quote_required: tier.quoteRequired
      }
    : null;

  return items.map((item) => ({
    ...item,
    unit_price:
      tier?.quoteRequired && tier.unitPrice === null
        ? item.unit_price
        : tierBasePrice + item.variant_price_adjustment + item.size_price_adjustment,
    price_tier: tierSnapshot,
    requires_review: Boolean(item.requires_review || tier?.quoteRequired)
  }));
}

export function validateMinimumOrder(
  product: Product,
  totalQuantity: number
): ValidationIssue[] {
  const rule = getActiveMinimumRule(product);

  if (!rule || totalQuantity >= rule.minimumQuantity) {
    return [];
  }

  return [
    {
      field: "minimum_quantity",
      message: `Minimum order untuk produk ini ${rule.minimumQuantity} pcs.`,
      severity: "error"
    }
  ];
}

export function createServiceAllocation(
  service: CustomService,
  itemQuantity: number,
  note?: string
): ServiceAllocation {
  const quantity = Math.max(service.minimumQuantity, itemQuantity);
  const tieredRule =
    service.pricingRules
      ?.filter((rule) => rule.status === "active")
      .sort((a, b) => a.minQuantity - b.minQuantity || a.sortOrder - b.sortOrder)
      .find(
        (rule) =>
          quantity >= rule.minQuantity &&
          (rule.maxQuantity === null || quantity <= rule.maxQuantity)
      ) ?? null;

  if (service.pricingType === "manual_quote") {
    return createQuoteAllocation(service, quantity, note);
  }

  if (service.pricingType === "estimated") {
    return {
      ...createQuoteAllocation(service, quantity, note),
      estimated_min_price: service.estimatedMinPrice,
      estimated_max_price: service.estimatedMaxPrice
    };
  }

  if (service.pricingType === "fixed_per_order") {
    return {
      service_id: service.id,
      service_slug: service.slug,
      service_name: service.name,
      pricing_type: service.pricingType,
      quantity: 1,
      unit_price: null,
      flat_price: service.basePrice,
      estimated_min_price: null,
      estimated_max_price: null,
      quote_required: service.requiresReview,
      note
    };
  }

  if (service.pricingType === "tiered" && tieredRule) {
    return {
      service_id: service.id,
      service_slug: service.slug,
      service_name: service.name,
      pricing_type: service.pricingType,
      quantity,
      unit_price: tieredRule.unitPrice,
      flat_price: tieredRule.flatPrice,
      estimated_min_price: null,
      estimated_max_price: null,
      quote_required: tieredRule.quoteRequired || service.requiresReview,
      note
    };
  }

  return {
    service_id: service.id,
    service_slug: service.slug,
    service_name: service.name,
    pricing_type: service.pricingType,
    quantity,
    unit_price: service.basePrice,
    flat_price: null,
    estimated_min_price: null,
    estimated_max_price: null,
    quote_required: service.requiresReview,
    note
  };
}

export function validateServiceSelections(
  selectedServices: CustomService[],
  totalQuantity: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const service of selectedServices) {
    if (service.maximumQuantity !== null && totalQuantity > service.maximumQuantity) {
      issues.push({
        field: service.slug,
        message: `${service.name} maksimal untuk ${service.maximumQuantity} pcs.`,
        severity: "error"
      });
    }
  }

  return issues;
}

export function validateServiceQuantityInputs(
  selectedServices: CustomService[],
  totalQuantity: number,
  serviceQuantities: Record<string, number>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const exclusiveQuantityByGroup = new Map<string, number>();

  for (const service of selectedServices) {
    if (service.pricingType === "fixed_per_order") {
      continue;
    }

    const requestedQuantity = serviceQuantities[service.slug] ?? totalQuantity;

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      issues.push({
        field: service.slug,
        message: `Quantity layanan ${service.name} wajib minimal 1 pcs.`,
        severity: "error"
      });
      continue;
    }

    if (requestedQuantity > totalQuantity) {
      issues.push({
        field: service.slug,
        message: `Quantity layanan ${service.name} melebihi total item.`,
        severity: "error"
      });
    }

    if (service.exclusiveGroup && !service.isStackable) {
      exclusiveQuantityByGroup.set(
        service.exclusiveGroup,
        (exclusiveQuantityByGroup.get(service.exclusiveGroup) ?? 0) +
          requestedQuantity
      );
    }
  }

  for (const [group, quantity] of exclusiveQuantityByGroup.entries()) {
    if (quantity > totalQuantity) {
      issues.push({
        field: group,
        message: "Total quantity layanan eksklusif melebihi total item.",
        severity: "error"
      });
    }
  }

  return issues;
}

export function getServiceEstimateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const services = item.services ?? [];
    const serviceTotal = services.reduce((serviceSum, service) => {
      const unitTotal =
        service.unit_price === null ? 0 : service.unit_price * service.quantity;
      return serviceSum + unitTotal + (service.flat_price ?? 0);
    }, 0);
    return sum + serviceTotal;
  }, 0);
}

export function getProductEstimateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

export function summarizeBulkOrder(
  product: Product,
  items: CartItem[]
): BulkPricingSummary {
  const totalQuantity = getProductTotalQuantity(items);
  const estimatedProductTotal = getProductEstimateTotal(items);
  const estimatedServiceTotal = getServiceEstimateTotal(items);
  const minimumIssues = validateMinimumOrder(product, totalQuantity);

  return {
    totalQuantity,
    tier: resolveProductPriceTier(product, totalQuantity),
    nextTier: getNextPriceTier(product, totalQuantity),
    minimumRule: getActiveMinimumRule(product),
    issues: minimumIssues,
    estimatedProductTotal,
    estimatedServiceTotal,
    estimatedGrandTotal: estimatedProductTotal + estimatedServiceTotal,
    requiresReview: items.some(
      (item) =>
        item.requires_review ||
        item.services?.some((service) => service.quote_required)
    )
  };
}

function createQuoteAllocation(
  service: CustomService,
  quantity: number,
  note?: string
): ServiceAllocation {
  return {
    service_id: service.id,
    service_slug: service.slug,
    service_name: service.name,
    pricing_type: service.pricingType,
    quantity,
    unit_price: null,
    flat_price: null,
    estimated_min_price: null,
    estimated_max_price: null,
    quote_required: true,
    note
  };
}

function getVariantSizeAdjustment(variantSize: ProductVariantSize): number {
  return variantSize.priceAdjustment + variantSize.size.priceAdjustment;
}
