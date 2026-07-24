import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildSizeAdjustmentPolicyPreview,
  GLOBAL_SIZE_ADJUSTMENT_POLICY,
  normalizeManagedSize,
  type SellableSizePreviewInput,
  type SizeMasterPreviewInput
} from "@/lib/size-adjustment-policy-preview";

const sizeMasters: SizeMasterPreviewInput[] = [
  { id: "size-s", name: "S", slug: "s", sizeGroup: "apparel" },
  { id: "size-xl", name: "XL", slug: "xl", sizeGroup: "apparel" },
  { id: "size-2xl", name: "2XL", slug: "2xl", sizeGroup: "apparel" },
  { id: "size-3xl", name: "3XL", slug: "3xl", sizeGroup: "apparel" },
  { id: "size-4xl", name: "4XL", slug: "4xl", sizeGroup: "apparel" },
  { id: "size-xs", name: "XS", slug: "xs", sizeGroup: "apparel" }
];

function sellable(
  id: string,
  overrides: Partial<SellableSizePreviewInput> = {}
): SellableSizePreviewInput {
  return {
    id,
    productId: "product-1",
    productStatus: "active",
    variantId: "variant-1",
    sizeId: "size-2xl",
    sizeName: "2XL",
    sku: `SKU-${id}`,
    currentAdjustment: 0,
    explicitOverride: null,
    ...overrides
  };
}

describe("P8A global size adjustment policy", () => {
  it("freezes exactly the owner-approved S through 4XL policy", () => {
    expect(GLOBAL_SIZE_ADJUSTMENT_POLICY).toEqual({
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      "2XL": 10_000,
      "3XL": 20_000,
      "4XL": 30_000
    });
  });

  it.each([
    ["S", "S"],
    ["xl", "XL"],
    ["XXL", "2XL"],
    ["2-xl", "2XL"],
    ["xxxl", "3XL"],
    ["4 xl", "4XL"],
    ["XS", null],
    ["All Size", null]
  ] as const)("normalizes %s without inventing an unmanaged policy", (input, expected) => {
    expect(normalizeManagedSize(input)).toBe(expected);
  });
});

