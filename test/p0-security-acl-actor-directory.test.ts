import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260715050713_p0_security_acl_actor_directory.sql";
const migration = readFileSync(migrationPath, "utf8").toLowerCase();

describe("P0 security stage 1: ACL closure and actor directory", () => {
  it("closes privileged commerce and audit RPCs from browser roles", () => {
    for (const signature of [
      "refresh_order_payment_summary(uuid)",
      "reserve_public_order_stock(uuid, interval, uuid)",
      "release_public_order_stock(uuid, text, uuid)",
      "consume_paid_order_stock(uuid)",
      "expire_public_commerce_orders()"
    ]) {
      expect(migration).toContain(`revoke all on function public.${signature}`);
      expect(migration).toContain(`grant execute on function public.${signature}`);
    }

    expect(migration).toContain("public.write_audit_log(");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("set search_path = ''");
  });

  it("makes actor_directory security-invoker and read-only", () => {
    expect(migration).toContain("create or replace view public.actor_directory");
    expect(migration).toContain("with (security_invoker = true)");
    expect(migration).toContain(
      "revoke all on table public.actor_directory from public, anon, authenticated"
    );
    expect(migration).toContain(
      "grant select on table public.actor_directory to authenticated, service_role"
    );
    expect(migration).not.toContain("grant update on table public.actor_directory");
    expect(migration).not.toContain("grant insert on table public.actor_directory");
    expect(migration).not.toContain("grant delete on table public.actor_directory");
  });

  it("hardens future function defaults and leaves reservation cleanup out of stage 1", () => {
    expect(migration).toContain(
      "alter default privileges for role postgres in schema public"
    );
    expect(migration).not.toContain("update public.stock_reservations");
    expect(migration).not.toContain("delete from public.stock_reservations");
  });
});
