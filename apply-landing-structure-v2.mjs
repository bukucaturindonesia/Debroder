import fs from "node:fs";
import { execFileSync } from "node:child_process";

const PAGE = "app/page.tsx";
const EXPECTED_BRANCH = "LANDING-PAGE-PUBLIC";
const SCRIPT_NAME = "apply-landing-structure-v2.mjs";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
  process.exit();
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const branch = git("branch", "--show-current");
if (branch !== EXPECTED_BRANCH) {
  fail(`Branch aktif harus ${EXPECTED_BRANCH}, sekarang: ${branch}`);
}

const dirty = git("status", "--porcelain")
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => !line.endsWith(SCRIPT_NAME));

if (dirty.length) {
  console.error("Working tree memiliki perubahan lain:");
  for (const line of dirty) console.error(line);
  fail("Bersihkan perubahan lain sebelum revisi.");
}

if (!fs.existsSync(PAGE)) fail(`File tidak ditemukan: ${PAGE}`);

let page = fs.readFileSync(PAGE, "utf8");

if (page.includes("DEBRODER_LANDING_STRUCTURE_V2_APPLIED")) {
  fail("Revisi struktur v2 sudah pernah diterapkan.");
}

const importPattern =
  /^import\s+\{\s*PublicInstagramBanner\s*\}\s+from\s+["']@\/components\/PublicInstagramBanner["'];\r?\n/m;

if (!importPattern.test(page)) {
  fail("Import PublicInstagramBanner tidak ditemukan. Source berbeda dari baseline.");
}
page = page.replace(importPattern, "");

const trendingStartMarker = '      {trendingSection ? (() => {';
const campaignStartMarker =
  '      <LandingSectionSlot setting={landingSection("campaign-banners")}>';
const freshStartMarker = '      {freshDropSection ? (() => {';

const trendingStart = page.indexOf(trendingStartMarker);
const campaignStart = page.indexOf(campaignStartMarker);
const freshStart = page.indexOf(freshStartMarker);

if (trendingStart === -1 || campaignStart === -1 || freshStart === -1) {
  fail("Blok Trending, Campaign, atau Fresh Drop tidak ditemukan.");
}

if (!(trendingStart < campaignStart && campaignStart < freshStart)) {
  fail("Urutan baseline tidak sesuai. Tidak ada perubahan dilakukan.");
}

const beforeTrending = page.slice(0, trendingStart);
const trendingBlock = page.slice(trendingStart, campaignStart);
const campaignBlock = page.slice(campaignStart, freshStart);
const afterCampaign = page.slice(freshStart);

page =
  beforeTrending +
  campaignBlock +
  trendingBlock +
  afterCampaign;

const instagramStartMarker = '      {content.instagramBanner?.id ? (';
const storesStartMarker =
  '      <LandingSectionSlot setting={landingSection("stores")}>';

const instagramStart = page.indexOf(instagramStartMarker);
const storesStart = page.indexOf(storesStartMarker);

if (instagramStart === -1 || storesStart === -1 || instagramStart >= storesStart) {
  fail("Blok Instagram atau Store tidak ditemukan.");
}

page = page.slice(0, instagramStart) + page.slice(storesStart);

const darkFooter =
  '<PublicFooter model={shellModel.data.footer} variant="dark" />';
const lightFooter =
  '<PublicFooter model={shellModel.data.footer} />';

if (!page.includes(darkFooter)) {
  fail("Footer dark baseline tidak ditemukan.");
}
page = page.replace(darkFooter, lightFooter);

page = page.replace(
  'export default async function Home() {',
  '/* DEBRODER_LANDING_STRUCTURE_V2_APPLIED */\nexport default async function Home() {'
);

fs.writeFileSync(PAGE, page, "utf8");

console.log("PASS: Struktur landing page v2 diterapkan.");
console.log("Urutan: Hero → Benefit → Featured → Campaign → Trending → Fresh Drop → Shop by Category → Store → Cara Order → About → Footer.");
console.log("Instagram tidak dirender di homepage; data dan CMS tidak dihapus.");
console.log("Footer diubah ke varian putih minimal.");
console.log("Belum build, commit, push, atau deploy.");
