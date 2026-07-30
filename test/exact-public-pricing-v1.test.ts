import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isCheckoutEligibleCustomPricing,
  isFinalExactCustomPricing,
  isOrderFirstCustomPricing
} from "@/lib/custom-commerce/exact-pricing";
import type { CustomProjectPricing } from "@/lib/custom-commerce/types";

function exactPricing(): CustomProjectPricing {
  return {
    projectId: "project-exact",
    status: "final",
    totalQuantity: 2,
    finalTotal: 90000,
    estimatedMinTotal: null,
    estimatedMaxTotal: null,
    lines: [{
      key: "product:item:allocation",
      label: "Produk · Hitam · M",
      displayLabel: "Produk · Hitam · M",
      quantity: 2,
      unitPrice: 45000,
      subtotal: 90000,
      kind: "product",
      componentType: "product_base",
      sourceRuleId: "pim-variant-size:variant-size",
      calculationBasis: "pim_tier"
    }],
    issues: [],
    pricedAt: "2026-07-28T00:00:00.000Z"
  };
}

describe("Exact Public Pricing V1", () => {
  it("accepts only exact final pricing or a clean order-first result", () => {
    const exact = exactPricing();
    expect(isFinalExactCustomPricing(exact)).toBe(true);
    expect(isCheckoutEligibleCustomPricing(exact)).toBe(true);

    const orderFirst: CustomProjectPricing = {
      ...exact,
      status: "quotation_required",
      finalTotal: null,
      lines: exact.lines.map((line) => ({
        ...line,
        unitPrice: null,
        subtotal: null,
        calculationBasis: "quotation"
      }))
    };
    expect(isOrderFirstCustomPricing(orderFirst)).toBe(true);
    expect(isCheckoutEligibleCustomPricing(orderFirst)).toBe(true);

    const estimated: CustomProjectPricing = {
      ...orderFirst,
      status: "estimated",
      estimatedMinTotal: 80000,
      estimatedMaxTotal: 100000
    };
    expect(isCheckoutEligibleCustomPricing(estimated)).toBe(false);
  });

  it("keeps active public price producers server-authoritative", () => {
    const panel = readFileSync("components/TieredProductPurchasePanel.tsx", "utf8");
    const endpoint = readFileSync("app/api/pricing/ready-stock/route.ts", "utf8");
    const quickAdd = readFileSync("lib/public-quick-add.ts", "utf8");
    const card = readFileSync("lib/product-card.ts", "utf8");
    const serviceCatalog = readFileSync("components/ServiceCatalog.tsx", "utf8");
    const dtfDetail = readFileSync("app/sablon-dtf/[slug]/page.tsx", "utf8");

    expect(panel).toContain('fetch("/api/pricing/ready-stock"');
    expect(panel).toContain('pricing_source: "server_canonical"');
    expect(panel).toContain("pricingRequestKey");
    expect(panel).toContain('throw new Error("PRICE_RESPONSE_MISMATCH")');
    expect(panel).toContain("Harga belum dapat dikonfirmasi. Coba lagi.");
    expect(panel).not.toContain('from("product_price_tiers")');
    expect(endpoint).toContain("resolveReadyStockSelectionPricing");
    expect(quickAdd).not.toContain("priceValue:");
    expect(card).not.toMatch(/`Mulai\s/);
    expect(serviceCatalog).not.toContain("formatRupiah(service.harga_mulai)");
    expect(serviceCatalog).not.toMatch(/Mulai\s*\{/);
    expect(dtfDetail).not.toContain("formatRupiah(service.harga_mulai)");
    expect(dtfDetail).not.toMatch(/Mulai\s*\{/);
  });

  it("does not publish estimated custom totals or enable payment before final pricing", () => {
    const pricing = readFileSync("lib/custom-commerce/pricing.ts", "utf8");
    const builder = readFileSync("components/custom/CustomProjectBuilder.tsx", "utf8");
    const checkout = readFileSync("components/checkout/CheckoutClient.tsx", "utf8");
    const checkoutRoute = readFileSync("app/api/checkout/route.ts", "utf8");
    const cartProvider = readFileSync("components/CartProvider.tsx", "utf8");

    expect(pricing).toContain("estimatedMinTotal: null");
    expect(pricing).toContain("toPublicCustomPricing");
    expect(builder).not.toContain("pricing.estimatedMinTotal");
    expect(builder).not.toContain("pricing.estimatedMaxTotal");
    expect(checkout).toContain("Pembayaran belum tersedia");
    expect(checkoutRoute).toContain("isCheckoutEligibleCustomPricing");
    expect(builder).toContain("pricingRequestVersion");
    expect(cartProvider).toContain("CART_REVALIDATION_SUPERSEDED");
  });
});
