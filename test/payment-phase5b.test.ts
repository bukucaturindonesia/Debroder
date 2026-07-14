import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculateRequiredPayment,
  createPaymentToken,
  effectivePaidTotal,
  hashPaymentToken,
  isPaymentRole,
  isPaymentVerifier
} from "@/lib/payments";

const paymentAuth = readFileSync("lib/payment-auth.ts", "utf8");
const verificationRoute = readFileSync(
  "app/api/admin/payments/[id]/verification/route.ts",
  "utf8"
);
const requirementRoute = readFileSync(
  "app/api/admin/orders/[id]/payment-requirement/route.ts",
  "utf8"
);
const adjustmentRoute = readFileSync(
  "app/api/admin/payments/adjustments/route.ts",
  "utf8"
);
const paymentTracking = readFileSync(
  "components/admin/PaymentTrackingManager.tsx",
  "utf8"
);
const authenticatedActorAcl = readFileSync(
  "supabase/migrations/20260713201237_payment_authenticated_actor_acl_correction.sql",
  "utf8"
).toLowerCase();

describe("Phase 5B payment policy", () => {
  it("supports full, percentage, fixed, and deposit requirements", () => {
    expect(calculateRequiredPayment(200_000, "full")).toBe(200_000);
    expect(calculateRequiredPayment(200_000, "percentage", 50)).toBe(100_000);
    expect(calculateRequiredPayment(200_000, "fixed", 100, 75_000)).toBe(75_000);
    expect(calculateRequiredPayment(200_000, "deposit", 100, 250_000)).toBe(200_000);
  });

  it("calculates an effective balance from immutable effects", () => {
    expect(effectivePaidTotal(150_000, [-25_000, 5_000])).toBe(130_000);
    expect(effectivePaidTotal(20_000, [-50_000])).toBe(0);
  });

  it("uses strong non-stored public tokens and stable hashes", () => {
    const first = createPaymentToken();
    const second = createPaymentToken();
    expect(first.token).not.toBe(second.token);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.hash).toBe(hashPaymentToken(first.token));
    expect(first.hash).not.toContain(first.token);
  });

  it("keeps verification permissions narrower than payment access", () => {
    expect(isPaymentRole("sales_admin")).toBe(true);
    expect(isPaymentVerifier("sales_admin")).toBe(false);
    expect(isPaymentVerifier("admin")).toBe(true);
    expect(isPaymentRole("viewer")).toBe(false);
  });

  it("forwards the authenticated Admin JWT to sensitive payment RPCs", () => {
    expect(paymentAuth).toContain("Authorization: `Bearer ${token}`");
    expect(verificationRoute).toContain('actor.client.rpc("verify_order_payment"');
    expect(verificationRoute).toContain('actor.client.rpc("reject_order_payment"');
    expect(requirementRoute).toContain('actor.client.rpc("set_order_payment_requirement"');
    expect(adjustmentRoute).toContain('actor.client.rpc("create_payment_adjustment"');
    expect(adjustmentRoute).toContain('actor.client.rpc("decide_payment_adjustment"');
    expect(authenticatedActorAcl).toContain(
      "revoke all on function public.verify_order_payment(uuid,text)"
    );
    expect(authenticatedActorAcl).toContain(
      "grant execute on function public.verify_order_payment(uuid,text)"
    );
    expect(authenticatedActorAcl).toContain("to authenticated, service_role");
  });

  it("shows pending payments before secondary payment configuration", () => {
    expect(paymentTracking.indexOf('tab === "active"')).toBeLessThan(
      paymentTracking.indexOf("<PaymentCompletionPanel")
    );
    expect(paymentTracking).toContain("bukti pembayaran menunggu verifikasi");
  });
});
