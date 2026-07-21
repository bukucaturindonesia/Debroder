import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  csvPimPhase6Cell,
  hashPimPhase6Value,
  normalizePimPhase6Scope,
  PIM_PHASE6_EXPORT_SCHEMA_VERSION,
  PIM_PHASE6_RULE_SET_VERSION,
  protectSpreadsheetText,
  type PimPhase6Snapshot
} from "@/lib/pim-phase6";
import { generatePimProductExport, generatePimReconciliationReport } from "@/lib/pim-phase6-export";
import { evaluatePimReconciliation, reconciliationRuleRegistry } from "@/lib/pim-reconciliation";

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
const variantSizeId = "33333333-3333-4333-8333-333333333333";
const categoryId = "44444444-4444-4444-8444-444444444444";
const colorId = "55555555-5555-4555-8555-555555555555";
const sizeId = "66666666-6666-4666-8666-666666666666";

type ExcelLoadInput = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

function excelBuffer(bytes: Uint8Array): ExcelLoadInput {
  return Buffer.from(bytes) as unknown as ExcelLoadInput;
}

function snapshot(overrides: Partial<PimPhase6Snapshot> = {}): PimPhase6Snapshot {
  const scope = normalizePimPhase6Scope({ kind: "selected", ids: [productId], excludedIds: [], filters: {} })!;
  return {
    snapshotAt: "2026-07-17T10:30:00.000Z",
    scope,
    scopeHash: hashPimPhase6Value(scope),
    productCount: 1,
    variantCount: 1,
    productLimitExceeded: false,
    variantLimitExceeded: false,
    products: [{
      productId, productName: "Kaos Audit", slug: "kaos-audit", categoryId, categoryCode: "kaos", categoryName: "Kaos",
      categoryActive: true, status: "draft", active: false, productType: "standard_product", pricingMode: "fixed_price",
      basePrice: 50000, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-17T10:00:00.000Z",
      variantCount: 1, activeVariantCount: 1, activeSellableCount: 1, frontImageCount: 1, duplicateSlugCount: 1
    }],
    variantRoots: [{
      variantId, productId, variantName: "Hitam", variantSlug: "hitam", variantStatus: "active", variantActive: true,
      colorMasterId: colorId, colorCode: "black", colorName: "Hitam", colorMasterActive: true, colorMasterMatched: true,
      hasFrontImage: true, sellableCount: 1, activeSellableCount: 1
    }],
    variants: [{
      variantId, variantSizeId, productId, productName: "Kaos Audit", productSlug: "kaos-audit", productStatus: "draft",
      productType: "standard_product", categoryId, categoryCode: "kaos", categoryName: "Kaos", variantName: "Hitam",
      variantSlug: "hitam", variantStatus: "active", variantActive: true, variantSortOrder: 0, colorMasterId: colorId,
      colorCode: "black", colorName: "Hitam", colorDisplayOrder: 0, colorMasterActive: true, colorMasterMatched: true,
      sizeMasterId: sizeId, sizeCode: "s", sizeName: "S", sizeDisplayOrder: 0, sizeMasterActive: true,
      sizeMasterMatched: true, sku: "000123", duplicateSkuCount: 1, basePrice: 50000, variantPriceAdjustment: 0,
      sizePriceAdjustment: 0, effectivePrice: 50000, stock: 0, sellableStatus: "active", sellableActive: true,
      sellableSortOrder: 0, hasFrontImage: true, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-17T10:00:00.000Z"
    }],
    categories: [{ id: categoryId, code: "kaos", name: "Kaos", displayOrder: 0, active: true }],
    colors: [{ id: colorId, code: "black", name: "Hitam", displayOrder: 0, active: true, group: "basic", hex: "#111111" }],
    sizes: [{ id: sizeId, code: "s", name: "S", displayOrder: 0, active: true, group: "apparel" }],
    ...overrides
  };
}

