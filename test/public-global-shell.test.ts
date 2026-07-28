import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const publicPage = read("components/PublicPage.tsx");
const header = read("components/header/SiteHeaderClient.tsx");
const footer = read("components/PublicFooter.tsx");
const home = read("app/page.tsx");
const styles = read("app/globals.css");

describe("canonical public global shell", () => {
  it("mounts one canonical header and footer through the shared public shell", () => {
    expect(publicPage.match(/<SiteHeader\b/g)).toHaveLength(1);
    expect(publicPage.match(/<PublicFooter\b/g)).toHaveLength(1);
    expect(publicPage).not.toMatch(/showHeader|headerMode|headerExpandedAtTop/);
    expect(header).not.toContain("preserveJerseyOutput");
    expect(footer).not.toContain("type FooterVariant");
    expect(footer).not.toContain("variant?:");
  });

  it("locks the header to white, sticky, 60px mobile, and 72px desktop", () => {
    expect(header).toContain('data-public-header');
    expect(header).toContain("sticky top-0");
    expect(header).toContain("bg-white");
    expect(header).toContain("h-[60px]");
    expect(header).toContain("lg:h-[72px]");
    expect(header).not.toContain("setExpanded");
    expect(header).not.toContain("transition-[max-height,opacity]");
  });

  it("removes WhatsApp from the header while preserving core controls", () => {
    expect(header).not.toMatch(/WhatsApp|wa\.me|promo\.actionHref/);
    expect(header).toContain('name="search"');
    expect(header).toContain('name="wishlist"');
    expect(header).toContain('name="user"');
    expect(header).toContain("<CartNavButton");
    expect(header).toContain('name={isOpen ? "close" : "menu"}');
  });

  it("locks the only public footer to pure black and preserves footer WhatsApp", () => {
    expect(footer).toContain("data-public-footer");
    expect(footer).toContain("bg-black text-white");
    expect(footer).toContain('variant="primary-white"');
    expect(footer).not.toMatch(/#050505|publicDark|bg-white text-/);
    expect(styles).toContain("background: #000000;");
    expect(read("lib/public-shell/domain.ts")).toContain('{ label: "WhatsApp"');
  });

  it("keeps homepage and shared routes on the same canonical components", () => {
    expect(home.match(/<SiteHeader\b/g)).toHaveLength(1);
    expect(home.match(/<PublicFooter\b/g)).toHaveLength(1);
    const sharedRoutes = [
      "app/koleksi/page.tsx",
      "app/produk/[slug]/page.tsx",
      "app/custom/page.tsx",
      "app/jersey/page.tsx",
      "app/jersey/shop/page.tsx",
      "app/keranjang/page.tsx",
      "app/checkout/page.tsx",
      "app/order-confirmation/[token]/page.tsx",
      "app/track-order/page.tsx",
      "app/help/page.tsx",
      "app/payment/[token]/page.tsx",
      "app/persetujuan/mockup/[token]/page.tsx"
    ];
    for (const route of sharedRoutes) {
      expect(read(route), route).toContain("<PublicShell");
    }
  });

  it("does not mount the public footer in Admin or retain a page-specific footer", () => {
    expect(read("app/admin/layout.tsx")).not.toContain("PublicFooter");
    expect(read("components/public/PublicMockupApproval.tsx")).not.toContain("<footer");
    expect(read("app/jersey/shop/page.tsx")).not.toContain("showHeader");
  });
});
