import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  authorizeGuestTracking,
  deriveCheckoutTrackingToken,
  isTrackingRateLimited,
  normalizeOrderNumber,
  TRACKING_RATE_LIMIT_ATTEMPTS,
  type TrackingAuthorizationRow
} from "@/lib/order-tracking";

const TOKEN_A = "a".repeat(64);
const TOKEN_B = "b".repeat(64);
const future = "2026-10-14T00:00:00.000Z";
const now = new Date("2026-07-14T00:00:00.000Z");

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function order(overrides: Partial<TrackingAuthorizationRow> = {}): TrackingAuthorizationRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    public_access_token_hash: digest(TOKEN_A),
    public_access_token_expires_at: future,
    customer_phone: "6281234567890",
    ...overrides
  };
}

describe("guest order tracking authorization", () => {
  it("accepts a valid tracking token", () => {
    expect(authorizeGuestTracking(order(), { token: TOKEN_A }, now)).toEqual({ ok: true, method: "token" });
  });

  it("rejects a wrong token", () => {
    expect(authorizeGuestTracking(order(), { token: TOKEN_B }, now)).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("rejects an expired token", () => {
    const result = authorizeGuestTracking(order({ public_access_token_expires_at: "2026-07-13T23:59:59.000Z" }), { token: TOKEN_A }, now);
    expect(result).toEqual({ ok: false, reason: "expired_token" });
  });

  it("accepts a matching normalized WhatsApp number", () => {
    expect(authorizeGuestTracking(order(), { whatsapp: "0812-3456-7890" }, now)).toEqual({ ok: true, method: "whatsapp" });
  });

  it("rejects a wrong WhatsApp number", () => {
    expect(authorizeGuestTracking(order(), { whatsapp: "081299999999" }, now)).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("returns not found without exposing another order", () => {
    expect(authorizeGuestTracking(null, { token: TOKEN_A }, now)).toEqual({ ok: false, reason: "not_found" });
  });

  it("does not accept a token belonging to another customer order", () => {
    const otherOrder = order({ id: "22222222-2222-4222-8222-222222222222", public_access_token_hash: digest(TOKEN_B) });
    expect(authorizeGuestTracking(otherOrder, { token: TOKEN_A }, now)).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("enforces the five-attempt rate limit boundary", () => {
    expect(isTrackingRateLimited(TRACKING_RATE_LIMIT_ATTEMPTS - 1)).toBe(false);
    expect(isTrackingRateLimited(TRACKING_RATE_LIMIT_ATTEMPTS)).toBe(true);
  });

  it("normalizes safe order numbers and rejects unsafe input", () => {
    expect(normalizeOrderNumber(" ord-deb-2026-0001 ")).toBe("ORD-DEB-2026-0001");
    expect(normalizeOrderNumber("../../admin/orders")).toBe("");
  });

  it("derives a stable server-secret tracking token for idempotent retry", () => {
    const first = deriveCheckoutTrackingToken("checkout-key-123456", "server-secret");
    const retry = deriveCheckoutTrackingToken("checkout-key-123456", "server-secret");
    expect(first).toBe(retry);
    expect(first).toHaveLength(43);
    expect(deriveCheckoutTrackingToken("checkout-key-654321", "server-secret")).not.toBe(first);
  });
});

describe("guest tracking route security contracts", () => {
  const route = readFileSync("app/api/public/order-tracking/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260714005325_guest_order_tracking_security.sql", "utf8").toLowerCase();

  it("validates on the server and never selects proof or admin fields", () => {
    expect(route).toContain("authorizeGuestTracking");
    expect(route).toContain('source: "guest_order_tracking"');
    expect(route).not.toContain("proof_path");
    expect(route).not.toContain("admin_notes");
  });

  it("adds expiry and a focused suspicious-access audit index", () => {
    expect(migration).toContain("public_access_token_expires_at");
    expect(migration).toContain("system_audit_log_guest_tracking_fingerprint_idx");
    expect(migration).toContain("set_order_public_access_token_expiry");
  });
});
