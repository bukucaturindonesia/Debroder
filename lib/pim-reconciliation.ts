import { validateProductPublishSnapshot, type ProductPublishSnapshot } from "@/lib/product-manager";
import {
  hashPimPhase6Value,
  PIM_PHASE6_RULE_SET_VERSION,
  type PimPhase6ProductRow,
  type PimPhase6Snapshot,
  type PimPhase6VariantRootRow,
  type PimPhase6VariantRow
} from "@/lib/pim-phase6";

export type PimReconciliationSeverity = "PASS" | "WARNING" | "ERROR";
export type PimReconciliationLifecycle = "NEW" | "EXISTING" | "RESOLVED" | "NOT_EVALUATED";
export type PimReconciliationEvaluation = "EVALUATED" | "NOT_APPLICABLE" | "SKIPPED" | "FAILED";
export type PimReconciliationStatus = "PASS" | "WARNING" | "ERROR" | "INCOMPLETE";

export type PimReconciliationFinding = {
  fingerprint: string;
  issueCode: string;
  ruleVersion: string;
  severity: Exclude<PimReconciliationSeverity, "PASS">;
  lifecycle: PimReconciliationLifecycle;
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryName: string;
  productStatus: string;
  variantId: string | null;
  sku: string | null;
  field: string;
  currentValue: string | number | boolean | null;
  valueState: "VALUE" | "ZERO" | "NULL" | "EMPTY" | "NOT_APPLICABLE";
  message: string;
  recommendation: string;
  detectedAt: string;
  sourceLevel: "PRODUCT_ROOT" | "PRODUCT_COLOR" | "PRODUCT_VARIANT" | "DERIVED_READ_ONLY";
  editorDestination: "/admin/products" | "/admin/products/bulk-edit";
  evaluationStatus: PimReconciliationEvaluation;
  ruleAppliesTo: string;
};

export type PimReconciliationRule = {
  code: string;
  version: string;
  title: string;
  description: string;
  severity: "WARNING" | "ERROR";
  appliesTo: string;
  dataLevel: PimReconciliationFinding["sourceLevel"];
  recommendation: string;
  enabled: boolean;
  skipReason: string | null;
};

type RuleContext = {
  snapshot: PimPhase6Snapshot;
  products: Map<string, PimPhase6ProductRow>;
  variantRootsByProduct: Map<string, PimPhase6VariantRootRow[]>;
  variantsByProduct: Map<string, PimPhase6VariantRow[]>;
  detectedAt: string;
};

type ExecutableRule = PimReconciliationRule & {
  evaluate: (context: RuleContext) => PimReconciliationFinding[];
};

const VERSION = "1";
const PRODUCT_EDITOR = "/admin/products" as const;

