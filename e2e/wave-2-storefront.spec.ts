import { expect, test, type ConsoleMessage, type Page, type Request } from "@playwright/test";

const viewports = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
] as const;

const homepageSections = [
  "#featured",
  "#trending",
  ".home-campaign",
  "#fresh-drops",
  "#shop-category",
  "#store",
  "#tentang"
] as const;

const requiredHomepageSections = [
  ".home-campaign",
  "#shop-category",
  "#store",
  "#tentang"
] as const;

type PageSignals = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  reset: () => void;
};

function watchPage(page: Page): PageSignals {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  const onRequestFailed = (request: Request) => {
    const failure = request.failure()?.errorText || "unknown failure";
    if (failure.includes("ERR_ABORTED")) return;
    if (request.url().startsWith(new URL(page.url()).origin)) {
      failedRequests.push(`${request.method()} ${request.url()} — ${failure}`);
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  return {
    consoleErrors,
    pageErrors,
    failedRequests,
    reset() {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      failedRequests.length = 0;
    }
  };
}

async function documentAudit(page: Page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    brokenImages: Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src || image.alt),
    primaryNavigations: document.querySelectorAll('nav[aria-label="Navigasi utama"]').length,
    footers: document.querySelectorAll("footer").length
  }));
}

async function expectHealthyDocument(page: Page, route: string, signals: PageSignals, expectedStatus?: number) {
  signals.reset();
  const response = await page.goto(route, { waitUntil: "load" });
  const status = response?.status() ?? 0;
  if (expectedStatus) expect(status, `${route} returned an unexpected status`).toBe(expectedStatus);
  else expect(status, `${route} returned a server error`).toBeLessThan(500);
  await expect(page.locator("main").first(), `${route} has no visible main landmark`).toBeVisible();
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

  const audit = await documentAudit(page);
  expect(audit.scrollWidth - audit.clientWidth, `${route} overflows the viewport`).toBeLessThanOrEqual(1);
  expect(audit.brokenImages, `${route} has broken loaded images`).toEqual([]);
  expect(audit.primaryNavigations, `${route} must mount one canonical primary navigation`).toBe(1);
  expect(audit.footers, `${route} must mount one canonical footer`).toBe(1);
  const unexpectedConsoleErrors = expectedStatus === 404
    ? signals.consoleErrors.filter((message) => !message.includes("status of 404"))
    : signals.consoleErrors;
  expect(unexpectedConsoleErrors, `${route} emitted browser console errors`).toEqual([]);
  expect(signals.pageErrors, `${route} emitted uncaught page errors`).toEqual([]);
  expect(signals.failedRequests, `${route} has failed same-origin requests`).toEqual([]);
}

test.describe.configure({ mode: "serial" });

for (const viewport of viewports) {
  test(`homepage keeps its canonical responsive composition at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const signals = watchPage(page);
    await expectHealthyDocument(page, "/", signals);

    for (const selector of requiredHomepageSections) {
      await expect(page.locator(selector), `missing required Homepage section ${selector}`).toHaveCount(1);
    }
    for (const selector of homepageSections) {
      expect(await page.locator(selector).count(), `duplicate Homepage section ${selector}`).toBeLessThanOrEqual(1);
    }

    const positions = await page.evaluate((selectors) => {
      const sections = Array.from(document.querySelectorAll("section"));
      return selectors
        .map((selector) => document.querySelector(selector))
        .filter((section): section is HTMLElement => Boolean(section))
        .map((section) => sections.indexOf(section));
    }, homepageSections);

    expect(positions.length).toBeGreaterThanOrEqual(requiredHomepageSections.length);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    await expect(page.locator("#pakaian-polos")).toHaveCount(0);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }] as const) {
  test(`public storefront route matrix is healthy at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(viewport);
    const signals = watchPage(page);

    await expectHealthyDocument(page, "/koleksi", signals);
    const productHref = await page.locator('a[href^="/produk/"]').first().getAttribute("href");
    expect(productHref, "collection must expose a canonical product-detail link").toMatch(/^\/produk\//);

    const routes = [
      "/",
      "/koleksi",
      "/jersey",
      "/jersey/shop",
      "/kaos-polos",
      "/kaos-polos/shop",
      "/jaket-hoodie",
      "/jaket-hoodie/shop",
      "/headwear",
      "/headwear/shop",
      "/sablon-dtf",
      "/cetak-sublim",
      "/search?q=kaos",
      productHref!,
      "/cart",
      "/checkout",
      "/login",
      "/register",
      "/forgot-password",
      "/account",
      "/account/orders",
      "/order-confirmation",
      "/track-order",
      "/help",
      "/store",
      "/cara-order"
    ];

    for (const route of routes) {
      await expectHealthyDocument(page, route, signals);
      if (route === "/cart") await expect(page).toHaveURL(/\/keranjang\/?$/);
    }
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }] as const) {
  test(`not-found preserves public recovery chrome at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const signals = watchPage(page);
    await expectHealthyDocument(page, "/wave-2-not-found-check", signals, 404);
    await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kembali ke Beranda" })).toHaveAttribute("href", "/");
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }] as const) {
  test(`catalog query survives refresh and browser history at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const signals = watchPage(page);
    await expectHealthyDocument(page, "/koleksi", signals);

    const search = page.getByRole("textbox", { name: "Cari produk" });
    await search.fill("ready stock");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("ready stock");

    await page.reload({ waitUntil: "load" });
    await expect(page.getByRole("textbox", { name: "Cari produk" })).toHaveValue("ready stock");

    await page.goBack({ waitUntil: "load" });
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
    await expect(page.getByRole("textbox", { name: "Cari produk" })).toHaveValue("");

    await page.goForward({ waitUntil: "load" });
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("ready stock");
    await expect(page.getByRole("textbox", { name: "Cari produk" })).toHaveValue("ready stock");
  });
}
