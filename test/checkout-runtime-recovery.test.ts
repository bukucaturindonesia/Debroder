import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("checkout runtime recovery", () => {
  const client = () => read("components/checkout/CheckoutClient.tsx");
  const route = () => read("app/api/checkout/route.ts");

  it("returns an explicit negative recovery result instead of a handled 404", () => {
    const source = route();
    expect(source).toContain("if (!data) return respond({ found: false }, 200);");
    expect(client()).toContain("if (response.ok && payload.found === false) return { kind: \"missing\" };");
  });

  it("keeps one click to one logical POST and blocks rapid duplicate submits", () => {
    const source = client();
    expect((source.match(/fetch\(\"\/api\/checkout\"/g) ?? []).length).toBe(1);
    expect(source).toContain("submitting");
    expect(source).toMatch(/if \(\s*submitting/);
    expect(source).toContain('<button type="submit" disabled={submitting');
    expect(source).not.toContain('onClick={submit}');
  });

  it("keeps same-key recovery for an unknown result and rotates after a safe rejection", () => {
    const source = client();
    expect(source).toContain('lastKnownOutcome?: "rejected"');
    expect(source).toContain('if (stored.lastKnownOutcome === "rejected")');
    expect(source).toContain('if (currentDraft.lastKnownOutcome === "rejected")');
    expect(source).toContain('const rejectedDraft = { ...currentDraft, lastKnownOutcome: "rejected" as const }');
    expect(source).toContain("recoverStoredCheckout(currentDraft)");
  });

  it("preserves idempotent retry, server abuse protection, and commerce safety branches", () => {
    const api = route();
    expect(api).toContain('client.rpc("enforce_public_checkout_abuse_guard"');
    expect(api).toContain('.from("orders")');
    expect(api).toContain('client.rpc(rpcName, rpcPayload)');
    expect(api).toContain("CHECKOUT_STOCK_UNAVAILABLE");
    expect(api).toContain("CHECKOUT_IDEMPOTENCY_CONFLICT");
    expect(api).toContain("CHECKOUT_CONFIGURED_STALE");
  });
});
