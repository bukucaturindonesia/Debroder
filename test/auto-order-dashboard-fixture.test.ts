import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync } from "node:fs";
import { afterAll, expect, it, vi } from "vitest";
import { OperationalPriorityQueues } from "@/components/admin/OperationalPriorityQueues";
import type { DashboardQueueItem } from "@/lib/global-admin-dashboard/contracts";
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
it("renders real priority component with three distinct areas and preserves synthetic queue actions", () => {
 const css=readFileSync("qa-artifacts/auto-order-20261026/dashboard-tailwind.css","utf8")+"\n"+readFileSync("app/admin/global-dashboard.css","utf8");
 const queues:DashboardQueueItem[]=[
  {key:"quality_control",label:"Pemeriksaan kualitas",count:2,href:"/admin/quality-control",tone:"amber"},
  {key:"ready_to_ship",label:"Siap dikirim",count:4,href:"/admin/fulfillments",tone:"green"},
  {key:"awaiting_payment",label:"Menunggu pembayaran",count:3,href:"/admin/orders",tone:"amber"},
  {key:"production",label:"Produksi berjalan",count:2,href:"/admin/production",tone:"blue"},
  {key:"new_orders",label:"Pesanan baru perlu ditinjau",count:3,href:"/admin/orders",tone:"green"},
  {key:"unknown_future",label:"Kebutuhanbaru".repeat(12),count:1,href:null,tone:"red"}
 ];
 for(const [name,items] of [["normal",queues],["empty",[]]] as const){
  const markup=renderToStaticMarkup(React.createElement(OperationalPriorityQueues,{queues:items}));
  for(const key of ["ready","in_progress","attention"]) expect(markup).toContain(`id="operational-priority-${key}"`);
  if(name==="normal"){
   expect(markup).toContain('href="/admin/quality-control"');
   expect(markup).toContain("Tindakan belum tersedia");
   expect(markup).toContain("Jumlah antrean tidak dijumlahkan");
  }
  const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA static component fixture</title><style>${css}</style></head><body><div data-global-dashboard="true"><main class="gad-root p-4">${markup}</main></div></body></html>`;
  writeFileSync(`qa-artifacts/auto-order-20261026/dashboard-${name}.html`,html);
 }
});
