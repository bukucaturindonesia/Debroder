import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MidtransClient,
  midtransConfig,
  paymentState,
  RajaOngkirClient,
  safeSnapRedirect,
  validSignature,
} from "@/lib/fast-checkout/providers";
import {
  basketFingerprint,
  readQuote,
  signQuote,
} from "@/lib/fast-checkout/quote";
import { basketSchema, type FastQuote } from "@/lib/fast-checkout/contracts";
afterEach(() => vi.restoreAllMocks());
const config = {
  serverKey: "test-only-server",
  clientKey: "test-only-client",
  merchantId: "test-merchant",
};
const rate = {
  code: "jne",
  name: "JNE",
  service: "REG",
  description: "Regular",
  cost: 12000,
  etd: "2-3 day",
};
const dim = { length: 20, width: 15, height: 3 };
const response = (data: unknown) =>
  Response.json({ meta: { code: 200 }, data });
describe("RajaOngkir adapter — MOCK", () => {
  it("uses the current direct-search endpoint and validates destinations", async () => {
    const destination = {
      id: 1,
      label: "Bandung",
      province_name: "Jawa Barat",
      city_name: "Bandung",
      district_name: "Coblong",
      subdistrict_name: "Dago",
      zip_code: "40135",
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response([destination]));
    expect(
      await new RajaOngkirClient("test-key", fetcher).destinations("Dago"),
    ).toEqual([destination]);
    expect(fetcher.mock.calls[0][0]).toContain(
      "destination/domestic-destination?search=Dago",
    );
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({ key: "test-key" });
    expect(fetcher.mock.calls[0][1]?.cache).toBe("no-store");
  });
  it("uses server weights and actual provider service labels", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        response([
          rate,
          { ...rate, service: "YES", cost: 20000 },
          { ...rate, service: "ZERO", cost: 0 },
        ]),
      );
    const result = await new RajaOngkirClient("test-key", fetcher).rates(
      1,
      2,
      500,
      ["jne"],
      dim,
    );
    expect(result.map((x) => x.service)).toEqual(["REG", "YES"]);
    expect(String(fetcher.mock.calls[0][1]?.body)).toContain("weight=500");
    expect(String(fetcher.mock.calls[0][1]?.body)).toContain("origin=1");
    expect(result.every((x) => x.cost > 0)).toBe(true);
  });
  it.each([0, -1, 1.5])(
    "rejects invalid weight %s without a request",
    async (weight) => {
      const f = vi.fn<typeof fetch>();
      await expect(
        new RajaOngkirClient("key", f).rates(1, 2, weight, ["jne"], dim),
      ).rejects.toThrow("SHIPPING_INPUT_INVALID");
      expect(f).not.toHaveBeenCalled();
    },
  );
  it.each([401, 429, 500])(
    "never converts HTTP %s into free shipping",
    async (status) => {
      const f = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("error", { status }));
      await expect(
        new RajaOngkirClient("key", f).rates(1, 2, 500, ["jne"], dim),
      ).rejects.toThrow("PROVIDER_UNAVAILABLE");
    },
  );
  it("handles timeout and malformed responses", async () => {
    await expect(
      new RajaOngkirClient(
        "key",
        vi
          .fn<typeof fetch>()
          .mockRejectedValue(new DOMException("timeout", "TimeoutError")),
      ).destinations("Dago"),
    ).rejects.toThrow("PROVIDER_UNAVAILABLE");
    await expect(
      new RajaOngkirClient(
        "key",
        vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: null })),
      ).destinations("Dago"),
    ).rejects.toThrow("SHIPPING_UNAVAILABLE");
  });
});
describe("signed shipping quote — LOCAL", () => {
  const secret = "test-only-secret-".repeat(4);
  const quote = {
    version: 1,
    issuedAt: 1000,
    expiresAt: 5000,
    fingerprint: "basket",
    weight: 500,
    dimensions: dim,
    rate,
  } as FastQuote;
  it("rejects stale and tampered quotes", () => {
    const token = signQuote(quote, secret);
    expect(readQuote(token, secret, 2000)).toEqual(quote);
    expect(() => readQuote(token, secret, 5000)).toThrow(
      "SHIPPING_QUOTE_EXPIRED",
    );
    expect(() => readQuote(token + "x", secret, 2000)).toThrow();
    expect(() => readQuote(token, "another-secret", 2000)).toThrow();
  });
  it("binds a basket independently of item order and reacts to quantities", () => {
    const a = { variantSizeId: "a", quantity: 1 },
      b = { variantSizeId: "b", quantity: 2 };
    expect(basketFingerprint([a, b])).toBe(basketFingerprint([b, a]));
    expect(basketFingerprint([a])).not.toBe(
      basketFingerprint([{ ...a, quantity: 2 }]),
    );
  });
  it("preserves existing cart limits", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(
      basketSchema.safeParse([{ variantSizeId: id, quantity: 101 }]).success,
    ).toBe(false);
    expect(
      basketSchema.safeParse([
        { variantSizeId: id, quantity: 1 },
        { variantSizeId: id, quantity: 1 },
      ]).success,
    ).toBe(false);
  });
});
describe("Midtrans — MOCK", () => {
  it("blocks absent keys and production mode", () => {
    expect(() => midtransConfig({ MIDTRANS_ENV: "production" })).toThrow(
      "PAYMENT_NOT_CONFIGURED",
    );
    expect(() => midtransConfig({ MIDTRANS_ENV: "sandbox" })).toThrow();
  });
  it("requires exact item total and sends sandbox basic auth", async () => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({
          token: "test-token",
          redirect_url: "https://app.sandbox.midtrans.com/snap/v4/test",
        }),
      );
    const client = new MidtransClient(config, f);
    await expect(
      client.create(
        "DBR-test",
        101,
        [{ id: "1", name: "Item", price: 100, quantity: 1 }],
        { name: "Test", email: "a@example.com", phone: "08123456789" },
        "https://example.com/checkout",
      ),
    ).rejects.toThrow("PAYMENT_TOTAL_INVALID");
    expect(f).not.toHaveBeenCalled();
    await client.create(
      "DBR-test",
      100,
      [{ id: "1", name: "Item", price: 100, quantity: 1 }],
      { name: "Test", email: "a@example.com", phone: "08123456789" },
      "https://example.com/checkout",
    );
    expect(f.mock.calls[0][0]).toBe(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
    );
    expect(f.mock.calls[0][1]?.headers).toMatchObject({
      authorization: `Basic ${Buffer.from(config.serverKey + ":").toString("base64")}`,
    });
  });
  it("validates signature in constant-size comparison", () => {
    const b = {
      order_id: "DBR-test",
      status_code: "200",
      gross_amount: "100.00",
      signature_key: "",
    };
    b.signature_key = createHash("sha512")
      .update(b.order_id + b.status_code + b.gross_amount + config.serverKey)
      .digest("hex");
    expect(validSignature(b, config.serverKey)).toBe(true);
    expect(
      validSignature({ ...b, gross_amount: "101.00" }, config.serverKey),
    ).toBe(false);
    expect(
      validSignature({ ...b, signature_key: "invalid" }, config.serverKey),
    ).toBe(false);
  });
  it.each([
    ["pending", undefined, "201", "pending"],
    ["capture", "challenge", "200", "pending"],
    ["capture", "accept", "200", "paid"],
    ["settlement", undefined, "200", "paid"],
    ["settlement", "deny", "200", "pending"],
    ["capture", undefined, "200", "pending"],
    ["expire", undefined, "202", "expire"],
    ["cancel", undefined, "202", "cancel"],
    ["deny", undefined, "202", "deny"],
  ])(
    "maps %s / %s / %s safely",
    (transaction_status, fraud_status, status_code, expected) => {
      expect(
        paymentState({
          transaction_status,
          fraud_status,
          status_code,
          currency: "IDR",
        }),
      ).toBe(expected);
    },
  );
  it("rejects foreign-currency success and attacker redirects", () => {
    expect(
      paymentState({
        transaction_status: "settlement",
        status_code: "200",
        currency: "USD",
      }),
    ).toBe("pending");
    expect(
      safeSnapRedirect("https://app.sandbox.midtrans.com.evil.test/snap/a"),
    ).toBe(false);
    expect(safeSnapRedirect("javascript:alert(1)")).toBe(false);
  });
});
