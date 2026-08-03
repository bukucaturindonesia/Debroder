-- DEBRODER v1.2 Phase 10 — remove editable QC evidence metadata.

create or replace function public.remove_qc_file(p_qc_file_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_permission('qc.update') then raise exception 'Tidak berwenang menghapus bukti QC'; end if;
 delete from public.qc_files file_row using public.qc_records record_row where file_row.id=p_qc_file_id and record_row.id=file_row.qc_record_id and record_row.result='pending' and record_row.status in ('draft','in_review') and record_row.archived_at is null;
 if not found then raise exception 'Bukti QC tidak dapat dihapus'; end if;
end $$;

revoke all on function public.remove_qc_file(uuid) from public,anon;
grant execute on function public.remove_qc_file(uuid) to authenticated;
