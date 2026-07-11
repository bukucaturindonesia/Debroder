import { describe, expect, it } from "vitest";
import { sampleProducts } from "@/data/sample-products";
import {
  applyProductTierToItems,
  createServiceAllocation,
  defaultCustomServices,
  summarizeBulkOrder,
  validateMinimumOrder,
  validateServiceQuantityInputs
} from "@/lib/bulk-ordering";
import { createCartItem } from "@/lib/cart/operations";
import { buildWhatsAppMessage } from "@/lib/whatsapp";

describe("v1.1 bulk and custom ordering", () => {
  const product = sampleProducts[0];
  const blackVariant = product.variants[0];
  const blackMedium = blackVariant.sizes.find((size) => size.size.slug === "m");
  const whiteVariant = product.variants[1];
  const whiteMedium = whiteVariant.sizes.find((size) => size.size.slug === "m");

  it("applies a quantity tier across colors and sizes", () => {
    expect(blackMedium).toBeDefined();
    expect(whiteMedium).toBeDefined();
    if (!blackMedium || !whiteMedium) {
      return;
    }

    const items = applyProductTierToItems(product, [
      createCartItem(product, blackVariant, blackMedium, 10),
      createCartItem(product, whiteVariant, whiteMedium, 2)
    ]);

    expect(items[0]?.price_tier?.tier_id).toBe("tier-kcc24-12");
    expect(items[0]?.unit_price).toBe(42000);
    expect(items[1]?.unit_price).toBe(42000);
  });

  it("blocks orders below the configured minimum", () => {
    const issues = validateMinimumOrder(product, 3);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.field).toBe("minimum_quantity");
  });

  it("detects exclusive custom service conflicts", () => {
    const dtf = defaultCustomServices.find((service) => service.slug === "sablon-dtf");
    const bordir = defaultCustomServices.find(
      (service) => service.slug === "bordir-komputer"
    );

    expect(dtf).toBeDefined();
    expect(bordir).toBeDefined();
    if (!dtf || !bordir) {
      return;
    }

    const issues = validateServiceQuantityInputs([dtf, bordir], 8, {
      [dtf.slug]: 5,
      [bordir.slug]: 5
    });

    expect(issues.some((issue) => issue.field === "print-method")).toBe(true);
  });

  it("rejects partial service quantity above total item quantity", () => {
    const service = defaultCustomServices.find(
      (candidate) => candidate.slug === "tambah-nomor"
    );

    expect(service).toBeDefined();
    if (!service) {
      return;
    }

    const issues = validateServiceQuantityInputs([service], 8, {
      [service.slug]: 9
    });

    expect(issues.some((issue) => issue.field === service.slug)).toBe(true);
  });

  it("includes custom services in totals and WhatsApp payload", () => {
    expect(blackMedium).toBeDefined();
    if (!blackMedium) {
      return;
    }

    const service = defaultCustomServices.find(
      (candidate) => candidate.slug === "tambah-nama"
    );
    expect(service).toBeDefined();
    if (!service) {
      return;
    }

    const [tieredItem] = applyProductTierToItems(product, [
      createCartItem(product, blackVariant, blackMedium, 12)
    ]);
    expect(tieredItem).toBeDefined();
    if (!tieredItem) {
      return;
    }
    const item = {
      ...tieredItem,
      services: [createServiceAllocation(service, 12, "Nama per pemain")]
    };
    const summary = summarizeBulkOrder(product, [item]);
    const message = buildWhatsAppMessage([item]);

    expect(summary.estimatedProductTotal).toBe(504000);
    expect(summary.estimatedServiceTotal).toBe(144000);
    expect(message).toContain("Tambah Nama");
    expect(message).toContain("Nama per pemain");
  });
});
