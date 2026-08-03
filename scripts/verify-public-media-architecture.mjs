import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];

function check(name, condition, detail = "") {
  checks.push({ name, status: condition ? "PASS" : "FAIL", detail });
  if (!condition) failures.push({ name, detail });
}
function read(path) { return readFileSync(join(root, path), "utf8"); }
function filesUnder(dir) {
  const output = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else output.push(path);
    }
  };
  walk(join(root, dir));
  return output;
}

const registry = read("lib/public-media.ts");
const expectedSlots = [
  "productPrimary", "productGallery", "categoryPortrait", "trendingPortrait",
  "homepageHeroDesktop", "homepageHeroMobile", "homepageFeaturedDesktop",
  "homepageFeaturedMobile", "homepageCampaignDesktop", "homepageCampaignMobile",
  "instagramBannerDesktop", "instagramBannerMobile", "pageHeroDesktop", "pageHeroMobile", "serviceDetailLandscape", "storeLandscape",
  "aboutHomepageLandscape", "aboutPagePortrait", "editorialPortrait",
  "customHeroDesktop", "customHeroMobile", "customPathway", "customInspiration",
  "customPreset", "openGraph"
];
for (const slot of expectedSlots) check(`registry:${slot}`, registry.includes(`| "${slot}"`) && registry.includes(`${slot}: {`));
check("registry:all-canonical-ratios", ["4:5", "16:7", "12:5", "5:4", "4:3", "1.91:1"].every((ratio) => registry.includes(`aspectRatio: "${ratio}"`)));
check("resolver:reject-public-prefix", registry.includes('trimmed.startsWith("/public/")'));
check("resolver:reject-arbitrary-external", registry.includes('url.hostname === configuredHost') && registry.includes('url.pathname.startsWith("/storage/v1/object/")'));
check("resolver:social-blocklist", registry.includes("SOCIAL_ONLY_PATHS") && registry.includes('slot !== "openGraph"'));

