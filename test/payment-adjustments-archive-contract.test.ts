import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const phase5bPath = path.join(
  root,
  "supabase/migrations/20260712142905_v1_2_phase_5b_payment_completion.sql",
);
const summaryPath = path.join(
  root,
  "supabase/migrations/20260719140000_payment_verification_and_fulfillment.sql",
);
const correctionName =
  "20260819095347_wave_0_payment_adjustments_archive_contract.sql";
const correctionPath = path.join(root, "supabase/migrations", correctionName);
const manifestPath = path.join(root, "DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md");

describe("payment_adjustments archive contract", () => {
  const phase5b = fs.readFileSync(phase5bPath, "utf8");
  const summary = fs.readFileSync(summaryPath, "utf8");
  const correction = fs.readFileSync(correctionPath, "utf8");
  const manifest = fs.readFileSync(manifestPath, "utf8");

  it("proves the runtime failure contract and its owner", () => {
    expect(phase5b).toContain(
      "create table if not exists public.payment_adjustments",
    );
    const tableStart = phase5b.indexOf(
      "create table if not exists public.payment_adjustments",
    );
    const tableEnd = phase5b.indexOf("\n);", tableStart);
    expect(tableStart).toBeGreaterThanOrEqual(0);
    expect(tableEnd).toBeGreaterThan(tableStart);
    expect(phase5b.slice(tableStart, tableEnd)).not.toContain(
      "archived_at timestamptz",
    );
    expect(summary).toMatch(
      /from public\.payment_adjustments\s+where order_id=p_order_id and status='approved' and archived_at is null/i,
    );
  });

  it("adds the missing lifecycle column without changing the payment authority", () => {
    expect(correction).toContain(
      "alter table public.payment_adjustments\n  add column if not exists archived_at timestamptz;",
    );
    expect(correction).toContain(
      "create index if not exists payment_adjustments_active_summary_idx",
    );
    expect(correction).not.toMatch(/create table\s+public\.payment_adjustments/i);
    expect(correction).not.toMatch(/grant\s+(all|insert|update|delete)/i);
    expect(correction).toContain("begin;");
    expect(correction).toContain("commit;");
  });

  it("is reachable in the executable fresh replay manifest", () => {
    const correctionRow = `| \`${correctionName}\` | RUN |`;
    expect(manifest).toContain(correctionRow);
    expect(
      manifest.indexOf("20260712142905_v1_2_phase_5b_payment_completion.sql"),
    ).toBeLessThan(
      manifest.indexOf(correctionRow),
    );
    expect(manifest).toContain("20260719140000_payment_verification_and_fulfillment.sql");
  });
});