export const PIM_RECONCILIATION_RULES: readonly ExecutableRule[] = [
  rule("PIM_PRODUCT_WITHOUT_VARIANT", "Produk tanpa color variant", "Product Root tidak memiliki color variant.", "ERROR", "all_product_types", "PRODUCT_ROOT", "Tambahkan variant melalui Variant Matrix.", productWithoutVariant),
  rule("PIM_PRODUCT_WITHOUT_ACTIVE_COLOR", "Produk tanpa warna aktif", "Produk tidak memiliki color variant aktif.", "ERROR", "all_product_types", "PRODUCT_COLOR", "Aktifkan atau tambahkan warna melalui Variant Matrix.", productWithoutActiveColor),
  rule("PIM_PRODUCT_WITHOUT_ACTIVE_VARIANT", "Produk tanpa variant aktif", "Produk tidak memiliki variant aktif.", "ERROR", "all_product_types", "PRODUCT_COLOR", "Periksa lifecycle variant melalui Variant Matrix.", productWithoutActiveVariant),
  rule("PIM_DUPLICATE_SKU", "SKU duplikat", "Sellable SKU digunakan lebih dari satu row canonical.", "ERROR", "sellable_sku", "PRODUCT_VARIANT", "Perbaiki SKU melalui Unified Product Workflow.", duplicateSku),
  rule("PIM_MISSING_SKU", "SKU kosong", "Sellable row tidak mempunyai SKU.", "ERROR", "sellable_sku", "PRODUCT_VARIANT", "Isi SKU melalui Unified Product Workflow.", missingSku),
  rule("PIM_DUPLICATE_SLUG", "Slug produk duplikat", "Slug Product Root tidak unik.", "ERROR", "product_root", "PRODUCT_ROOT", "Perbaiki slug melalui Unified Product Workflow.", duplicateSlug),
  rule("PIM_MISSING_SLUG", "Slug produk kosong", "Product Root tidak mempunyai slug.", "ERROR", "product_root", "PRODUCT_ROOT", "Isi slug melalui Unified Product Workflow.", missingSlug),
  rule("PIM_RESERVED_OR_INVALID_SLUG", "Slug produk tidak valid", "Slug tidak mengikuti lowercase kebab-case canonical.", "ERROR", "product_root", "PRODUCT_ROOT", "Perbaiki slug melalui Unified Product Workflow.", invalidSlug),
  rule("PIM_DUPLICATE_COLOR_SIZE", "Kombinasi warna dan ukuran duplikat", "Satu produk mempunyai kombinasi warna dan ukuran yang sama lebih dari sekali.", "ERROR", "sellable_sku", "PRODUCT_VARIANT", "Hapus duplikasi melalui Variant Matrix.", duplicateColorSize),
  rule("PIM_INVALID_COLOR_MASTER", "Referensi Color Master tidak valid", "Color variant tidak dapat direkonsiliasi dengan Color Master canonical.", "ERROR", "color_variant", "PRODUCT_COLOR", "Pilih ulang Color Master melalui Variant Matrix.", invalidColorMaster),
  rule("PIM_INVALID_SIZE_MASTER", "Referensi Size Master tidak valid", "Sellable SKU tidak mempunyai Size Master canonical.", "ERROR", "sellable_sku", "PRODUCT_VARIANT", "Pilih ulang Size Master melalui Variant Matrix.", invalidSizeMaster),
  rule("PIM_INACTIVE_COLOR_MASTER_IN_USE", "Color Master nonaktif masih digunakan", "Color Master nonaktif masih direferensikan variant.", "WARNING", "color_variant", "PRODUCT_COLOR", "Tinjau Color Master dan variant terkait.", inactiveColorMaster),
  rule("PIM_INACTIVE_SIZE_MASTER_IN_USE", "Size Master nonaktif masih digunakan", "Size Master nonaktif masih direferensikan sellable SKU.", "WARNING", "sellable_sku", "PRODUCT_VARIANT", "Tinjau Size Master dan sellable SKU terkait.", inactiveSizeMaster),
  rule("PIM_INVALID_PRICE", "Harga tidak valid", "Harga canonical atau adjustment bukan integer finite.", "ERROR", "product_and_sellable", "PRODUCT_VARIANT", "Perbaiki harga melalui Product Manager atau Bulk Edit.", invalidPrice),
  rule("PIM_MISSING_PRICE", "Harga kosong", "Harga canonical yang diperlukan bernilai null.", "ERROR", "product_and_sellable", "PRODUCT_VARIANT", "Isi harga melalui Product Manager.", missingPrice),
  rule("PIM_NEGATIVE_PRICE", "Harga negatif", "Harga atau adjustment menghasilkan nilai negatif yang tidak valid.", "ERROR", "product_and_sellable", "PRODUCT_VARIANT", "Perbaiki harga melalui Product Manager atau Bulk Edit.", negativePrice),
  rule("PIM_INVALID_STOCK", "Stok tidak valid", "Stok bukan integer finite.", "ERROR", "sellable_sku", "PRODUCT_VARIANT", "Perbaiki stok melalui Variant Matrix atau Bulk Edit.", invalidStock),
  rule("PIM_NEGATIVE_STOCK", "Stok negatif", "Stok canonical bernilai negatif.", "ERROR", "sellable_sku", "PRODUCT_VARIANT", "Perbaiki stok melalui Variant Matrix atau Bulk Edit.", negativeStock),
  rule("PIM_PRODUCT_VARIANT_STATE_CONFLICT", "Konflik lifecycle produk dan variant", "Produk aktif tidak mempunyai sellable SKU aktif.", "ERROR", "published_product", "DERIVED_READ_ONLY", "Perbaiki dependency melalui Unified Product Workflow.", productVariantStateConflict),
  rule("PIM_PUBLISHED_PRODUCT_NOT_READY", "Produk published tidak memenuhi validator canonical", "Produk aktif gagal canonical publish readiness validator.", "ERROR", "published_product", "DERIVED_READ_ONLY", "Buka Product Manager dan selesaikan seluruh blocker publish.", publishedNotReady),
  rule("PIM_PUBLISHED_PRODUCT_WITHOUT_MEDIA", "Produk published tanpa media front", "Produk aktif tidak mempunyai gambar front pada variant aktif.", "ERROR", "published_product", "PRODUCT_COLOR", "Tambahkan media front melalui Unified Product Workflow.", publishedWithoutMedia),
  rule("PIM_PUBLISHED_PRODUCT_WITHOUT_VALID_VARIANT", "Produk published tanpa variant valid", "Produk aktif tidak mempunyai sellable variant aktif.", "ERROR", "published_product", "PRODUCT_VARIANT", "Perbaiki variant dan SKU melalui Variant Matrix.", productVariantStateConflict),
  rule("PIM_PRODUCT_CATEGORY_CONFLICT", "Kategori produk tidak valid", "Kategori Product Root hilang atau nonaktif.", "ERROR", "product_root", "PRODUCT_ROOT", "Pilih kategori aktif melalui Product Manager.", categoryConflict),
  disabledRule("PIM_ORPHAN_PRODUCT_COLOR", "Orphan Product Color", "FK product_variants.product_id mencegah orphan pada schema canonical.", "PRODUCT_COLOR"),
  disabledRule("PIM_ORPHAN_VARIANT", "Orphan Product Variant", "FK product_variant_sizes.variant_id mencegah orphan pada schema canonical.", "PRODUCT_VARIANT"),
  disabledRule("PIM_VARIANT_WITHOUT_PRODUCT_ROOT", "Variant tanpa Product Root", "Tidak applicable karena FK canonical.", "PRODUCT_COLOR"),
  disabledRule("PIM_VARIANT_WITHOUT_PRODUCT_COLOR", "Sellable tanpa Product Color", "Tidak applicable karena FK canonical.", "PRODUCT_VARIANT"),
  disabledRule("PIM_COLOR_SIZE_COMPATIBILITY_ERROR", "Color/size compatibility", "Canonical baseline tidak mempunyai compatibility matrix terpisah.", "DERIVED_READ_ONLY")
] as const;

