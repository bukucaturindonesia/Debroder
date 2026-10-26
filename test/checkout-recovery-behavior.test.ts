import { afterEach, describe, expect, it, vi } from "vitest";
import { recoverStoredCheckout } from "@/lib/checkout-recovery";

const draft = { idempotencyKey: "existing-checkout-0123456789" };
afterEach(() => vi.unstubAllGlobals());

describe("checkout recovery network outcomes", () => {
  it.each([
    [404, "<html>Gateway route missing</html>"],
    [404, JSON.stringify({ found: false })],
    [200, "invalid json"],
    [409, JSON.stringify({ code: "CHECKOUT_RECOVERY_CONFLICT" })]
  ])("does not authorize a replacement checkout for HTTP %s", async (status, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status })));
    expect((await recoverStoredCheckout(draft)).kind).toBe("unsafe");
  });

  it("accepts only a successful explicit missing-order response", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ found: false }));
    vi.stubGlobal("fetch", fetch);
    expect(await recoverStoredCheckout(draft)).toEqual({ kind: "missing" });
    expect(fetch).toHaveBeenCalledWith(
      `/api/checkout?idempotencyKey=${draft.idempotencyKey}`, { cache: "no-store" }
    );
  });

  it("recovers the original confirmation destination", async () => {
    const payload = { found: true, confirmationUrl: "/order-confirmation/original" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    expect(await recoverStoredCheckout(draft)).toEqual({ kind: "found", payload });
  });

  it.each([429, 503])("retains retry guidance for HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, {
      status, headers: { "retry-after": "30" }
    })));
    expect(await recoverStoredCheckout(draft)).toMatchObject({ kind: "temporary", retryAfter: 30 });
  });

  it("preserves uncertainty after a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network disconnected")));
    expect(await recoverStoredCheckout(draft)).toMatchObject({ kind: "temporary", retryAfter: 15 });
  });
});
