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

  it("keeps the brochure homepage focused and provides a keyboard-accessible mobile menu", () => {
    const home = read("app/page.tsx");
    const brochureShell = read("components/brochure/BrochureShell.tsx");
    expect(home).toContain("<BrochureShell>");
    expect(brochureShell).toContain("<details");
    expect(brochureShell).toContain('aria-label="Navigasi mobile"');
    expect(brochureShell).toContain('label: "Produk", href: "/produk"');
    expect(home).not.toContain("ReadyCab");
    expect(home).not.toContain("grocery");
  });
});
