import { expect, test } from "@playwright/test";

test("public shell and canonical read-only routes respond without mutation", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const home = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(home?.status() ?? 0).toBeLessThan(500);
  await expect(page.locator("main").first()).toBeVisible();

  const collection = await page.goto("/koleksi", { waitUntil: "domcontentloaded" });
  expect(collection?.status() ?? 0).toBeLessThan(500);
  await expect(page.locator("main").first()).toBeVisible();

  await page.goto("/cart", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/keranjang\/?$/);
  await expect(page.locator("main").first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
