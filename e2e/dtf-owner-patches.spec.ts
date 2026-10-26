import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

for (const width of [360, 390, 430, 1024, 1440]) {
  test(`DTF public runtime, empty CMS and keyboard at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto("/sablon-dtf"); await page.waitForLoadState("networkidle");
    expect(response?.status()).toBe(200);
    await expect(page.locator("[data-category-hero]")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".dtf-benefit-card")).toHaveCount(3);
    const rail = page.locator(".dtf-benefit-rail");
    const dimensions = await rail.evaluate(el => ({ width: el.clientWidth, card: el.children[0].getBoundingClientRect().width }));
    if (width < 768) {
      expect(Math.abs(dimensions.width - dimensions.card)).toBeLessThanOrEqual(1);
      await rail.focus(); await page.keyboard.press("ArrowRight");
      await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    }
    await expect(page.getByText("Pilihan sablon DTF akan tampil setelah dipublikasikan oleh pengelola.")).toBeVisible();
    await expect(page.locator(".dtf-gallery-photo")).toHaveCount(0);
    const questions = page.locator(".dtf-faq-item");
    await expect(questions).toHaveCount(6);
    for (const item of await questions.all()) {
      await item.locator("summary").focus(); await page.keyboard.press("Enter");
      await expect(item).toHaveAttribute("open", "");
      await page.keyboard.press("Enter"); await expect(item).not.toHaveAttribute("open", "");
    }
    const cta = page.getByRole("link", { name: "Order Sekarang", exact: true });
    const url = new URL((await cta.getAttribute("href"))!);
    expect(["wa.me", "api.whatsapp.com"]).toContain(url.hostname);
    expect(url.searchParams.get("text")).toContain("sablon DTF");
    await expect(page.locator("footer")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const broken = await page.locator("img").evaluateAll(images => images.filter(img => img instanceof HTMLImageElement && img.complete && img.naturalWidth === 0).map(img => img.getAttribute("src")));
    expect(broken).toEqual([]); expect(errors).toEqual([]);
    await rail.evaluate(el => { el.scrollLeft = 0; });
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
    mkdirSync("docs/dtf-owner-patches/screenshots", { recursive: true });
    await page.screenshot({ path: `docs/dtf-owner-patches/screenshots/dtf-${width}.png`, fullPage: true });
  });

  test(`DTF populated gallery CSS fixture (not CMS acceptance) at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/sablon-dtf"); await page.waitForLoadState("networkidle");
    // Synthetic, visibly labeled test cells exercise the real stylesheet; never published as results.
    await page.evaluate(() => {
      const grid = document.createElement("div"); grid.className = "dtf-gallery-grid";
      for (let i = 0; i < 17; i++) {
        const card = document.createElement("figure"); card.className = "dtf-gallery-photo";
        card.textContent = `QA layout fixture ${i + 1}`; grid.append(card);
      }
      document.querySelector(".dtf-experience")!.append(grid);
    });
    const grid = page.locator(".dtf-gallery-grid");
    const metrics = await grid.evaluate(el => { const s = getComputedStyle(el); return { columns: s.gridTemplateColumns.split(" ").length, gap: s.gap, padding: s.padding, count: el.children.length }; });
    expect(metrics).toEqual({ columns: width < 768 ? 2 : width < 1024 ? 3 : 4, gap: "16px", padding: "16px", count: 17 });
    await expect(grid.locator("a,button,figcaption")).toHaveCount(0);
    await page.evaluate(() => {
      const rail = document.createElement("div"); rail.className = "dtf-service-rail";
      for (let i = 0; i < 5; i++) { const card = document.createElement("article"); card.className = "dtf-service-card"; card.textContent = `QA offer fixture ${i}`; rail.append(card); }
      document.querySelector("#dtf-services")!.append(rail);
    });
    const services = page.locator(".dtf-service-rail");
    const size = await services.evaluate(el => ({ rail: el.clientWidth, card: el.children[0].getBoundingClientRect().width }));
    expect(Math.abs(size.card - (width < 640 ? size.rail : width < 1024 ? (size.rail - 16) / 2 : (size.rail - 48) / 4))).toBeLessThanOrEqual(1);
    await services.focus(); await page.keyboard.press("ArrowRight");
    await expect.poll(() => services.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
