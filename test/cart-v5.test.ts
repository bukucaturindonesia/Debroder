import { describe, expect, it } from "vitest";
import {
  applyReadyStockRevalidation,
  CART_V5_VERSION,
  createConfiguredProductCartItem,
  createCustomProjectCartItem,
  createLegacyUnsupportedCartItem,
  createReadyStockCartItem,
  getCartCheckoutDecision,
  markReadyStockLinesStale,
  MAX_CART_LINES,
  MAX_CART_LINE_QUANTITY,
  MAX_CART_TOTAL_QUANTITY,
  migrateLegacyCart,
  restoreCartV5,
  serializeCartV5,
  validateCartLimits,
  type CartItem
} from "@/lib/cart-v5";
import { CONTRACT_VERSIONS } from "@/lib/contracts";
import type {
  ConfiguredProductSnapshot,
  PricingSnapshot
} from "@/lib/contracts";
import type { CustomProjectSnapshot } from "@/lib/custom-commerce/types";

const NOW = "2026-07-24T00:00:00.000Z";
const PRODUCT_ID = "10000000-0000-4000-8000-000000000001";
const VARIANT_ID = "10000000-0000-4000-8000-000000000002";
const VARIANT_SIZE_ID = "10000000-0000-4000-8000-000000000003";

function readyStockLine(
  input: {
    lineId?: string;
    quantity?: number;
    validation?: CartItem["validation"];
    priceValue?: number;
  } = {}
) {
  const line = createReadyStockCartItem({
    lineId: input.lineId ?? "ready-line",
    quantity: input.quantity ?? 2,
    productId: PRODUCT_ID,
    variantId: VARIANT_ID,
    variantSizeId: VARIANT_SIZE_ID,
    sku: "SKU-CANONICAL",
    display: { title: "Produk Canonical", href: "/produk/canonical" },
    ui: {
      role: "primary",
      name: "Produk Canonical",
      priceLabel: "Rp45.000",
      priceValue: input.priceValue ?? 45000,
      color: "Hitam",
      size: "M",
      variantSnapshot: {
        product_id: PRODUCT_ID,
        applied_tier: { id: "tier-1" }
      }
    }
  });
  return {
    ...line,
    validation: input.validation ?? line.validation
  } satisfies CartItem;
}

function pricingSnapshot(): PricingSnapshot {
  return {
    contractVersion: CONTRACT_VERSIONS.pricing,
    snapshotId: "pricing-snapshot-1",
    immutable: true,
    inputFingerprint: "fixture",
    status: "priced",
    quantity: 2,
    lines: [],
    totals: {
      subtotal: { currency: "IDR", amount: 90000 },
      discount: null,
      shipping: null,
      tax: null,
      grandTotal: { currency: "IDR", amount: 90000 }
    },
    sourceReferences: [],
    policyReferences: [],
    warnings: [],
    pricedAt: NOW
  };
}

function configuredSnapshot(): ConfiguredProductSnapshot {
  return {
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    snapshotId: "configured-snapshot-1",
    definition: {
      contractVersion: CONTRACT_VERSIONS.configuredProduct,
      id: "definition-1",
      version: "1",
      code: "generic-configured",
      name: "Configured Product",
      pricingMode: "server_priced",
      optionGroups: [],
      compatibilityRules: [],
      allocationDimensions: [],
      serviceRequirements: [],
      uploadRequirements: [],
      policyReferences: []
    },
    draft: {
      contractVersion: CONTRACT_VERSIONS.configuredProduct,
      id: "configuration-1",
      definitionId: "definition-1",
      definitionVersion: "1",
      quantity: 2,
      selections: [],
      allocations: [],
      services: [],
      uploads: [],
      createdAt: NOW,
      updatedAt: NOW
    },
    validation: {
      valid: true,
      pricingStatus: "priced",
      issues: [],
      warnings: [],
      validatedAt: NOW
    },
    pricing: pricingSnapshot(),
    immutable: true,
    capturedAt: NOW
  };
}

function customSnapshot(): CustomProjectSnapshot {
  return {
    version: 1,
    id: "custom-project-1",
    mode: "free",
    presetId: null,
    categoryId: "10000000-0000-4000-8000-000000000010",
    categoryName: "Kategori Custom",
    categorySlug: "kategori-custom",
    sessionToken: "1234567890abcdef1234567890abcdef",
    items: [{
      id: "custom-item-1",
      categoryId: "10000000-0000-4000-8000-000000000010",
      categoryName: "Kategori Custom",
      categorySlug: "kategori-custom",
      productId: "10000000-0000-4000-8000-000000000011",
      productName: "Produk Custom",
      productSlug: "produk-custom",
      allocations: [{
        id: "allocation-1",
        variantId: "10000000-0000-4000-8000-000000000012",
        variantSizeId: "10000000-0000-4000-8000-000000000013",
        variantName: "Hitam",
        colorHex: "#111111",
        sizeName: "M",
        sku: "CUSTOM-SKU",
        quantity: 12,
        designPackageId: null
      }],
      designPackages: [],
      personalization: {
        ruleId: null,
        mode: "same_for_all",
        sharedValue: "",
        entries: []
      },
      uploads: [],
      note: "",
      leadTime: "7 hari"
    }],
    note: "",
    createdAt: NOW,
    updatedAt: NOW,
    pricing: {
      projectId: "custom-project-1",
      status: "final",
      totalQuantity: 12,
      finalTotal: 600000,
      estimatedMinTotal: null,
      estimatedMaxTotal: null,
      lines: [],
      issues: [],
      pricedAt: NOW
    }
  };
}

