create or replace function public.update_work_item_draft(p_work_item_id uuid,p_title text,p_description text,p_quantity integer,p_unit text,p_target_date date,p_priority text)
returns public.work_items language plpgsql security definer set search_path=public as $$
declare r public.work_items; begin
 if not public.has_permission('work_item.update') then raise exception 'Not authorized'; end if;
 if btrim(coalesce(p_title,''))='' or coalesce(p_quantity,0)<=0 then raise exception 'Title and quantity required'; end if;
 if p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;
 update public.work_items set title=btrim(p_title),description=nullif(btrim(coalesce(p_description,'')),''),quantity=p_quantity,unit=coalesce(nullif(btrim(coalesce(p_unit,'')),''),'pcs'),target_date=p_target_date,priority=p_priority,updated_by=auth.uid(),updated_at=now()
 where id=p_work_item_id and archived_at is null and status in ('draft','ready') returning * into r;
 if not found then raise exception 'Editable Work Item not found'; end if; return r; end $$;

create or replace function public.update_qc_record_draft(p_qc_record_id uuid,p_checked_quantity integer,p_checklist jsonb,p_defect_notes text default null)
returns public.qc_records language plpgsql security definer set search_path=public as $$
declare q public.qc_records; wi public.work_items; item jsonb; begin
 if not public.has_permission('qc.inspect') then raise exception 'Not authorized'; end if;
 select * into q from public.qc_records where id=p_qc_record_id and result='pending' and archived_at is null for update;
 if not found then raise exception 'Pending QC record not found'; end if;
 select * into wi from public.work_items where id=q.work_item_id;
 if p_checked_quantity<=0 or p_checked_quantity>wi.quantity then raise exception 'Invalid checked quantity'; end if;
 if jsonb_typeof(coalesce(p_checklist,'[]'::jsonb))<>'array' then raise exception 'Checklist must be array'; end if;
 delete from public.qc_checklist_results where qc_record_id=q.id;
 for item in select * from jsonb_array_elements(coalesce(p_checklist,'[]'::jsonb)) loop
  if coalesce(item->>'code','')='' or coalesce(item->>'label','')='' or coalesce(item->>'result','') not in ('pass','fail','not_applicable') then raise exception 'Invalid checklist item'; end if;
  insert into public.qc_checklist_results(qc_record_id,code,label,result,note,sort_order)
  values(q.id,item->>'code',item->>'label',item->>'result',nullif(item->>'note',''),coalesce((item->>'sort_order')::int,0));
 end loop;
 update public.qc_records set checked_quantity=p_checked_quantity,defect_notes=nullif(btrim(coalesce(p_defect_notes,'')),'') where id=q.id returning * into q;
 return q; end $$;

create or replace function public.archive_notification_template(p_template_id uuid,p_reason text default null)
returns public.notification_templates language plpgsql security definer set search_path=public as $$
declare t public.notification_templates; begin
 if not public.has_permission('notification.manage') then raise exception 'Not authorized'; end if;
 update public.notification_templates set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),active=false,updated_by=auth.uid(),updated_at=now()
 where id=p_template_id and archived_at is null returning * into t;
 if not found then raise exception 'Template not found'; end if; return t; end $$;
create or replace function public.restore_notification_template(p_template_id uuid)
returns public.notification_templates language plpgsql security definer set search_path=public as $$
declare t public.notification_templates; begin
 if not public.has_permission('notification.manage') then raise exception 'Not authorized'; end if;
 update public.notification_templates set archived_at=null,archived_by=null,archive_reason=null,active=true,updated_by=auth.uid(),updated_at=now()
 where id=p_template_id and archived_at is not null returning * into t;
 if not found then raise exception 'Archived template not found'; end if; return t; end $$;

grant execute on function public.update_work_item_draft(uuid,text,text,integer,text,date,text),public.update_qc_record_draft(uuid,integer,jsonb,text) to authenticated;;
