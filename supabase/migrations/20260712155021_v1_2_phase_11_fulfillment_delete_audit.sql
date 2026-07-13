-- DEBRODER v1.2 Phase 11 — immutable histories and controlled permanent deletion.

create or replace function public.prevent_fulfillment_history_mutation()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if current_setting('debroder.fulfillment_permanent_delete',true)='on' and tg_op='DELETE' then return old; end if;
  raise exception 'Riwayat fulfillment bersifat permanen dan tidak dapat diubah';
end $$;

drop trigger if exists prevent_fulfillment_history_mutation on public.fulfillment_status_history;
create trigger prevent_fulfillment_history_mutation
before update or delete on public.fulfillment_status_history
for each row execute function public.prevent_fulfillment_history_mutation();

drop trigger if exists prevent_fulfillment_revision_mutation on public.fulfillment_revisions;
create trigger prevent_fulfillment_revision_mutation
before update or delete on public.fulfillment_revisions
for each row execute function public.prevent_fulfillment_history_mutation();

drop trigger if exists prevent_fulfillment_deletion_audit_mutation on public.fulfillment_deletion_audit;
create trigger prevent_fulfillment_deletion_audit_mutation
before update or delete on public.fulfillment_deletion_audit
for each row execute function public.prevent_fulfillment_history_mutation();

create or replace function public.permanently_delete_fulfillment(p_fulfillment_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare target_row public.fulfillments;
begin
  if not public.has_permission('permanent_delete') or not public.has_staff_role(array['superadmin','super_admin']) then
    raise exception 'Hanya Super Admin yang dapat menghapus permanen';
  end if;
  select * into target_row from public.fulfillments
  where id=p_fulfillment_id and archived_at is not null and status in ('preparing','cancelled')
  for update;
  if not found then raise exception 'Hanya penyerahan Persiapan atau Dibatalkan di Gudang Arsip yang dapat dihapus permanen'; end if;
  if exists(select 1 from public.fulfillment_files where fulfillment_id=target_row.id) then
    raise exception 'Hapus seluruh file bukti sebelum menghapus permanen';
  end if;

  insert into public.fulfillment_deletion_audit(fulfillment_id,fulfillment_number,order_id,snapshot,deleted_by)
  values(target_row.id,target_row.fulfillment_number,target_row.order_id,to_jsonb(target_row),auth.uid());
  perform set_config('debroder.fulfillment_permanent_delete','on',true);
  delete from public.fulfillment_revisions where fulfillment_id=target_row.id;
  delete from public.fulfillment_status_history where fulfillment_id=target_row.id;
  delete from public.fulfillment_items where fulfillment_id=target_row.id;
  delete from public.fulfillments where id=target_row.id;
  perform public.refresh_order_fulfillment_status(target_row.order_id);
end $$;
