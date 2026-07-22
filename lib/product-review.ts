import type {
  ProductImageRole,
  ProductLifecycle,
  ProductManagerCapabilities,
  ProductVariantStatus
} from "@/lib/product-manager";
import type {
  ProductColorType,
  ProductSwatchDirection
} from "@/lib/product-variants";

export const PRODUCT_REVIEW_GROUP_DEFINITIONS = [
  { key: "information", label: "Informasi", module: "information" },
  { key: "variants", label: "Varian", module: "variants" },
  { key: "sku_sizes", label: "SKU dan ukuran", module: "variants" },
  { key: "pricing", label: "Harga", module: "inventory" },
  { key: "stock", label: "Stok", module: "inventory" },
  { key: "media", label: "Media", module: "media" },
  { key: "seo", label: "SEO", module: "information" },
  { key: "publish", label: "Publish readiness", module: "review" }
] as const;

export type ProductReviewGroupKey =
  (typeof PRODUCT_REVIEW_GROUP_DEFINITIONS)[number]["key"];
export type ProductReviewSeverity = "error" | "warning";
export type ProductReviewAction = "publish" | "archive";

export type ProductReviewSellable = {
  id: string;
  sku: string | null;
  sizeId: string | null;
  sizeName: string;
  sizeActive: boolean;
  stockQuantity: number | null;
  priceAdjustment: number | null;
  status: ProductVariantStatus;
  duplicateSku: boolean;
  updatedAt: string | null;
};

export type ProductReviewVariant = {
  id: string;
  name: string;
  slug: string;
  status: ProductVariantStatus;
  colorType: ProductColorType;
  primaryHex: string | null;
  secondaryHex: string | null;
  tertiaryHex: string | null;
  swatchDirection: ProductSwatchDirection;
  patternImageUrl: string | null;
  colorHex: string | null;
  priceAdjustment: number | null;
  imageRoles: ProductImageRole[];
  hasFrontImage: boolean;
  updatedAt: string | null;
  sellable: ProductReviewSellable[];
};

export type ProductReviewSnapshot = {
  id: string;
  name: string;
  slug: string;
  status: ProductLifecycle;
  productCategoryId: string | null;
  categoryActive: boolean;
  duplicateSlug: boolean;
  basePrice: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string | null;
  variants: ProductReviewVariant[];
};

export type ProductReviewIssue = {
  code: string;
  field: string;
  message: string;
  severity: ProductReviewSeverity;
  group: ProductReviewGroupKey;
  productId: string;
  variantId: string | null;
  sellableId: string | null;
  sku: string | null;
  href: string;
};

export type ProductReviewIssueSummary = {
  code: string;
  message: string;
  severity: ProductReviewSeverity;
  count: number;
  affected: Array<{
    label: string;
    href: string;
    variantId: string | null;
    sellableId: string | null;
    sku: string | null;
  }>;
};

export type ProductReviewGroup = {
  key: ProductReviewGroupKey;
  label: string;
  module: "information" | "variants" | "inventory" | "media" | "review";
  status: "ready" | "warning" | "blocked";
  blockerCount: number;
  warningCount: number;
  issueCount: number;
  summaries: ProductReviewIssueSummary[];
  issues: ProductReviewIssue[];
};

export type ProductReviewPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  product: {
    id: string;
    name: string;
    slug: string;
    status: ProductLifecycle;
    updatedAt: string | null;
  };
  reviewVersion: string;
  counts: {
    variants: number;
    activeVariants: number;
    sellableSkus: number;
    activeSellableSkus: number;
    images: number;
    blockers: number;
    warnings: number;
  };
  groups: ProductReviewGroup[];
  issues: ProductReviewIssue[];
  canPublishNow: boolean;
  canArchiveNow: boolean;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_PATTERN = /^#[0-9A-F]{6}$/;
const RECOMMENDED_MEDIA_ROLES: ProductImageRole[] = ["back", "detail", "lifestyle"];

