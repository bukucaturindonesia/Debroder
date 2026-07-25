import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const pagePath = path.join(root, "app", "page.tsx");
const cssPath = path.join(root, "app", "globals.css");
const campaignPath = path.join(root, "components", "CampaignBanners.tsx");
const marker = "DEBRODER_LANDING_VISUAL_BATCH_2";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function replaceExact(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: anchor harus ditemukan tepat 1 kali, ditemukan ${count}.`);
  }
  return content.replace(before, after);
}

let page = read(pagePath);
let css = read(cssPath);
let campaign = read(campaignPath);

if (!page.includes("landing-nike")) {
  throw new Error("Baseline landing refinement V1 tidak ditemukan pada app/page.tsx.");
}
if (page.includes(marker) || css.includes(marker) || campaign.includes(marker)) {
  throw new Error("Landing Visual Batch 2 sudah pernah diterapkan.");
}

page = replaceExact(
  page,
  '<article className="category-rail-card min-w-0 shrink-0 snap-start">',
  '<article className="category-rail-card landing-category-card min-w-0 shrink-0 snap-start">',
  "Category card"
);
page = replaceExact(
  page,
  '<div className="aspect-[4/5] overflow-hidden bg-[#f2f2f2]">',
  '<div className="category-media aspect-[4/5] overflow-hidden bg-[#f2f2f2]">',
  "Category media"
);
page = replaceExact(
  page,
  '    <section id={section.slug} className="home-section home-fresh-drop section-space bg-white">\r\n      <PublicSectionFrame variant="near-wide">',
  '    <section id={section.slug} className="home-section home-fresh-drop section-space bg-white">\r\n      <PublicSectionFrame variant="near-wide" className="fresh-drop-shell">',
  "Fresh Drop frame"
);
page = replaceExact(
  page,
  'className="home-bleed-rail public-frame-rail fresh-drop-rail no-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto md:mt-6"',
  'className="home-bleed-rail public-frame-rail fresh-drop-rail landing-commerce-rail no-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto md:mt-6"',
  "Fresh Drop rail"
);
page = replaceExact(
  page,
  '<PublicSectionFrame variant="inset">\r\n            <SectionHeading\r\n              title={landingSection("services-products")?.title || "Belanja Berdasarkan Kategori"}',
  '<PublicSectionFrame variant="near-wide" className="category-shell">\r\n            <SectionHeading\r\n              title={landingSection("services-products")?.title || "Belanja Berdasarkan Kategori"}',
  "Category frame"
);
page = replaceExact(
  page,
  'className="home-bleed-rail public-frame-rail category-carousel premium-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto pb-6 md:mt-6"',
  'className="home-bleed-rail public-frame-rail category-carousel landing-category-rail premium-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto pb-6 md:mt-6"',
  "Category rail"
);
page = page.replace(
  "/* DEBRODER_LANDING_STRUCTURE_V2_APPLIED */",
  `/* ${marker} */\r\n/* DEBRODER_LANDING_STRUCTURE_V2_APPLIED */`
);

campaign = replaceExact(
  campaign,
  'className="home-section home-campaign campaign-section section-space bg-white"',
  'className="home-section home-campaign campaign-section landing-campaign section-space bg-white"',
  "Campaign section"
);
campaign = replaceExact(
  campaign,
  '<div className="relative aspect-[4/5] overflow-hidden bg-[#efefef] sm:aspect-[16/7]">',
  '<div className="landing-campaign-media relative aspect-[4/5] overflow-hidden bg-[#efefef] sm:aspect-[16/7]">',
  "Campaign media"
);
campaign = replaceExact(
  campaign,
  '<div className="campaign-copy mx-auto max-w-5xl px-5 pt-8 text-center sm:pt-10 lg:pt-12">',
  '<div className="campaign-copy landing-campaign-copy mx-auto max-w-5xl px-5 pt-8 text-center sm:pt-10 lg:pt-12">',
  "Campaign copy"
);
campaign = replaceExact(
  campaign,
  'className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/75"',
  'className="landing-campaign-cta mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/75"',
  "Campaign CTA"
);
campaign = campaign.replace(
  'import type { CmsBanner } from "@/lib/types";',
  `/* ${marker} */\r\nimport type { CmsBanner } from "@/lib/types";`
);

const cssBlock = `\r\n\r\n/* =========================================================\r\n   ${marker}\r\n   Campaign Banner · Fresh Drop · Shop by Category\r\n   Homepage-only scope.\r\n   ========================================================= */\r\n.landing-nike .landing-campaign {\r\n  padding-top: clamp(56px, 6vw, 88px);\r\n  padding-bottom: clamp(60px, 7vw, 96px);\r\n}\r\n\r\n.landing-nike .landing-campaign .campaign-shell {\r\n  width: min(var(--landing-content-max), calc(100% - (var(--landing-page-gutter) * 2)));\r\n}\r\n\r\n.landing-nike .landing-campaign-media {\r\n  background: #f5f5f5;\r\n}\r\n\r\n.landing-nike .landing-campaign-media :is(img, video) {\r\n  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);\r\n}\r\n\r\n.landing-nike .landing-campaign-copy {\r\n  max-width: 760px;\r\n  padding-top: 30px;\r\n}\r\n\r\n.landing-nike .landing-campaign-copy .campaign-copy-title {\r\n  font-family: var(--font-body);\r\n  font-size: clamp(2rem, 6.6vw, 3.4rem);\r\n  font-weight: 700;\r\n  letter-spacing: -0.045em;\r\n  line-height: 0.98;\r\n  text-transform: none;\r\n}\r\n\r\n.landing-nike .landing-campaign-copy p {\r\n  max-width: 620px;\r\n  margin-top: 14px;\r\n  font-size: 15px;\r\n  line-height: 1.55;\r\n  color: rgba(17, 17, 17, 0.65);\r\n}\r\n\r\n.landing-nike .landing-campaign-cta {\r\n  min-height: 44px;\r\n  margin-top: 22px;\r\n  padding-inline: 22px;\r\n  font-size: 15px;\r\n  font-weight: 600;\r\n}\r\n\r\n.landing-nike .fresh-drop-shell,\r\n.landing-nike .category-shell {\r\n  overflow: hidden;\r\n}\r\n\r\n.landing-nike .landing-commerce-rail,\r\n.landing-nike .landing-category-rail {\r\n  gap: 12px;\r\n  scroll-padding-inline: 0;\r\n  overscroll-behavior-inline: contain;\r\n}\r\n\r\n.landing-nike .home-fresh-drop .public-product-card {\r\n  background: #fff;\r\n}\r\n\r\n.landing-nike .home-fresh-drop .product-image-frame {\r\n  aspect-ratio: 4 / 5;\r\n  background: #f5f5f5;\r\n}\r\n\r\n.landing-nike .home-fresh-drop .public-product-card-body {\r\n  padding-top: 13px;\r\n}\r\n\r\n.landing-nike .home-fresh-drop .public-product-meta {\r\n  margin-bottom: 3px;\r\n  font-size: 13px;\r\n  color: rgba(17, 17, 17, 0.52);\r\n}\r\n\r\n.landing-nike .home-fresh-drop .public-product-name {\r\n  font-size: 15px;\r\n  font-weight: 500;\r\n  line-height: 1.35;\r\n}\r\n\r\n.landing-nike .home-fresh-drop .public-product-price-block {\r\n  margin-top: 7px;\r\n}\r\n\r\n.landing-nike .home-fresh-drop .public-product-price,\r\n.landing-nike .home-fresh-drop .public-product-compare-price {\r\n  font-size: 14px;\r\n}\r\n\r\n.landing-nike .landing-category-card .category-media {\r\n  background: #f5f5f5;\r\n}\r\n\r\n.landing-nike .landing-category-card .category-media img {\r\n  transition: transform 650ms cubic-bezier(0.22, 1, 0.36, 1);\r\n}\r\n\r\n.landing-nike .landing-category-card h3 {\r\n  margin-top: 12px;\r\n  font-size: 15px;\r\n  font-weight: 500;\r\n  letter-spacing: -0.02em;\r\n  line-height: 1.3;\r\n}\r\n\r\n@media (hover: hover) and (pointer: fine) {\r\n  .landing-nike .landing-campaign-media:hover :is(img, video) {\r\n    transform: scale(1.008);\r\n  }\r\n\r\n  .landing-nike .landing-category-card:hover .category-media img {\r\n    transform: scale(1.018);\r\n  }\r\n}\r\n\r\n@media (max-width: 639px) {\r\n  .landing-nike .landing-campaign .campaign-shell {\r\n    width: 100%;\r\n  }\r\n\r\n  .landing-nike .landing-campaign-copy {\r\n    padding-inline: var(--landing-page-gutter);\r\n  }\r\n\r\n  .landing-nike .fresh-drop-card,\r\n  .landing-nike .category-rail-card {\r\n    flex-basis: 77%;\r\n  }\r\n}\r\n\r\n@media (min-width: 640px) {\r\n  .landing-nike .landing-commerce-rail,\r\n  .landing-nike .landing-category-rail {\r\n    gap: 16px;\r\n  }\r\n\r\n  .landing-nike .landing-campaign-copy {\r\n    padding-top: 36px;\r\n  }\r\n}\r\n\r\n@media (min-width: 1024px) {\r\n  .landing-nike .landing-campaign-copy {\r\n    padding-top: 40px;\r\n  }\r\n\r\n  .landing-nike .landing-campaign-copy .campaign-copy-title {\r\n    font-size: clamp(2.75rem, 3.6vw, 3.75rem);\r\n  }\r\n\r\n  .landing-nike .fresh-drop-card,\r\n  .landing-nike .category-rail-card {\r\n    flex-basis: calc((100% - 36px) / 3.2);\r\n  }\r\n}\r\n`;

css += cssBlock;

write(pagePath, page);
write(cssPath, css);
write(campaignPath, campaign);

console.log("PASS: Targeted visual patch Batch 2 selesai.");
