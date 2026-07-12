import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  JOB_ORDER_STATUS_LABELS,
  canArchiveJobOrder,
  canEditJobOrder,
  getFoundationTransitions,
  isSuperAdminRole
} from "@/lib/job-orders";

const foundationSql = [
  "20260712070529_phase7_to_phase9_production_foundation.sql",
  "20260712095523_v1_2_phase_7_job_order_foundation_and_security.sql"
]
  .map((file) => readFileSync(resolve("supabase/migrations", file), "utf8"))
  .join("\n")
  .toLowerCase();
const atomicSql = readFileSync(
  resolve("supabase/migrations/20260712095652_v1_2_phase_7_job_order_creation_atomic_number.sql"),
  "utf8"
).toLowerCase();
const navigation = readFileSync(
  resolve("components/admin/layout/admin-navigation.ts"),
  "utf8"
);
const orderDetail = readFileSync(
  resolve("components/admin/OrderDetailAdmin.tsx"),
  "utf8"
);

describe("Phase 7 Job Order foundation helpers", () => {
  it("keeps controlled Indonesian status copy", () => {
    expect(JOB_ORDER_STATUS_LABELS.draft).toBe("Draft");
    expect(JOB_ORDER_STATUS_LABELS.ready).toBe("Siap Dirilis");
    expect(JOB_ORDER_STATUS_LABELS.released).toBe("Dirilis ke Produksi");
  });

  it("opens release only after the Phase 8 Work Item gate", () => {
    expect(getFoundationTransitions("draft")).toEqual(["ready", "cancelled"]);
    expect(getFoundationTransitions("ready")).toEqual(["draft", "released", "cancelled"]);
    expect(getFoundationTransitions("released")).toEqual(["in_progress", "on_hold", "cancelled"]);
    expect(canEditJobOrder("ready")).toBe(true);
    expect(canEditJobOrder("released")).toBe(false);
  });

  it("keeps archive and permanent-delete restrictions", () => {
    expect(canArchiveJobOrder("draft")).toBe(true);
    expect(canArchiveJobOrder("in_progress")).toBe(false);
    expect(isSuperAdminRole("superadmin")).toBe(true);
    expect(isSuperAdminRole("owner")).toBe(false);
  });
});

describe("Phase 7 migration contract", () => {
  it("creates snapshots, immutable history, RLS, and lifecycle RPCs", () => {
    expect(foundationSql).toContain("order_snapshot jsonb");
    expect(foundationSql).toContain("mockup_snapshot jsonb");
    expect(foundationSql).toContain("payment_snapshot jsonb");
    expect(foundationSql).toContain("prevent_job_order_history_mutation");
    expect(foundationSql).toContain("enable row level security");
    expect(foundationSql).toContain("revoke insert,update,delete,truncate,references,trigger");
    expect(foundationSql).toContain("hanya super admin yang dapat menghapus permanen");
  });

  it("allocates the immutable number before inserting the NOT NULL row", () => {
    const allocationIndex = atomicSql.indexOf("number_value:=public.issue_document_number");
    const insertIndex = atomicSql.indexOf("insert into public.job_orders");
    expect(allocationIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(allocationIndex);
    expect(atomicSql).toContain("result_id uuid:=gen_random_uuid()");
  });
});

describe("Phase 7 discoverability", () => {
  it("adds the Job Order route to admin navigation and order detail", () => {
    expect(navigation).toContain('href: "/admin/job-orders"');
    expect(navigation).toContain('pathname.startsWith("/admin/job-orders")');
    expect(orderDetail).toContain('/admin/job-orders?order=${order.id}');
  });
});
