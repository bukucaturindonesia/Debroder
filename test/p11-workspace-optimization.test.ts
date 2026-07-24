import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("P11 workspace optimization", () => {
  it("lazy-loads route-specific AdminDashboard panels without disabling SSR", () => {
    const dashboard = read("components/admin/AdminDashboard.tsx");
    const panels = [
      ["MediaLibrary", "MediaLibraryPanel"],
      ["SiteMediaSettingsAdmin", "SiteMediaSettingsAdmin"],
      ["ProductAdmin", "ProductAdminPanel"],
      ["PimManagerAdmin", "PimManagerAdmin"],
      ["PimV2Admin", "PimV2Admin"],
      ["FocalPointEditor", "FocalPointEditor"],
      ["HomepageSectionsAdmin", "HomepageSectionsAdmin"],
      ["LandingSectionsAdmin", "LandingSectionsAdmin"],
      ["LandingSectionEditor", "LandingSectionEditor"],
      ["CampaignBannerAdmin", "CampaignBannerAdmin"],
      ["OrderManagementAdmin", "OrderManagementAdmin"],
      ["WebsiteSettingsAdmin", "WebsiteSettingsAdmin"]
    ] as const;

    expect(dashboard).toContain('import dynamic from "next/dynamic"');
    expect(dashboard).not.toContain("ssr: false");
    for (const [moduleName, exportName] of panels) {
      expect(dashboard).toContain(
        `import("@/components/admin/${moduleName}")`
      );
      expect(dashboard).toContain(`module.${exportName}`);
      expect(dashboard).toContain(`<${exportName}`);
      expect(dashboard).not.toContain(
        `import { ${exportName} } from "@/components/admin/${moduleName}"`
      );
    }
  });

  it("removes the unreferenced pre-P6 checkout implementation while retaining the canonical checkout", () => {
    expect(existsSync("components/checkout/CheckoutClientV2.tsx")).toBe(false);
    expect(existsSync("components/checkout/CheckoutClient.tsx")).toBe(true);

    const checkoutPage = read("app/checkout/page.tsx");
    const canonical = read("components/checkout/CheckoutClient.tsx");
    expect(checkoutPage).toContain(
      'import { CheckoutClient } from "@/components/checkout/CheckoutClient"'
    );
    expect(canonical).toContain("cart.checkoutDecision");
    expect(canonical).toContain("RECOVERY_KEY");
  });

  it("removes the zero-consumer Jersey legacy read model and seven-query fallback loader", () => {
    const publicData = read("lib/public-data.ts");
    const fallbackData = read("lib/fallback-data.ts");
    const types = read("lib/types.ts");

    expect(publicData).not.toContain("readJerseyConfiguratorData");
    expect(publicData).not.toContain("fallbackJerseyConfigurator");
    expect(publicData).not.toContain('from("jersey_packages")');
    expect(publicData).not.toContain('from("jersey_settings")');
    expect(fallbackData).not.toContain("fallbackJerseyConfigurator");
    expect(types).not.toContain("JerseyConfiguratorData");
    expect(types).not.toContain("jerseyConfigurator:");
  });

  it("keeps the canonical P10 Jersey consumer and server authority intact", () => {
    const page = read("app/jersey/configurator/page.tsx");
    const access = read("lib/jersey-configured-product/data-access.ts");
    const action = read("app/jersey/configurator/actions.ts");

    expect(page).toContain("readJerseyConfiguredProduct");
    expect(access).toContain('.eq("pricing_mode", "custom_quote")');
    expect(action).toContain("resolveConfiguredProductOnServer");
  });
});