export function buildProductReviewPayload(input: {
  role: string;
  capabilities: ProductManagerCapabilities;
  snapshot: ProductReviewSnapshot;
  reviewVersion?: string;
}): ProductReviewPayload {
  const issues = validateProductReviewSnapshot(input.snapshot);
  const blockers = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - blockers;
  const groups = decoratePublishReadinessGroup(
    groupProductReviewIssues(issues),
    input.snapshot,
    blockers
  );
  const activeVariants = input.snapshot.variants.filter((variant) => variant.status === "active");
  const sellable = input.snapshot.variants.flatMap((variant) => variant.sellable);
  const activeSellable = sellable.filter((row) => row.status === "active");
  const images = input.snapshot.variants.reduce((total, variant) => total + variant.imageRoles.length, 0);

  return {
    role: input.role,
    capabilities: input.capabilities,
    product: {
      id: input.snapshot.id,
      name: input.snapshot.name,
      slug: input.snapshot.slug,
      status: input.snapshot.status,
      updatedAt: input.snapshot.updatedAt
    },
    reviewVersion: input.reviewVersion || createProductReviewVersion(input.snapshot),
    counts: {
      variants: input.snapshot.variants.length,
      activeVariants: activeVariants.length,
      sellableSkus: sellable.length,
      activeSellableSkus: activeSellable.length,
      images,
      blockers,
      warnings
    },
    groups,
    issues,
    canPublishNow: Boolean(
      input.capabilities.canPublish &&
      input.snapshot.status === "draft" &&
      blockers === 0
    ),
    canArchiveNow: Boolean(
      input.capabilities.canArchive && input.snapshot.status === "active"
    )
  };
}

