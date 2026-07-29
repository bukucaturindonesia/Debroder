import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("UX/UI Bab 6 screen, state, and responsive contract", () => {
  it("keeps every canonical task screen behind a loading and recovery boundary", () => {
    for (const path of [
      "app/loading.tsx",
      "app/error.tsx",
      "app/not-found.tsx",
      "app/produk/[slug]/loading.tsx",
      "app/produk/[slug]/error.tsx",
      "app/track-order/[order-number]/loading.tsx",
      "app/track-order/[order-number]/error.tsx"
    ]) {
      expect(existsSync(path), `missing state boundary: ${path}`).toBe(true);
    }

    expect(read("app/error.tsx")).toContain("Coba Lagi");
    expect(read("components/CategoryCommerceError.tsx")).toContain("reset");
    expect(read("components/customer-order/CustomerOrderReadFeedback.tsx")).toContain("onRetry");
    expect(read("components/checkout/CheckoutClient.tsx")).toContain("retryAfter");
  });

  it("keeps explicit empty and pending states in catalog, cart, checkout, Custom, and tracking", () => {
    expect(read("components/ProductCatalog.tsx")).toContain("Produk tidak ditemukan");
    expect(read("components/CartProvider.tsx")).toContain("Keranjang masih kosong");
    expect(read("components/checkout/CheckoutClient.tsx")).toContain("Membuat pesanan...");
    expect(read("components/custom/CustomProjectBuilder.tsx")).toContain("Belum ada nominal");
    expect(read("components/tracking/GuestOrderTracking.tsx")).toContain("CustomerOrderReadError");
  });

  it("keeps responsive composition and 44px minimum primary catalog actions", () => {
    const styles = read("app/globals.css");
    const productCard = read("components/PublicProductCard.tsx");
    const serviceCard = read("components/ServiceCatalog.tsx");

    expect(styles).toContain("--content-gutter: 20px;");
    expect(styles).toContain("@media (min-width: 768px)");
    expect(styles).toContain("@media (min-width: 1024px)");
    expect(styles).toContain("@media (min-width: 1440px)");
    expect(styles).toContain("--container-max: 1440px;");
    expect(styles).toContain("width: min(var(--content-max)");
    expect(productCard).not.toMatch(/showActions[\s\S]*?min-h-10/);
    expect(productCard).toContain("min-h-11");
    expect(serviceCard).not.toContain("min-h-10");
  });
});
