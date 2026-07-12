import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getPhase9JobOrderTransitions,
  jobOrderTransitionNeedsReason
} from "@/lib/job-orders";
import {
  getPhase9WorkItemTransitions,
  workItemTransitionNeedsReason
} from "@/lib/work-items";
import { isWaitingForQc, workItemProgressWeight } from "@/lib/production";

const migration = [
  "20260712131753_v1_2_phase_9_production_status_and_progress.sql",
  "20260712132103_v1_2_phase_9_job_order_status.sql",
  "20260712132131_v1_2_phase_9_work_item_status.sql"
]
  .map((file) => readFileSync(resolve("supabase/migrations", file), "utf8"))
  .join("\n")
  .toLowerCase();
const navigation = readFileSync(resolve("components/admin/layout/admin-navigation.ts"), "utf8");
const production = readFileSync(resolve("components/admin/ProductionStatusAdmin.tsx"), "utf8");

describe("Phase 9 status helpers", () => {
  it("opens the Job Order production lifecycle without bypassing QC", () => {
    expect(getPhase9JobOrderTransitions("released")).toEqual(["in_progress", "on_hold", "cancelled"]);
    expect(getPhase9JobOrderTransitions("in_progress")).toEqual(["on_hold", "cancelled"]);
    expect(getPhase9JobOrderTransitions("completed")).toEqual([]);
    expect(jobOrderTransitionNeedsReason("on_hold")).toBe(true);
  });

  it("opens Work Item execution only for released production", () => {
    expect(getPhase9WorkItemTransitions("ready", "released")).toEqual(["draft", "in_progress", "cancelled"]);
    expect(getPhase9WorkItemTransitions("in_progress", "in_progress")).toEqual(["on_hold", "awaiting_qc", "cancelled"]);
    expect(getPhase9WorkItemTransitions("awaiting_qc", "in_progress")).toEqual([]);
    expect(workItemTransitionNeedsReason("on_hold")).toBe(true);
  });

  it("uses documented milestone progress and QC handoff", () => {
    expect(workItemProgressWeight("in_progress")).toBe(50);
    expect(workItemProgressWeight("awaiting_qc")).toBe(90);
    expect(isWaitingForQc(["awaiting_qc", "completed"])).toBe(true);
  });
});

describe("Phase 9 database and discoverability contract", () => {
  it("replaces production transition functions and protects the QC boundary", () => {
    expect(migration).toContain("create or replace function public.transition_job_order_status");
    expect(migration).toContain("create or replace function public.transition_work_item_status");
    expect(migration).toContain("penyelesaian job order menunggu quality control phase 10");
    expect(migration).toContain("old_status='in_progress' and p_to_status in ('on_hold','awaiting_qc','cancelled')");
    expect(migration).not.toContain("when 'awaiting_qc' then p_to_status in ('rework','completed')");
  });

  it("adds the production dashboard to navigation", () => {
    expect(navigation).toContain('href: "/admin/production"');
    expect(production).toContain("Status Produksi");
    expect(production).toContain("Menunggu QC");
  });
});
