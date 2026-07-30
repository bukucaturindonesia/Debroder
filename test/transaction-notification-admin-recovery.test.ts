import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const migration = read(
  "supabase/migrations/20260730122821_transaction_notification_admin_recovery_v1.sql"
);
const inboxApi = read("app/api/admin/notifications/route.ts");
const detailApi = read("app/api/admin/notifications/[id]/route.ts");

describe("transaction and Admin notification P0 recovery", () => {
  it("breaks the production RLS cycle without widening operator access", () => {
    expect(migration).toContain(
      "create or replace function public.operator_can_access_job_order"
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "revoke all on function public.operator_can_access_job_order(uuid)"
    );
    expect(migration).toContain(
      "or public.operator_can_access_job_order(id)"
    );
  });

  it("normalizes missing tier lookups with typed values", () => {
    expect(migration).toContain("tier_unit_price bigint;");
    expect(migration).toContain("tier_quote_required boolean;");
    expect(migration).toContain(
      "tier_row public.product_price_tiers%rowtype;"
    );
    expect(migration).toContain("select ppt.*");
    expect(migration).toContain(
      "if coalesce(tier_row.quote_required, false) then"
    );
  });

  it("keeps inbox and detail mutations on the actor's own notification rows", () => {
    expect(
      inboxApi.match(/\.eq\("recipient_id", actor\.user\.id\)/g)
    ).toHaveLength(5);
    expect(detailApi).toContain('.eq("recipient_id", actor.user.id)');
  });
});
