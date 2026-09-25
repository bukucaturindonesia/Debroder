import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql"),
  "utf8"
);
const productRead = readFileSync(resolve(process.cwd(), "lib/supabase/products.ts"), "utf8");

describe("public product read contract (STATIC CONTRACT EVIDENCE)", () => {
  it("allows the public catalog to resolve the canonical apparel-size authority", () => {
    expect(baseline).toContain('create policy "Public can read active apparel sizes"');
    expect(baseline).toContain("on public.product_size_master for select to anon, authenticated");
    expect(baseline).toContain("public.product_size_master, public.product_color_master");
    expect(productRead).toContain("product_size_master!product_variant_sizes_size_id_fkey");
  });

  it("does not grant public mutation on the canonical apparel-size table", () => {
    expect(baseline).not.toContain("grant insert, update, delete on public.product_size_master");
    expect(baseline).not.toContain("grant all on table public.product_size_master to anon");
  });
});
