import { test, expect, type Page } from "@playwright/test";
import { createReadyStockCartItem, serializeCartV5 } from "../lib/cart-v5";
const productId = "10000000-0000-4000-8000-000000000001",
  variantId = "10000000-0000-4000-8000-000000000002",
  sizeId = "10000000-0000-4000-8000-000000000003";
const line = createReadyStockCartItem({
  lineId: "fast-test",
  quantity: 2,
  productId,
  variantId,
  variantSizeId: sizeId,
  sku: "TEST-ONLY",
  display: { title: "Kaos Test Lokal", href: "/produk/test-only" },
  ui: {
    name: "Kaos Test Lokal",
    priceValue: 45000,
    color: "Hitam",
    size: "M",
    imageUrl: "/debroder/social-preview.png",
  },
});
const destination = {
  id: 1,
  label: "Dago, Coblong, Bandung, 40135",
  province_name: "Jawa Barat",
  city_name: "Bandung",
  district_name: "Coblong",
  subdistrict_name: "Dago",
  zip_code: "40135",
  token: "mock-destination",
};
async function setup(page: Page) {
  let creates = 0,
    snaps = 0;
  await page.addInitScript(
    (cart) => {
      if (!localStorage.getItem("debroder-cart-v5"))
        localStorage.setItem("debroder-cart-v5", cart);
      Object.assign(window, {
        snap: {
          pay: (_token: string, options: { onSuccess: () => void }) =>
            options.onSuccess(),
        },
      });
    },
    serializeCartV5([line]),
  );
  await page.route("**/api/cart/revalidate", (r) =>
    r.fulfill({
      json: {
        items: [
          {
            product_variant_size_id: sizeId,
            status: "ok",
            error_code: null,
            latest_unit_price: 45000,
            stock_available: 10,
            message: null,
          },
        ],
      },
    }),
  );
  await page.route("**/api/checkout/fast/config", (r) =>
    r.fulfill({
      json: {
        enabled: true,
        pickupEnabled: false,
        pickupLocationIds: [],
        shippingConfigured: true,
      },
    }),
  );
  await page.route("**/api/shipping/destinations?*", (r) =>
    r.fulfill({ json: { destinations: [destination] } }),
  );
  await page.route("**/api/shipping/quotes", (r) =>
    r.fulfill({
      json: {
        subtotal: 90000,
        quotes: [
          {
            rate: {
              code: "jne",
              name: "JNE",
              service: "REG",
              description: "Regular",
              cost: 12000,
              etd: "2-3 day",
            },
            expiresAt: Date.now() + 300000,
            token: "mock-quote",
          },
        ],
      },
    }),
  );
  await page.route("**/api/checkout/fast", (r) => {
    creates++;
    return r.fulfill({
      json: {
        orderId: productId,
        orderNumber: "TEST-ORDER",
        total: 102000,
        trackingToken: "t".repeat(64),
        confirmationUrl: "/order-confirmation/test",
      },
    });
  });
  await page.route("**/api/payments/midtrans/snap", (r) => {
    snaps++;
    return r.fulfill({
      json: {
        token: "mock-snap",
        redirectUrl: "https://app.sandbox.midtrans.com/snap/v4/test",
        clientKey: "mock-client",
      },
    });
  });
  await page.route("**/api/payments/midtrans/status", (r) =>
    r.fulfill({
      json: {
        paymentStatus: "unpaid",
        orderStatus: "awaiting_payment",
        confirmationUrl: "/order-confirmation/test",
      },
    }),
  );
  return { creates: () => creates, snaps: () => snaps };
}
async function fill(page: Page) {
  await page
    .getByLabel("Nama penerima", { exact: true })
    .fill("Pelanggan Test");
  await page.getByLabel("Nomor WhatsApp", { exact: true }).fill("08123456789");
  await page
    .getByLabel("Email untuk pesanan", { exact: true })
    .fill("test@example.com");
  await page
    .getByLabel("Cari kota, kecamatan, atau kode pos", { exact: true })
    .fill("Dago");
  await page
    .getByRole("button", { name: destination.label, exact: true })
    .click();
  await page
    .getByLabel("Alamat lengkap, nomor rumah, dan patokan", { exact: true })
    .fill("Jl Dago No 1");
  await page
    .getByRole("button", { name: "Hitung Ongkir / Coba Lagi", exact: true })
    .click();
  await page.getByRole("radio", { name: /JNE REG/ }).check();
  await expect(
    page.getByRole("button", { name: "BAYAR SEKARANG", exact: true }),
  ).toBeEnabled();
}
for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
  test(`fast checkout guest UX MOCK at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const count = await setup(page);
    await page.goto("/checkout", { waitUntil: "networkidle" });
    await fill(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
    await expect(page.getByText(/^Rp\s*102\.000$/)).toBeVisible();
    await page
      .getByRole("button", { name: "BAYAR SEKARANG", exact: true })
      .focus();
    await expect(
      page.getByRole("button", { name: "BAYAR SEKARANG", exact: true }),
    ).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`checkout-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "BAYAR SEKARANG", exact: true })
      .evaluate((button) => {
        (button as HTMLButtonElement).click();
        (button as HTMLButtonElement).click();
      });
    await expect.poll(count.creates).toBe(1);
    await expect.poll(count.snaps).toBe(1);
    // Fake onSuccess cannot clear the cart or claim paid: server reports unpaid.
    await expect(
      page.getByText(/Status pembayaran: menunggu pembayaran/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          JSON.parse(
            sessionStorage.getItem("debroder-fast-checkout-v1") || "null",
          ).session.orderNumber,
      ),
    ).toBe("TEST-ORDER");
    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Pesanan TEST-ORDER" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "BAYAR SEKARANG", exact: true })
      .click();
    await expect.poll(count.snaps).toBe(2);
    expect(count.creates()).toBe(1);
    expect(errors).toEqual([]);
  });
}
test("shipping failure preserves address/cart and never enables a free-shipping payment", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/shipping/quotes", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Ongkir belum dapat dihitung. Silakan coba lagi." },
    }),
  );
  await page.goto("/checkout", { waitUntil: "networkidle" });
  await page
    .getByLabel("Nama penerima", { exact: true })
    .fill("Pelanggan Test");
  await page.getByLabel("Nomor WhatsApp", { exact: true }).fill("08123456789");
  await page
    .getByLabel("Email untuk pesanan", { exact: true })
    .fill("test@example.com");
  await page
    .getByLabel("Cari kota, kecamatan, atau kode pos", { exact: true })
    .fill("Dago");
  await page
    .getByRole("button", { name: destination.label, exact: true })
    .click();
  const address = page.getByRole("textbox", {
    name: "Alamat lengkap, nomor rumah, dan patokan",
    exact: true,
  });
  await address.fill("Jl Dago No 1");
  await page
    .getByRole("button", { name: "Hitung Ongkir / Coba Lagi", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Ongkir belum dapat dihitung" }),
  ).toContainText("Ongkir belum dapat dihitung");
  await expect(address).toHaveValue("Jl Dago No 1");
  await expect(
    page.getByRole("button", { name: "BAYAR SEKARANG", exact: true }),
  ).toBeDisabled();
  await page.reload({ waitUntil: "networkidle" });
  await expect(address).toHaveValue("Jl Dago No 1");
});
test("anonymous settings mutation is denied at the real API boundary", async ({
  request,
}) => {
  const r = await request.post("/api/admin/checkout-settings", { data: {} });
  expect(r.status()).toBe(401);
});
