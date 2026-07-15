-- DEBRODER P0 security correction, stage 1.
-- Scope: close privileged internal RPCs and make actor_directory read-only/security-invoker.
-- This migration intentionally does not clean stale stock reservations.

begin;

-- Keep system audit writes behind trusted server-side/service-role execution.
create or replace function public.write_audit_log(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_old_value jsonb,
  p_new_value jsonb,
  p_reason text default null,
  p_source text default 'database',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.system_audit_log
language plpgsql
security definer
set search_path = ''
as $function$
declare
  audit_row public.system_audit_log;
begin
  if coalesce(btrim(p_entity_type), '') = ''
     or coalesce(btrim(p_action), '') = '' then
    raise exception 'Audit entity and action required';
  end if;

  insert into public.system_audit_log(
    entity_type,
    entity_id,
    action,
    old_value,
    new_value,
    actor_id,
    actor_role,
    source,
    reason,
    request_id,
    metadata
  )
  values (
    p_entity_type,
    p_entity_id,
    p_action,
    p_old_value,
    p_new_value,
    auth.uid(),
    public.current_actor_role(),
    coalesce(nullif(p_source, ''), 'database'),
    nullif(btrim(coalesce(p_reason, '')), ''),
    nullif(btrim(coalesce(p_request_id, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into audit_row;

  return audit_row;
end;
$function$;

revoke all on function public.write_audit_log(
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;
grant execute on function public.write_audit_log(
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  text,
  text,
  text,
  jsonb
) to service_role;

-- Internal commerce lifecycle helpers must never be browser-callable.
revoke all on function public.refresh_order_payment_summary(uuid)
  from public, anon, authenticated;
grant execute on function public.refresh_order_payment_summary(uuid)
  to service_role;

revoke all on function public.reserve_public_order_stock(uuid, interval, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_public_order_stock(uuid, interval, uuid)
  to service_role;

revoke all on function public.release_public_order_stock(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.release_public_order_stock(uuid, text, uuid)
  to service_role;

revoke all on function public.consume_paid_order_stock(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_paid_order_stock(uuid)
  to service_role;

revoke all on function public.expire_public_commerce_orders()
  from public, anon, authenticated;
grant execute on function public.expire_public_commerce_orders()
  to service_role;

-- The actor directory is a read-only authenticated directory. It must execute
-- using caller privileges so profiles RLS remains the enforcement boundary.
create or replace view public.actor_directory
with (security_invoker = true)
as
select
  p.id,
  p.email,
  p.role,
  coalesce(nullif(p.email, ''), p.id::text) as display_name
from public.profiles p
where public.has_staff_role(
  array['owner', 'superadmin', 'super_admin', 'sales_admin', 'admin']::text[]
);

revoke all on table public.actor_directory from public, anon, authenticated;
grant select on table public.actor_directory to authenticated, service_role;

-- Prevent future functions created by the migration owner from silently
-- inheriting browser execution through PostgreSQL's PUBLIC default.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

commit;
