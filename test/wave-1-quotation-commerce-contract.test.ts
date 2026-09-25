import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260819132837_wave_1_commerce_quotation_atomicity.sql",
  "utf8"
);
const compact = migration.replace(/\s+/g, " ").toLowerCase();

describe("Wave 1 quotation commerce correctness", () => {
  it("restores the repository RPCs used by quotation and Repeat Order flows", () => {
    for (const signature of [
      "public.refresh_quotation_totals(p_quotation_id uuid)",
      "public.create_repeat_order_quotation(",
      "public.transition_quotation_status(",
      "public.create_quotation_revision("
    ]) {
      expect(migration).toContain(signature);
    }
  });

  it("keeps the writes permission-gated and transaction-safe", () => {
    expect(compact).toContain("security definer");
    expect(compact).toContain("set search_path = ''");
    expect(migration).toContain("for update");
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(migration).toContain("repeat_idempotency_key = normalized_key");
    expect(migration).not.toContain("drop table");
    expect(migration).not.toContain("truncate");
  });

  it("preserves active pricing as pending until the existing pricing flow confirms it", () => {
    expect(migration).toContain("pricing_status");
    expect(migration).toContain("pending_pricing");
    expect(migration).toContain("Pending pricing cannot be approved");
    expect(migration).toContain("approved_version_id");
    expect(migration).toContain("source_snapshot");
  });

  it("exposes only authenticated and service-role execution", () => {
    for (const functionName of [
      "refresh_quotation_totals(uuid)",
      "create_repeat_order_quotation(uuid, text, text)",
      "transition_quotation_status(uuid, text, text)",
      "create_quotation_revision(uuid, text)"
    ]) {
      expect(compact).toContain(
        `revoke all on function public.${functionName} from public, anon;`
      );
      expect(compact).toContain(
        `grant execute on function public.${functionName} to authenticated, service_role;`
      );
    }
  });
});