const fallbackFiles = filesUnder("public/debroder/fallback").filter((path) => path.endsWith(".svg"));
check("fallback-assets:count", fallbackFiles.length >= 19, `found=${fallbackFiles.length}`);
for (const path of fallbackFiles) {
  const svg = readFileSync(path, "utf8");
  const size = svg.match(/<svg[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*viewBox="0 0 (\d+) (\d+)"/);
  check(`fallback-svg:${relative(root, path)}`, Boolean(size && size[1] === size[3] && size[2] === size[4]));
}

const allowedSocialFiles = new Set([
  "app/layout.tsx", "lib/public-media.ts", "lib/site-media.ts",
  "supabase/schema.sql", "supabase/admin-managed-site-media.sql",
  "test/public-media-architecture.test.ts", "test/jersey-commerce.test.ts",
  "test/pay-at-store-pickup-canonical-workflow.test.ts",
  "components/admin/MediaLibrary.tsx"
]);
const sourceFiles = ["app", "components", "lib", "supabase", "test"]
  .flatMap((dir) => filesUnder(dir))
  .filter((path) => /\.(ts|tsx|sql)$/.test(path));
const unexpectedSocial = [];
for (const path of sourceFiles) {
  const rel = relative(root, path).replaceAll("\\", "/");
  const content = readFileSync(path, "utf8");
  if (/social-preview\.png|open-graph-logo\.png/.test(content) && !allowedSocialFiles.has(rel)) unexpectedSocial.push(rel);
}
check("social-assets:metadata-only", unexpectedSocial.length === 0, unexpectedSocial.join(", "));

const home = read("app/page.tsx");
check("homepage:plain-category-independent", home.includes("plainCategorySection.items") && home.includes(".filter(isCustomHomepageItem)") && !home.includes("plainCategoryFallback"));
check("homepage:about-landscape", home.includes("fallbackImages.aboutLandscape") && home.includes("aspect-[4/3]"));
const custom = read("components/custom/CustomHub.tsx");
check("custom:hero-independent", custom.includes("pageHero?.image_url") && custom.includes("fallbackImages.customHero") && !custom.includes("categories[0]"));
const publicPage = read("components/PublicPage.tsx");
check("service:detail-independent", publicPage.includes("detail_image_url") && publicPage.includes("fallbackImages.serviceDetail"));
check("service:public-image-honors-slot-fallback", publicPage.includes("const imageSrc = src || fallbackSrc"));
const responsivePicture = read("components/ResponsivePicture.tsx");
check("responsive:separate-mobile-fallback", responsivePicture.includes("mobileFallbackSrc") && responsivePicture.includes("resolvedMobileFallback"));
const publicData = read("lib/public-data.ts");
check("service:card-portrait-slot", publicData.includes('resolveMediaUrl("editorialPortrait", service.image_url'));
check("instagram:independent-slots", publicData.includes('resolveMediaUrl("instagramBannerDesktop"') && publicData.includes('resolveMediaUrl("instagramBannerMobile"'));
const jerseyMedia = read("lib/jersey-experience.ts");
check("jersey:slot-by-section", jerseyMedia.includes("jerseyMediaSlots") && jerseyMedia.includes('"wide_campaign"') && !jerseyMedia.includes("categories[0]?.gambar_url"));
const jerseyAdmin = read("components/admin/JerseyExperienceAdmin.tsx");
check("jersey:admin-slot-fallback", jerseyAdmin.includes("jerseySectionFallbacks(form.section_type)") && !jerseyAdmin.includes("desktop_media_url: form.desktop_media_url.trim() || PUBLIC_MEDIA_FALLBACKS.editorial"));
const about = read("app/tentang/page.tsx");
check("about:page-independent", about.includes("about_page_image_url"));

const uploadRoute = read("app/api/admin/media/upload/route.ts");
check("upload:server-auth", uploadRoute.includes('requirePhase13Actor(request, "content.manage")'));
check("upload:byte-inspection", uploadRoute.includes("inspectImage(bytes)"));
check("upload:contract-validation", uploadRoute.includes("validateMediaContract"));
check("upload:server-replacement", uploadRoute.includes("replaceAssetId") && uploadRoute.includes("safeStoragePath") && uploadRoute.includes("folderMatchesSlot"));
const settingsRoute = read("app/api/admin/media/settings/route.ts");
check("settings:server-auth", settingsRoute.includes('requirePhase13Actor(request, "content.manage")'));
check("settings:slot-validation", settingsRoute.includes("SITE_MEDIA_SLOTS") && settingsRoute.includes("validateMediaContract"));
const productUpload = read("lib/product-media-upload.ts");
check("product-upload:server-endpoint", productUpload.includes('fetch("/api/admin/media/upload"') && !productUpload.includes("supabase.storage"));
const variantGallery = read("components/admin/VariantGalleryManager.tsx");
check("variant-upload:server-endpoint", variantGallery.includes("uploadProductMediaAsset") && !variantGallery.includes("supabase.storage"));
const siteAdmin = read("components/admin/SiteMediaSettingsAdmin.tsx");
check("settings-admin:server-endpoint", siteAdmin.includes('fetch("/api/admin/media/settings"') && !siteAdmin.includes('from("website_settings").upsert'));

const migrationPath = "supabase/migrations/20260803095600_public_media_architecture_reconciliation_v1.sql";
const migration = read(migrationPath);
check("migration:detail-fields", migration.includes("detail_image_url") && migration.includes("detail_target_ratio"));
check("migration:about-fields", migration.includes("about_page_image_url") && migration.includes("about_page_mobile_image_url"));
check("migration:about-mobile-crop-fields", migration.includes("about_page_mobile_focal_x") && migration.includes("about_page_mobile_target_ratio"));
check("migration:custom-existing-model", migration.includes("page_key = 'custom'") && !/insert\s+into\s+public\.page_heroes/i.test(migration));
check("migration:non-destructive", !/\bdrop\s+(table|column)\b/i.test(migration) && !/\bdelete\s+from\b/i.test(migration));

const changedHashInputs = [
  "lib/public-media.ts", "lib/site-media.ts", "app/api/admin/media/upload/route.ts",
  "app/api/admin/media/settings/route.ts", migrationPath
];
const digest = createHash("sha256");
for (const path of changedHashInputs) digest.update(readFileSync(join(root, path)));

const result = {
  status: failures.length ? "FAIL" : "PASS",
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  evidenceHash: digest.digest("hex"),
  failures
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
