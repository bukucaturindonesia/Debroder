import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("mobile storefront shell", () => {
  it("mounts one shared mobile navigation inside the canonical public shell", () => {
    const publicPage = read("components/PublicPage.tsx");
    const mobileNav = read("components/mobile/MobileBottomNav.tsx");

    expect(publicPage).toContain("<MobileBottomNav />");
    expect(mobileNav).toContain('aria-label="Navigasi mobile DEBRODER"');
    expect(mobileNav).toContain('href: "/koleksi"');
    expect(mobileNav).toContain('href: "/search"');
    expect(mobileNav).toContain('href: "/wishlist"');
    expect(mobileNav).toContain('customerAuth.profile ? "/account" : "/login"');
    expect(mobileNav).not.toContain('href="#"');
  });

  it("keeps focused transaction flows distraction-free and uses the real cart/auth state", () => {
    const mobileNav = read("components/mobile/MobileBottomNav.tsx");
    const cart = read("components/CartProvider.tsx");
    const header = read("components/header/SiteHeaderClient.tsx");
    const styles = read("app/globals.css");

    expect(mobileNav).toContain('"/checkout"');
    expect(mobileNav).toContain('"/payment"');
    expect(mobileNav).toContain("useCustomerAuth");
    expect(header).toContain('variant="symbol-dark"');
    expect(header).toContain("safe-area-inset-bottom");
    expect(cart).not.toContain('href={checkoutAllowed ? "/checkout" : "#"}');
    expect(cart).not.toContain('href={cart.checkoutDecision.allowed ? "/checkout" : "#"}');
    expect(styles).toContain(".mobile-bottom-nav");
    expect(styles).toContain("safe-area-inset-bottom");
  });

  it("adds a real mobile search destination to the homepage without adding demo data", () => {
    const home = read("app/page.tsx");
    expect(home).toContain('className="mobile-home-search section-shell"');
    expect(home).toContain('href="/search"');
    expect(home).toContain("Cari produk, kategori, atau layanan");
    expect(home).not.toContain("ReadyCab");
    expect(home).not.toContain("grocery");
  });
});
