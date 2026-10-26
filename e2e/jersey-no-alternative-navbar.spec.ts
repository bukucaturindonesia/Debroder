import { expect, test } from "@playwright/test";

const routes = ["/jersey", "/jersey/shop", "/jersey/configurator"];

test.describe("Jersey: main navbar only", () => {
  for (const width of [390, 1440]) for (const path of routes) {
    test(`no Jersey secondary navigation on ${path} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[aria-label="Navigasi kontekstual Jersey"], [aria-label="Tab katalog Jersey"], [data-ui-context-tabs]')).toHaveCount(0);
      await expect(page.locator("footer")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
});