export function reconciliationRuleRegistry(): PimReconciliationRule[] {
  return PIM_RECONCILIATION_RULES.map(({ evaluate: _evaluate, ...definition }) => definition);
}

export function evaluatePimReconciliation(snapshot: PimPhase6Snapshot, previous: PimReconciliationFinding[] = [], comparable = false) {
  const complete = !snapshot.productLimitExceeded && !snapshot.variantLimitExceeded;
  if (!complete) {
    return result("INCOMPLETE", [], snapshot, 0, PIM_RECONCILIATION_RULES.filter((item) => item.enabled).length, 0);
  }
  const products = new Map(snapshot.products.map((item) => [item.productId, item]));
  const variantRootsByProduct = groupBy(snapshot.variantRoots, (item) => item.productId);
  const variantsByProduct = groupBy(snapshot.variants, (item) => item.productId);
  const context: RuleContext = { snapshot, products, variantRootsByProduct, variantsByProduct, detectedAt: snapshot.snapshotAt };
  const enabledRules = PIM_RECONCILIATION_RULES.filter((item) => item.enabled);
  let failedRules = 0;
  const current: PimReconciliationFinding[] = [];
  for (const definition of enabledRules) {
    try {
      current.push(...definition.evaluate(context));
    } catch {
      failedRules += 1;
    }
  }
  if (failedRules > 0) return result("INCOMPLETE", current.map((item) => ({ ...item, lifecycle: "NOT_EVALUATED" })), snapshot, enabledRules.length - failedRules, enabledRules.length, failedRules);
  const findings = applyLifecycle(current, previous, comparable, snapshot.snapshotAt);
  const active = findings.filter((item) => item.lifecycle !== "RESOLVED" && item.lifecycle !== "NOT_EVALUATED");
  const status: PimReconciliationStatus = active.some((item) => item.severity === "ERROR") ? "ERROR" : active.some((item) => item.severity === "WARNING") ? "WARNING" : "PASS";
  return result(status, findings, snapshot, enabledRules.length, enabledRules.length, 0);
}

