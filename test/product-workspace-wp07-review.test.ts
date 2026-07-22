import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildProductReviewDeepLink,
  buildProductReviewPayload,
  createProductReviewVersion,
  PRODUCT_REVIEW_GROUP_DEFINITIONS,
  validateProductReviewTransition,
  type ProductReviewSnapshot,
  type ProductReviewVariant
} from "@/lib/product-review";

const route = readFileSync("app/api/admin/products/[id]/review/route.ts", "utf8");
const server = readFileSync("lib/product-review-server.ts", "utf8");
const panel = readFileSync(
  "components/admin/products/workspace/ProductReviewPanel.tsx",
  "utf8"
);
const page = readFileSync("app/admin/products/[id]/review/page.tsx", "utf8");

const lifecycleCapabilities = {
  canCreateDraft: true,
  canEditDraft: true,
  canEditPublished: true,
  canPublish: true,
  canArchive: true,
  canManageDependencies: true,
  canUseMaintenance: true
};
const adminCapabilities = {
  ...lifecycleCapabilities,
  canEditPublished: false,
  canPublish: false,
  canArchive: false,
  canManageDependencies: false,
  canUseMaintenance: false
};
const guestCapabilities = {
  ...adminCapabilities,
  canCreateDraft: false,
  canEditDraft: false
};

function variant(input: Partial<ProductReviewVariant> = {}): ProductReviewVariant {
  return {
    id: input.id || "11111111-1111-4111-8111-111111111111",
    name: input.name ?? "Black",
    slug: input.slug ?? "black",
    status: input.status || "active",
    colorType: input.colorType || "solid",
    primaryHex: input.primaryHex === undefined ? "#111111" : input.primaryHex,
    secondaryHex: input.secondaryHex || null,
    tertiaryHex: input.tertiaryHex || null,
    swatchDirection: input.swatchDirection || "diagonal",
    patternImageUrl: input.patternImageUrl || null,
    colorHex: input.colorHex || "#111111",
    priceAdjustment: input.priceAdjustment ?? 0,
    imageRoles: input.imageRoles || ["front", "back", "detail", "lifestyle"],
    hasFrontImage: input.hasFrontImage ?? true,
    updatedAt: input.updatedAt || "2026-07-22T01:00:00.000Z",
    sellable: input.sellable || [{
      id: "22222222-2222-4222-8222-222222222222",
      sku: "DBR-TEST-BLACK-M",
      sizeId: "33333333-3333-4333-8333-333333333333",
      sizeName: "M",
      sizeActive: true,
      stockQuantity: 0,
      priceAdjustment: 0,
      status: "active",
      duplicateSku: false,
      updatedAt: "2026-07-22T01:00:00.000Z"
    }]
  };
}

function snapshot(input: Partial<ProductReviewSnapshot> = {}): ProductReviewSnapshot {
  return {
    id: input.id || "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: input.name ?? "7200 Premium",
    slug: input.slug ?? "7200-premium",
    status: input.status || "draft",
    productCategoryId: input.productCategoryId === undefined
      ? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      : input.productCategoryId,
    categoryActive: input.categoryActive ?? true,
    duplicateSlug: input.duplicateSlug ?? false,
    basePrice: input.basePrice ?? 47000,
    seoTitle: input.seoTitle === undefined ? "7200 Premium" : input.seoTitle,
    seoDescription: input.seoDescription === undefined
      ? "Kaos polos premium DEBRODER."
      : input.seoDescription,
    updatedAt: input.updatedAt || "2026-07-22T01:00:00.000Z",
    variants: input.variants || [variant()]
  };
}

function payload(input: {
  status?: "draft" | "active" | "archived";
  capabilities?: typeof lifecycleCapabilities;
  source?: Partial<ProductReviewSnapshot>;
} = {}) {
  const source = snapshot({ ...input.source, status: input.status || input.source?.status });
  return buildProductReviewPayload({
    role: "owner",
    capabilities: input.capabilities || lifecycleCapabilities,
    snapshot: source
  });
}

