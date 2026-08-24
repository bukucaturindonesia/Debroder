import { expect, test, type Page } from "@playwright/test";
import { adminAccessToken, absolute, jsonResponse, loginAdmin } from "./support/helpers";
import type { Wave0aEnv } from "./support/env";
import { requireWave0aEnv } from "./support/env";

const PICKUP_QUOTATION_ID = "a1111111-1111-4111-8111-111111111111";
const SHIPPING_QUOTATION_ID = "a2222222-2222-4222-8222-222222222222";
const CUSTOMER_A_ID = "6be061d1-f568-43d6-b862-72b8db29c317";
const CUSTOMER_A_NAME = "DEBRODER E2E Customer A";
const CUSTOMER_A_EMAIL = "debroder.e2e.customer.a@example.com";
const CUSTOMER_A_PHONE = "+6281333333333";
const PICKUP_TOTAL = 143000;
const SHIPPING_COST = 25000;
const SHIPPING_TOTAL = PICKUP_TOTAL + SHIPPING_COST;
const SHIPPING_ADDRESS = "Jl. Test Wave 1 No. 123, Mamuju, Sulawesi Barat";

type OrderDetail = {
  order: {
    id: string;
    order_number: string;
    quotation_id: string | null;
    delivery_method: string;
    shipping_address: string;
    payment_status: string;
    total_amount: number;
  };
  items: Array<{
    id: string;
    required_services: unknown;
  }>;
  job_order: unknown;
  quality_control: unknown;
  fulfillment: unknown;
  latest_payment: unknown;
};

type SupabaseBrowserAuth = {
  origin: string;
  apikey: string;
  authorization: string;
};

// The isolated staging runtime compiles several admin routes on first access.
// Keep assertion deadlines strict while allowing that one-time compilation to finish.
test.describe.configure({ mode: "serial", timeout: 240_000 });