function result(status: PimReconciliationStatus, findings: PimReconciliationFinding[], snapshot: PimPhase6Snapshot, executed: number, applicable: number, failed: number) {
  const active = findings.filter((item) => item.lifecycle !== "RESOLVED" && item.lifecycle !== "NOT_EVALUATED");
  return {
    ruleSetVersion: PIM_PHASE6_RULE_SET_VERSION,
    status,
    completeness: status === "INCOMPLETE" ? "INCOMPLETE" as const : "COMPLETE" as const,
    findings,
    summary: {
      productCount: snapshot.productCount,
      variantCount: snapshot.variantCount,
      applicableRuleCount: applicable,
      executedRuleCount: executed,
      failedRuleCount: failed,
      passCount: Math.max(0, executed - new Set(active.map((item) => item.issueCode)).size),
      warningCount: active.filter((item) => item.severity === "WARNING").length,
      errorCount: active.filter((item) => item.severity === "ERROR").length,
      totalFindings: active.length,
      newFindings: findings.filter((item) => item.lifecycle === "NEW").length,
      existingFindings: findings.filter((item) => item.lifecycle === "EXISTING").length,
      resolvedFindings: findings.filter((item) => item.lifecycle === "RESOLVED").length
    }
  };
}

function applyLifecycle(current: PimReconciliationFinding[], previous: PimReconciliationFinding[], comparable: boolean, detectedAt: string) {
  if (!comparable) return current.map((item) => ({ ...item, lifecycle: "NEW" as const }));
  const previousByFingerprint = new Map(previous.map((item) => [item.fingerprint, item]));
  const currentFingerprints = new Set(current.map((item) => item.fingerprint));
  const currentRuleVersions = new Map(PIM_RECONCILIATION_RULES.map((item) => [item.code, item.version]));
  const active = current.map((item) => {
    const previousItem = previousByFingerprint.get(item.fingerprint);
    const lifecycle = !previousItem || previousItem.ruleVersion !== item.ruleVersion ? "NEW" as const : "EXISTING" as const;
    return { ...item, lifecycle };
  });
  const resolved = previous
    .filter((item) => item.lifecycle !== "RESOLVED" && !currentFingerprints.has(item.fingerprint))
    .map((item) => ({ ...item, lifecycle: currentRuleVersions.get(item.issueCode) === item.ruleVersion ? "RESOLVED" as const : "NOT_EVALUATED" as const, detectedAt }));
  return [...active, ...resolved].sort(findingSort);
}

function rule(code: string, title: string, description: string, severity: "WARNING" | "ERROR", appliesTo: string, dataLevel: PimReconciliationFinding["sourceLevel"], recommendation: string, evaluate: ExecutableRule["evaluate"]): ExecutableRule {
  return { code, version: VERSION, title, description, severity, appliesTo, dataLevel, recommendation, enabled: true, skipReason: null, evaluate };
}

