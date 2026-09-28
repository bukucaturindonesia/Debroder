import { expect, test } from "@playwright/test";

const routes = ["/", "/produk", "/layanan", "/tentang", "/kontak", "/produk/nsa-premium", "/produk/cotton-combed-24s"];

test("brochure routes render without client errors or Supabase requests", async ({ page }) => {
  const errors: string[] = [];
  const supabaseRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (request.url().includes("supabase.co")) supabaseRequests.push(request.url()); });

  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeAttached();
    expect(await page.title(), route).toContain("DEBRODER");
    for (const image of await page.locator("main img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    }
    const broken = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute("src")));
    expect(broken, route).toEqual([]);
  }

  expect(errors).toEqual([]);
  expect(supabaseRequests).toEqual([]);
});

test("products open a detail and prepare the exact WhatsApp inquiry without submitting an order", async ({ page }) => {
  await page.goto("/produk", { waitUntil: "networkidle" });
  await expect(page.locator(".brochure-product-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /keranjang|beli sekarang|checkout/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Lihat NSA Premium", exact: true }).click();
  await expect(page).toHaveURL(/\/produk\/nsa-premium$/);
  await expect(page.getByRole("heading", { level: 1, name: "NSA Premium" })).toBeVisible();
  await page.getByLabel("Ukuran", { exact: true }).fill("M & L");
  await page.getByLabel("Warna", { exact: true }).fill("Hitam");
  await page.getByLabel("Jumlah", { exact: true }).fill("24");
  await page.getByLabel("Catatan", { exact: true }).fill("Logo tim #1");
  const action = page.getByRole("link", { name: "Pesan via WhatsApp" });
  const url = new URL((await action.getAttribute("href"))!);
  expect(`${url.origin}${url.pathname}`).toBe("https://wa.me/6285355333364");
  expect(url.searchParams.get("text")).toBe("Halo DEBRODER,\nsaya ingin menanyakan/pesan:\n\nProduk/Layanan: NSA Premium\nUkuran: M & L\nWarna: Hitam\nJumlah: 24\nCatatan: Logo tim #1");
  await page.getByLabel("Jumlah", { exact: true }).fill("0");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pesan via WhatsApp" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pesan via WhatsApp" })).toBeDisabled();
  await page.getByLabel("Jumlah", { exact: true }).fill("1.5");
  await expect(page.getByRole("button", { name: "Pesan via WhatsApp" })).toBeDisabled();
  await page.getByLabel("Jumlah", { exact: true }).fill("24");
  // Inspect the navigation handoff locally; never send a message or contact WhatsApp during QA.
  await page.route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/plain", body: "WhatsApp handoff captured by test" }));
  await action.click();
  await expect(page).toHaveURL(url.toString());
});

test("mobile brochure navigation is usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const menu = page.locator('summary[aria-label="Buka menu navigasi"]');
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Navigasi mobile" }).getByRole("link", { name: "Produk" })).toBeVisible();
  await page.getByRole("navigation", { name: "Navigasi mobile" }).getByRole("link", { name: "Produk" }).click();
  await expect(page).toHaveURL(/\/produk$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("release denies unknown and trial product details while allowing the two inquiry products", async ({ request }) => {
  for (const path of ["/produk/w3-test", "/produk/17159506-1b3f-45fd-8a12-8ec1a2531574", "/koleksi", "/jersey/shop", "/checkout", "/cart", "/account/orders"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const body = await sitemap.text();
  for (const path of ["/produk", "/layanan", "/tentang", "/kontak"]) {
    expect(body).toContain(path);
  }
  expect(body).toContain("/produk/nsa-premium");
  expect(body).toContain("/produk/cotton-combed-24s");
  expect((body.match(/<loc>/g) || []).length).toBe(7);
  expect(body).not.toContain("/koleksi");
});

test("canonical graphical logo stays visible in header and dark footer across release pages and viewports", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `${route} at ${viewport.width}px`).toBe(200);
      const header = page.locator(".brochure-brand");
      const footer = page.locator(".brochure-footer-brand");
      await expect(header).toHaveAttribute("href", "/");
      await expect(header.getByRole("img", { name: "Logo DE BRODER" })).toBeVisible();
      await expect(footer.getByRole("img", { name: "Logo DE BRODER" })).toBeVisible();
      expect(await header.locator("img").evaluateAll((images) => images.map((image) => ({
        src: image.getAttribute("src"),
        ready: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
      })))).toEqual([
        { src: "/brand/debroder/logo-symbol-black.svg", ready: true },
        { src: "/brand/debroder/logo-wordmark-black.svg", ready: true }
      ]);
      expect(await footer.locator("img").evaluateAll((images) => images.map((image) => ({
        src: image.getAttribute("src"),
        ready: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
      })))).toEqual([
        { src: "/brand/debroder/logo-symbol-white.svg", ready: true },
        { src: "/brand/debroder/logo-wordmark-white.svg", ready: true }
      ]);
      expect(await footer.evaluate((node) => getComputedStyle(node.closest(".brochure-footer")!).backgroundColor)).toBe("rgb(32, 35, 31)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${route} at ${viewport.width}px`).toBe(false);

      if (route === "/" && (viewport.width === 390 || viewport.width === 1440)) {
        await page.locator(".brochure-header").screenshot({ path: testInfo.outputPath(`brochure-header-${viewport.width}.png`) });
        await page.locator(".brochure-footer-grid").screenshot({ path: testInfo.outputPath(`brochure-footer-${viewport.width}.png`) });
      }
    }
    if (viewport.width <= 768) {
      await page.goto("/");
      await page.locator('summary[aria-label="Buka menu navigasi"]').click();
      await expect(page.getByRole("navigation", { name: "Navigasi mobile" }).getByRole("link", { name: "Produk" })).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

test("mobile service links close the menu and reach the requested service", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/layanan", { waitUntil: "networkidle" });
  await page.locator('summary[aria-label="Buka menu navigasi"]').click();
  await page.getByRole("navigation", { name: "Navigasi mobile" }).getByRole("link", { name: "DTF / Sablon" }).click();
  await expect(page).toHaveURL(/\/layanan#dtf-sablon$/);
  await expect(page.locator(".brochure-mobile-menu")).not.toHaveAttribute("open", "");
  await expect(page.locator("#dtf-sablon")).toBeInViewport();
  const href = await page.locator("#dtf-sablon a").getAttribute("href");
  expect(new URL(href!).searchParams.get("text")).toContain("Produk/Layanan: DTF / Sablon");
});

test("homepage and product detail are usable on small mobile and desktop", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 320, height: 780 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/produk/cotton-combed-24s"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${path} at ${viewport.width}`).toBe(false);
      await expect(page.locator(".brochure-header-cta")).toBeVisible();
      for (const image of await page.locator("main img").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`${path === "/" ? "homepage" : "product"}-${viewport.width}.png`), fullPage: true });
    }
  }
});