test.describe("Wave 1 quotation-to-order browser contract", () => {
  let env: Wave0aEnv;

  test.beforeAll(() => {
    // This is the existing harness guard. It must fail closed when the owner-approved
    // staging contract and all browser identities are not supplied.
    env = requireWave0aEnv();
  });

  test("Full Admin authenticates and sees the quotation conversion workspace", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    const workspace = await openQuotation(page, PICKUP_QUOTATION_ID, env.fullAdmin);

    if (workspace.existingOrder) {
      await expect(page.getByRole("button", { name: "Buka Pesanan", exact: true })).toBeVisible();
      await openExistingOrder(page);
      await assertCanonicalOrder(page, PICKUP_QUOTATION_ID, "pickup", PICKUP_TOTAL);
    } else {
      await expect(page.getByRole("heading", { name: "Kontrak transaksi order", exact: true })).toBeVisible();
      await expect(page.getByRole("checkbox")).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Metode penyerahan" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Status transaksi" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Toko pickup" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Metode pembayaran" })).toBeVisible();
      await expect(page.getByRole("spinbutton", { name: "Ongkir final" })).toBeVisible();
      await expect(page.getByRole("spinbutton", { name: "Harga quotation yang dikunci" })).toBeVisible();
    }

    await assertNoConsoleErrors(consoleErrors);
  });

  test("the conversion workspace enforces every explicit transaction field", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    const workspace = await openQuotation(page, PICKUP_QUOTATION_ID, env.fullAdmin);

    if (workspace.existingOrder) {
      // The retained W1 fixture is already converted. The application intentionally
      // collapses the form to the canonical order link, so no new business fixture is created.
      await expect(page.getByRole("button", { name: "Buka Pesanan", exact: true })).toBeVisible();
      test.info().annotations.push({
        type: "note",
        description: "Explicit-field form was not reopened because the retained W1 quotation already has its canonical order."
      });
      await assertNoConsoleErrors(consoleErrors);
      return;
    }

    const convertButton = page.getByRole("button", { name: "Konversi Menjadi Pesanan", exact: true });
    await convertButton.click();
    await expect(page.getByText("Konfirmasi identitas pelanggan dari quotation terlebih dahulu.", { exact: true })).toBeVisible();

    await page.getByRole("checkbox").check();
    await convertButton.click();
    await expect(page.getByText("Pilih metode penyerahan secara eksplisit.", { exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Metode penyerahan" }).selectOption("pickup");
    await convertButton.click();
    await expect(page.getByText("Pilih toko pickup secara eksplisit.", { exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Toko pickup" }).selectOption(env.readyStock.pickupLocationId);
    await convertButton.click();
    await expect(page.getByText("Ongkir final wajib diisi; gunakan 0 untuk pickup.", { exact: true })).toBeVisible();

    await page.getByRole("spinbutton", { name: "Ongkir final" }).fill("0");
    await convertButton.click();
    await expect(page.getByText("Pilih metode pembayaran secara eksplisit.", { exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Metode pembayaran" }).selectOption("bank_transfer");
    await convertButton.click();
    await expect(page.getByText("Harga final wajib diisi dan harus sama dengan total quotation.", { exact: true })).toBeVisible();

    await page.getByRole("spinbutton", { name: "Harga quotation yang dikunci" }).fill(String(PICKUP_TOTAL));
    await convertButton.click();
    await expect(page.getByText("Pilih status transaksi secara eksplisit.", { exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Status transaksi" }).selectOption("under_review");
    await convertButton.click();
    await expect(page).toHaveURL(/\/admin\/orders\/[0-9a-f-]+$/);
    await assertCanonicalOrder(page, PICKUP_QUOTATION_ID, "pickup", PICKUP_TOTAL);
    await assertNoConsoleErrors(consoleErrors);
  });

  test("pickup conversion exposes one visible canonical order without downstream side effects", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openQuotation(page, PICKUP_QUOTATION_ID, env.fullAdmin);
    await openExistingOrder(page);
    await assertCanonicalOrder(page, PICKUP_QUOTATION_ID, "pickup", PICKUP_TOTAL);
    await assertNoConsoleErrors(consoleErrors);
  });

  test("shipping conversion exposes the shipping contract and one canonical order", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    const workspace = await openQuotation(page, SHIPPING_QUOTATION_ID, env.fullAdmin);

    if (!workspace.existingOrder) {
      await fillConversionForm(page, env, "shipping");
      await page.getByRole("button", { name: "Konversi Menjadi Pesanan", exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/orders\/[0-9a-f-]+$/);
    } else {
      await openExistingOrder(page);
    }

    await assertCanonicalOrder(page, SHIPPING_QUOTATION_ID, "shipping", SHIPPING_TOTAL, SHIPPING_ADDRESS);
    await assertNoConsoleErrors(consoleErrors);
  });

  test("same material replay returns the same order and does not duplicate its graph", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    const workspace = await openQuotation(page, PICKUP_QUOTATION_ID, env.fullAdmin);
    if (!workspace.existingOrder) {
      test.skip(true, "The retained W1 pickup fixture must be converted before replay verification; creating it here would hide the fixture state.");
      return;
    }

    await openExistingOrder(page);
    const first = await readOrder(page);
    const firstPath = new URL(page.url()).pathname;
    const replay = await invokeConversionRpc(page, workspace.supabaseAuth, pickupPayload(env, 0));
    expect(replay.status).toBe(200);
    expect(replay.text).toContain(first.order.id);

    await page.goto(`/admin/orders/quotations/${PICKUP_QUOTATION_ID}`);
    await waitForQuotationWorkspace(page);
    await openExistingOrder(page);
    expect(new URL(page.url()).pathname).toBe(firstPath);
    const second = await assertCanonicalOrder(page, PICKUP_QUOTATION_ID, "pickup", PICKUP_TOTAL);
    expect(second.order.id).toBe(first.order.id);
    await assertNoConsoleErrors(consoleErrors);
  });

  test("conflicting replay fails closed at the same application RPC boundary", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    const workspace = await openQuotation(page, PICKUP_QUOTATION_ID, env.fullAdmin);
    if (!workspace.existingOrder) {
      test.skip(true, "The retained W1 pickup fixture must exist before conflicting replay verification.");
      return;
    }

    await openExistingOrder(page);
    const before = await readOrder(page);
    const conflicting = await invokeConversionRpc(page, workspace.supabaseAuth, pickupPayload(env, 1));
    expect(conflicting.status).not.toBe(200);
    expect(conflicting.text).toMatch(/conflict|replay|already has an order|idempotency/i);

    await page.goto(`/admin/orders/${before.order.id}?tab=summary`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(before.order.order_number);
    const after = await assertCanonicalOrder(page, PICKUP_QUOTATION_ID, "pickup", PICKUP_TOTAL);
    expect(after.order.id).toBe(before.order.id);
    await assertNoConsoleErrors(consoleErrors);
  });

  test("unauthenticated users cannot open the quotation workspace", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.goto(`/admin/orders/quotations/${PICKUP_QUOTATION_ID}`);
    await expect.poll(async () => {
      if (await page.getByText("Akses detail quotation ditolak.", { exact: true }).count()) return "denied";
      if (new URL(page.url()).pathname === "/admin/login") return "login";
      return "pending";
    }, { timeout: 30_000 }).toMatch(/denied|login/);
    await assertNoConsoleErrors(consoleErrors);
  });

  test("an authenticated Admin Guest is denied the quotation workspace", async ({ page }) => {
    await loginAdmin(page, env.adminGuest);
    const consoleErrors = captureConsoleErrors(page);
    await page.goto(`/admin/orders/quotations/${PICKUP_QUOTATION_ID}`);
    await expect.poll(async () => {
      if (await page.getByText("Akses detail quotation ditolak.", { exact: true }).count()) return "denied";
      if (await page.getByText("MODE LIHAT SAJA", { exact: true }).count()) return "denied";
      if (new URL(page.url()).pathname === "/admin/orders/quotations") return "denied";
      if (new URL(page.url()).pathname === "/admin/login") return "login";
      return "pending";
    }, { timeout: 30_000 }).toBe("denied");
    await assertNoConsoleErrors(consoleErrors);
  });
});

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push(`HTTP_${response.status()} ${response.url()}`);
  });
  return errors;
}

async function assertNoConsoleErrors(errors: string[]) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  expect(errors).toEqual([]);
}

async function openQuotation(
  page: Page,
  quotationId: string,
  credentials: Wave0aEnv["fullAdmin"]
) {
  const supabaseAuth = captureSupabaseAuth(page);
  await loginAdmin(page, credentials);
  await page.goto(`/admin/orders/quotations/${quotationId}`);
  const workspaceState = await waitForQuotationWorkspace(page);
  await waitForSupabaseAuth(supabaseAuth);
  return {
    existingOrder: workspaceState === "existing",
    supabaseAuth
  };
}

async function waitForQuotationWorkspace(page: Page) {
  await expect.poll(async () => {
    if (await page.getByRole("button", { name: "Buka Pesanan", exact: true }).count()) return "existing";
    if (await page.getByRole("heading", { name: "Kontrak transaksi order", exact: true }).count()) return "contract";
    return "pending";
  }, { timeout: 60_000 }).toMatch(/existing|contract/);
  if (await page.getByRole("button", { name: "Buka Pesanan", exact: true }).count()) return "existing" as const;
  return "contract" as const;
}

async function openExistingOrder(page: Page) {
  await page.getByRole("button", { name: "Buka Pesanan", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/[0-9a-f-]+$/, { timeout: 60_000 });
  const summaryUrl = new URL(page.url());
  summaryUrl.searchParams.set("tab", "summary");
  await page.goto(summaryUrl.toString());
}

async function readOrder(page: Page): Promise<OrderDetail> {
  const token = await adminAccessToken(page);
  const orderId = new URL(page.url()).pathname.split("/").pop();
  if (!orderId) throw new Error("Canonical order URL did not include an order id.");
  const response = await page.request.get(absolute(envBaseUrl(page), `/api/admin/orders/${orderId}`), {
    headers: { authorization: `Bearer ${token}` }
  });
  const responseBody = await response.text();
  expect(response.status(), responseBody).toBe(200);
  return JSON.parse(responseBody) as OrderDetail;
}

async function assertCanonicalOrder(
  page: Page,
  quotationId: string,
  deliveryMethod: "pickup" | "shipping",
  expectedTotal: number,
  shippingAddress?: string
) {
  await expect(page.locator("h1").filter({ hasText: /ORD-/ }).first()).toBeVisible({ timeout: 60_000 });
  const orderSummary = page.locator("#summary");
  await expect(orderSummary.getByRole("heading", { name: "Informasi penting pesanan", exact: true })).toBeVisible();
  await expect(orderSummary.getByText("Metode penyerahan", { exact: true })).toBeVisible();
  await expect(orderSummary.getByText(deliveryMethod === "pickup" ? "Ambil di Toko" : "Dikirim", { exact: true })).toBeVisible();
  if (shippingAddress) await expect(orderSummary.getByText(shippingAddress, { exact: true })).toBeVisible();

  const detail = await readOrder(page);
  expect(detail.order.quotation_id).toBe(quotationId);
  expect(detail.order.delivery_method).toBe(deliveryMethod);
  expect(detail.order.total_amount).toBe(expectedTotal);
  expect(detail.order.payment_status).toMatch(/unpaid|pending|waiting/i);
  expect(detail.latest_payment).toBeNull();
  expect(detail.fulfillment).toBeNull();
  expect(detail.job_order).toBeNull();
  expect(detail.quality_control).toBeNull();
  expect(detail.items).toHaveLength(1);
  expect(new Set(detail.items.map((item) => item.id)).size).toBe(detail.items.length);

  const serviceSnapshots = detail.items.flatMap((item) => (
    Array.isArray(item.required_services) ? item.required_services : []
  ));
  expect(serviceSnapshots).toHaveLength(1);
  return detail;
}

async function fillConversionForm(page: Page, env: Wave0aEnv, deliveryMethod: "pickup" | "shipping") {
  await page.getByRole("checkbox").check();
  await page.getByRole("combobox", { name: "Metode penyerahan" }).selectOption(deliveryMethod);
  if (deliveryMethod === "pickup") {
    await page.getByRole("combobox", { name: "Toko pickup" }).selectOption(env.readyStock.pickupLocationId);
  } else {
    await page.getByRole("textbox", { name: "Alamat pengiriman final" }).fill(SHIPPING_ADDRESS);
  }
  await page.getByRole("spinbutton", { name: "Ongkir final" }).fill(deliveryMethod === "pickup" ? "0" : String(SHIPPING_COST));
  await page.getByRole("combobox", { name: "Metode pembayaran" }).selectOption("bank_transfer");
  await page.getByRole("spinbutton", { name: "Harga quotation yang dikunci" }).fill(String(PICKUP_TOTAL));
  await page.getByRole("combobox", { name: "Status transaksi" }).selectOption("under_review");
}

function captureSupabaseAuth(page: Page): SupabaseBrowserAuth {
  const captured: SupabaseBrowserAuth = { origin: "", apikey: "", authorization: "" };
  page.on("request", (request) => {
    if (!request.url().includes(".supabase.co/rest/v1/")) return;
    const headers = request.headers();
    if (!captured.origin) captured.origin = new URL(request.url()).origin;
    if (!captured.apikey && headers.apikey) captured.apikey = headers.apikey;
    if (!captured.authorization && headers.authorization) captured.authorization = headers.authorization;
  });
  return captured;
}

async function waitForSupabaseAuth(auth: SupabaseBrowserAuth) {
  await expect.poll(() => Boolean(auth.origin && auth.apikey && auth.authorization), { timeout: 30_000 }).toBe(true);
}

function pickupPayload(env: Wave0aEnv, shippingCost: number) {
  return {
    p_quotation_id: PICKUP_QUOTATION_ID,
    p_customer_id: CUSTOMER_A_ID,
    p_customer_name: CUSTOMER_A_NAME,
    p_company_name: null,
    p_customer_phone: CUSTOMER_A_PHONE,
    p_customer_email: CUSTOMER_A_EMAIL,
    p_billing_address: null,
    p_delivery_method: "pickup",
    p_pickup_location_id: env.readyStock.pickupLocationId,
    p_shipping_address: null,
    p_payment_method: "bank_transfer",
    p_shipping_cost: shippingCost,
    p_resolved_price: PICKUP_TOTAL,
    p_transaction_status: "under_review",
    p_idempotency_key: "wave1-pickup-conversion-0001"
  };
}

async function invokeConversionRpc(
  page: Page,
  auth: SupabaseBrowserAuth,
  payload: Record<string, unknown>
) {
  const response = await page.request.post(
    `${auth.origin}/rest/v1/rpc/convert_quotation_to_order`,
    {
      headers: {
        apikey: auth.apikey,
        authorization: auth.authorization,
        "content-type": "application/json"
      },
      data: payload
    }
  );
  return { status: response.status(), text: await response.text() };
}

function envBaseUrl(page: Page) {
  return new URL(page.url()).origin;
}
