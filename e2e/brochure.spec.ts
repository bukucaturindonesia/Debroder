import { expect, test } from "@playwright/test";

const routes = ["/", "/produk", "/layanan", "/tentang", "/kontak"];

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
    const broken = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute("src")));
    expect(broken, route).toEqual([]);
  }

  expect(errors).toEqual([]);
  expect(supabaseRequests).toEqual([]);
});

test("first-launch products remain empty and consultation stays non-transactional", async ({ page }) => {
  await page.goto("/produk", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Produk segera hadir." })).toBeVisible();
  await expect(page.getByText("Koleksi DEBRODER sedang kami siapkan.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lihat Layanan/ })).toHaveAttribute("href", "/layanan");
  await expect(page.getByRole("link", { name: "Hubungi Kami" })).toHaveAttribute("href", "/kontak");
  await expect(page.getByText("NSA PREMIUM")).toHaveCount(0);
  await expect(page.getByText("Cotton Combed 24s")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /keranjang|beli sekarang|checkout/i })).toHaveCount(0);
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
