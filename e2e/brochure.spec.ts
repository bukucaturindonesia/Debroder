import { expect, test } from "@playwright/test";

test("complete storefront restores navigation and responsive public surfaces", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const width of [390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/koleksi", "/kaos-polos", "/cart", "/account"]) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      if (route === "/account") await expect(page).toHaveURL(/\/(account|login)/);
      await expect(page.locator('nav[aria-label="Navigasi utama"]')).toBeVisible();
      await expect(page.locator(".brochure-shell")).toHaveCount(0);
      await page.waitForTimeout(350);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      const broken = await page.locator("img").evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.src));
      expect(broken).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath((route === "/" ? "home" : route.slice(1)) + "-" + width + ".png"), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tutup menu", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await page.locator('.mobile-bottom-nav a[href="/koleksi"]').click();
  await expect(page).toHaveURL(/\/koleksi$/);
  await page.locator('.mobile-bottom-nav a[href="/login"]').click();
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});
