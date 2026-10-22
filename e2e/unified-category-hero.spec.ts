import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const routes = ["kaos-polos", "koleksi", "sablon-dtf", "jersey", "custom", "jaket-hoodie", "headwear"];
const navigation = ["/koleksi", "/kaos-polos", "/sablon-dtf", "/jersey", "/custom", "/jaket-hoodie", "/headwear"];

for (const width of [1600, 1440, 1280, 1024, 768, 430, 390, 360]) {
  test(`shared image-only hero geometry at ${width}px`, async ({ page }) => {
    if (process.env.HERO_COMPARE_BASELINE === "1") {
      // Baseline was captured by resizing a 1600px browser. Match its warm image cache
      // so a smaller optimizer candidate does not create a false pixel regression.
      await page.setViewportSize({ width: 1600, height: 960 });
      await page.goto("/kaos-polos");
      await expect.poll(() => page.locator("[data-category-hero]:visible img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    await page.setViewportSize({ width, height: 960 });
    let master: unknown;
    const report = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    for (const route of routes) {
      const response = await page.goto(`/${route}`);
      expect(response?.status()).toBe(200);
      const hero = page.locator("[data-category-hero]:visible");
      await expect(hero).toHaveCount(1);
      await expect.poll(() => hero.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      if (route === "sablon-dtf") {
        const content = page.locator(".category-hero-following:visible");
        await expect(content).toHaveClass(/is-visible/);
        await content.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
      }
      const geometry = await hero.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const image = element.querySelector("img")!;
        const css = getComputedStyle(element);
        const mediaRect = image.getBoundingClientRect();
        const sibling = element.nextElementSibling!;
        const following = sibling.matches(".category-hero-following, .kaos-blueprint-intro-section") ? sibling : sibling.querySelector(".category-hero-following")!;
        const gap = following.getBoundingClientRect().top + parseFloat(getComputedStyle(following).paddingTop) - rect.bottom;
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          radius: css.borderRadius, fit: getComputedStyle(image).objectFit, position: getComputedStyle(image).objectPosition, gap,
          media: { x: mediaRect.x, y: mediaRect.y, width: mediaRect.width, height: mediaRect.height } };
      });
      if (route === "kaos-polos") master = geometry;
      expect(geometry, route).toEqual(master);
      expect(geometry.media, "image must fill the hero without inherited section padding").toEqual({ x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height });
      expect(await hero.locator("a,button").count()).toBe(0);
      const visibleText = await hero.evaluate((element) => [...element.querySelectorAll("h1,p,span")]
        .filter((node) => !node.classList.contains("sr-only")).map((node) => node.textContent));
      expect(visibleText).toEqual([]);
      await expect(hero.locator("img")).toHaveAttribute("loading", "eager");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const footerLinks = await page.locator("footer .public-footer-column").filter({ has: page.locator("h3").filter({ hasText: /^Belanja$/ }) }).locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      expect(footerLinks).toEqual(navigation);
      const output = process.env.HERO_ARTIFACT_DIR;
      const image = await hero.locator("img").evaluate((element: HTMLImageElement) => ({ src: element.currentSrc, width: element.naturalWidth, height: element.naturalHeight }));
      let kaosPixelMatch: boolean | undefined;
      if (output) {
        mkdirSync(output, { recursive: true });
        const heroScreenshot = await hero.screenshot({ path: join(output, `${route}-hero-${width}.png`) });
        if (route === "kaos-polos" && process.env.HERO_COMPARE_BASELINE === "1") {
          kaosPixelMatch = heroScreenshot.equals(readFileSync(join(output, `before-kaos-hero-${width}.png`)));
          expect(kaosPixelMatch, "Kaos hero pixels must remain identical").toBe(true);
        }
        if (width === 1440 || width === 390) await page.screenshot({ path: join(output, `${route}-${width}.png`) });
      }
      report.push({ route, width, geometry, image, kaosPixelMatch });
    }
    expect(errors).toEqual([]);
    if (process.env.HERO_ARTIFACT_DIR) writeFileSync(join(process.env.HERO_ARTIFACT_DIR, `report-${width}.json`), JSON.stringify({ report, errors }, null, 2));
  });
}

test("mobile drawer keeps the owner order and correct destinations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jersey");
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  const drawer = page.locator("#global-mobile-navigation");
  await expect(drawer).toBeVisible();
  const links = drawer.locator("a:visible");
  expect((await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")))).slice(0, 7)).toEqual(navigation);
  await expect(drawer.locator('a[href="/jersey"]')).toHaveAttribute("aria-current", "page");
  await drawer.locator('a[href="/koleksi"]').first().click();
  await expect(page).toHaveURL(/\/koleksi$/);
});

test("the rendered picture selects dedicated mobile artwork at the master breakpoint", async ({ page }) => {
  await page.goto("/kaos-polos");
  const picture = await page.locator("[data-category-hero]:visible picture").evaluate((element) => element.outerHTML);
  // Isolated browser fixture using the production picture markup; no CMS mutation.
  await page.setContent(picture);
  const desktop = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="2170" height="725"><rect width="100%" height="100%" fill="navy"/></svg>');
  const mobile = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="100%" height="100%" fill="green"/></svg>');
  await page.locator("picture").evaluate((element, media) => {
    element.querySelector("source")!.setAttribute("srcset", media.mobile);
    const image = element.querySelector("img")!;
    image.removeAttribute("srcset");
    image.src = media.desktop;
  }, { desktop, mobile });
  for (const width of [390, 767, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await expect.poll(() => page.locator("img").evaluate((image: HTMLImageElement) => image.currentSrc)).toBe(width <= 767 ? mobile : desktop);
  }
});
