import { expect, test } from "@playwright/test";

// No fixtures, login, order creation, or remote database writes in this suite.
for (const width of [390, 1440]) {
  test(`public commerce route matrix at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const route of ["/", "/koleksi", "/jersey", "/jersey/shop", "/kaos-polos",
      "/jaket-hoodie", "/headwear", "/sablon-dtf", "/cetak-sublim", "/cart", "/checkout"]) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
      const document = await page.evaluate(() => ({
        overflow: window.document.documentElement.scrollWidth > window.innerWidth + 1,
        brokenImages: Array.from(window.document.images)
          .filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src)
      }));
      expect(document.overflow, route).toBe(false);
      expect(document.brokenImages, route).toEqual([]);
      const path = testInfo.outputPath(`${route.replaceAll("/", "_") || "home"}-${width}.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(`${route}-${width}`, { path, contentType: "image/png" });
    }
    expect(errors).toEqual([]);
  });
}

test("gateway 404 retains an old unknown-outcome checkout key", async ({ page }) => {
  const stored = {
    idempotencyKey: "solo-recovery-original-key-0123456789",
    accessToken: "a".repeat(64),
    createdAt: "2026-01-01T00:00:00.000Z",
    payloadHash: "original-payload"
  };
  await page.addInitScript((value) => {
    sessionStorage.setItem("debroder-checkout-recovery-v1", JSON.stringify(value));
  }, stored);
  await page.route("**/api/checkout?*", (route) => route.fulfill({
    status: 404, contentType: "text/html", body: "<html>Gateway route unavailable</html>"
  }));
  const probe = page.waitForResponse((response) => response.url().includes("/api/checkout?"));
  await page.goto("/checkout", { waitUntil: "networkidle" });
  expect((await probe).status()).toBe(404);
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("debroder-checkout-recovery-v1") || "null")
  )).toEqual(stored);
});

test("anonymous admin access redirects to login", async ({ page }) => {
  await page.goto("/admin/products", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("checkout rejects malformed requests before any order creation", async ({ request }) => {
  const recovery = await request.get("/api/checkout?idempotencyKey=bad");
  expect(recovery.status()).toBe(400);
  expect((await recovery.json()).code).toBe("CHECKOUT_RECOVERY_INVALID");
  const checkout = await request.post("/api/checkout", { data: {} });
  expect(checkout.status()).toBe(400);
  expect((await checkout.json()).code).toBe("CHECKOUT_INVALID_REQUEST");
});