export function validateProductReviewSnapshot(
  snapshot: ProductReviewSnapshot
): ProductReviewIssue[] {
  const issues: ProductReviewIssue[] = [];
  const push = (issue: Omit<ProductReviewIssue, "productId" | "href">) => {
    issues.push({
      ...issue,
      productId: snapshot.id,
      href: buildProductReviewDeepLink({
        productId: snapshot.id,
        group: issue.group,
        field: issue.field,
        variantId: issue.variantId,
        sellableId: issue.sellableId,
        sku: issue.sku
      })
    });
  };

  if (!snapshot.name.trim()) {
    push(issue("information.name", "name", "Nama produk wajib diisi.", "information"));
  }
  if (!SLUG_PATTERN.test(snapshot.slug)) {
    push(issue("information.slug_invalid", "slug", "Slug wajib memakai format kebab-case.", "information"));
  }
  if (snapshot.duplicateSlug) {
    push(issue("information.slug_duplicate", "slug", "Slug sudah dipakai produk lain.", "information"));
  }
  if (!snapshot.productCategoryId || !snapshot.categoryActive) {
    push(issue(
      "information.category_inactive",
      "product_category_id",
      "Kategori produk tidak valid atau tidak aktif.",
      "information"
    ));
  }

  if (!integerAtLeastZero(snapshot.basePrice)) {
    push(issue(
      "pricing.base_price",
      "base_price",
      "Harga dasar wajib berupa integer dan tidak boleh negatif.",
      "pricing"
    ));
  }

  if (!snapshot.seoTitle?.trim()) {
    push(issue(
      "seo.title_missing",
      "seo_title",
      "SEO title belum diisi.",
      "seo",
      "warning"
    ));
  }
  if (!snapshot.seoDescription?.trim()) {
    push(issue(
      "seo.description_missing",
      "seo_description",
      "SEO description belum diisi.",
      "seo",
      "warning"
    ));
  }

  const activeVariants = snapshot.variants.filter((variant) => variant.status === "active");
  if (!activeVariants.length) {
    push(issue(
      "variants.none_active",
      "variants",
      "Minimal satu varian warna aktif wajib tersedia.",
      "variants"
    ));
  }

  for (const variant of activeVariants) {
    const identity = { variantId: variant.id, sellableId: null, sku: null };
    if (!variant.name.trim()) {
      push(issue(
        "variants.name_missing",
        `variant.${variant.id}.name`,
        "Nama varian warna wajib diisi.",
        "variants",
        "error",
        identity
      ));
    }
    if (!SLUG_PATTERN.test(variant.slug)) {
      push(issue(
        "variants.slug_invalid",
        `variant.${variant.id}.slug`,
        "Slug varian warna wajib memakai format kebab-case.",
        "variants",
        "error",
        identity
      ));
    }

    const primary = normalizedHex(variant.primaryHex) || normalizedHex(variant.colorHex);
    if (variant.colorType === "solid" && !primary) {
      push(issue(
        "variants.solid_color_invalid",
        `variant.${variant.id}.color`,
        "Solid color wajib memiliki primary HEX atau fallback color HEX yang valid.",
        "variants",
        "error",
        identity
      ));
    }
    if (variant.colorType === "combination") {
      if (!primary || !normalizedHex(variant.secondaryHex)) {
        push(issue(
          "variants.combination_color_invalid",
          `variant.${variant.id}.color`,
          "Combination color wajib memiliki warna primary dan secondary yang valid.",
          "variants",
          "error",
          identity
        ));
      }
      if (!(["diagonal", "horizontal", "vertical"] as string[]).includes(variant.swatchDirection)) {
        push(issue(
          "variants.swatch_direction_invalid",
          `variant.${variant.id}.swatch_direction`,
          "Arah swatch combination color tidak valid.",
          "variants",
          "error",
          identity
        ));
      }
    }
    if (
      variant.colorType === "pattern" &&
      !safeHttpUrl(variant.patternImageUrl) &&
      !primary
    ) {
      push(issue(
        "variants.pattern_color_invalid",
        `variant.${variant.id}.pattern`,
        "Pattern color wajib memiliki pattern image atau fallback HEX yang valid.",
        "variants",
        "error",
        identity
      ));
    }

    if (!Number.isInteger(variant.priceAdjustment)) {
      push(issue(
        "pricing.variant_adjustment",
        `variant.${variant.id}.price_adjustment`,
        "Penyesuaian harga varian wajib berupa integer.",
        "pricing",
        "error",
        identity
      ));
    }

    const activeRows = variant.sellable.filter((row) => row.status === "active");
    if (!activeRows.length) {
      push(issue(
        "sku_sizes.none_active",
        `variant.${variant.id}.sizes`,
        "Varian aktif wajib memiliki minimal satu SKU ukuran aktif.",
        "sku_sizes",
        "error",
        identity
      ));
    }

    if (!variant.hasFrontImage) {
      push(issue(
        "media.front_missing",
        `variant.${variant.id}.images`,
        "Varian aktif wajib memiliki Front image.",
        "media",
        "error",
        identity
      ));
    }
    const missingRecommended = RECOMMENDED_MEDIA_ROLES.filter(
      (role) => !variant.imageRoles.includes(role)
    );
    if (missingRecommended.length) {
      push(issue(
        "media.recommended_missing",
        `variant.${variant.id}.recommended_images`,
        `Slot ${missingRecommended.map(mediaRoleLabel).join(", ")} belum dilengkapi.`,
        "media",
        "warning",
        identity
      ));
    }

    for (const row of activeRows) {
      const target = {
        variantId: variant.id,
        sellableId: row.id,
        sku: row.sku
      };
      if (!row.sku?.trim()) {
        push(issue(
          "sku_sizes.sku_missing",
          `variant_size.${row.id}.sku`,
          "SKU siap jual wajib diisi.",
          "sku_sizes",
          "error",
          target
        ));
      } else if (row.duplicateSku) {
        push(issue(
          "sku_sizes.sku_duplicate",
          `variant_size.${row.id}.sku`,
          "SKU siap jual duplikat.",
          "sku_sizes",
          "error",
          target
        ));
      }
      if (!row.sizeId || !row.sizeActive) {
        push(issue(
          "sku_sizes.size_inactive",
          `variant_size.${row.id}.size_id`,
          "SKU wajib memakai size master aktif.",
          "sku_sizes",
          "error",
          target
        ));
      }
      if (!Number.isInteger(row.priceAdjustment)) {
        push(issue(
          "pricing.sku_adjustment",
          `variant_size.${row.id}.price_adjustment`,
          "Penyesuaian harga SKU wajib berupa integer.",
          "pricing",
          "error",
          target
        ));
      }
      if (!integerAtLeastZero(row.stockQuantity)) {
        push(issue(
          "stock.invalid",
          `variant_size.${row.id}.stock_quantity`,
          "Stok wajib berupa integer dan tidak boleh negatif.",
          "stock",
          "error",
          target
        ));
      }
    }
  }

  return deduplicateIssues(issues);
}

