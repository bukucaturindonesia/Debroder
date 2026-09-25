import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { requireWave0aEnv, type Wave0aEnv } from "./support/env";
import { absolute, adminAccessToken, customerAccessToken, jsonResponse, loginAdmin, loginCustomer } from "./support/helpers";

test.describe.configure({ mode: "serial" });

let env: Wave0aEnv;
let createdOrder: { id: string; orderNumber: string; paymentPath: string; trackingPath: string } | null = null;

test.beforeAll(() => {
  env = requireWave0aEnv();
});

test("customer login, protected account, logout, and invalid-session redirect", async ({ page }) => {
  await loginCustomer(page, env.customerA);
  await expect(page.getByRole("heading", { name: /Halo,/ })).toBeVisible();

  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");

  await page.goto("/account");
  await page.waitForURL((url) => url.pathname === "/login");

  await loginCustomer(page, env.customerA);
  await page.evaluate(() => window.localStorage.removeItem("debroder-customer-auth-v1"));
  await page.goto("/account");
  await page.waitForURL((url) => url.pathname === "/login");
});

test("ready stock checkout creates one unpaid order and replays idempotently", async ({ page }) => {
  await loginCustomer(page, env.customerA, "/account");
  await page.goto(`/produk/${encodeURIComponent(env.readyStock.slug)}`);
  await page.getByRole("button", { name: env.readyStock.variant, exact: true }).click();
  await page
    .getByRole("button", { name: new RegExp(`^Ukuran ${env.readyStock.size}(?:,|$)`) })
    .click();
  await page.getByRole("button", { name: "Tambah ke Keranjang", exact: true }).click();

  const revalidation = page.waitForResponse((response) =>
    response.url().includes("/api/cart/revalidate") && response.request().method() === "POST"
  );
  await page.goto("/cart");
  expect((await revalidation).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Isi Keranjang" })).toBeVisible();
  await page.getByRole("link", { name: "Lanjut ke Checkout", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // CheckoutClient renders these controls with stable form names. Use the
  // actual submission contract so this probe waits for the async checkout
  // page instead of depending on a label association that is not exposed by
  // the current Field wrapper.
  await page.locator('select[name="pickupLocationId"]').selectOption(env.readyStock.pickupLocationId);
  await page.locator('select[name="paymentMethod"]').selectOption("bank_transfer");

  const checkoutRequest = page.waitForRequest((request) =>
    request.url().includes("/api/checkout") && request.method() === "POST"
  );
  const checkoutResponse = page.waitForResponse((response) =>
    response.url().includes("/api/checkout") && response.request().method() === "POST"
  );
  await Promise.all([
    page.waitForURL(/\/order-confirmation\//),
    page.getByRole("button", { name: "Buat Pesanan", exact: true }).click()
  ]);
  const request = await checkoutRequest;
  const response = await checkoutResponse;
  expect(response.status()).toBe(201);
  const body = request.postDataJSON() as Record<string, unknown>;
  expect(typeof body.idempotencyKey).toBe("string");
  expect(typeof body.accessToken).toBe("string");

  const confirmationToken = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1);
  expect(confirmationToken).toBeTruthy();
  const paymentLink = page.getByRole("link", { name: /Lihat Rekening & Bayar/ });
  await expect(paymentLink).toBeVisible();
  const paymentPath = await paymentLink.getAttribute("href");
  const trackingPath = await page.locator('a[href^="/track-order/"]').first().getAttribute("href");
  expect(paymentPath).toMatch(/^\/payment\//);
  expect(trackingPath).toMatch(/^\/track-order\//);

  const replay = await page.evaluate(async (payload) => {
    const results: Array<{ status: number; body: unknown }> = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const replayResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      results.push({ status: replayResponse.status, body: await replayResponse.json().catch(() => null) });
    }
    return results;
  }, body);
  expect(replay[0]?.status).toBe(200);
  expect(replay[1]?.status).toBe(200);
  expect(replay[0]?.body).toEqual(replay[1]?.body);

  const concurrent = await page.evaluate(async (payload) => {
    const attempts = await Promise.all([1, 2].map(async () => {
      const concurrentResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      return {
        status: concurrentResponse.status,
        body: await concurrentResponse.json().catch(() => null)
      };
    }));
    return attempts;
  }, body);
  expect(concurrent.every((attempt) => attempt.status === 200)).toBe(true);
  expect(concurrent[0]?.body).toEqual(concurrent[1]?.body);

  const conflictingBody = {
    ...body,
    customer: {
      ...(body.customer as Record<string, unknown>),
      notes: "Wave 0B conflicting payload probe"
    }
  };
  const conflict = await page.evaluate(async (payload) => {
    const conflictResponse = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    return {
      status: conflictResponse.status,
      body: await conflictResponse.json().catch(() => null)
    };
  }, conflictingBody);
  expect(conflict.status).toBe(409);
  expect((conflict.body as { code?: string })?.code).toBe("CHECKOUT_IDEMPOTENCY_CONFLICT");

  const token = await customerAccessToken(page);
  const ordersResponse = await page.request.get(absolute(env.baseUrl, "/api/customer/orders"), {
    headers: { authorization: `Bearer ${token}` }
  });
  expect(ordersResponse.status()).toBe(200);
  const orders = (await jsonResponse(ordersResponse)).orders as Array<{ id: string; orderNumber: string; paymentStatus: string }>;
  const matchingOrders = orders.filter((order) => order.orderNumber === (replay[0]?.body as { orderNumber?: string })?.orderNumber);
  expect(matchingOrders).toHaveLength(1);
  const matching = matchingOrders[0];
  expect(matching).toBeTruthy();
  expect(matching?.paymentStatus).toMatch(/unpaid|pending|waiting|menunggu/i);
  createdOrder = {
    id: matching!.id,
    orderNumber: matching!.orderNumber,
    paymentPath: paymentPath!,
    trackingPath: trackingPath!
  };

  await page.goto(createdOrder.trackingPath);
  await expect(page.getByText(createdOrder.orderNumber, { exact: true })).toBeVisible();
});

test("payment submission and replay keep one payment record", async ({ page }) => {
  expect(createdOrder).toBeTruthy();
  const paymentIdempotencyKey = `wave0a${createdOrder!.id.replace(/-/g, "")}`;
  await page.addInitScript((fixedIdempotencyKey) => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => fixedIdempotencyKey
    });
  }, paymentIdempotencyKey);
  await page.goto(createdOrder!.paymentPath);
  await expect(page.getByRole("heading", { name: createdOrder!.orderNumber })).toBeVisible();

  const paymentApiPath = createdOrder!.paymentPath.replace(/^\/payment\//, "/api/public/payments/");
  const failedPayment = await page.evaluate(async (apiPath) => {
    const form = new FormData();
    form.set("amount", "1");
    form.set("paidAt", new Date(Date.now() - 60_000).toISOString());
    form.set("paymentMethodId", "00000000-0000-0000-0000-000000000000");
    form.set("senderName", "Wave 0B Failure Probe");
    form.set("channelName", "Wave 0B Failure Probe");
    form.set("idempotencyKey", "wave0b-failure-0001");
    form.set("proof", new File(["not-a-payment-image"], "invalid.txt", { type: "text/plain" }));
    const response = await fetch(apiPath, { method: "POST", body: form });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, paymentApiPath);
  expect(failedPayment.status).toBe(400);

  const paidAt = localDateTimeInput();
  const senderName = "DEBRODER Wave 0A Test";
  const channelName = "Wave 0A Test Bank";
  const amount = await page.locator('input[name="amount"]').inputValue();
  await page.getByLabel("Tanggal dan waktu pembayaran", { exact: true }).fill(paidAt);
  await page.getByLabel("Nama pengirim", { exact: true }).fill(senderName);
  await page.getByLabel("Bank / dompet digital pengirim", { exact: true }).fill(channelName);
  await page.getByLabel("Bukti pembayaran (PNG, JPG, PDF; maks. 5 MB)", { exact: true }).setInputFiles(env.paymentProofPath);

  const paymentRequest = page.waitForRequest((request) =>
    request.url().includes("/api/public/payments/") && request.method() === "POST"
  );
  const paymentResponse = page.waitForResponse((response) =>
    response.url().includes("/api/public/payments/") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: /Kirim Bukti Pembayaran/ }).click();
  const request = await paymentRequest;
  expect((await paymentResponse).status()).toBe(201);
  const contentType = request.headers()["content-type"];
  expect(contentType).toContain("multipart/form-data");

  const paymentDetailsResponse = await page.request.get(absolute(env.baseUrl, paymentApiPath));
  expect(paymentDetailsResponse.status()).toBe(200);
  const paymentDetails = await paymentDetailsResponse.json() as { methods?: Array<{ id?: string }> };
  const paymentMethodId = paymentDetails.methods?.[0]?.id;
  expect(paymentMethodId).toMatch(/^[0-9a-f-]{36}$/i);

  const replay = await page.request.fetch(absolute(env.baseUrl, new URL(createdOrder!.paymentPath, env.baseUrl).pathname.replace(/^\/payment\//, "/api/public/payments/")), {
    method: "POST",
    multipart: {
      amount,
      paidAt,
      paymentMethodId: paymentMethodId!,
      senderName,
      channelName,
      idempotencyKey: paymentIdempotencyKey,
      proof: {
        name: "debroder-e2e-payment-proof.png",
        mimeType: "image/png",
        buffer: readFileSync(env.paymentProofPath)
      }
    }
  });
  expect(replay.status()).toBe(200);
  const replayBody = await replay.json() as { idempotent?: boolean; paymentNumber?: string };
  expect(replayBody.idempotent).toBe(true);
  expect(replayBody.paymentNumber).toBeTruthy();
  await expect(page.getByText(/berhasil dikirim/i)).toBeVisible();
  await page.getByText("Riwayat laporan pembayaran", { exact: true }).click();
  await expect(page.getByText(/Menunggu pemeriksaan/i)).toBeVisible();
});

test("customer A and B are isolated by authenticated order ownership", async ({ page, browser }) => {
  expect(createdOrder).toBeTruthy();
  await loginCustomer(page, env.customerA, "/account/orders");
  const tokenA = await customerAccessToken(page);
  const ordersAResponse = await page.request.get(absolute(env.baseUrl, "/api/customer/orders"), {
    headers: { authorization: `Bearer ${tokenA}` }
  });
  expect(ordersAResponse.status()).toBe(200);
  const ordersA = (await jsonResponse(ordersAResponse)).orders as Array<{ id: string; orderNumber: string }>;
  expect(ordersA.some((order) => order.id === createdOrder!.id)).toBe(true);

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  try {
    await loginCustomer(otherPage, env.customerB, "/account/orders");
    const tokenB = await customerAccessToken(otherPage);
    const ordersBResponse = await otherPage.request.get(absolute(env.baseUrl, "/api/customer/orders"), {
      headers: { authorization: `Bearer ${tokenB}` }
    });
    expect(ordersBResponse.status()).toBe(200);
    const ordersB = (await jsonResponse(ordersBResponse)).orders as Array<{ id: string; orderNumber: string }>;
    expect(ordersB.some((order) => order.id === createdOrder!.id)).toBe(false);

    const foreignDetail = await otherPage.request.get(absolute(env.baseUrl, `/api/customer/orders/${encodeURIComponent(createdOrder!.id)}`), {
      headers: { authorization: `Bearer ${tokenB}` }
    });
    expect(foreignDetail.status()).toBe(404);
  } finally {
    await otherContext.close();
  }
});

test("unauthenticated admin access is denied and full admin can verify the order", async ({ page }) => {
  const unauthorized = await page.request.get(absolute(env.baseUrl, "/api/admin/orders"));
  expect([401, 403]).toContain(unauthorized.status());
  await page.goto("/admin/orders");
  await page.waitForURL((url) => url.pathname === "/admin/login");

  await loginAdmin(page, env.fullAdmin);
  const token = await adminAccessToken(page);
  const orders = await page.request.get(absolute(env.baseUrl, "/api/admin/orders"), {
    headers: { authorization: `Bearer ${token}` }
  });
  expect(orders.status()).toBe(200);
  expect(JSON.stringify(await jsonResponse(orders))).toContain(createdOrder!.orderNumber);
});

test("admin guest cannot mutate and scoped admin cannot read an out-of-scope order", async ({ browser }) => {
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  try {
    await loginAdmin(guestPage, env.adminGuest);
    const guestToken = await adminAccessToken(guestPage);
    const guestMutation = await guestPage.request.patch(absolute(env.baseUrl, "/api/admin/orders/not-a-real-order"), {
      headers: { authorization: `Bearer ${guestToken}` },
      data: { action: "cancel", reason: "Wave 0A permission probe" }
    });
    expect([401, 403]).toContain(guestMutation.status());
    await guestPage.goto("/admin/orders");
    await expect(guestPage.locator('[data-admin-mutation="true"]:not([disabled])')).toHaveCount(0);
  } finally {
    await guestContext.close();
  }

  const scopedContext = await browser.newContext();
  const scopedPage = await scopedContext.newPage();
  try {
    await loginAdmin(scopedPage, env.scopedAdmin);
    const scopedToken = await adminAccessToken(scopedPage);
    const outOfScope = await scopedPage.request.get(absolute(env.baseUrl, `/api/admin/orders/${encodeURIComponent(env.outOfScopeOrderId)}`), {
      headers: { authorization: `Bearer ${scopedToken}` }
    });
    expect([403, 404]).toContain(outOfScope.status());
  } finally {
    await scopedContext.close();
  }
});

function localDateTimeInput() {
  const date = new Date(Date.now() - 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
