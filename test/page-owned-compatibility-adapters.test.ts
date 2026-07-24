import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  adaptLegacyProductToFocusedReadModel,
  adaptPimProductToCanonicalReadModel,
  mapCompatibleStock,
  mapDatabaseErrorCompatibility,
  normalizePanelRole,
  readLegacyCartStorage
} from "@/lib/compatibility";
import type { PimProduct, Product } from "@/lib/types";

const compatibilityDirectory = "lib/compatibility";
const compatibilityFiles = readdirSync(compatibilityDirectory)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => join(compatibilityDirectory, file));
const source = compatibilityFiles.map((file) => readFileSync(file, "utf8")).join("\n").toLowerCase();

const legacyProduct = {
  id: "product-1",
  nama: "Kaos Polos",
  kategori: "Kaos Polos",
  deskripsi: "Cotton combed",
  badge: "",
  gambar_url: "/product.webp",
  whatsapp_link: "#",
  price: 45000,
  slug: "kaos-polos",
  stock: 12,
  urutan: 1,
  status_aktif: true
} satisfies Product;

const pimProduct = {
  id: "product-1",
  name: "Kaos Polos",
  slug: "kaos-polos",
  productCategoryId: "category-1",
  category: {
    id: "category-1",
    name: "Kaos Polos",
    slug: "kaos-polos",
    description: null,
    status: "active",
    sortOrder: 1
  },
  basePrice: 45000,
  description: null,
  status: "active",
  sku: "KCC24",
  variants: [
    {
      id: "variant-1",
      productId: "product-1",
      name: "Hitam",
      slug: "hitam",
      hexCode: "#111111",
      sku: "KCC24-HITAM",
      sortOrder: 1,
      isDefault: true,
      status: "active",
      priceAdjustment: 0,
      images: [],
      sizes: [
        {
          id: "variant-size-1",
          variantId: "variant-1",
          sizeId: "size-1",
          sku: "KCC24-HITAM-M",
          stockQuantity: 10,
          priceAdjustment: 0,
          status: "active",
          size: {
            id: "size-1",
            name: "M",
            slug: "m",
            sortOrder: 1,
            status: "active",
            priceAdjustment: 0
          }
        }
      ]
    }
  ],
  priceTiers: [],
  minimumRule: null
} satisfies PimProduct;

describe("Page-Owned compatibility adapter foundation", () => {
  it("maps legacy and PIM products without creating identity, price, SKU, or stock", () => {
    const legacy = adaptLegacyProductToFocusedReadModel(legacyProduct);
    expect(legacy.compatible).toBe(true);
    if (legacy.compatible) {
      expect(legacy.value.productId).toBe("product-1");
      expect(legacy.value.pricing).toMatchObject({ status: "known", amount: 45000, source: "price" });
      expect(legacy.value.stock).toMatchObject({ status: "known", quantity: 12, source: "stock" });
    }

    const pim = adaptPimProductToCanonicalReadModel(pimProduct);
    expect(pim.compatible).toBe(true);
    if (pim.compatible) {
      expect(pim.value.sellables).toHaveLength(1);
      expect(pim.value.sellables[0]).toMatchObject({
        variantId: "variant-1",
        variantSizeId: "variant-size-1",
        sku: "KCC24-HITAM-M"
      });
    }
  });

  it("keeps conflicting stock and prices explicit instead of selecting one", () => {
    expect(mapCompatibleStock({ stock: 4, stock_quantity: 5 })).toEqual({
      status: "conflict",
      quantity: null,
      source: "conflict",
      candidates: { stock: 4, stockQuantity: 5 }
    });

    const result = adaptLegacyProductToFocusedReadModel({
      ...legacyProduct,
      price: 45000,
      harga: 47000
    });
    expect(result.compatible).toBe(true);
    if (result.compatible) {
      expect(result.value.pricing.status).toBe("conflict");
      expect(result.issues.some((issue) => issue.code === "legacy_product.price_conflict")).toBe(true);
    }
  });

  it("reads cart v1-v4 without changing a storage writer and quarantines synthetic Jersey lines", () => {
    const result = readLegacyCartStorage([
      {
        cartId: "ready-line",
        id: "product-1",
        name: "Kaos Polos",
        variantId: "variant-1",
        variantSizeId: "variant-size-1",
        variantSku: "KCC24-HITAM-M",
        quantity: 2,
        notes: ""
      },
      {
        cartId: "jersey-line",
        id: "jersey-config-1",
        name: "Jersey Custom",
        variantSku: "JERSEY-CONFIG",
        variantSnapshot: { configurator_type: "jersey" },
        quantity: 12
      }
    ], "v4");

    expect(result.adaptedLines[0]?.lineType).toBe("ready_stock");
    expect(result.entries[1]).toMatchObject({
      classification: "legacy_unsupported",
      reasonCode: "legacy_cart.jersey_synthetic_line"
    });
    expect(result.adaptedLines[1]).toMatchObject({
      lineType: "legacy_unsupported",
      checkoutEligible: false,
      displayPricing: null
    });
  });

  it("does not fabricate a cart line ID when the legacy source does not contain one", () => {
    const result = readLegacyCartStorage([{ name: "Old line", quantity: 1 }], "v1");
    expect(result.entries[0]).toMatchObject({
      classification: "legacy_unsupported",
      sourceLineId: null,
      line: null
    });
  });

  it("reports malformed storage roots without fabricating cart entries", () => {
    expect(readLegacyCartStorage("{broken", "v2")).toMatchObject({
      storageIssue: "invalid_json",
      entries: [],
      adaptedLines: []
    });
    expect(readLegacyCartStorage({ items: [] }, "v3")).toMatchObject({
      storageIssue: "non_array_root",
      entries: [],
      adaptedLines: []
    });
  });

  it("normalizes only the approved panel-role alias", () => {
    expect(normalizePanelRole("super_admin")).toEqual({
      supported: true,
      canonicalRole: "superadmin",
      sourceRole: "super_admin",
      usedLegacyAlias: true
    });
    expect(normalizePanelRole("designer")).toMatchObject({
      supported: false,
      canonicalRole: null,
      reason: "unsupported_role"
    });
  });

  it("maps database errors to safe public output while retaining internal evidence separately", () => {
    const mapped = mapDatabaseErrorCompatibility({
      error: { code: "23505", message: "sensitive constraint detail", details: "private row detail" },
      referenceId: "ref-1",
      occurredAt: "2026-07-23T00:00:00.000Z",
      operation: "compatibility-test"
    });
    expect(mapped.publicError).toMatchObject({
      code: "infrastructure.conflict",
      referenceId: "ref-1",
      retryable: false
    });
    expect(mapped.publicError.message).not.toContain("sensitive");
    expect(mapped.internalError.context).toMatchObject({ sourceCode: "23505" });
  });

  it("stays additive and framework/database/browser independent", () => {
    expect(source).not.toContain('from "react"');
    expect(source).not.toContain('from "next');
    expect(source).not.toContain("@supabase");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("localstorage");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("document.");
  });
});
