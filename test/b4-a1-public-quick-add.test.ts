import { describe, expect, it } from "vitest";
import { resolvePublicQuickAdd } from "@/lib/public-quick-add";
import type { Product } from "@/lib/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "412add8b-998d-4ee9-a793-c0e589ee5eff",
    nama: "Cotton Combed 24s",
    kategori: "Kaos Polos",
    deskripsi: "Produk pilot Ready Stock",
    badge: "",
    gambar_url: "/product.webp",
    image_url: "/product.webp",
    whatsapp_link: "",
    urutan: 1,
    status: "active",
    status_aktif: true,
    product_type: "standard_product",
    pricing_mode: "variant_based",
    base_price: 45000,
    variants: [],
    ...overrides
  };
}

const input = {
  detailHref: "/produk/cotton-combed-24s",
  imageUrl: "/product.webp",
  imageAlt: "Cotton Combed 24s",
  priceLabel: "Rp45.000"
};

describe("B4-A1 public Quick Add canonical", () => {
  it("does not add a multi-SKU product directly from a public card", () => {
    const result = resolvePublicQuickAdd(product({
      variants: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          product_id: "412add8b-998d-4ee9-a793-c0e589ee5eff",
          variant_name: "Hitam",
          color_name: "Hitam",
          color_hex: "#111111",
          is_active: true,
          status: "active",
          sort_order: 1,
          sizes: [
            {
              id: "21111111-1111-4111-8111-111111111111",
              variant_id: "11111111-1111-4111-8111-111111111111",
              size_name: "S",
              sku: "CC24-HITAM-S",
              stock: 10,
              is_active: true,
              status: "active",
              sort_order: 1
            },
            {
              id: "31111111-1111-4111-8111-111111111111",
              variant_id: "11111111-1111-4111-8111-111111111111",
              size_name: "M",
              sku: "CC24-HITAM-M",
              stock: 10,
              is_active: true,
              status: "active",
              sort_order: 2
            }
          ]
        }
      ]
    }), input);

    expect(result).toEqual({ mode: "options", reason: "multiple_options" });
  });

  it("adds only the sole active in-stock canonical SKU", () => {
    const result = resolvePublicQuickAdd(product({
      variants: [{
        id: "11111111-1111-4111-8111-111111111111",
        product_id: "412add8b-998d-4ee9-a793-c0e589ee5eff",
        variant_name: "Hitam",
        color_name: "Hitam",
        color_hex: "#111111",
        price_adjustment: 1000,
        is_active: true,
        status: "active",
        sort_order: 1,
        sizes: [{
          id: "21111111-1111-4111-8111-111111111111",
          variant_id: "11111111-1111-4111-8111-111111111111",
          size_name: "M",
          sku: "CC24-HITAM-M",
          stock: 7,
          price_adjustment: 2000,
          is_active: true,
          status: "active",
          sort_order: 1
        }]
      }]
    }), input);

    expect(result.mode).toBe("add");
    if (result.mode !== "add") throw new Error("Expected canonical add decision");
    expect(result.product.variantSizeId).toBe("21111111-1111-4111-8111-111111111111");
    expect(result.product.variantSku).toBe("CC24-HITAM-M");
    expect(result.product.priceValue).toBe(48000);
    expect(result.product.variantSnapshot?.product_id).toBe("412add8b-998d-4ee9-a793-c0e589ee5eff");
  });

  it("routes configurator products to option selection", () => {
    expect(resolvePublicQuickAdd(product({
      product_type: "configurable_product",
      pricing_mode: "configurator_based",
      uses_configurator: true
    }), input)).toEqual({ mode: "options", reason: "custom_product" });
  });

  it("shows unavailable when every canonical SKU has zero stock", () => {
    const result = resolvePublicQuickAdd(product({
      variants: [{
        id: "11111111-1111-4111-8111-111111111111",
        product_id: "412add8b-998d-4ee9-a793-c0e589ee5eff",
        variant_name: "Hitam",
        color_name: "Hitam",
        color_hex: "#111111",
        is_active: true,
        status: "active",
        sort_order: 1,
        sizes: [{
          id: "21111111-1111-4111-8111-111111111111",
          variant_id: "11111111-1111-4111-8111-111111111111",
          size_name: "M",
          sku: "CC24-HITAM-M",
          stock: 0,
          is_active: true,
          status: "active",
          sort_order: 1
        }]
      }]
    }), input);

    expect(result).toEqual({ mode: "unavailable", reason: "out_of_stock" });
  });
});
