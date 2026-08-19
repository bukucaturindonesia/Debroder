alter table public.document_number_rule_history
  drop constraint if exists document_number_rule_history_action_check;
alter table public.document_number_rule_history
  add constraint document_number_rule_history_action_check
  check (action in ('created','updated','archived','restored','deleted'));

create or replace function public.permanently_delete_document_number_rule(p_document_type text)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  old_row public.document_number_rules;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then
    raise exception 'Hanya Super Admin yang dapat menghapus permanen';
  end if;

  select * into old_row
  from public.document_number_rules
  where document_type=p_document_type and archived_at is not null
  for update;
  if not found then
    raise exception 'Aturan arsip tidak ditemukan';
  end if;

  if exists(
    select 1 from public.document_number_issues
    where document_type=p_document_type
  ) then
    raise exception 'Aturan yang sudah menerbitkan nomor tidak dapat dihapus permanen';
  end if;

  delete from public.document_number_sequences
  where document_type=p_document_type;

  delete from public.document_number_rules
  where document_type=p_document_type and archived_at is not null;

  insert into public.document_number_rule_history(
    document_type,action,old_value,actor_id,reason
  ) values(
    p_document_type,'deleted',to_jsonb(old_row),auth.uid(),
    'Aturan arsip yang belum pernah digunakan dihapus permanen'
  );
end $$;

revoke all on function public.permanently_delete_document_number_rule(text) from public,anon;
grant execute on function public.permanently_delete_document_number_rule(text) to authenticated;
