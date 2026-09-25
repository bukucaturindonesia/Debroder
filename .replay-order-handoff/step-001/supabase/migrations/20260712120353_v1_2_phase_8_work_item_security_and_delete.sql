create or replace function public.permanently_delete_work_item(p_work_item_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare target_row public.work_items;
begin
  if not public.has_permission('work_item.delete') or not public.has_staff_role(array['superadmin','super_admin']) then
    raise exception 'Hanya Super Admin yang dapat menghapus permanen';
  end if;
  select * into target_row from public.work_items
  where id=p_work_item_id and archived_at is not null and status in ('draft','cancelled')
  for update;
  if not found then raise exception 'Hanya Work Item Draft atau Dibatalkan di Gudang Arsip yang dapat dihapus permanen'; end if;
  if exists(select 1 from public.qc_records where work_item_id=target_row.id) then
    raise exception 'Work Item yang sudah mempunyai catatan QC tidak dapat dihapus permanen';
  end if;

  insert into public.work_item_deletion_audit(work_item_id,work_item_number,job_order_id,snapshot,deleted_by)
  values(target_row.id,target_row.work_item_number,target_row.job_order_id,to_jsonb(target_row),auth.uid());
  perform set_config('debroder.work_item_permanent_delete','on',true);
  delete from public.work_item_dependencies
  where work_item_id=target_row.id or depends_on_work_item_id=target_row.id;
  delete from public.work_item_dependency_history
  where work_item_id=target_row.id or depends_on_work_item_id=target_row.id;
  delete from public.work_item_assignment_history where work_item_id=target_row.id;
  delete from public.work_item_status_history where work_item_id=target_row.id;
  delete from public.work_item_revisions where work_item_id=target_row.id;
  delete from public.work_items where id=target_row.id;
  perform public.refresh_job_order_progress(target_row.job_order_id);
end $$;

alter table public.work_items enable row level security;
alter table public.work_item_dependencies enable row level security;
alter table public.work_item_assignment_history enable row level security;
alter table public.work_item_status_history enable row level security;
alter table public.work_item_revisions enable row level security;
alter table public.work_item_dependency_history enable row level security;
alter table public.work_item_deletion_audit enable row level security;

do $$
declare table_value text;
begin
  foreach table_value in array array[
    'work_items','work_item_dependencies','work_item_assignment_history','work_item_status_history',
    'work_item_revisions','work_item_dependency_history','work_item_deletion_audit'
  ] loop
    execute format('drop policy if exists "staff read %s" on public.%I',table_value,table_value);
    execute format('drop policy if exists "production staff read %s" on public.%I',table_value,table_value);
    execute format(
      'create policy "production staff read %s" on public.%I for select to authenticated using(public.has_staff_role(array[''owner'',''superadmin'',''super_admin'',''admin'']))',
      table_value,table_value
    );
  end loop;
end $$;

revoke all on public.work_items,public.work_item_dependencies,public.work_item_assignment_history,
  public.work_item_status_history,public.work_item_revisions,public.work_item_dependency_history,
  public.work_item_deletion_audit from public,anon;
revoke insert,update,delete,truncate,references,trigger on public.work_items,public.work_item_dependencies,
  public.work_item_assignment_history,public.work_item_status_history,public.work_item_revisions,
  public.work_item_dependency_history,public.work_item_deletion_audit from authenticated;
grant select on public.work_items,public.work_item_dependencies,public.work_item_assignment_history,
  public.work_item_status_history,public.work_item_revisions,public.work_item_dependency_history,
  public.work_item_deletion_audit to authenticated;

revoke all on function public.generate_job_order_work_items(uuid) from public,anon;
revoke all on function public.create_work_item(uuid,text,text,integer,text,date,text,uuid,text) from public,anon;
revoke all on function public.create_work_item(uuid,text,text,integer,text,date,text,uuid) from public,anon;
revoke all on function public.update_work_item_draft(uuid,text,text,integer,text,date,text,text) from public,anon;
revoke all on function public.update_work_item_draft(uuid,text,text,integer,text,date,text) from public,anon;
revoke all on function public.assign_work_item(uuid,uuid,text) from public,anon;
revoke all on function public.add_work_item_dependency(uuid,uuid) from public,anon;
revoke all on function public.remove_work_item_dependency(uuid,uuid) from public,anon;
revoke all on function public.transition_work_item_status(uuid,text,text,text) from public,anon;
revoke all on function public.archive_work_item(uuid,text) from public,anon;
revoke all on function public.restore_work_item(uuid) from public,anon;
revoke all on function public.permanently_delete_work_item(uuid) from public,anon;

grant execute on function public.generate_job_order_work_items(uuid) to authenticated;
grant execute on function public.create_work_item(uuid,text,text,integer,text,date,text,uuid,text) to authenticated;
grant execute on function public.create_work_item(uuid,text,text,integer,text,date,text,uuid) to authenticated;
grant execute on function public.update_work_item_draft(uuid,text,text,integer,text,date,text,text) to authenticated;
grant execute on function public.update_work_item_draft(uuid,text,text,integer,text,date,text) to authenticated;
grant execute on function public.assign_work_item(uuid,uuid,text) to authenticated;
grant execute on function public.add_work_item_dependency(uuid,uuid) to authenticated;
grant execute on function public.remove_work_item_dependency(uuid,uuid) to authenticated;
grant execute on function public.transition_work_item_status(uuid,text,text,text) to authenticated;
grant execute on function public.archive_work_item(uuid,text) to authenticated;
grant execute on function public.restore_work_item(uuid) to authenticated;
grant execute on function public.permanently_delete_work_item(uuid) to authenticated;

-- No live Work Item rows existed when Phase 8 was prepared. Keep all future rows strictly numbered.
alter table public.work_items alter column work_item_number set not null;