describe("PIM Phase 6 scope and export contract", () => {
  it("normalizes selected/current/all-matching/category/status/date/full scopes without trusting arbitrary IDs", () => {
    expect(normalizePimPhase6Scope({ kind: "selected", ids: [productId, "bad"], excludedIds: [], filters: {} })?.ids).toEqual([productId]);
    expect(normalizePimPhase6Scope({ kind: "current_page", ids: [productId], excludedIds: [], filters: {} })?.kind).toBe("current_page");
    expect(normalizePimPhase6Scope({ kind: "all_matching", ids: [], excludedIds: [productId], filters: { status: "draft", categoryId } })).toMatchObject({ kind: "all_matching", excludedIds: [productId], filters: { status: "draft", categoryId } });
    expect(normalizePimPhase6Scope({ kind: "category", ids: [], excludedIds: [], filters: { categoryId } })?.kind).toBe("category");
    expect(normalizePimPhase6Scope({ kind: "status", ids: [], excludedIds: [], filters: { status: "active" } })?.kind).toBe("status");
    expect(normalizePimPhase6Scope({ kind: "updated_range", ids: [], excludedIds: [], filters: { updatedFrom: "2026-07-01", updatedTo: "2026-07-17" } })?.filters.updatedFrom).toContain("2026-06-30T16:00:00.000Z");
    expect(normalizePimPhase6Scope({ kind: "full", ids: [productId], excludedIds: [productId], filters: { status: "active" } })).toMatchObject({ kind: "full", ids: [], excludedIds: [], filters: { status: "all" } });
    expect(normalizePimPhase6Scope({ kind: "selected", ids: [], filters: {} })).toBeNull();
  });

  it("neutralizes formula-injection characters without mutating business data", () => {
    expect(protectSpreadsheetText("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(protectSpreadsheetText("+cmd")).toBe("'+cmd");
    expect(protectSpreadsheetText("-1+2")).toBe("'-1+2");
    expect(protectSpreadsheetText("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvPimPhase6Cell("normal")).toBe('"normal"');
    expect(csvPimPhase6Cell(-12)).toBe('"-12"');
  });

  it("generates XLSX with required sheets, metadata, dictionary, references, and text SKU", async () => {
    const generated = await generatePimProductExport("xlsx", snapshot(), {
      exportId: "export-id", generatedAt: "2026-07-17T10:30:00.000Z", generatedBy: "actor-id", generatedByRole: "admin_guest",
      sourceEnvironment: "local", scopeLabel: "Selected Products", filterSummary: "{}", filterHash: "a".repeat(64)
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer(generated.bytes));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "EXPORT_INFORMATION", "DATA_DICTIONARY", "PRODUCTS", "VARIANTS", "CATEGORY_REFERENCE", "COLOR_MASTER_REFERENCE", "SIZE_MASTER_REFERENCE"
    ]);
    expect(workbook.getWorksheet("EXPORT_INFORMATION")?.getCell("B5").text).toBe(PIM_PHASE6_EXPORT_SCHEMA_VERSION);
    const skuCell = workbook.getWorksheet("VARIANTS")?.getRow(2).getCell(14);
    expect(skuCell?.text).toBe("000123");
  });

  it("generates CSV UTF-8 with canonical metadata, numeric price/stock, and leading-zero SKU", async () => {
    const generated = await generatePimProductExport("csv", snapshot(), {
      exportId: "export-id", generatedAt: "2026-07-17T10:30:00.000Z", generatedBy: "actor-id", generatedByRole: "owner",
      sourceEnvironment: "local", scopeLabel: "Selected Products", filterSummary: "{}", filterHash: "b".repeat(64)
    });
    expect(Array.from(generated.bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const csv = new TextDecoder().decode(generated.bytes);
    expect(csv).toContain("export_schema_version");
    expect(csv).toContain(PIM_PHASE6_EXPORT_SCHEMA_VERSION);
    expect(csv).toContain('"000123"');
    expect(csv).toContain('"50000"');
    expect(csv).toContain('"0"');
    expect(csv).not.toContain("Rp50");
  });
});

describe("PIM Phase 6 reconciliation", () => {
  it("keeps a unique, versioned, applicable central rule registry", () => {
    const registry = reconciliationRuleRegistry();
    expect(new Set(registry.map((rule) => rule.code)).size).toBe(registry.length);
    expect(registry.every((rule) => rule.version && rule.severity && rule.appliesTo && rule.recommendation)).toBe(true);
    expect(registry.find((rule) => rule.code === "PIM_ORPHAN_VARIANT")).toMatchObject({ enabled: false, appliesTo: "NOT_APPLICABLE" });
  });

  it("returns PASS only for a complete healthy snapshot", () => {
    const result = evaluatePimReconciliation(snapshot());
    expect(result.status).toBe("PASS");
    expect(result.completeness).toBe("COMPLETE");
    expect(result.findings).toEqual([]);
  });

  it("detects duplicate SKU/slug/color-size, invalid masters, price, stock, media, and published readiness", () => {
    const base = snapshot();
    const broken = snapshot({
      products: [{ ...base.products[0]!, status: "active", active: true, duplicateSlugCount: 2, frontImageCount: 0 }],
      variantRoots: [{ ...base.variantRoots[0]!, colorMasterMatched: false, colorMasterId: null, hasFrontImage: false }],
      variants: [
        { ...base.variants[0]!, sku: "DUP", duplicateSkuCount: 2, sizeMasterMatched: false, sizeMasterId: null, effectivePrice: -1, stock: -1, hasFrontImage: false },
        { ...base.variants[0]!, variantSizeId: "77777777-7777-4777-8777-777777777777", sku: "DUP", duplicateSkuCount: 2, sizeMasterMatched: false, sizeMasterId: null, effectivePrice: -1, stock: -1, hasFrontImage: false }
      ],
      variantCount: 2
    });
    const result = evaluatePimReconciliation(broken);
    const codes = new Set(result.findings.map((finding) => finding.issueCode));
    expect(result.status).toBe("ERROR");
    for (const code of ["PIM_DUPLICATE_SKU", "PIM_DUPLICATE_SLUG", "PIM_DUPLICATE_COLOR_SIZE", "PIM_INVALID_COLOR_MASTER", "PIM_INVALID_SIZE_MASTER", "PIM_NEGATIVE_PRICE", "PIM_NEGATIVE_STOCK", "PIM_PUBLISHED_PRODUCT_WITHOUT_MEDIA", "PIM_PUBLISHED_PRODUCT_NOT_READY"]) expect(codes.has(code)).toBe(true);
  });

  it("marks exceeded or failed-completeness snapshots INCOMPLETE and never PASS", () => {
    const result = evaluatePimReconciliation(snapshot({ productLimitExceeded: true }));
    expect(result.status).toBe("INCOMPLETE");
    expect(result.completeness).toBe("INCOMPLETE");
  });

  it("uses stable fingerprints and protects NEW/EXISTING/RESOLVED comparison", () => {
    const base = snapshot();
    const broken = snapshot({ variants: [{ ...base.variants[0]!, sku: "", duplicateSkuCount: 0 }] });
    const first = evaluatePimReconciliation(broken);
    const second = evaluatePimReconciliation(broken, first.findings, true);
    expect(second.findings.every((finding) => finding.lifecycle === "EXISTING")).toBe(true);
    const resolved = evaluatePimReconciliation(base, first.findings, true);
    expect(resolved.findings.some((finding) => finding.lifecycle === "RESOLVED")).toBe(true);
    const incomparable = evaluatePimReconciliation(base, first.findings, false);
    expect(incomparable.findings.some((finding) => finding.lifecycle === "RESOLVED")).toBe(false);
    const versionChanged = evaluatePimReconciliation(base, first.findings.map((finding) => ({ ...finding, ruleVersion: "legacy" })), true);
    expect(versionChanged.findings.some((finding) => finding.lifecycle === "RESOLVED")).toBe(false);
    expect(versionChanged.findings.some((finding) => finding.lifecycle === "NOT_EVALUATED")).toBe(true);
    expect(first.findings[0]?.fingerprint).toBe(second.findings[0]?.fingerprint);
  });

  it("creates XLSX and CSV reports from stored findings without rescanning", async () => {
    const base = snapshot();
    const result = evaluatePimReconciliation(snapshot({ variants: [{ ...base.variants[0]!, sku: "" }] }));
    const input = {
      runId: "run-id", generatedAt: "2026-07-17T10:30:00.000Z", generatedBy: "actor", generatedByRole: "admin_guest",
      scopeLabel: "Selected Products", scopeHash: "a".repeat(64), snapshotAt: base.snapshotAt,
      ruleSetVersion: PIM_PHASE6_RULE_SET_VERSION, overallStatus: result.status, completeness: result.completeness,
      productCount: 1, variantCount: 1, findings: result.findings
    };
    const xlsx = await generatePimReconciliationReport("xlsx", input);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer(xlsx.bytes));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["REPORT_INFORMATION", "SUMMARY", "FINDINGS", "RULE_REGISTRY", "DATA_DICTIONARY"]);
    const csv = new TextDecoder().decode((await generatePimReconciliationReport("csv", input)).bytes);
    expect(csv).toContain("issue_code");
    expect(csv).toContain("PIM_MISSING_SKU");
  });
});

describe("PIM Phase 6 permission, snapshot, job, and read-only source gates", () => {
  const migration = readFileSync("supabase/migrations/20260717193000_pim_phase_6_export_reconciliation.sql", "utf8");
  const route = readFileSync("app/api/admin/products/export-reconciliation/route.ts", "utf8");
  const download = readFileSync("app/api/admin/products/export-reconciliation/download/[jobId]/route.ts", "utf8");
  const reconciliation = readFileSync("lib/pim-reconciliation.ts", "utf8");

  it("uses one service-role-only snapshot RPC and operational metadata tables", () => {
    expect(migration).toContain("create or replace function public.pim_phase6_snapshot_v1");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("revoke all on function public.pim_phase6_snapshot_v1");
    expect(migration).toContain("grant execute on function public.pim_phase6_snapshot_v1(uuid,jsonb,integer,integer) to service_role");
    expect(migration).toContain("create table if not exists public.pim_export_jobs");
    expect(migration).toContain("create table if not exists public.pim_reconciliation_runs");
    expect(migration).toContain("create table if not exists public.pim_reconciliation_findings");
  });

  it("keeps storage private, validates ownership/expiry/hash, and prevents cross-user download", () => {
    expect(migration).toContain("'pim-phase6-files'");
    expect(migration).toContain("false,");
    expect(download).toContain("loadOwnedPimPhase6File(actor.adminClient, actor.user.id, jobId)");
    expect(download).toContain('"content-disposition"');
    expect(download).toContain('"cache-control": "private, no-store, max-age=0"');
    expect(route).toContain("idempotencyToken");
    expect(route).toContain("EXPORT_BACKGROUND_UNAVAILABLE");
  });

  it("does not add reconciliation auto-fix or canonical PIM mutation SQL", () => {
    expect(reconciliation).toContain("validateProductPublishSnapshot");
    expect(reconciliation).not.toMatch(/\.from\("products"\)\.(update|insert|delete)/);
    expect(migration).not.toMatch(/update\s+public\.(products|product_variants|product_variant_sizes|product_color_master|product_size_master)/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.(products|product_variants|product_variant_sizes|product_color_master|product_size_master)/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.(products|product_variants|product_variant_sizes|product_color_master|product_size_master)/i);
  });

  it("keeps unauthenticated users rejected and Admin Guest on the same read-only server allowlist", () => {
    expect(route).toContain("requirePhase13Actor");
    expect(route).toContain("PRODUCT_MANAGER_ROLES");
    expect(migration).toContain("'admin_guest'");
    expect(migration).toContain("revoke all on table public.pim_export_jobs from public, anon, authenticated");
  });
});
