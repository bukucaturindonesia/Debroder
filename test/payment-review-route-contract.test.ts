import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  "app/api/admin/payments/[id]/verification/route.ts",
  "utf8"
);
const auth = readFileSync("lib/payment-auth.ts", "utf8");

describe("payment review route server-client contract", () => {
  it("uses the server client for canonical reads without widening payment table grants", () => {
    expect(auth).toContain("adminClient: SupabaseClient");
    expect(route).toContain("getCanonicalPayment(actor.adminClient, id)");
    expect(route).toContain("actor.client.rpc(\"review_order_payment\"");
    expect(route).toContain('requirePaymentActor(request, "payment.verify")');
    expect(route).toContain("isPaymentVerifier(actor.role)");
  });

  it("does not replace the protected review RPC with direct table mutation", () => {
    expect(route).toContain("review_order_payment");
    expect(route).not.toMatch(/actor\.adminClient\s*\.from\([\"']order_payments[\"']\)[\s\S]*\.(update|insert|delete)\(/);
  });
});