function disabledRule(code: string, title: string, skipReason: string, dataLevel: PimReconciliationFinding["sourceLevel"]): ExecutableRule {
  return { code, version: VERSION, title, description: skipReason, severity: "ERROR", appliesTo: "NOT_APPLICABLE", dataLevel, recommendation: "Gunakan workflow canonical jika schema berubah pada fase berikutnya.", enabled: false, skipReason, evaluate: () => [] };
}

function productWithoutVariant(context: RuleContext) {
  return context.snapshot.products.filter((product) => product.variantCount === 0).map((product) => productFinding(context, "PIM_PRODUCT_WITHOUT_VARIANT", product, "variants", product.variantCount, "Product Root tidak memiliki color variant."));
}

function productWithoutActiveVariant(context: RuleContext) {
  return context.snapshot.products.filter((product) => product.activeVariantCount === 0).map((product) => productFinding(context, "PIM_PRODUCT_WITHOUT_ACTIVE_VARIANT", product, "variants.status", product.activeVariantCount, "Product Root tidak memiliki color variant aktif."));
}

function productWithoutActiveColor(context: RuleContext) {
  return context.snapshot.products.filter((product) => product.activeVariantCount === 0).map((product) => productFinding(context, "PIM_PRODUCT_WITHOUT_ACTIVE_COLOR", product, "variants.color", product.activeVariantCount, "Product Root tidak memiliki warna aktif."));
}

function duplicateSku(context: RuleContext) {
  return context.snapshot.variants.filter((row) => row.sku && row.duplicateSkuCount > 1).map((row) => variantFinding(context, "PIM_DUPLICATE_SKU", row, "sku", row.sku, `SKU ${row.sku} digunakan ${row.duplicateSkuCount} kali.`));
}

function missingSku(context: RuleContext) {
  return context.snapshot.variants.filter((row) => !row.sku.trim()).map((row) => variantFinding(context, "PIM_MISSING_SKU", row, "sku", "", "Sellable SKU kosong."));
}

function duplicateSlug(context: RuleContext) {
  return context.snapshot.products.filter((product) => product.slug && product.duplicateSlugCount > 1).map((product) => productFinding(context, "PIM_DUPLICATE_SLUG", product, "slug", product.slug, `Slug digunakan ${product.duplicateSlugCount} Product Root.`));
}

function missingSlug(context: RuleContext) {
  return context.snapshot.products.filter((product) => !product.slug).map((product) => productFinding(context, "PIM_MISSING_SLUG", product, "slug", "", "Slug Product Root kosong."));
}

function invalidSlug(context: RuleContext) {
  const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return context.snapshot.products.filter((product) => product.slug && !pattern.test(product.slug)).map((product) => productFinding(context, "PIM_RESERVED_OR_INVALID_SLUG", product, "slug", product.slug, "Slug tidak mengikuti lowercase kebab-case canonical."));
}

function duplicateColorSize(context: RuleContext) {
  const groups = groupBy(context.snapshot.variants, (row) => `${row.productId}:${row.colorCode}:${row.sizeMasterId || row.sizeName}`);
  return [...groups.values()].filter((rows) => rows.length > 1).flatMap((rows) => rows.map((row) => variantFinding(context, "PIM_DUPLICATE_COLOR_SIZE", row, "color_size", `${row.colorCode}/${row.sizeCode}`, "Kombinasi warna dan ukuran duplikat.")));
}

function invalidColorMaster(context: RuleContext) {
  return context.snapshot.variantRoots.filter((row) => !row.colorMasterMatched).map((row) => variantRootFinding(context, "PIM_INVALID_COLOR_MASTER", row, "color_master", row.colorCode, "Color variant tidak cocok dengan Color Master canonical."));
}

function invalidSizeMaster(context: RuleContext) {
  return context.snapshot.variants.filter((row) => !row.sizeMasterMatched).map((row) => variantFinding(context, "PIM_INVALID_SIZE_MASTER", row, "size_master_id", row.sizeMasterId, "Sellable SKU tidak mempunyai Size Master canonical."));
}

