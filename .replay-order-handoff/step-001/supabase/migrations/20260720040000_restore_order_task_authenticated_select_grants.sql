-- DEBRODER migration history/grant reconciliation
-- Safe and idempotent. Keeps direct authenticated reads behind existing RLS policies.

grant select on table public.order_integrity_findings to authenticated;
grant select on table public.order_tasks to authenticated;
grant select on table public.order_task_history to authenticated;

grant all on table public.order_integrity_findings to service_role;
grant all on table public.order_tasks to service_role;
grant all on table public.order_task_history to service_role;
