import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { groupOperationalQueues } from "@/lib/global-admin-dashboard/priority-queues";
import { OperationalPriorityQueues } from "@/components/admin/OperationalPriorityQueues";
import type { DashboardQueueItem } from "@/lib/global-admin-dashboard/contracts";

// Vitest's existing JSX-preserve configuration uses the classic JSX runtime.
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
const queue = (key: string, count = 2, href: string | null = "/admin/orders"): DashboardQueueItem => ({ key, label: key, count, href, tone: "blue" });
const keys = (items: readonly DashboardQueueItem[]) => groupOperationalQueues(items).map(area => ({ key: area.key, keys: area.queues.map(item => item.key) }));

describe("operational priorities from canonical read-model queues", () => {
  it("separates physical ready work from unpaid orders and new-order review", () => {
    const model = keys([queue("new_orders"), queue("awaiting_payment"), queue("quality_control"), queue("ready_to_ship")]);
    expect(model).toEqual([
      { key: "ready", keys: ["quality_control", "ready_to_ship"] },
      { key: "in_progress", keys: ["awaiting_payment"] },
      { key: "attention", keys: ["new_orders"] }
    ]);
  });
  it("keeps production and pickup waiting in progress without inventing tasks", () => {
    expect(keys([queue("production"), queue("pickup_waiting")])[1].keys).toEqual(["production", "pickup_waiting"]);
  });
  it("routes review, overdue, incomplete and unknown future queues to attention", () => {
    const review = ["payment_verification", "awaiting_service", "shipping_incomplete", "overdue_orders", "future_state"];
    expect(keys(review.map(key => queue(key)))[2].keys).toEqual(review);
  });
  it("preserves every immutable source count and link exactly once without a combined total", () => {
    const input = Object.freeze([Object.freeze(queue("production", 7)), Object.freeze(queue("pickup_waiting", 7)), Object.freeze(queue("quality_control", 0, null))]);
    const result = groupOperationalQueues(input);
    const flattened = result.flatMap(area => area.queues);
    expect(flattened.map(({key,count,href}) => ({key,count,href}))).toEqual([
      {key:"quality_control",count:0,href:null},
      {key:"production",count:7,href:"/admin/orders"},
      {key:"pickup_waiting",count:7,href:"/admin/orders"}
    ]);
    expect(flattened).toHaveLength(input.length);
    expect(result.every(area => !("total" in area))).toBe(true);
    expect(input[0]).toEqual(queue("production",7));
  });
  it("provides all three empty areas rather than claiming there are ready tasks", () => {
    const areas = groupOperationalQueues([]);
    expect(areas.map(area => area.title)).toEqual(["Siap Dikerjakan", "Dalam Proses", "Perlu Perhatian"]);
    expect(areas.every(area => area.queues.length === 0 && area.emptyMessage.length > 0)).toBe(true);
  });
});

describe("operational priorities server render", () => {
  it("renders the three empty priority sections and their accessible headings", () => {
    const html = renderToStaticMarkup(React.createElement(OperationalPriorityQueues, { queues: [] }));
    for (const area of groupOperationalQueues([])) {
      expect(html).toContain(area.title);
      expect(html).toContain(area.emptyMessage);
    }
    expect((html.match(/<section\b/g) || []).length).toBeGreaterThanOrEqual(3);
  });
  it("keeps unavailable navigation inert and escapes unexpected labels", () => {
    const missing = { ...queue("future_state", 3, null), label: "<script>unsafe()</script>" };
    const html = renderToStaticMarkup(React.createElement(OperationalPriorityQueues, { queues: [missing] }));
    expect(html).toContain("&lt;script&gt;unsafe()&lt;/script&gt;");
    const card = html.match(/<li\b[\s\S]*?<\/li>/)?.[0];
    expect(card).toContain("Tindakan belum tersedia");
    expect(card).not.toContain("<a ");
    expect(html).not.toContain("<script>");
  });
});