function inactiveColorMaster(context: RuleContext) {
  return context.snapshot.variantRoots.filter((row) => row.colorMasterMatched && row.colorMasterActive === false).map((row) => variantRootFinding(context, "PIM_INACTIVE_COLOR_MASTER_IN_USE", row, "color_master.active", false, "Color Master nonaktif masih digunakan."));
}

function inactiveSizeMaster(context: RuleContext) {
  return context.snapshot.variants.filter((row) => row.sizeMasterMatched && row.sizeMasterActive === false).map((row) => variantFinding(context, "PIM_INACTIVE_SIZE_MASTER_IN_USE", row, "size_master.active", false, "Size Master nonaktif masih digunakan."));
}

function invalidPrice(context: RuleContext) {
  return context.snapshot.variants.filter((row) => [row.basePrice, row.variantPriceAdjustment, row.sizePriceAdjustment].some((value) => value !== null && (!Number.isSafeInteger(value) || !Number.isFinite(value)))).map((row) => variantFinding(context, "PIM_INVALID_PRICE", row, "price", row.effectivePrice, "Harga atau adjustment bukan integer finite."));
}

function missingPrice(context: RuleContext) {
  return context.snapshot.products.filter((product) => product.basePrice === null).map((product) => productFinding(context, "PIM_MISSING_PRICE", product, "base_price", null, "Harga dasar Product Root kosong."));
}

function negativePrice(context: RuleContext) {
  return context.snapshot.variants.filter((row) => [row.basePrice, row.variantPriceAdjustment, row.sizePriceAdjustment, row.effectivePrice].some((value) => value !== null && value < 0)).map((row) => variantFinding(context, "PIM_NEGATIVE_PRICE", row, "price", row.effectivePrice, "Harga atau adjustment menghasilkan nilai negatif."));
}

function invalidStock(context: RuleContext) {
  return context.snapshot.variants.filter((row) => row.stock !== null && (!Number.isSafeInteger(row.stock) || !Number.isFinite(row.stock))).map((row) => variantFinding(context, "PIM_INVALID_STOCK", row, "stock", row.stock, "Stok bukan integer finite."));
}

function negativeStock(context: RuleContext) {
  return context.snapshot.variants.filter((row) => row.stock !== null && row.stock < 0).map((row) => variantFinding(context, "PIM_NEGATIVE_STOCK", row, "stock", row.stock, "Stok canonical bernilai negatif."));
}

function productVariantStateConflict(context: RuleContext) {
  return context.snapshot.products.filter((product) => product.status === "active" && product.activeSellableCount === 0).map((product) => productFinding(context, "PIM_PRODUCT_VARIANT_STATE_CONFLICT", product, "status", product.status, "Produk aktif tidak mempunyai sellable SKU aktif."));
}

function publishedWithoutMedia(context: RuleContext) {
  return context.snapshot.products.filter((product) => product.status === "active" && product.frontImageCount === 0).map((product) => productFinding(context, "PIM_PUBLISHED_PRODUCT_WITHOUT_MEDIA", product, "media.front", 0, "Produk aktif tidak mempunyai gambar front."));
}

function categoryConflict(context: RuleContext) {
  return context.snapshot.products.filter((product) => !product.categoryId || !product.categoryActive).map((product) => productFinding(context, "PIM_PRODUCT_CATEGORY_CONFLICT", product, "product_category_id", product.categoryId, "Kategori Product Root hilang atau nonaktif."));
}

