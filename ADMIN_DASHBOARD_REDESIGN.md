# Operational dashboard — bounded implementation

2026-10-26. Latest owner instruction explicitly assigns Agent06 UI/UX for this mission; this is a scoped extension of the earlier asset-only role. Scope: existing GlobalAdminDashboard queue panel, new presentation component/helper. No global CSS/navigation/homepage/DTF/query/Auth/RLS change.

| Area | Principle | Existing queue placement |
|---|---|---|
| Siap Dikerjakan | Physical action indicated by existing operational projection; not automatic approval | QC and ready-to-ship queues; clear links to canonical module. |
| Dalam Proses | Waiting or active operation, not a new manual-approval requirement | Awaiting payment, production, pickup waiting. |
| Perlu Perhatian | Unclassified/new/review/blocked items | Payment verification, new orders, awaiting service, shipping incomplete, overdue; unknown future keys conservative attention. |

Counts can overlap and must not be added into a total. Queue cards are summaries, not newly created per-order tasks; operator follows the existing authorized module to see actual tasks. Zero counts are not proof the backend is healthy. Preserve module-issue warning, null-link unavailable state, loading/error/empty presentation and existing scoped API. Do not relabel all new orders as ready or turn unpaid into paid.

KPI, store and trend information remain available below the priority panel. Local component styles/Tailwind must wrap at mobile widths without horizontal overflow. Desktop/mobile runtime and operator-task timing require explicit evidence; design improvement alone is not measured efficiency. There are no new destructive or payment-approval controls.
Acceptance boundary: the changed component is the existing global dashboard. AdminDashboardGate still routes operator/store roles through their existing role dashboard. This wave does not change those routes/permissions or claim every employee now uses the new panel. Per-order tasks and cashier controls remain in canonical modules. Human operatorUAT and full store-role presentation remain pending.