export function groupProductReviewIssues(
  issues: ProductReviewIssue[]
): ProductReviewGroup[] {
  return PRODUCT_REVIEW_GROUP_DEFINITIONS.map((definition) => {
    const groupIssues = issues.filter((issue) => issue.group === definition.key);
    const blockerCount = groupIssues.filter((issue) => issue.severity === "error").length;
    const warningCount = groupIssues.length - blockerCount;
    const summaryMap = new Map<string, ProductReviewIssueSummary>();

    for (const current of groupIssues) {
      const key = `${current.code}|${current.message}|${current.severity}`;
      const existing = summaryMap.get(key) || {
        code: current.code,
        message: current.message,
        severity: current.severity,
        count: 0,
        affected: []
      };
      existing.count += 1;
      existing.affected.push({
        label: affectedLabel(current),
        href: current.href,
        variantId: current.variantId,
        sellableId: current.sellableId,
        sku: current.sku
      });
      summaryMap.set(key, existing);
    }

    return {
      ...definition,
      status: blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready",
      blockerCount,
      warningCount,
      issueCount: groupIssues.length,
      summaries: [...summaryMap.values()],
      issues: groupIssues
    };
  });
}

function decoratePublishReadinessGroup(
  groups: ProductReviewGroup[],
  snapshot: ProductReviewSnapshot,
  blockers: number
) {
  const publish = groups.find((group) => group.key === "publish");
  if (!publish) return groups;
  if (blockers > 0) {
    publish.status = "blocked";
    publish.blockerCount = blockers;
    publish.issueCount = blockers;
    publish.summaries = [{
      code: "publish.blocked_summary",
      message: "Selesaikan blocker pada kelompok readiness sebelum Publish.",
      severity: "error",
      count: blockers,
      affected: [{
        label: "Lihat kelompok bermasalah",
        href: `/admin/products/${encodeURIComponent(snapshot.id)}/review#publish-readiness`,
        variantId: null,
        sellableId: null,
        sku: null
      }]
    }];
    return groups;
  }
  if (snapshot.status === "active" || snapshot.status === "archived") {
    publish.status = "warning";
    publish.warningCount = 1;
    publish.issueCount = 1;
    publish.summaries = [{
      code: `publish.lifecycle_${snapshot.status}`,
      message: snapshot.status === "active"
        ? "Produk sudah Active; Publish ulang tidak tersedia."
        : "Produk Archived tidak dapat langsung dipublish pada WP-07.",
      severity: "warning",
      count: 1,
      affected: [{
        label: "Lihat lifecycle",
        href: `/admin/products/${encodeURIComponent(snapshot.id)}/review#publish-readiness`,
        variantId: null,
        sellableId: null,
        sku: null
      }]
    }];
  }
  return groups;
}

export function validateProductReviewTransition(input: {
  action: ProductReviewAction;
  payload: ProductReviewPayload;
}) {
  if (input.action === "publish") {
    if (!input.payload.capabilities.canPublish) {
      return "Publish hanya tersedia untuk Owner atau Super Admin.";
    }
    if (input.payload.product.status !== "draft") {
      return "Publish hanya dapat mengubah Draft menjadi Active.";
    }
    if (input.payload.counts.blockers > 0) {
      return "Produk masih memiliki blocker Publish.";
    }
    return null;
  }
  if (!input.payload.capabilities.canArchive) {
    return "Archive hanya tersedia untuk Owner atau Super Admin.";
  }
  if (input.payload.product.status !== "active") {
    return "Archive hanya dapat mengubah Active menjadi Archived.";
  }
  return null;
}

