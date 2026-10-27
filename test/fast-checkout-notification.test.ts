import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { rpc, from } = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ data: { applied: true }, error: null }),
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabaseClient: () => ({ rpc, from }),
}));
import { notification, status, assertFastStaging } from "@/lib/fast-checkout/server";
const key = "test-only-notification-secret";
function body() {
  const b = {
    order_id: "DBR-test",
    status_code: "200",
    gross_amount: "100.00",
    signature_key: "",
    transaction_status: "settlement",
    merchant_id: "merchant",
    currency: "IDR",
    transaction_id: "txn",
  };
  b.signature_key = createHash("sha512")
    .update(b.order_id + b.status_code + b.gross_amount + key)
    .digest("hex");
  return b;
}
beforeEach(() => {
  vi.stubEnv("DEBRODER_ENV", "staging");
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://ykfjgnrigcsapblbxnxb.supabase.co",
  );
  vi.stubEnv("FAST_CHECKOUT_SUPABASE_PROJECT_REF", "ykfjgnrigcsapblbxnxb");
  rpc.mockClear();
  from.mockReset();
  vi.stubEnv("DEBRODER_FAST_CHECKOUT_ENABLED", "1");
  vi.stubEnv("FAST_CHECKOUT_SIGNING_SECRET", "test-only-".repeat(8));
  vi.stubEnv("MIDTRANS_ENV", "sandbox");
  vi.stubEnv("MIDTRANS_SERVER_KEY", key);
  vi.stubEnv("MIDTRANS_CLIENT_KEY", "test-client");
  vi.stubEnv("MIDTRANS_MERCHANT_ID", "merchant");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Midtrans notification boundary — MOCK", () => {
  it("blocks production and lookalike database hosts", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://lzennundwqqtyvvcnzbg.supabase.co",
    );
    expect(() => assertFastStaging()).toThrow("FAST_ENVIRONMENT_BLOCKED");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://ykfjgnrigcsapblbxnxb.evil.test",
    );
    expect(() => assertFastStaging()).toThrow("FAST_ENVIRONMENT_BLOCKED");
  });
  it("rejects forged signatures before contacting the provider", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(
      notification(
        new Request("http://localhost/notification", {
          method: "POST",
          body: JSON.stringify({ ...body(), signature_key: "0".repeat(128) }),
        }),
      ),
    ).rejects.toThrow("PAYMENT_SIGNATURE_INVALID");
    expect(f).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("ignores unsigned status changes and trusts authenticated current status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ ...body(), transaction_status: "pending" }),
        ),
    );
    await notification(
      new Request("http://localhost/notification", {
        method: "POST",
        body: JSON.stringify(body()),
      }),
    );
    expect(rpc).toHaveBeenCalledWith(
      "fast_payment_apply_v1",
      expect.objectContaining({
        p_state: "pending",
        p_provider_order_id: "DBR-test",
        p_amount: 100,
      }),
    );
  });
  it("rejects a different merchant and keeps API outages uncommitted", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ ...body(), merchant_id: "other" })),
    );
    await expect(
      notification(
        new Request("http://localhost/notification", {
          method: "POST",
          body: JSON.stringify(body()),
        }),
      ),
    ).rejects.toThrow("PAYMENT_NOTIFICATION_INVALID");
    expect(rpc).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(
      notification(
        new Request("http://localhost/notification", {
          method: "POST",
          body: JSON.stringify(body()),
        }),
      ),
    ).rejects.toThrow("PROVIDER_UNAVAILABLE");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects a current-status response belonging to another notification order", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...body(), order_id: "DBR-other" })));
    await expect(notification(new Request("http://localhost/notification", {
      method: "POST", body: JSON.stringify(body()),
    }))).rejects.toThrow("PAYMENT_NOTIFICATION_INVALID");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not apply a different order returned while polling an authorized attempt", async () => {
    const orderId = "11111111-1111-4111-8111-111111111111";
    const token = "synthetic-local-token-".repeat(3);
    const order = {
      id: orderId, public_access_token_hash: createHash("sha256").update(token).digest("hex"),
      public_access_token_expires_at: "2099-01-01", payment_status: "unpaid", status: "awaiting_payment",
    };
    from.mockImplementation((table: string) => {
      const data = table === "orders" ? order : { provider_order_id: "DBR-test", status: "pending" };
      const chain = { select: () => chain, eq: () => chain, is: () => chain,
        order: () => chain, limit: () => chain, maybeSingle: async () => ({ data, error: null }) };
      return chain;
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...body(), order_id: "DBR-other" })));
    const result = await status(new Request("http://localhost/status", {
      method: "POST", body: JSON.stringify({ orderId, trackingToken: token }),
    }));
    expect(result.paymentStatus).toBe("unpaid");
    expect(rpc.mock.calls.some(([name]) => name === "fast_payment_apply_v1")).toBe(false);
  });
});
