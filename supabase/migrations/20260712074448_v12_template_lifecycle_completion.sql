create or replace function public.create_qc_checklist_template(p_code text,p_label text,p_applies_to text,p_sort_order integer default 0)
returns public.qc_checklist_templates language plpgsql security definer set search_path=public as $$
declare r public.qc_checklist_templates; begin
 if not public.has_permission('qc.inspect') then raise exception 'Not authorized'; end if;
 if btrim(coalesce(p_code,''))='' or btrim(coalesce(p_label,''))='' then raise exception 'Code and label required'; end if;
 insert into public.qc_checklist_templates(code,label,applies_to,sort_order,created_by)
 values(lower(regexp_replace(btrim(p_code),'[^a-zA-Z0-9_]+','_','g')),btrim(p_label),coalesce(nullif(btrim(p_applies_to),''),'all'),coalesce(p_sort_order,0),auth.uid()) returning * into r;
 return r; end $$;
create or replace function public.update_qc_checklist_template(p_template_id uuid,p_label text,p_applies_to text,p_sort_order integer,p_active boolean)
returns public.qc_checklist_templates language plpgsql security definer set search_path=public as $$
declare r public.qc_checklist_templates; begin
 if not public.has_permission('qc.inspect') then raise exception 'Not authorized'; end if;
 update public.qc_checklist_templates set label=btrim(p_label),applies_to=coalesce(nullif(btrim(p_applies_to),''),'all'),sort_order=coalesce(p_sort_order,0),active=coalesce(p_active,true)
 where id=p_template_id and archived_at is null returning * into r;
 if not found then raise exception 'Template not found'; end if; return r; end $$;
create or replace function public.archive_qc_checklist_template(p_template_id uuid,p_reason text default null)
returns public.qc_checklist_templates language plpgsql security definer set search_path=public as $$
declare r public.qc_checklist_templates; begin
 if not public.has_permission('qc.archive') then raise exception 'Not authorized'; end if;
 update public.qc_checklist_templates set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),active=false where id=p_template_id and archived_at is null returning * into r;
 if not found then raise exception 'Template not found'; end if; return r; end $$;
create or replace function public.restore_qc_checklist_template(p_template_id uuid)
returns public.qc_checklist_templates language plpgsql security definer set search_path=public as $$
declare r public.qc_checklist_templates; begin
 if not public.has_permission('qc.archive') then raise exception 'Not authorized'; end if;
 update public.qc_checklist_templates set archived_at=null,archived_by=null,archive_reason=null,active=true where id=p_template_id and archived_at is not null returning * into r;
 if not found then raise exception 'Archived template not found'; end if; return r; end $$;
create or replace function public.permanently_delete_qc_checklist_template(p_template_id uuid)
returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 delete from public.qc_checklist_templates t where t.id=p_template_id and t.archived_at is not null and not exists(select 1 from public.qc_checklist_results r where r.template_id=t.id);
 if not found then raise exception 'Archived unused template required'; end if; end $$;

create or replace function public.create_notification_template(p_event_code text,p_channel text,p_title_template text,p_body_template text,p_provider_configured boolean default false)
returns public.notification_templates language plpgsql security definer set search_path=public as $$
declare r public.notification_templates; begin
 if not public.has_permission('notification.manage') then raise exception 'Not authorized'; end if;
 if p_channel not in ('in_app','email','whatsapp','sms','push') then raise exception 'Invalid channel'; end if;
 if btrim(coalesce(p_event_code,''))='' or btrim(coalesce(p_title_template,''))='' or btrim(coalesce(p_body_template,''))='' then raise exception 'Required fields missing'; end if;
 insert into public.notification_templates(event_code,channel,title_template,body_template,provider_configured,created_by,updated_by)
 values(btrim(p_event_code),p_channel,btrim(p_title_template),btrim(p_body_template),case when p_channel='in_app' then true else coalesce(p_provider_configured,false) end,auth.uid(),auth.uid()) returning * into r;
 return r; end $$;
create or replace function public.update_notification_template(p_template_id uuid,p_title_template text,p_body_template text,p_active boolean,p_provider_configured boolean)
returns public.notification_templates language plpgsql security definer set search_path=public as $$
declare r public.notification_templates; begin
 if not public.has_permission('notification.manage') then raise exception 'Not authorized'; end if;
 update public.notification_templates set title_template=btrim(p_title_template),body_template=btrim(p_body_template),active=coalesce(p_active,true),provider_configured=case when channel='in_app' then true else coalesce(p_provider_configured,false) end,updated_by=auth.uid(),updated_at=now()
 where id=p_template_id and archived_at is null returning * into r;
 if not found then raise exception 'Template not found'; end if; return r; end $$;
create or replace function public.permanently_delete_notification_template(p_template_id uuid)
returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 delete from public.notification_templates where id=p_template_id and archived_at is not null;
 if not found then raise exception 'Template must be archived'; end if; end $$;

grant execute on function public.create_qc_checklist_template(text,text,text,integer),public.update_qc_checklist_template(uuid,text,text,integer,boolean),public.archive_qc_checklist_template(uuid,text),public.restore_qc_checklist_template(uuid),public.permanently_delete_qc_checklist_template(uuid),public.create_notification_template(text,text,text,text,boolean),public.update_notification_template(uuid,text,text,boolean,boolean),public.permanently_delete_notification_template(uuid) to authenticated;;
