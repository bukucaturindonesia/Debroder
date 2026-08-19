import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql"),
  "utf8"
);

describe("public store read contract (STATIC CONTRACT EVIDENCE)", () => {
  it("allows public checkout/store pages to read active stores", () => {
    expect(baseline).toContain('create policy "Public can read active stores"');
    expect(baseline).toContain("on public.stores for select to anon, authenticated");
    expect(baseline).toContain("grant select on public.stores to anon, authenticated");
  });

  it("keeps public store access read-only and active-row scoped", () => {
    expect(baseline).toContain("using (status_aktif = true);");
    expect(baseline).not.toContain("grant insert, update, delete on public.stores");
    expect(baseline).not.toContain("grant all on table public.stores to anon");
  });

  it("provides the CMS status contract used by public reads and checkout validation", () => {
    expect(baseline).toMatch(
      /create\s+table\s+if\s+not\s+exists\s+public\.stores[\s\S]*status\s+text\s+not\s+null\s+default\s+'published'[\s\S]*publish_at\s+timestamptz/iu
    );
    expect(baseline).toContain("status in ('draft','scheduled','published','archived')");
  });
});
