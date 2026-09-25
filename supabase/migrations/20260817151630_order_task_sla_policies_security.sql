begin;

-- The SLA catalog is consumed by trusted server-side task automation only.
-- Keep it in the exposed public schema with explicit RLS and no direct
-- customer or anonymous table access.
alter table public.order_task_sla_policies enable row level security;

revoke all on table public.order_task_sla_policies from public, anon, authenticated;
grant select, insert, update, delete on table public.order_task_sla_policies to service_role;

insert into public.system_audit_log (
  entity_type,
  action,
  actor_role,
  source,
  reason,
  metadata
)
select
  'security',
  'order_task_sla_policies_rls_enabled',
  'system',
  'migration',
  'Restrict operational SLA policy storage to trusted server-side automation.',
  jsonb_build_object(
    'table', 'public.order_task_sla_policies',
    'rls', true,
    'direct_public_access', false,
    'direct_anon_access', false,
    'direct_authenticated_access', false,
    'service_role_access', true
  )
where not exists (
  select 1
  from public.system_audit_log
  where action = 'order_task_sla_policies_rls_enabled'
);

commit;
