-- DEBRODER v1.2 Phase 10 — update QC draft and checklist with immutable revision history.

create or replace function public.update_qc_record_draft(p_qc_record_id uuid,p_checked_quantity integer,p_checklist jsonb,p_defect_notes text default null,p_reason text default null)
returns public.qc_records language plpgsql security definer set search_path='' as $$
declare old_row public.qc_records; result_row public.qc_records; item_row public.work_items; checklist_item jsonb; previous_checklist jsonb; next_checklist jsonb; revision_value integer; reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
 if not public.has_permission('qc.update') then raise exception 'Tidak berwenang mengubah draft QC'; end if;
 if jsonb_typeof(coalesce(p_checklist,'[]'::jsonb))<>'array' then raise exception 'Checklist QC harus berupa array'; end if;
 select * into old_row from public.qc_records where id=p_qc_record_id and result='pending' and status in ('draft','in_review') and archived_at is null for update;
 if not found then raise exception 'Draft QC aktif tidak ditemukan'; end if;
 if old_row.status='in_review' and reason_value is null then raise exception 'Alasan perubahan wajib diisi saat pemeriksaan berjalan'; end if;
 select * into item_row from public.work_items where id=old_row.work_item_id and archived_at is null;
 if not found then raise exception 'Work Item aktif tidak ditemukan'; end if;
 if p_checked_quantity<=0 or p_checked_quantity>item_row.quantity then raise exception 'Jumlah pemeriksaan tidak valid'; end if;
 select coalesce(jsonb_agg(to_jsonb(row_value) order by row_value.sort_order,row_value.code),'[]'::jsonb) into previous_checklist from public.qc_checklist_results row_value where row_value.qc_record_id=old_row.id;
 for checklist_item in select * from jsonb_array_elements(coalesce(p_checklist,'[]'::jsonb)) loop
  if coalesce(checklist_item->>'code','')='' or coalesce(checklist_item->>'label','')='' then raise exception 'Kode dan label checklist wajib diisi'; end if;
  if coalesce(checklist_item->>'result','pending') not in ('pending','pass','fail','not_applicable') then raise exception 'Hasil checklist tidak valid'; end if;
  insert into public.qc_checklist_results(qc_record_id,template_id,code,label,result,note,sort_order)
  values(old_row.id,nullif(checklist_item->>'template_id','')::uuid,checklist_item->>'code',checklist_item->>'label',coalesce(checklist_item->>'result','pending'),nullif(btrim(coalesce(checklist_item->>'note','')),''),coalesce((checklist_item->>'sort_order')::integer,0))
  on conflict(qc_record_id,code) do update set result=excluded.result,note=excluded.note,sort_order=excluded.sort_order,label=excluded.label,template_id=excluded.template_id;
 end loop;
 update public.qc_records set checked_quantity=p_checked_quantity,defect_notes=nullif(btrim(coalesce(p_defect_notes,'')),''),updated_by=auth.uid(),updated_at=now() where id=old_row.id returning * into result_row;
 select coalesce(jsonb_agg(to_jsonb(row_value) order by row_value.sort_order,row_value.code),'[]'::jsonb) into next_checklist from public.qc_checklist_results row_value where row_value.qc_record_id=old_row.id;
 select coalesce(max(revision_number),0)+1 into revision_value from public.qc_record_revisions where qc_record_id=old_row.id;
 insert into public.qc_record_revisions(qc_record_id,revision_number,reason,previous_snapshot,new_snapshot,created_by)
 values(old_row.id,revision_value,coalesce(reason_value,'Pembaruan draft QC'),jsonb_build_object('record',to_jsonb(old_row),'checklist',previous_checklist),jsonb_build_object('record',to_jsonb(result_row),'checklist',next_checklist),auth.uid());
 return result_row;
end $$;

grant execute on function public.update_qc_record_draft(uuid,integer,jsonb,text,text) to authenticated;
