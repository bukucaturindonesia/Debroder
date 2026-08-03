alter table public.document_number_rules add column if not exists archived_at timestamptz;
alter table public.document_number_rules add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.document_number_rules add column if not exists archive_reason text;

create or replace function public.archive_document_number_rule(p_document_type text,p_reason text default null)
returns public.document_number_rules language plpgsql security definer set search_path=public as $$
declare r public.document_number_rules; begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 update public.document_number_rules set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),active=false,updated_by=auth.uid(),updated_at=now()
 where document_type=p_document_type and archived_at is null returning * into r;
 if not found then raise exception 'Rule not found'; end if; return r; end $$;
create or replace function public.restore_document_number_rule(p_document_type text)
returns public.document_number_rules language plpgsql security definer set search_path=public as $$
declare r public.document_number_rules; begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 update public.document_number_rules set archived_at=null,archived_by=null,archive_reason=null,active=true,updated_by=auth.uid(),updated_at=now()
 where document_type=p_document_type and archived_at is not null returning * into r;
 if not found then raise exception 'Archived rule not found'; end if; return r; end $$;
create or replace function public.permanently_delete_document_number_rule(p_document_type text)
returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 delete from public.document_number_rules r where r.document_type=p_document_type and r.archived_at is not null and not exists(select 1 from public.document_number_issues i where i.document_type=r.document_type);
 if not found then raise exception 'Archived unused rule required'; end if; end $$;

create or replace function public.add_work_item_dependency(p_work_item_id uuid,p_depends_on_work_item_id uuid)
returns public.work_item_dependencies language plpgsql security definer set search_path=public as $$
declare r public.work_item_dependencies; j1 uuid; j2 uuid; begin
 if not public.has_permission('work_item.update') then raise exception 'Not authorized'; end if;
 if p_work_item_id=p_depends_on_work_item_id then raise exception 'Self dependency is not allowed'; end if;
 select job_order_id into j1 from public.work_items where id=p_work_item_id and archived_at is null;
 select job_order_id into j2 from public.work_items where id=p_depends_on_work_item_id and archived_at is null;
 if j1 is null or j2 is null or j1<>j2 then raise exception 'Dependencies must be active Work Items in the same Job Order'; end if;
 if exists(with recursive deps(id) as (select depends_on_work_item_id from public.work_item_dependencies where work_item_id=p_depends_on_work_item_id union all select d.depends_on_work_item_id from public.work_item_dependencies d join deps x on d.work_item_id=x.id) select 1 from deps where id=p_work_item_id) then raise exception 'Dependency cycle detected'; end if;
 insert into public.work_item_dependencies(work_item_id,depends_on_work_item_id,created_by) values(p_work_item_id,p_depends_on_work_item_id,auth.uid()) on conflict do nothing returning * into r;
 if r.work_item_id is null then select * into r from public.work_item_dependencies where work_item_id=p_work_item_id and depends_on_work_item_id=p_depends_on_work_item_id; end if;
 return r; end $$;
create or replace function public.remove_work_item_dependency(p_work_item_id uuid,p_depends_on_work_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.has_permission('work_item.update') then raise exception 'Not authorized'; end if;
 delete from public.work_item_dependencies where work_item_id=p_work_item_id and depends_on_work_item_id=p_depends_on_work_item_id;
 if not found then raise exception 'Dependency not found'; end if; end $$;

grant execute on function public.archive_document_number_rule(text,text),public.restore_document_number_rule(text),public.permanently_delete_document_number_rule(text),public.add_work_item_dependency(uuid,uuid),public.remove_work_item_dependency(uuid,uuid) to authenticated;;
