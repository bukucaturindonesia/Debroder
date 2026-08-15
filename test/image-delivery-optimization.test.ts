import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

describe("image delivery optimization", () => {
  it("uses cached WebP transforms for raster image delivery", () => {
    const config = readFileSync(resolve(root, "next.config.ts"), "utf8");

    expect(config).toContain('formats: ["image/webp"]');
    expect(config).toContain("minimumCacheTTL: 60 * 60 * 24 * 30");
    expect(config).toContain('key: "Cache-Control"');
  });

  it("routes responsive CMS imagery through the Next image optimizer", () => {
    const responsivePicture = readFileSync(resolve(root, "components/ResponsivePicture.tsx"), "utf8");
    const safeImage = readFileSync(resolve(root, "components/SafeImage.tsx"), "utf8");
    const logo = readFileSync(resolve(root, "components/Logo.tsx"), "utf8");

    expect(responsivePicture).toContain('import { getImageProps } from "next/image"');
    expect(responsivePicture).toContain("optimizedMobile?.srcSet || mobileSource");
    expect(safeImage).toContain("const isLogoAsset");
    expect(logo).toContain("<img src={symbolSrc}");
  });
});