describe("WP-07 Review & Publish", () => {
  it("replaces the read-only shell with the real panel", () => {
    expect(page).toContain("ProductReviewPanel");
    expect(page).not.toContain("ProductWorkspaceReadOnlyModule");
    expect(panel).toContain("WP-07 REVIEW &amp; PUBLISH");
  });

  it("uses the eight owner-approved grouped readiness sections", () => {
    expect(PRODUCT_REVIEW_GROUP_DEFINITIONS.map((group) => group.label)).toEqual([
      "Informasi",
      "Varian",
      "SKU dan ukuran",
      "Harga",
      "Stok",
      "Media",
      "SEO",
      "Publish readiness"
    ]);
  });

  it("aggregates repeated issues but preserves backend details", () => {
    const source = snapshot({
      variants: [
        variant({ id: "11111111-1111-4111-8111-111111111111", hasFrontImage: false, imageRoles: [] }),
        variant({ id: "44444444-4444-4444-8444-444444444444", hasFrontImage: false, imageRoles: [] })
      ]
    });
    const result = payload({ source });
    const media = result.groups.find((group) => group.key === "media");
    expect(media?.issues.filter((issue) => issue.code === "media.front_missing")).toHaveLength(2);
    expect(media?.summaries.find((summary) => summary.code === "media.front_missing")?.count).toBe(2);
  });

  it("creates stable deep links with product, variant, SKU, and focus params", () => {
    const href = buildProductReviewDeepLink({
      productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      group: "sku_sizes",
      field: "variant_size.row.sku",
      variantId: "11111111-1111-4111-8111-111111111111",
      sellableId: "22222222-2222-4222-8222-222222222222",
      sku: "DBR-7200-BLACK-M"
    });
    expect(href).toContain("/admin/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/variants?");
    expect(href).toContain("variantId=11111111-1111-4111-8111-111111111111");
    expect(href).toContain("skuId=22222222-2222-4222-8222-222222222222");
    expect(href).toContain("sku=DBR-7200-BLACK-M");
    expect(href).toContain("focus=variant_size.row.sku");
  });

  it("keeps Draft incomplete saveable but blocks Publish", () => {
    const result = payload({ source: { variants: [] } });
    expect(result.product.status).toBe("draft");
    expect(result.canPublishNow).toBe(false);
    expect(validateProductReviewTransition({ action: "publish", payload: result }))
      .toBe("Produk masih memiliki blocker Publish.");
  });

  it("allows complete Draft to Publish and only Active to Archive", () => {
    const draft = payload();
    expect(draft.canPublishNow).toBe(true);
    expect(validateProductReviewTransition({ action: "publish", payload: draft })).toBeNull();
    expect(validateProductReviewTransition({ action: "archive", payload: draft }))
      .toBe("Archive hanya dapat mengubah Active menjadi Archived.");

    const active = payload({ status: "active" });
    expect(active.canPublishNow).toBe(false);
    expect(active.canArchiveNow).toBe(true);
    expect(validateProductReviewTransition({ action: "publish", payload: active }))
      .toBe("Publish hanya dapat mengubah Draft menjadi Active.");
    expect(validateProductReviewTransition({ action: "archive", payload: active })).toBeNull();

    const archived = payload({ status: "archived" });
    expect(archived.canPublishNow).toBe(false);
    expect(archived.canArchiveNow).toBe(false);
  });

  it.each([
    ["owner", lifecycleCapabilities, true],
    ["superadmin", lifecycleCapabilities, true],
    ["admin", adminCapabilities, false],
    ["admin_guest", guestCapabilities, false]
  ])("preserves role capability for %s", (
    role: string,
    capabilities: typeof lifecycleCapabilities,
    lifecycleAllowed: boolean
  ) => {
    const result = buildProductReviewPayload({
      role,
      capabilities,
      snapshot: snapshot()
    });
    expect(result.canPublishNow).toBe(lifecycleAllowed);
  });

  it("keeps stock zero valid", () => {
    const result = payload();
    expect(result.issues.some((issue) => issue.group === "stock")).toBe(false);
  });

  it("blocks missing front but not missing Back, Detail, Lifestyle", () => {
    const frontMissing = payload({
      source: { variants: [variant({ imageRoles: [], hasFrontImage: false })] }
    });
    expect(frontMissing.issues.some((issue) => issue.code === "media.front_missing" && issue.severity === "error")).toBe(true);

    const optionalMissing = payload({
      source: { variants: [variant({ imageRoles: ["front"], hasFrontImage: true })] }
    });
    expect(optionalMissing.canPublishNow).toBe(true);
    expect(optionalMissing.issues.some((issue) => issue.code === "media.recommended_missing" && issue.severity === "warning")).toBe(true);
  });

  it("supports solid, combination, and pattern color contracts", () => {
    const colors = [
      variant({ id: "11111111-1111-4111-8111-111111111111", colorType: "solid", primaryHex: "#111111" }),
      variant({ id: "22222222-2222-4222-8222-222222222222", colorType: "combination", primaryHex: "#111111", secondaryHex: "#FFFFFF" }),
      variant({ id: "33333333-3333-4333-8333-333333333333", colorType: "pattern", patternImageUrl: "https://example.com/pattern.webp" })
    ];
    const result = payload({ source: { variants: colors } });
    expect(result.issues.some((issue) => issue.code.includes("color_invalid"))).toBe(false);
  });

  it("blocks no active SKU, duplicate SKU, and inactive size", () => {
    const noSku = payload({ source: { variants: [variant({ sellable: [] })] } });
    expect(noSku.issues.some((issue) => issue.code === "sku_sizes.none_active")).toBe(true);

    const duplicate = payload({
      source: {
        variants: [variant({
          sellable: [{
            ...variant().sellable[0],
            duplicateSku: true
          }]
        })]
      }
    });
    expect(duplicate.issues.some((issue) => issue.code === "sku_sizes.sku_duplicate")).toBe(true);

    const inactiveSize = payload({
      source: {
        variants: [variant({
          sellable: [{
            ...variant().sellable[0],
            sizeActive: false
          }]
        })]
      }
    });
    expect(inactiveSize.issues.some((issue) => issue.code === "sku_sizes.size_inactive")).toBe(true);
  });

  it("handles 15 colors and 7200 Premium 34 colors / 176 SKU deterministically", () => {
    const buildVariants = (colorCount: number, skuCount: number) => {
      let remaining = skuCount;
      return Array.from({ length: colorCount }, (_, colorIndex) => {
        const count = Math.ceil(remaining / (colorCount - colorIndex));
        remaining -= count;
        const id = `${String(colorIndex + 1).padStart(8, "0")}-1111-4111-8111-${String(colorIndex + 1).padStart(12, "0")}`;
        return variant({
          id,
          name: `Color ${colorIndex + 1}`,
          slug: `color-${colorIndex + 1}`,
          sellable: Array.from({ length: count }, (_, skuIndex) => ({
            ...variant().sellable[0],
            id: `${String(colorIndex + 1).padStart(8, "0")}-2222-4222-8222-${String(skuIndex + 1).padStart(12, "0")}`,
            sku: `DBR-7200-C${colorIndex + 1}-S${skuIndex + 1}`
          }))
        });
      });
    };
    const medium = payload({ source: { variants: buildVariants(15, 75) } });
    expect(medium.counts.activeVariants).toBe(15);
    expect(medium.counts.activeSellableSkus).toBe(75);

    const premiumSource = snapshot({ variants: buildVariants(34, 176) });
    const premium = buildProductReviewPayload({
      role: "owner",
      capabilities: lifecycleCapabilities,
      snapshot: premiumSource
    });
    expect(premium.counts.activeVariants).toBe(34);
    expect(premium.counts.activeSellableSkus).toBe(176);
    expect(createProductReviewVersion(premiumSource)).toBe(createProductReviewVersion(premiumSource));
  });

  it("implements server authority, scoped ownership queries, and 409 concurrency", () => {
    expect(route).toContain("export async function GET");
    expect(route).toContain("export async function PATCH");
    expect(route).not.toContain("export async function POST");
    expect(route).not.toContain("export async function DELETE");
    expect(route).toContain("expectedUpdatedAt");
    expect(route).toContain("expectedReviewVersion");
    expect(server).toContain('eq("product_id", productId)');
    expect(server).toContain('"product_variant_sizes"');
    expect(server).toContain('"product_variant_images"');
    expect(server).toContain('in(column, chunk)');
    expect(server).not.toContain('.from("product_variant_sizes").select(SELLABLE_FIELDS)');
    expect(server).toContain("throw conflict()");
    expect(server).toContain("rollbackLifecycle");
    expect(panel).toContain("Konflik versi");
    expect(panel).toContain("Muat ulang data terbaru");
  });

  it("does not change schema, RLS, inventory, hard delete, or WP-08", () => {
    const source = `${route}\n${server}\n${panel}`.toLowerCase();
    expect(source).not.toContain("create table");
    expect(source).not.toContain("alter table");
    expect(source).not.toContain("create policy");
    expect(source).not.toContain("drop table");
    expect(source).not.toContain(".delete(");
    expect(source).not.toContain("legacy stock");
    expect(source).not.toContain("wp-08");
  });
});