export function createProductReviewVersion(snapshot: ProductReviewSnapshot) {
  const canonical = JSON.stringify({
    product: [
      snapshot.id,
      snapshot.name,
      snapshot.slug,
      snapshot.status,
      snapshot.productCategoryId,
      snapshot.categoryActive,
      snapshot.duplicateSlug,
      snapshot.basePrice,
      snapshot.seoTitle,
      snapshot.seoDescription,
      snapshot.updatedAt
    ],
    variants: [...snapshot.variants]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((variant) => ({
        values: [
          variant.id,
          variant.name,
          variant.slug,
          variant.status,
          variant.colorType,
          variant.primaryHex,
          variant.secondaryHex,
          variant.tertiaryHex,
          variant.swatchDirection,
          variant.patternImageUrl,
          variant.colorHex,
          variant.priceAdjustment,
          variant.hasFrontImage,
          variant.updatedAt
        ],
        roles: [...variant.imageRoles].sort(),
        sellable: [...variant.sellable]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((row) => [
            row.id,
            row.sku,
            row.sizeId,
            row.sizeName,
            row.sizeActive,
            row.stockQuantity,
            row.priceAdjustment,
            row.status,
            row.duplicateSku,
            row.updatedAt
          ])
      }))
  });
  return `wp07-${fnv1a(canonical)}`;
}

export function buildProductReviewDeepLink(input: {
  productId: string;
  group: ProductReviewGroupKey;
  field: string;
  variantId?: string | null;
  sellableId?: string | null;
  sku?: string | null;
}) {
  const definition = PRODUCT_REVIEW_GROUP_DEFINITIONS.find(
    (item) => item.key === input.group
  ) || PRODUCT_REVIEW_GROUP_DEFINITIONS[7];
  const base = `/admin/products/${encodeURIComponent(input.productId)}/${definition.module}`;
  if (input.group === "publish") return `${base}#publish-readiness`;
  const params = new URLSearchParams({ from: "review", focus: input.field });
  if (input.variantId) params.set("variantId", input.variantId);
  if (input.sellableId) params.set("skuId", input.sellableId);
  if (input.sku) params.set("sku", input.sku);
  if (input.group === "seo") params.set("section", "seo");
  return `${base}?${params.toString()}`;
}

function issue(
  code: string,
  field: string,
  message: string,
  group: ProductReviewGroupKey,
  severity: ProductReviewSeverity = "error",
  target: {
    variantId: string | null;
    sellableId: string | null;
    sku: string | null;
  } = { variantId: null, sellableId: null, sku: null }
): Omit<ProductReviewIssue, "productId" | "href"> {
  return { code, field, message, group, severity, ...target };
}

function affectedLabel(issueValue: ProductReviewIssue) {
  if (issueValue.sku) return issueValue.sku;
  if (issueValue.sellableId) return `SKU ${shortId(issueValue.sellableId)}`;
  if (issueValue.variantId) return `Varian ${shortId(issueValue.variantId)}`;
  return "Buka modul";
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function mediaRoleLabel(role: ProductImageRole) {
  if (role === "back") return "Back";
  if (role === "detail") return "Detail";
  return "Lifestyle";
}

function integerAtLeastZero(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 0;
}

function normalizedHex(value: string | null | undefined) {
  const normalized = String(value || "").trim().toUpperCase();
  return HEX_PATTERN.test(normalized) ? normalized : null;
}

function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function deduplicateIssues(issues: ProductReviewIssue[]) {
  const seen = new Set<string>();
  return issues.filter((current) => {
    const key = [
      current.code,
      current.field,
      current.message,
      current.variantId,
      current.sellableId,
      current.sku
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
