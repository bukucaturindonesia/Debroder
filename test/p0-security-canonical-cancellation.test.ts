import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260715053035_p0_security_canonical_cancellation.sql";
const migration = readFileSync(migrationPath, "utf8").toLowerCase();

describe("P0 security stage 2: canonical transactional cancellation", () => {
  it("creates one reason-required and idempotent cancellation path", () => {
    expect(migration).toContain(
      "function public.cancel_order_transactional"
    );
    expect(migration).toContain("cancellation reason is required");
    expect(migration).toContain(
      "if order_before.status in ('cancelled','dibatalkan')"
    );
    expect(migration).toContain("return order_before");
  });

  it("releases reservations and records before/after audit in the same transaction", () => {
    expect(migration).toContain("public.release_public_order_stock(");
    expect(migration).toContain("'order_cancelled'");
    expect(migration).toContain("to_jsonb(order_before)");
    expect(migration).toContain("to_jsonb(order_after)");
    expect(migration).toContain("released_reservation_count");
  });

  it("prevents archive, payment verification, and invalid consumption bypasses", () => {
    expect(migration).toContain("cancel or complete the order before archiving");
    expect(migration).toContain(
      "payment cannot be verified for cancelled, expired, or archived order"
    );
    expect(migration).toContain("released reservation cannot be consumed");
    expect(migration).toContain("consumed reservation cannot be consumed again");
    expect(migration).toContain("expired or invalid reservation cannot be consumed");
  });

  it("does not clean existing stale reservations during stage 2 migration", () => {
    const stockReservationUpdates = migration
      .split(";")
      .filter((statement) =>
        /update\s+public\.stock_reservations\b/.test(statement)
      );

    expect(stockReservationUpdates.length).toBeGreaterThan(0);
    for (const statement of stockReservationUpdates) {
      expect(statement).not.toContain("archived_at");
      expect(statement).not.toContain("set status='released'");
    }
    expect(migration).not.toContain("p0_archived_order_reservation_cleanup");
  });
});
