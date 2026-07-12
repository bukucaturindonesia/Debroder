-- DEBRODER v1.2 Phase 10 — QC evidence registration, archive, and restore.

create or replace function public.register_qc_file(p_qc_record_id uuid,p_path text,p_file_name text,p_mime_type text,p_size_bytes bigint)
returns public.qc_files language plpgsql security definer set search_path='' as $$
declare result_row public.qc_files;
begin
 if not public.has_permission('qc.inspect') then raise exception 'Tidak berwenang mengunggah bukti QC'; end if;
 if p_mime_type not in ('image/png','image/jpeg','image/webp','application/pdf') then raise exception 'Tipe file tidak didukung'; end if;
 if p_size_bytes<=0 or p_size_bytes>10485760 then raise exception 'Ukuran file tidak valid'; end if;
 if btrim(coalesce(p_path,''))='' or p_path not like p_qc_record_id::text||'/%' then raise exception 'Path bukti QC tidak valid'; end if;
 perform 1 from public.qc_records where id=p_qc_record_id and result='pending' and status in ('draft','in_review') and archived_at is null;
 if not found then raise exception 'QC tidak dapat menerima bukti baru'; end if;
 insert into public.qc_files(qc_record_id,path,file_name,mime_type,size_bytes,uploaded_by) values(p_qc_record_id,p_path,p_file_name,p_mime_type,p_size_bytes,auth.uid()) returning * into result_row;
 return result_row;
end $$;

create or replace function public.archive_qc_record(p_qc_record_id uuid,p_reason text default null)
returns public.qc_records language plpgsql security definer set search_path='' as $$
declare result_row public.qc_records; reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
 if not public.has_permission('qc.archive') then raise exception 'Tidak berwenang mengarsipkan QC'; end if;
 if reason_value is null then raise exception 'Alasan arsip wajib diisi'; end if;
 update public.qc_records set archived_at=now(),archived_by=auth.uid(),archive_reason=reason_value,updated_by=auth.uid(),updated_at=now() where id=p_qc_record_id and archived_at is null and result='pending' and status in ('draft','in_review') returning * into result_row;
 if not found then raise exception 'Hanya QC yang belum difinalisasi yang dapat diarsipkan'; end if;
 insert into public.qc_status_history(qc_record_id,from_result,to_result,note,changed_by) values(result_row.id,result_row.status,'archived',reason_value,auth.uid());
 return result_row;
end $$;

create or replace function public.restore_qc_record(p_qc_record_id uuid)
returns public.qc_records language plpgsql security definer set search_path='' as $$
declare archived_row public.qc_records; result_row public.qc_records;
begin
 if not public.has_permission('qc.archive') then raise exception 'Tidak berwenang memulihkan QC'; end if;
 select * into archived_row from public.qc_records where id=p_qc_record_id and archived_at is not null and result='pending' for update;
 if not found then raise exception 'Draft QC arsip tidak ditemukan'; end if;
 if exists(select 1 from public.qc_records other_row where other_row.work_item_id=archived_row.work_item_id and other_row.id<>archived_row.id and other_row.archived_at is null and other_row.result='pending') then raise exception 'Work Item sudah mempunyai draft QC aktif'; end if;
 update public.qc_records set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now() where id=archived_row.id returning * into result_row;
 insert into public.qc_status_history(qc_record_id,from_result,to_result,note,changed_by) values(result_row.id,'archived',result_row.status,'Draft QC dipulihkan dari Gudang Arsip',auth.uid());
 return result_row;
end $$;

grant execute on function public.register_qc_file(uuid,text,text,text,bigint) to authenticated;
grant execute on function public.archive_qc_record(uuid,text) to authenticated;
grant execute on function public.restore_qc_record(uuid) to authenticated;
