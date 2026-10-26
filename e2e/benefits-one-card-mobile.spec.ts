import { expect, test } from "@playwright/test";

const mobileWidths = [320, 360, 390, 430, 768, 1023];

for (const width of mobileWidths) {
  test(`one complete benefit is visible and horizontally swipable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 880 });
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const carousel = page.locator(".debroder-landing .benefit-grid");
    await expect(carousel).toBeVisible();
    const items = carousel.locator(".benefit-slide");
    await expect(items).toHaveCount(4);

    const metrics = await carousel.evaluate((element) => {
      const style = getComputedStyle(element);
      const innerWidth = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return {
        innerWidth,
        itemWidths: [...element.children].map((child) => child.getBoundingClientRect().width),
        scrollable: element.scrollWidth > element.clientWidth + 2,
        snapType: style.scrollSnapType,
      };
    });
    expect(metrics.scrollable).toBe(true);
    expect(metrics.snapType).toContain("x");
    for (const itemWidth of metrics.itemWidths) {
      expect(Math.abs(itemWidth - metrics.innerWidth)).toBeLessThanOrEqual(3);
    }
    await carousel.evaluate((element) => { element.scrollLeft = element.clientWidth; });
    await expect.poll(() => carousel.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test("desktop retains four benefit columns without a horizontal carousel", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/"); await page.waitForLoadState("networkidle");
  const carousel = page.locator(".debroder-landing .benefit-grid");
  await expect(carousel.locator(".benefit-slide")).toHaveCount(4);
  const metrics = await carousel.evaluate((element) => ({
    display: getComputedStyle(element).display,
    columns: getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(metrics.display).toBe("grid");
  expect(metrics.columns).toBe(4);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
});
