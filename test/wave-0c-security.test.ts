import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  WAVE_0C_SAFE_IDENTITY,
  type Wave0cRuntimeEnv,
  stagingContractBlocker,
  wave0cRuntimeBlocker
} from "@/e2e/support/env";

const migration = readFileSync(
  "supabase/migrations/20260815212358_wave_0c_quotation_snapshot_security.sql",
  "utf8"
);
const compactMigration = migration.replace(/\s+/g, " ").toLowerCase();

const requiredRuntimeNames = [
  "E2E_CUSTOMER_A_EMAIL",
  "E2E_CUSTOMER_A_PASSWORD",
  "E2E_CUSTOMER_B_EMAIL",
  "E2E_CUSTOMER_B_PASSWORD",
  "E2E_READY_STOCK_PRODUCT_SLUG",
  "E2E_READY_STOCK_VARIANT_LABEL",
  "E2E_READY_STOCK_SIZE_LABEL",
  "E2E_READY_STOCK_PICKUP_LOCATION_ID",
  "E2E_PAYMENT_PROOF_PATH",
  "E2E_FULL_ADMIN_EMAIL",
  "E2E_FULL_ADMIN_PASSWORD",
  "E2E_ADMIN_GUEST_EMAIL",
  "E2E_ADMIN_GUEST_PASSWORD",
  "E2E_SCOPED_ADMIN_EMAIL",
  "E2E_SCOPED_ADMIN_PASSWORD",
  "E2E_OUT_OF_SCOPE_ORDER_ID"
] as const;

function validContract(overrides: Wave0cRuntimeEnv = {}): Wave0cRuntimeEnv {
  return {
    DEBRODER_ENV: "staging",
    E2E_TARGET_ENV: "staging",
    E2E_BASE_URL: "https://staging.example.test",
    E2E_SAFE_STAGING_IDENTITY: WAVE_0C_SAFE_IDENTITY,
    E2E_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
    E2E_EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
    E2E_FIXTURE_PREFIX: "debroder_e2e_wave0c",
    E2E_FIXTURE_NAMESPACE_CONFIRMED: "1",
    E2E_ALLOW_MUTATIONS: "1",
    ...Object.fromEntries(requiredRuntimeNames.map((name) => [name, "fixture-value"])),
    ...overrides
  };
}

describe("Wave 0C quotation snapshot security contract", () => {
  it("requires the existing function and applies an authorization predicate inside the definer", () => {
    expect(compactMigration).toContain(
      "pg_catalog.to_regprocedure('public.build_quotation_snapshot(uuid)')"
    );
    expect(compactMigration).toContain(
      "create or replace function public.build_quotation_snapshot(p_quotation_id uuid)"
    );
    expect(compactMigration).toContain("security definer");
    expect(compactMigration).toContain("set search_path = ''");
    expect(compactMigration).toContain("public.has_permission('quotation.read'::text)");
  });

  it("denies anonymous, PUBLIC, and service-role execution while retaining authenticated staff execution", () => {
    expect(compactMigration).toContain(
      "revoke all on function public.build_quotation_snapshot(uuid) from public"
    );
    expect(compactMigration).toContain(
      "revoke all on function public.build_quotation_snapshot(uuid) from anon, authenticated, service_role"
    );
    expect(compactMigration).toContain(
      "grant execute on function public.build_quotation_snapshot(uuid) to authenticated"
    );
    expect(compactMigration).not.toMatch(
      /grant\s+execute\s+on\s+function[^;]+\s+to\s+(?:public|anon|service_role)/i
    );
  });

  it("preserves the staff-only quotation contract for customer A/B and store A/B", () => {
    expect(migration).toContain("staff/admin permission-only");
    expect(migration).toContain("have no store_id access path");
    expect(migration).toContain("no customer ownership policy");
    expect(compactMigration).toContain("public.has_permission('quotation.read'::text)");
  });

  it("does not add a client service-role boundary or a second quotation data source", () => {
    expect(migration).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(compactMigration).not.toMatch(/insert\s+into\s+public\.(?:quotations|quotation_items)/i);
    expect(compactMigration).not.toMatch(/update\s+public\.(?:quotations|quotation_items)/i);
  });
});

describe("Wave 0C safe staging identity contract", () => {
  it("blocks production project identity even when other inputs look staging-like", () => {
    expect(
      stagingContractBlocker(
        validContract({
          E2E_SUPABASE_PROJECT_REF: PRODUCTION_SUPABASE_PROJECT_REF,
          E2E_EXPECTED_SUPABASE_PROJECT_REF: PRODUCTION_SUPABASE_PROJECT_REF
        })
      )
    ).toBe("BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED");
  });

  it("blocks missing or mismatched project attestation and fixture namespace confirmation", () => {
    expect(
      stagingContractBlocker(validContract({ E2E_EXPECTED_SUPABASE_PROJECT_REF: "" }))
    ).toBe("BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED");
    expect(
      stagingContractBlocker(validContract({ E2E_FIXTURE_NAMESPACE_CONFIRMED: "0" }))
    ).toBe("BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED");
  });

  it("blocks missing credentials before a mutation-capable run can start", () => {
    expect(
      stagingContractBlocker(validContract({ E2E_CUSTOMER_A_PASSWORD: "" }))
    ).toBe("BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED");
  });

  it("requires explicit mutation opt-in after identity is established", () => {
    expect(
      wave0cRuntimeBlocker(validContract({ E2E_ALLOW_MUTATIONS: "0" }))
    ).toBe("BLOCKED — EXTERNAL RUNTIME EVIDENCE REQUIRED: set E2E_ALLOW_MUTATIONS=1 only for an isolated test/staging runtime.");
    expect(wave0cRuntimeBlocker(validContract())).toBeNull();
  });
});
