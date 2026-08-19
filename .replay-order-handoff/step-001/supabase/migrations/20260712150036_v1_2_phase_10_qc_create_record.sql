-- DEBRODER v1.2 Phase 10 — create QC record from Work Item awaiting QC.

create or replace function public.create_qc_record(p_work_item_id uuid,p_checked_quantity integer,p_checklist jsonb,p_defect_notes text default null)
returns public.qc_records language plpgsql security definer set search_path='' as $$
declare item_row public.work_items; job_row public.job_orders; result_row public.qc_records; result_id uuid:=gen_random_uuid(); attempt_value integer; number_value text; checklist_item jsonb; supplied_checklist jsonb:=coalesce(p_checklist,'[]'::jsonb);
begin
 if not public.has_permission('qc.create') then raise exception 'Tidak berwenang membuat pemeriksaan QC'; end if;
 if p_checked_quantity is null or p_checked_quantity<=0 then raise exception 'Jumlah pemeriksaan wajib lebih dari nol'; end if;
 if jsonb_typeof(supplied_checklist)<>'array' then raise exception 'Checklist QC harus berupa array'; end if;
 select * into item_row from public.work_items where id=p_work_item_id and archived_at is null for update;
 if not found then raise exception 'Work Item aktif tidak ditemukan'; end if;
 if item_row.status<>'awaiting_qc' then raise exception 'Work Item harus berstatus Menunggu QC'; end if;
 if p_checked_quantity>item_row.quantity then raise exception 'Jumlah pemeriksaan melebihi jumlah Work Item'; end if;
 select * into job_row from public.job_orders where id=item_row.job_order_id and archived_at is null;
 if not found or job_row.status not in ('in_progress','on_hold') then raise exception 'Job Order belum berada pada tahap Quality Control'; end if;
 select * into result_row from public.qc_records where work_item_id=item_row.id and result='pending' and archived_at is null for update;
 if found then return result_row; end if;
 select coalesce(max(attempt_number),0)+1 into attempt_value from public.qc_records where work_item_id=item_row.id;
 number_value:=public.issue_document_number('qc','qc_records',result_id,'qc:'||item_row.id::text||':'||attempt_value::text,jsonb_build_object('work_item_id',item_row.id,'job_order_id',job_row.id,'attempt',attempt_value));
 insert into public.qc_records(id,qc_number,job_order_id,work_item_id,attempt_number,checked_quantity,status,result,defect_notes,idempotency_key,created_by,updated_by)
 values(result_id,number_value,job_row.id,item_row.id,attempt_value,p_checked_quantity,'draft','pending',nullif(btrim(coalesce(p_defect_notes,'')),''),'qc:'||item_row.id::text||':'||attempt_value::text,auth.uid(),auth.uid()) returning * into result_row;
 if jsonb_array_length(supplied_checklist)>0 then
  for checklist_item in select * from jsonb_array_elements(supplied_checklist) loop
   if coalesce(checklist_item->>'code','')='' or coalesce(checklist_item->>'label','')='' then raise exception 'Kode dan label checklist wajib diisi'; end if;
   if coalesce(checklist_item->>'result','pending') not in ('pending','pass','fail','not_applicable') then raise exception 'Hasil checklist tidak valid'; end if;
   insert into public.qc_checklist_results(qc_record_id,template_id,code,label,result,note,sort_order)
   values(result_row.id,nullif(checklist_item->>'template_id','')::uuid,checklist_item->>'code',checklist_item->>'label',coalesce(checklist_item->>'result','pending'),nullif(btrim(coalesce(checklist_item->>'note','')),''),coalesce((checklist_item->>'sort_order')::integer,0));
  end loop;
 else
  insert into public.qc_checklist_results(qc_record_id,template_id,code,label,result,sort_order)
  select result_row.id,id,code,label,'pending',sort_order from public.qc_checklist_templates where active and archived_at is null order by sort_order,code;
 end if;
 insert into public.qc_status_history(qc_record_id,from_result,to_result,note,changed_by) values(result_row.id,null,'draft','Draft pemeriksaan QC dibuat',auth.uid());
 return result_row;
end $$;

grant execute on function public.create_qc_record(uuid,integer,jsonb,text) to authenticated;
