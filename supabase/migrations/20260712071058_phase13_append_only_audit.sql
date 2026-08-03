create table if not exists public.system_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  source text not null default 'database',
  reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists system_audit_log_entity_idx on public.system_audit_log(entity_type,entity_id,created_at desc);
create index if not exists system_audit_log_actor_idx on public.system_audit_log(actor_id,created_at desc);
create index if not exists system_audit_log_action_idx on public.system_audit_log(action,created_at desc);
create or replace function public.write_audit_log(
 p_entity_type text,p_entity_id uuid,p_action text,p_old_value jsonb,p_new_value jsonb,
 p_reason text default null,p_source text default 'database',p_request_id text default null,p_metadata jsonb default '{}'::jsonb
)
returns public.system_audit_log
language plpgsql security definer set search_path=public
as $$
declare a public.system_audit_log;
begin
 if coalesce(btrim(p_entity_type),'')='' or coalesce(btrim(p_action),'')='' then raise exception 'Audit entity and action required'; end if;
 insert into public.system_audit_log(entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source,reason,request_id,metadata)
 values(p_entity_type,p_entity_id,p_action,p_old_value,p_new_value,auth.uid(),public.current_actor_role(),coalesce(nullif(p_source,''),'database'),
 nullif(btrim(coalesce(p_reason,'')),''),nullif(btrim(coalesce(p_request_id,'')),''),coalesce(p_metadata,'{}'::jsonb)) returning * into a;
 return a;
end $$;
create or replace function public.prevent_audit_change()
returns trigger language plpgsql as $$ begin raise exception 'Audit log is append-only'; end $$;
drop trigger if exists prevent_system_audit_change on public.system_audit_log;
create trigger prevent_system_audit_change before update or delete on public.system_audit_log for each row execute function public.prevent_audit_change();
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare row_id uuid; action_name text; old_json jsonb; new_json jsonb;
begin
 if tg_op='INSERT' then new_json:=to_jsonb(new); row_id:=(new_json->>'id')::uuid; action_name='created';
 elsif tg_op='UPDATE' then old_json:=to_jsonb(old); new_json:=to_jsonb(new); row_id:=(new_json->>'id')::uuid;
   if new_json->>'archived_at' is not null and old_json->>'archived_at' is null then action_name='archived';
   elsif new_json->>'archived_at' is null and old_json->>'archived_at' is not null then action_name='restored'; else action_name='updated'; end if;
 else old_json:=to_jsonb(old); row_id:=(old_json->>'id')::uuid; action_name='deleted'; end if;
 insert into public.system_audit_log(entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source)
 values(tg_table_name,row_id,action_name,old_json,new_json,auth.uid(),public.current_actor_role(),'trigger');
 if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists audit_job_orders_changes on public.job_orders;
create trigger audit_job_orders_changes after insert or update or delete on public.job_orders for each row execute function public.audit_row_change();
drop trigger if exists audit_work_items_changes on public.work_items;
create trigger audit_work_items_changes after insert or update or delete on public.work_items for each row execute function public.audit_row_change();
drop trigger if exists audit_qc_records_changes on public.qc_records;
create trigger audit_qc_records_changes after insert or update or delete on public.qc_records for each row execute function public.audit_row_change();
drop trigger if exists audit_fulfillments_changes on public.fulfillments;
create trigger audit_fulfillments_changes after insert or update or delete on public.fulfillments for each row execute function public.audit_row_change();
drop trigger if exists audit_notification_templates_changes on public.notification_templates;
create trigger audit_notification_templates_changes after insert or update or delete on public.notification_templates for each row execute function public.audit_row_change();
create or replace function public.update_role_permission(p_role text,p_permission_key text,p_granted boolean)
returns public.role_permissions language plpgsql security definer set search_path=public as $$
declare rp public.role_permissions;
begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 if p_role not in ('owner','superadmin','super_admin','sales_admin','admin') then raise exception 'Invalid role'; end if;
 if p_permission_key='permanent_delete' and p_role not in ('superadmin','super_admin') and p_granted then raise exception 'Permanent delete is Super Admin only'; end if;
 insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
 values(p_role,p_permission_key,p_granted,auth.uid(),now())
 on conflict(role,permission_key) do update set granted=excluded.granted,updated_by=excluded.updated_by,updated_at=now() returning * into rp;
 perform public.write_audit_log('role_permission',null,'permission_changed',null,to_jsonb(rp),'Permission matrix updated','rpc',null,jsonb_build_object('role',p_role,'permission_key',p_permission_key));
 return rp;
end $$;
alter table public.system_audit_log enable row level security;
drop policy if exists "authorized read audit log" on public.system_audit_log;
create policy "authorized read audit log" on public.system_audit_log for select to authenticated using(public.has_permission('audit.read'));
grant select on public.system_audit_log to authenticated;
grant execute on function public.write_audit_log(text,uuid,text,jsonb,jsonb,text,text,text,jsonb),public.update_role_permission(text,text,boolean) to authenticated;;
