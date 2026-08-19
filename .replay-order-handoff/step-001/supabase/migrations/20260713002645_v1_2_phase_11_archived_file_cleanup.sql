-- Phase 11 lifecycle correction: Super Admin may clear proof metadata from archived draft/cancelled fulfillments before permanent deletion.
create or replace function public.remove_fulfillment_file(p_file_id uuid)
returns public.fulfillment_files
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.fulfillment_files;
  fulfillment_row public.fulfillments;
  active_edit_allowed boolean:=false;
  archive_cleanup_allowed boolean:=false;
begin
  select * into result_row
  from public.fulfillment_files
  where id=p_file_id
  for update;
  if not found then raise exception 'Bukti penyerahan tidak ditemukan'; end if;

  select * into fulfillment_row
  from public.fulfillments
  where id=result_row.fulfillment_id
  for update;
  if not found then raise exception 'Dokumen penyerahan tidak ditemukan'; end if;

  active_edit_allowed:=fulfillment_row.archived_at is null
    and fulfillment_row.status not in ('delivered','picked_up','cancelled')
    and public.has_permission('shipping.update');
  archive_cleanup_allowed:=fulfillment_row.archived_at is not null
    and fulfillment_row.status in ('preparing','cancelled')
    and public.has_permission('permanent_delete')
    and public.has_staff_role(array['superadmin','super_admin']);

  if not active_edit_allowed and not archive_cleanup_allowed then
    raise exception 'Bukti penyerahan tidak dapat dihapus pada status ini';
  end if;

  delete from public.fulfillment_files where id=result_row.id;
  return result_row;
end $$;

revoke all on function public.remove_fulfillment_file(uuid) from public,anon;
grant execute on function public.remove_fulfillment_file(uuid) to authenticated;
