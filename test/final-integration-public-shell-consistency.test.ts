import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const header = readFileSync("components/SiteHeader.tsx", "utf8");
const headerClient = readFileSync("components/header/SiteHeaderClient.tsx", "utf8");
const publicPage = readFileSync("components/PublicPage.tsx", "utf8");
const homePage = readFileSync("app/page.tsx", "utf8");

describe("Final Integration public shell consistency", () => {
  it("removes WhatsApp controls from desktop and mobile public navigation", () => {
    expect(headerClient).not.toContain("function ChatIcon()");
    expect(headerClient).not.toContain('aria-label="Hubungi WhatsApp DEBRODER"');
    expect(headerClient).not.toContain("Konsultasi via WhatsApp");
    expect(headerClient).not.toContain("href={whatsappHref}");
  });

  it("removes obsolete WhatsApp and promo plumbing from the public header", () => {
    expect(header).not.toContain("whatsappHref?: string");
    expect(header).not.toContain("whatsappHref={whatsappHref}");
    expect(publicPage).not.toContain("whatsappHref={header.whatsappHref}");
    expect(homePage).not.toContain("whatsappHref={shellModel.data.header.whatsappHref}");
    expect(header).not.toContain("fallbackPromo");
  });

  it("uses the canonical footer for the homepage and every shared public shell theme", () => {
    expect(homePage).toContain('<PublicFooter model={shellModel.data.footer} tone="light" />');
    expect(publicPage).toContain('<PublicFooter model={shellModel.data.footer} />');
    expect(publicPage).not.toContain("variant=");
    expect(readFileSync("components/PublicFooter.tsx", "utf8")).toContain('tone = "dark"');
  });
});
