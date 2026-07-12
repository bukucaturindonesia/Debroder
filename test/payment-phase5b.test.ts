import { describe, expect, it } from "vitest";
import {
  calculateRequiredPayment,
  createPaymentToken,
  effectivePaidTotal,
  hashPaymentToken,
  isPaymentRole,
  isPaymentVerifier
} from "@/lib/payments";

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
});