function allDiscriminatedLines(): CartItem[] {
  return [
    readyStockLine({
      validation: { status: "valid", validatedAt: NOW }
    }),
    createConfiguredProductCartItem({
      lineId: "configured-line",
      quantity: 2,
      display: { title: "Configured Product" },
      configurationSnapshot: configuredSnapshot(),
      ui: { role: "additional", name: "Configured Product" }
    }),
    createCustomProjectCartItem({
      lineId: "custom-line",
      project: customSnapshot(),
      display: { title: "Custom Project" },
      ui: { role: "additional", name: "Custom Project" }
    }),
    createLegacyUnsupportedCartItem({
      lineId: "legacy-line",
      legacyStorageVersion: "v3",
      reasonCode: "legacy_cart.incomplete_identity",
      rawLine: { name: "Legacy Item", quantity: 1 },
      display: { title: "Legacy Item" },
      ui: { role: "additional", name: "Legacy Item" }
    })
  ];
}

describe("P6 Cart v5", () => {
  it("migrates a complete v4 Ready Stock line deterministically", () => {
    const raw = JSON.stringify([{
      cartId: "legacy-ready",
      id: PRODUCT_ID,
      name: "Produk Canonical",
      priceLabel: "Rp45.000",
      priceValue: 45000,
      variantId: VARIANT_ID,
      variantSizeId: VARIANT_SIZE_ID,
      variantSku: "SKU-CANONICAL",
      quantity: 2,
      color: "Hitam",
      size: "M",
      notes: "",
      variantSnapshot: { product_id: PRODUCT_ID }
    }]);

    const first = migrateLegacyCart(raw, "v4", NOW);
    const second = migrateLegacyCart(raw, "v4", NOW);

    expect(first).toEqual(second);
    expect(first.cart).toMatchObject({
      version: CART_V5_VERSION,
      contractVersion: CONTRACT_VERSIONS.cartLine,
      lines: [{
        lineId: "legacy-ready",
        lineType: "ready_stock",
        productId: PRODUCT_ID,
        variantId: VARIANT_ID,
        variantSizeId: VARIANT_SIZE_ID,
        sku: "SKU-CANONICAL",
        quantity: 2,
        priceValue: 45000,
        validation: { status: "stale" }
      }]
    });
  });

  it("quarantines unsupported legacy data without inventing transaction identity", () => {
    const raw = JSON.stringify([{
      cartId: "legacy-configured",
      name: "Konfigurasi lama",
      quantity: 12,
      variantSnapshot: { configurator_type: "legacy-configurator" }
    }]);

    const result = migrateLegacyCart(raw, "v4", NOW);

    expect(result.cart.lines[0]).toMatchObject({
      lineId: "legacy-configured",
      lineType: "legacy_unsupported",
      checkoutEligible: false,
      reasonCode: "legacy_cart.incomplete_ready_stock_identity",
      rawLine: { name: "Konfigurasi lama", quantity: 12 }
    });
    expect(getCartCheckoutDecision([...result.cart.lines])).toMatchObject({
      allowed: false,
      code: "CART_LEGACY_UNSUPPORTED"
    });
  });

  it("serializes and restores every discriminated line", () => {
    const raw = serializeCartV5(allDiscriminatedLines(), NOW);
    const restored = restoreCartV5(raw, [], NOW);

    expect(restored.cart.version).toBe(5);
    expect(restored.cart.lines.map((line) => line.lineType)).toEqual([
      "ready_stock",
      "configured_product",
      "custom_project",
      "legacy_unsupported"
    ]);
    expect(restored.cart.lines[0]).toMatchObject({
      priceValue: 45000,
      validation: {
        status: "stale",
        lastValidatedAt: NOW,
        retryable: true
      }
    });
    expect(restored.cart.lines[2]).toMatchObject({
      projectId: "custom-project-1",
      quantity: 12,
      customProject: { pricing: { finalTotal: 600000 } }
    });
  });

  it("enforces line, per-line quantity, and total quantity limits", () => {
    expect(validateCartLimits(
      Array.from({ length: MAX_CART_LINES + 1 }, (_, index) =>
        readyStockLine({ lineId: `line-${index}`, quantity: 1 })
      )
    )).toMatchObject({
      ok: false,
      issue: { code: "CART_MAX_LINES_EXCEEDED" }
    });
    expect(validateCartLimits([
      readyStockLine({ quantity: MAX_CART_LINE_QUANTITY + 1 })
    ])).toMatchObject({
      ok: false,
      issue: { code: "CART_MAX_LINE_QUANTITY_EXCEEDED" }
    });
    expect(validateCartLimits([
      ...Array.from({ length: 5 }, (_, index) =>
        readyStockLine({ lineId: `line-${index}`, quantity: 100 })
      ),
      readyStockLine({ lineId: "line-over-total", quantity: 1 })
    ])).toMatchObject({
      ok: false,
      issue: { code: "CART_MAX_TOTAL_QUANTITY_EXCEEDED" }
    });
    expect(MAX_CART_TOTAL_QUANTITY).toBe(500);
  });

  it("preserves the display snapshot when revalidation fails", () => {
    const stale = markReadyStockLinesStale(
      [readyStockLine({ priceValue: 45000 })],
      {
        code: "CART_REVALIDATION_UNAVAILABLE",
        message: "Server tidak tersedia."
      }
    );

    expect(stale[0]).toMatchObject({
      priceValue: 45000,
      priceLabel: "Rp45.000",
      validation: {
        status: "stale",
        retryable: true,
        warning: { code: "CART_REVALIDATION_UNAVAILABLE" }
      }
    });
    expect(getCartCheckoutDecision(stale)).toMatchObject({
      allowed: false,
      code: "CART_REVALIDATION_REQUIRED"
    });
  });

  it("allows retry to replace stale display data with a valid server result", () => {
    const stale = markReadyStockLinesStale(
      [readyStockLine({ priceValue: 45000 })],
      { code: "CART_REVALIDATION_UNAVAILABLE", message: "Coba lagi." }
    );
    const retried = applyReadyStockRevalidation(stale, [{
      product_variant_size_id: VARIANT_SIZE_ID,
      status: "ok",
      error_code: null,
      latest_unit_price: 47000,
      stock_available: 8,
      message: null
    }], NOW);

    expect(retried.readyStockValid).toBe(true);
    expect(retried.lines[0]).toMatchObject({
      priceValue: 47000,
      stockAvailable: 8,
      validation: { status: "valid", validatedAt: NOW }
    });
    expect(getCartCheckoutDecision(retried.lines)).toEqual({
      allowed: true,
      mode: "ready_stock"
    });
  });

  it("keeps checkout fail-closed until Ready Stock has latest validation", () => {
    expect(getCartCheckoutDecision([readyStockLine()])).toMatchObject({
      allowed: false,
      code: "CART_REVALIDATION_REQUIRED"
    });
    expect(getCartCheckoutDecision([
      readyStockLine({ validation: { status: "valid", validatedAt: NOW } })
    ])).toEqual({
      allowed: true,
      mode: "ready_stock"
    });
  });

  it("rejects mixed checkout modes and accepts one mode per command", () => {
    const ready = readyStockLine({
      validation: { status: "valid", validatedAt: NOW }
    });
    const custom = createCustomProjectCartItem({
      lineId: "custom-line",
      project: customSnapshot(),
      display: { title: "Custom Project" }
    });

    expect(getCartCheckoutDecision([ready, custom])).toMatchObject({
      allowed: false,
      code: "CART_MIXED_CHECKOUT_MODE"
    });
    expect(getCartCheckoutDecision([custom])).toEqual({
      allowed: true,
      mode: "custom_project"
    });
    expect(getCartCheckoutDecision([
      createConfiguredProductCartItem({
        lineId: "configured-line",
        quantity: 2,
        display: { title: "Configured Product" },
        configurationSnapshot: configuredSnapshot()
      })
    ])).toEqual({
      allowed: true,
      mode: "configured_product"
    });
  });

  it("keeps oversized legacy carts as an explicit unsupported issue", () => {
    const raw = JSON.stringify([{
      cartId: "unsafe-line",
      id: PRODUCT_ID,
      name: "Produk lama",
      variantId: VARIANT_ID,
      variantSizeId: VARIANT_SIZE_ID,
      variantSku: "SKU-CANONICAL",
      quantity: 101
    }]);

    const migrated = migrateLegacyCart(raw, "v4", NOW);

    expect(migrated.cart.lines).toHaveLength(1);
    expect(migrated.cart.lines[0]).toMatchObject({
      lineType: "legacy_unsupported",
      reasonCode: "CART_LEGACY_LINE_QUANTITY_UNSAFE",
      rawLine: { storedLines: [{ quantity: 101 }] }
    });
  });
});
