-- DEBRODER v1.2 Phase 10 — begin QC review workflow.

create or replace function public.begin_qc_record(p_qc_record_id uuid,p_note text default null)
returns public.qc_records language plpgsql security definer set search_path='' as $$
declare result_row public.qc_records;
begin
 if not public.has_permission('qc.inspect') then raise exception 'Tidak berwenang memulai pemeriksaan QC'; end if;
 update public.qc_records set status='in_review',inspector_id=auth.uid(),inspection_started_at=now(),updated_by=auth.uid(),updated_at=now() where id=p_qc_record_id and status='draft' and result='pending' and archived_at is null returning * into result_row;
 if not found then raise exception 'Draft QC aktif tidak ditemukan'; end if;
 insert into public.qc_status_history(qc_record_id,from_result,to_result,note,changed_by) values(result_row.id,'draft','in_review',coalesce(nullif(btrim(coalesce(p_note,'')),''),'Pemeriksaan QC dimulai'),auth.uid());
 return result_row;
end $$;

grant execute on function public.begin_qc_record(uuid,text) to authenticated;
