import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reader = readFileSync(resolve(process.cwd(), "lib/product-read/data-access.ts"), "utf8");
const baseline = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql"),
  "utf8"
);

describe("current product reader schema contract (STATIC CONTRACT EVIDENCE)", () => {
  it("selects only columns represented by the reconciled fresh baseline", () => {
    for (const column of [
      "product_category_id",
      "base_price",
      "public_description",
      "status",
      "status_aktif",
      "created_at"
    ]) {
      expect(reader).toContain(column);
      expect(baseline).toContain(`${column} `);
    }
    for (const removedColumn of [
      "compare_price",
      "specifications",
      "gallery_urls",
      "seo_title",
      "focal_points",
      "urutan"
    ]) {
      expect(reader).not.toContain(`,${removedColumn}`);
    }
  });

  it("keeps the canonical inventory reader as the stock authority", () => {
    expect(reader).toContain("readInventoryAvailabilityByVariantSizeIds");
    expect(reader).toContain("projectVariantSizeInventoryAvailability");
    expect(reader).not.toContain("inventory_balances");
  });

  it("keeps optional contact CMS availability from hiding a readable product", () => {
    const detailReader = readFileSync(
      resolve(process.cwd(), "lib/product-detail-page/data-access.ts"),
      "utf8"
    );

    expect(detailReader).toContain("Contact CMS content is optional");
    expect(detailReader).toContain(
      'status: relatedSource.products.status === "unavailable" ? "unavailable" : "ready"'
    );
    expect(detailReader).not.toContain("|| contactResult.error");
  });
});