describe("P8A deterministic SKU preview", () => {
  it("shows before/after for aligned and affected discriminated rows", () => {
    const preview = buildSizeAdjustmentPolicyPreview({
      sizeMasters,
      sellableSizes: [
        sellable("aligned", {
          sizeId: "size-xl",
          sizeName: "XL",
          currentAdjustment: 0
        }),
        sellable("2xl"),
        sellable("3xl", {
          sizeId: "size-3xl",
          sizeName: "3XL",
          currentAdjustment: 5_000
        }),
        sellable("4xl", {
          sizeId: "size-4xl",
          sizeName: "4XL",
          currentAdjustment: 30_000
        })
      ]
    });

    expect(preview.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantSizeId: "aligned",
          beforeAdjustment: 0,
          afterAdjustment: 0,
          delta: 0,
          status: "ALIGNED"
        }),
        expect.objectContaining({
          variantSizeId: "2xl",
          normalizedSize: "2XL",
          beforeAdjustment: 0,
          afterAdjustment: 10_000,
          delta: 10_000,
          status: "PENDING_CHANGE"
        }),
        expect.objectContaining({
          variantSizeId: "3xl",
          beforeAdjustment: 5_000,
          afterAdjustment: 20_000,
          delta: 15_000,
          status: "PENDING_CHANGE"
        }),
        expect.objectContaining({
          variantSizeId: "4xl",
          beforeAdjustment: 30_000,
          afterAdjustment: 30_000,
          status: "ALIGNED"
        })
      ])
    );
    expect(preview.summary).toMatchObject({
      totalSkuCount: 4,
      alignedSkuCount: 2,
      affectedSkuCount: 2,
      pendingChangeCount: 2
    });
  });

  it("keeps unsupported sizes out of policy and missing master links blocked", () => {
    const preview = buildSizeAdjustmentPolicyPreview({
      sizeMasters,
      sellableSizes: [
        sellable("xs", {
          sizeId: "size-xs",
          sizeName: "XS"
        }),
        sellable("mix", {
          sizeId: null,
          sizeName: "Mix Size",
          sku: "SKU-MIX"
        })
      ]
    });

    expect(preview.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantSizeId: "xs",
          afterAdjustment: null,
          status: "OUT_OF_POLICY",
          issueCodes: ["UNMANAGED_SIZE_POLICY"]
        }),
        expect.objectContaining({
          variantSizeId: "mix",
          afterAdjustment: null,
          status: "BLOCKED",
          issueCodes: ["MISSING_SIZE_MASTER"]
        })
      ])
    );
  });

  it("blocks alias, variant-size, SKU, and frozen snapshot duplicates or conflicts", () => {
    const preview = buildSizeAdjustmentPolicyPreview({
      sizeMasters: [
        ...sizeMasters,
        {
          id: "size-xxl-duplicate",
          name: "XXL",
          slug: "xxl",
          sizeGroup: "apparel"
        }
      ],
      sellableSizes: [
        sellable("first", { sku: "sku-duplicate" }),
        sellable("second", {
          sizeId: "size-xxl-duplicate",
          sizeName: "XXL",
          sku: "SKU-DUPLICATE"
        }),
        sellable("snapshot-conflict", {
          variantId: "variant-2",
          sizeName: "3XL",
          sku: "SKU-SNAPSHOT"
        })
      ]
    });

    expect(
      preview.rows.find((row) => row.variantSizeId === "first")
    ).toMatchObject({
      status: "BLOCKED",
      issueCodes: expect.arrayContaining([
        "DUPLICATE_NORMALIZED_SIZE_MASTER",
        "DUPLICATE_NORMALIZED_VARIANT_SIZE",
        "DUPLICATE_NORMALIZED_SKU"
      ])
    });
    expect(
      preview.rows.find((row) => row.variantSizeId === "snapshot-conflict")
    ).toMatchObject({
      status: "BLOCKED",
      issueCodes: expect.arrayContaining([
        "DUPLICATE_NORMALIZED_SIZE_MASTER",
        "SIZE_SNAPSHOT_CONFLICT"
      ])
    });
  });

  it("never treats an undocumented mismatch as a valid override", () => {
    const preview = buildSizeAdjustmentPolicyPreview({
      sizeMasters,
      sellableSizes: [
        sellable("not-proven", {
          explicitOverride: {
            auditEventId: "",
            reason: " "
          }
        }),
        sellable("explicit", {
          variantId: "variant-2",
          explicitOverride: {
            auditEventId: "audit-1",
            reason: "Kontrak harga khusus yang harus ditinjau owner."
          }
        })
      ]
    });

    expect(
      preview.rows.find((row) => row.variantSizeId === "not-proven")
    ).toMatchObject({
      status: "PENDING_CHANGE",
      explicitOverride: null
    });
    expect(
      preview.rows.find((row) => row.variantSizeId === "explicit")
    ).toMatchObject({
      status: "OVERRIDE_REVIEW",
      issueCodes: ["EXPLICIT_OVERRIDE_REVIEW"],
      explicitOverride: {
        auditEventId: "audit-1",
        reason: "Kontrak harga khusus yang harus ditinjau owner."
      }
    });
  });

  it("orders identical input deterministically without product or SKU branches", () => {
    const rows = [
      sellable("z", { productId: "product-z", sku: "SKU-Z" }),
      sellable("a", { productId: "product-a", sku: "SKU-A" })
    ];
    const forward = buildSizeAdjustmentPolicyPreview({
      sizeMasters,
      sellableSizes: rows
    });
    const reverse = buildSizeAdjustmentPolicyPreview({
      sizeMasters,
      sellableSizes: [...rows].reverse()
    });

    expect(forward.rows).toEqual(reverse.rows);
    expect(forward.rows.map((row) => row.variantSizeId)).toEqual(["a", "z"]);
  });
});

describe("P8A read-only database preview", () => {
  it("uses canonical master/SKU sources and cannot mutate product data", () => {
    const sql = readFileSync(
      "supabase/sql/04_p8a_size_adjustment_preview_read_only.sql",
      "utf8"
    );

    expect(sql).toContain("public.product_size_master");
    expect(sql).toContain("public.product_variant_sizes");
    expect(sql).toContain("before_adjustment");
    expect(sql).toContain("after_adjustment");
    expect(sql).toContain("EXPLICIT_OVERRIDE_REVIEW");
    expect(sql).toContain("DUPLICATE_NORMALIZED_VARIANT_SIZE");
    expect(sql).not.toMatch(
      /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke)\b/i
    );
  });
});
