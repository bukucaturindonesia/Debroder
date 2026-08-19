-- DEBRODER v1.2 Phase 10 — QC permanent delete alignment for archived draft only.

create or replace function public.permanently_delete_qc_record(p_qc_record_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target_row public.qc_records;
begin
 if not public.has_permission('qc.delete') or not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat menghapus permanen QC'; end if;
 select * into target_row from public.qc_records where id=p_qc_record_id and archived_at is not null and result='pending' and status in ('draft','in_review') for update;
 if not found then raise exception 'Hanya draft QC di Gudang Arsip yang dapat dihapus permanen'; end if;
 if exists(select 1 from public.qc_files where qc_record_id=target_row.id) then raise exception 'Hapus seluruh file bukti dari storage terlebih dahulu'; end if;
 insert into public.qc_deletion_audit(qc_record_id,qc_number,work_item_id,job_order_id,snapshot,deleted_by) values(target_row.id,target_row.qc_number,target_row.work_item_id,target_row.job_order_id,to_jsonb(target_row),auth.uid());
 perform set_config('debroder.qc_permanent_delete','on',true);
 delete from public.qc_checklist_results where qc_record_id=target_row.id;
 delete from public.qc_record_revisions where qc_record_id=target_row.id;
 delete from public.qc_status_history where qc_record_id=target_row.id;
 delete from public.qc_records where id=target_row.id;
end $$;

revoke all on function public.permanently_delete_qc_record(uuid) from public,anon;
grant execute on function public.permanently_delete_qc_record(uuid) to authenticated;