function publishedNotReady(context: RuleContext) {
  const findings: PimReconciliationFinding[] = [];
  for (const product of context.snapshot.products.filter((item) => item.status === "active")) {
    const roots = context.variantRootsByProduct.get(product.productId) || [];
    const rows = context.variantsByProduct.get(product.productId) || [];
    const snapshot: ProductPublishSnapshot = {
      id: product.productId,
      name: product.productName,
      slug: product.slug,
      productCategoryId: product.categoryId,
      basePrice: product.basePrice,
      status: "draft",
      categoryActive: product.categoryActive,
      duplicateSlug: product.duplicateSlugCount > 1,
      variants: roots.map((root) => ({
        id: root.variantId,
        name: root.variantName,
        slug: root.variantSlug,
        status: root.variantStatus,
        hasFrontImage: root.hasFrontImage,
        sellable: rows.filter((row) => row.variantId === root.variantId).map((row) => ({
          id: row.variantSizeId,
          sku: row.sku || null,
          sizeId: row.sizeMasterId,
          sizeActive: row.sizeMasterActive === true,
          stockQuantity: row.stock,
          status: row.sellableStatus,
          duplicateSku: row.duplicateSkuCount > 1
        }))
      }))
    };
    const issues = validateProductPublishSnapshot(snapshot);
    for (const issue of issues.filter((item) => item.severity === "error")) {
      findings.push(productFinding(context, "PIM_PUBLISHED_PRODUCT_NOT_READY", product, issue.field, null, issue.message));
    }
  }
  return findings;
}

function productFinding(context: RuleContext, code: string, product: PimPhase6ProductRow, field: string, currentValue: PimReconciliationFinding["currentValue"], message: string) {
  return createFinding(context, code, product.productId, product.productName, null, null, field, currentValue, message, "PRODUCT_ROOT");
}

function variantRootFinding(context: RuleContext, code: string, row: PimPhase6VariantRootRow, field: string, currentValue: PimReconciliationFinding["currentValue"], message: string) {
  const product = context.products.get(row.productId);
  return createFinding(context, code, row.productId, product?.productName || "Produk", row.variantId, null, field, currentValue, message, "PRODUCT_COLOR");
}

function variantFinding(context: RuleContext, code: string, row: PimPhase6VariantRow, field: string, currentValue: PimReconciliationFinding["currentValue"], message: string) {
  return createFinding(context, code, row.productId, row.productName, row.variantId, row.sku || null, field, currentValue, message, "PRODUCT_VARIANT", "/admin/products/bulk-edit");
}

function createFinding(context: RuleContext, code: string, productId: string, productName: string, variantId: string | null, sku: string | null, field: string, currentValue: PimReconciliationFinding["currentValue"], message: string, sourceLevel: PimReconciliationFinding["sourceLevel"], editorDestination: PimReconciliationFinding["editorDestination"] = PRODUCT_EDITOR): PimReconciliationFinding {
  const definition = PIM_RECONCILIATION_RULES.find((item) => item.code === code);
  if (!definition) throw new Error(`RULE_NOT_REGISTERED:${code}`);
  const entityIdentity = variantId || productId;
  const product = context.products.get(productId);
  return {
    fingerprint: hashPimPhase6Value({ issueCode: code, productId, variantId, field, entityIdentity }),
    issueCode: code,
    ruleVersion: definition.version,
    severity: definition.severity,
    lifecycle: "NEW",
    productId,
    productName,
    categoryId: product?.categoryId || null,
    categoryName: product?.categoryName || "",
    productStatus: product?.status || "",
    variantId,
    sku,
    field,
    currentValue,
    valueState: valueState(currentValue),
    message,
    recommendation: definition.recommendation,
    detectedAt: context.detectedAt,
    sourceLevel,
    editorDestination,
    evaluationStatus: "EVALUATED",
    ruleAppliesTo: definition.appliesTo
  };
}

function valueState(value: PimReconciliationFinding["currentValue"]): PimReconciliationFinding["valueState"] {
  if (value === null) return "NULL";
  if (value === "") return "EMPTY";
  if (value === 0) return "ZERO";
  return "VALUE";
}

function findingSort(left: PimReconciliationFinding, right: PimReconciliationFinding) {
  return left.severity.localeCompare(right.severity) || left.issueCode.localeCompare(right.issueCode) || left.productName.localeCompare(right.productName) || (left.sku || "").localeCompare(right.sku || "") || left.fingerprint.localeCompare(right.fingerprint);
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const groupKey = key(row);
    const group = groups.get(groupKey) || [];
    group.push(row);
    groups.set(groupKey, group);
  }
  return groups;
}
