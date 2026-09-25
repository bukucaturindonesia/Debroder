import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationsPath = "supabase/migrations";
const correctionName = "20260815212358_wave_0c_quotation_snapshot_security.sql";
const laterSecurityCorrectionName =
  "20260817151630_order_task_sla_policies_security.sql";
const laterProductCompatibilityCorrectionName =
  "20260817154449_product_compatibility_enum_safety.sql";
const laterOrderHandoffCorrectionName =
  "20260818003941_order_handoff_trigger_record_safety.sql";
const customerAuthServerAclCorrectionName =
  "20260818020559_customer_auth_server_acl_v1.sql";
const customerStoreScopeCorrectionName =
  "20260818082607_wave_0_public_store_scope_customer_rls.sql";
const readyStockPricingStatusCorrectionName =
  "20260819060740_wave_0_ready_stock_pricing_status_compatibility.sql";
const serviceRoleQcReadCorrectionName =
  "20260819064125_wave_0_service_role_qc_read_contract.sql";
const adminOrderReadGrantsCorrectionName =
  "20260819085144_wave_0_admin_order_read_grants.sql";
const triggerFunctionAclContainmentName =
  "20260819091348_wave_0_trigger_function_acl_containment.sql";
const paymentAdjustmentsArchiveContractName =
  "20260819095347_wave_0_payment_adjustments_archive_contract.sql";
const wave1CommerceQuotationAtomicityName =
  "20260819132837_wave_1_commerce_quotation_atomicity.sql";
const reconciliation = readFileSync(
  "supabase/MIGRATION_RECONCILIATION_WAVE_0C.md",
  "utf8"
);

describe("Wave 0C migration history contract", () => {
  it("keeps the correction as a unique forward migration after the existing numeric history", () => {
    const names = readdirSync(migrationsPath)
      .filter((name) => name.endsWith(".sql"))
      .filter((name) => name !== "20260816102253_debroder_fresh_database_baseline.sql");
    const numericPrefixes = names
      .map((name) => name.match(/^(\d{14})/u)?.[1])
      .filter((prefix): prefix is string => Boolean(prefix));

    expect(existsSync(`${migrationsPath}/${correctionName}`)).toBe(true);
    expect(numericPrefixes.length).toBe(new Set(numericPrefixes).size);
    expect(numericPrefixes).toContain("20260815212358");
    expect(existsSync(`${migrationsPath}/${laterSecurityCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260817151630");
    expect(existsSync(`${migrationsPath}/${laterProductCompatibilityCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260817154449");
    expect(existsSync(`${migrationsPath}/${laterOrderHandoffCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260818003941");
    expect(existsSync(`${migrationsPath}/${customerAuthServerAclCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260818020559");
    expect(existsSync(`${migrationsPath}/${customerStoreScopeCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260818082607");
    expect(existsSync(`${migrationsPath}/${readyStockPricingStatusCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260819060740");
    expect(existsSync(`${migrationsPath}/${serviceRoleQcReadCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260819064125");
    expect(existsSync(`${migrationsPath}/${adminOrderReadGrantsCorrectionName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260819085144");
    expect(existsSync(`${migrationsPath}/${triggerFunctionAclContainmentName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260819091348");
    expect(existsSync(`${migrationsPath}/${paymentAdjustmentsArchiveContractName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260819095347");
    expect(existsSync(`${migrationsPath}/${wave1CommerceQuotationAtomicityName}`)).toBe(true);
    expect(numericPrefixes).toContain("20260819132837");
    expect(
      numericPrefixes
        .filter((prefix) => prefix <= "20260819095347")
        .every((prefix) => prefix <= "20260819095347")
    ).toBe(true);
  });

  it("records the remote/local mismatch without claiming schema parity", () => {
    expect(reconciliation).toContain("Remote applied migrations: 173.");
    expect(reconciliation).toContain("Local migration files: 132.");
    expect(reconciliation).toContain("Exact timestamp-key matches: 80.");
    expect(reconciliation).toContain("Local-only timestamp keys: 43.");
    expect(reconciliation).toContain("Remote-only timestamp keys: 93.");
    expect(reconciliation).toContain("MISSING_IN_REPO");
    expect(reconciliation).toContain("FUNCTION_DRIFT");
    expect(reconciliation).toContain("remote project");
    expect(reconciliation).toContain("Not fully verifiable");
  });

  it("does not treat the historical applied files as numeric replay migrations", () => {
    const names = readdirSync(migrationsPath).filter((name) => name.endsWith(".sql"));
    const legacyApplied = names.filter((name) => name.endsWith("_applied.sql"));
    expect(legacyApplied.length).toBe(9);
    expect(legacyApplied.every((name) => !/^\d{14}/u.test(name))).toBe(true);
  });
});
