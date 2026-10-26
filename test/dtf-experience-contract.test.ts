import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf-8");
const page = source("app/sablon-dtf/page.tsx");
const styles = source("app/globals.css");
const publicData = source("lib/public-data.ts");
const cmsAdmin = source("components/admin/CampaignBannerAdmin.tsx");

describe("Debroder DTF public owner-spec contracts", () => {
  it("keeps the shared approved category hero and global footer", () => {
    expect(page).toContain("<CategoryHero");
    expect(page).toContain("<PublicShell footerTone=\"light\">");
  });
  it("has exactly three benefit cards and mobile single-card scroll rail", () => {
    expect(page.match(/icon: "(layers|artwork|quality)"/g)).toHaveLength(3);
    expect(styles).toMatch(/\.dtf-benefit-rail,\s*\.dtf-service-rail\s*\{\s*display: flex/);
    expect(styles).toMatch(/\.dtf-benefit-card\s*\{[^}]*flex: 0 0 100%/);
  });
  it("shows owner-managed consultation offers without a mandatory exact price", () => {
    expect(page).toContain("const databaseServices = (content.dtfServices || []).filter");
    expect(page).toContain("Harga menyesuaikan desain dan jumlah");
    expect(page).toContain("Konsultasikan Desain Anda");
  });
  it("only includes verified, unbounded real-result photos, without click actions or captions", () => {
    expect(page).toContain("content.dtfSections || []");
    expect(page).toContain("debroder_original === true");
    expect(page).not.toMatch(/portfolio\.slice\(/);
    expect(page).toContain('<DtfGalleryPhoto');
    expect(styles).toContain("pointer-events: none");
    expect(styles).toContain("grid-template-columns: repeat(2,minmax(0,1fr))");
    expect(styles).toContain("padding: 16px");
    expect(styles).toContain("gap:16px");
  });
  it("publishes DTF-specific media independently of landing campaigns", () => {
    expect(publicData).toContain('banner.section_group === "sablon-dtf"');
    expect(publicData).toContain('banner.section_group !== "sablon-dtf"');
    expect(cmsAdmin).toContain("debroder_original: event.target.checked");
  });
  it("has six tap-to-expand questions and owner-approved WA CTA", () => {
    expect(page.match(/question: "/g)).toHaveLength(6);
    expect(page).toContain("<details key={item.question}");
    expect(page).toContain("lebih dari 12 pcs");
    expect(page).toContain("satu hari setelah pembayaran dikonfirmasi");
    expect(page).toContain("PNG, JPG, atau PDF");
    expect(page).toContain("Siap Bikin Kaos Custom?");
    expect(page).toContain("Order Sekarang");
    expect(page).toContain("whatsappLinkWithMessage");
  });
});
