import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("UX/UI Bab 8 high-fidelity public commerce", () => {
  it("keeps the catalog card uniform, data-driven, and visibly actionable", () => {
    const card = read("components/PublicProductCard.tsx");
    const presentation = read("lib/product-card.ts");
    const image = read("components/ProductImageSwap.tsx");

    expect(image).toContain("aspect-[4/5]");
    expect(card).toContain("productCardMetadata");
    expect(card).toContain("productCardSummary");
    expect(card).toContain("productCommerceBadges");
    expect(card).toContain("line-clamp-2");
    expect(card).toContain("Lihat Detail");
    expect(presentation).toContain("productCardSizes");
    expect(presentation).not.toMatch(/Mulai dari|Estimasi harga|Kisaran/);
  });

  it("keeps Ready Stock PDP actions server-priced and data-derived", () => {
    const pdp = read("app/produk/[slug]/page.tsx");
    const purchase = read("components/TieredProductPurchasePanel.tsx");

    expect(pdp).toContain("<ProductGallery");
    expect(pdp).toContain("<TieredProductPurchasePanel");
    expect(purchase).toContain("Tambah ke Keranjang");
    expect(purchase).toContain("Beli Sekarang");
    expect(purchase).toContain("/api/pricing/ready-stock");
    expect(purchase).not.toContain("clientPrice");
  });

  it("preserves product image identity through PDP, cart, and checkout", () => {
    const pdp = read("app/produk/[slug]/page.tsx");
    const cart = read("components/CartProvider.tsx");
    const checkout = read("components/checkout/CheckoutClient.tsx");

    expect(pdp).toContain("imageUrl: getProductImage(product)");
    expect(cart).toContain("item.imageUrl || fallbackImages.product");
    expect(checkout).toContain("item.imageUrl || fallbackImages.product");
    expect(checkout).toContain("<SafeImage");
  });

  it("does not expose configured-product implementation language to customers", () => {
    const checkout = read("components/checkout/CheckoutClient.tsx");
    expect(checkout).not.toMatch(/Configured Product|command server|configured-product package/i);
    expect(checkout).toContain("konfigurasi tervalidasi server");
    expect(checkout).not.toContain("belum dapat dilanjutkan");
  });
});
