create or replace function public.generate_job_order_work_items(p_job_order_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  job_row public.job_orders;
  item_row public.order_items;
  service_row public.order_item_services;
  work_row public.work_items;
  result_id uuid;
  number_value text;
  key_value text;
  count_created integer:=0;
begin
  if not public.has_permission('work_item.create') then
    raise exception 'Tidak berwenang membuat Work Item';
  end if;

  select * into job_row
  from public.job_orders
  where id=p_job_order_id and archived_at is null
  for update;
  if not found then raise exception 'Job Order aktif tidak ditemukan'; end if;
  if job_row.status not in ('draft','ready') then
    raise exception 'Work Item hanya dapat dibuat sebelum Job Order dirilis';
  end if;

  for item_row in
    select * from public.order_items
    where order_id=job_row.order_id and archived_at is null
    order by created_at,id
  loop
    key_value:='work-item:order-item:'||item_row.id::text;
    if not exists(select 1 from public.work_items where idempotency_key=key_value) then
      result_id:=gen_random_uuid();
      number_value:=public.issue_document_number(
        'work_item','work_items',result_id,
        'work-item-number:'||result_id::text,
        jsonb_build_object('job_order_id',job_row.id,'source_order_item_id',item_row.id)
      );
      insert into public.work_items(
        id,work_item_number,job_order_id,source_order_item_id,title,description,
        quantity,unit,target_date,priority,status,instruction_snapshot,
        approved_design_snapshot,idempotency_key,created_by,updated_by
      ) values(
        result_id,number_value,job_row.id,item_row.id,item_row.product_name,
        nullif(concat_ws(' · ',nullif(item_row.variant_name,''),nullif(item_row.color,''),nullif(item_row.size,''),nullif(item_row.notes,'')),''),
        item_row.quantity,'pcs',job_row.target_date,job_row.priority,'draft',to_jsonb(item_row),
        job_row.mockup_snapshot,key_value,auth.uid(),auth.uid()
      ) returning * into work_row;
      insert into public.work_item_status_history(work_item_id,from_status,to_status,note,changed_by,metadata)
      values(work_row.id,null,'draft','Work Item dibuat otomatis dari produk pesanan',auth.uid(),
        jsonb_build_object('source_order_item_id',item_row.id));
      count_created:=count_created+1;
    end if;

    for service_row in
      select * from public.order_item_services
      where order_item_id=item_row.id
      order by created_at,id
    loop
      key_value:='work-item:service:'||service_row.id::text;
      if not exists(select 1 from public.work_items where idempotency_key=key_value) then
        result_id:=gen_random_uuid();
        number_value:=public.issue_document_number(
          'work_item','work_items',result_id,
          'work-item-number:'||result_id::text,
          jsonb_build_object('job_order_id',job_row.id,'source_order_item_service_id',service_row.id)
        );
        insert into public.work_items(
          id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,
          title,description,quantity,unit,target_date,priority,status,instruction_snapshot,
          approved_design_snapshot,idempotency_key,created_by,updated_by
        ) values(
          result_id,number_value,job_row.id,item_row.id,service_row.id,
          service_row.service_name,
          nullif(concat_ws(' · ',nullif(service_row.position,''),nullif(service_row.notes,'')),''),
          service_row.quantity,'pcs',job_row.target_date,job_row.priority,'draft',to_jsonb(service_row),
          job_row.mockup_snapshot,key_value,auth.uid(),auth.uid()
        ) returning * into work_row;
        insert into public.work_item_status_history(work_item_id,from_status,to_status,note,changed_by,metadata)
        values(work_row.id,null,'draft','Work Item dibuat otomatis dari layanan produksi',auth.uid(),
          jsonb_build_object('source_order_item_service_id',service_row.id));
        count_created:=count_created+1;
      end if;
    end loop;
  end loop;

  return count_created;
end $$;

create or replace function public.create_work_item(
  p_job_order_id uuid,
  p_title text,
  p_description text,
  p_quantity integer,
  p_unit text,
  p_target_date date,
  p_priority text,
  p_source_mockup_part_id uuid default null,
  p_idempotency_key text default null
)
returns public.work_items
language plpgsql
security definer
set search_path=''
as $$
declare
  job_row public.job_orders;
  result_row public.work_items;
  result_id uuid:=gen_random_uuid();
  number_value text;
  normalized_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
begin
  if not public.has_permission('work_item.create') then
    raise exception 'Tidak berwenang membuat Work Item';
  end if;
  if btrim(coalesce(p_title,''))='' then raise exception 'Judul Work Item wajib diisi'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah Work Item harus lebih dari nol'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Prioritas Work Item tidak valid'; end if;
  if p_target_date is not null and p_target_date<current_date then raise exception 'Target Work Item tidak boleh berada di masa lalu'; end if;

  if normalized_key is not null then
    select * into result_row from public.work_items where idempotency_key=normalized_key;
    if found then return result_row; end if;
  end if;

  select * into job_row
  from public.job_orders
  where id=p_job_order_id and archived_at is null
  for update;
  if not found then raise exception 'Job Order aktif tidak ditemukan'; end if;
  if job_row.status not in ('draft','ready') then raise exception 'Job Order sudah tidak dapat diubah'; end if;

  if p_source_mockup_part_id is not null and not exists(
    select 1 from public.mockup_parts
    where id=p_source_mockup_part_id and mockup_set_id=job_row.approved_mockup_set_id
  ) then raise exception 'Bagian mockup tidak sesuai dengan Job Order'; end if;

  number_value:=public.issue_document_number(
    'work_item','work_items',result_id,
    'work-item-number:'||result_id::text,
    jsonb_build_object('job_order_id',job_row.id,'manual',true)
  );

  insert into public.work_items(
    id,work_item_number,job_order_id,source_mockup_part_id,title,description,
    quantity,unit,target_date,priority,status,instruction_snapshot,
    approved_design_snapshot,idempotency_key,created_by,updated_by
  ) values(
    result_id,number_value,job_row.id,p_source_mockup_part_id,btrim(p_title),
    nullif(btrim(coalesce(p_description,'')),''),p_quantity,
    coalesce(nullif(btrim(coalesce(p_unit,'')),''),'pcs'),
    coalesce(p_target_date,job_row.target_date),p_priority,'draft',
    jsonb_build_object('manual',true,'created_at',now()),job_row.mockup_snapshot,
    coalesce(normalized_key,'work-item:manual:'||result_id::text),auth.uid(),auth.uid()
  ) returning * into result_row;

  insert into public.work_item_status_history(work_item_id,from_status,to_status,note,changed_by,metadata)
  values(result_row.id,null,'draft','Work Item manual dibuat',auth.uid(),jsonb_build_object('manual',true));
  return result_row;
end $$;

-- Compatibility wrapper for older clients that use the original 8-argument signature.
create or replace function public.create_work_item(
  p_job_order_id uuid,
  p_title text,
  p_description text,
  p_quantity integer,
  p_unit text,
  p_target_date date,
  p_priority text,
  p_source_mockup_part_id uuid default null
)
returns public.work_items
language sql
security definer
set search_path=''
as $$
  select public.create_work_item(
    p_job_order_id,p_title,p_description,p_quantity,p_unit,p_target_date,p_priority,
    p_source_mockup_part_id,null
  )
$$;

create or replace function public.update_work_item_draft(
  p_work_item_id uuid,
  p_title text,
  p_description text,
  p_quantity integer,
  p_unit text,
  p_target_date date,
  p_priority text,
  p_reason text default null
)
returns public.work_items
language plpgsql
security definer
set search_path=''
as $$
declare
  old_row public.work_items;
  result_row public.work_items;
  revision_value integer;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('work_item.update') then raise exception 'Tidak berwenang mengubah Work Item'; end if;
  if btrim(coalesce(p_title,''))='' then raise exception 'Judul Work Item wajib diisi'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah Work Item harus lebih dari nol'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Prioritas Work Item tidak valid'; end if;
  if p_target_date is not null and p_target_date<current_date then raise exception 'Target Work Item tidak boleh berada di masa lalu'; end if;

  select * into old_row from public.work_items
  where id=p_work_item_id and archived_at is null
  for update;
  if not found then raise exception 'Work Item aktif tidak ditemukan'; end if;
  if old_row.status not in ('draft','ready') then raise exception 'Work Item yang sudah masuk produksi tidak dapat diedit langsung'; end if;
  if old_row.status='ready' and reason_value is null then raise exception 'Alasan perubahan wajib diisi untuk Work Item Siap Dikerjakan'; end if;
  if exists(select 1 from public.job_orders where id=old_row.job_order_id and status not in ('draft','ready')) then
    raise exception 'Job Order induk sudah tidak dapat diubah';
  end if;

  update public.work_items set
    title=btrim(p_title),
    description=nullif(btrim(coalesce(p_description,'')),''),
    quantity=p_quantity,
    unit=coalesce(nullif(btrim(coalesce(p_unit,'')),''),'pcs'),
    target_date=p_target_date,
    priority=p_priority,
    updated_by=auth.uid(),updated_at=now()
  where id=p_work_item_id returning * into result_row;

  select coalesce(max(revision_number),0)+1 into revision_value
  from public.work_item_revisions where work_item_id=p_work_item_id;
  insert into public.work_item_revisions(
    work_item_id,revision_number,reason,previous_snapshot,new_snapshot,created_by
  ) values(
    p_work_item_id,revision_value,coalesce(reason_value,'Pembaruan draft'),
    to_jsonb(old_row),to_jsonb(result_row),auth.uid()
  );
  return result_row;
end $$;

-- Compatibility wrapper for the original signature.
create or replace function public.update_work_item_draft(
  p_work_item_id uuid,
  p_title text,
  p_description text,
  p_quantity integer,
  p_unit text,
  p_target_date date,
  p_priority text
)
returns public.work_items
language sql
security definer
set search_path=''
as $$
  select public.update_work_item_draft(
    p_work_item_id,p_title,p_description,p_quantity,p_unit,p_target_date,p_priority,null
  )
$$;

create or replace function public.assign_work_item(
  p_work_item_id uuid,
  p_assigned_to uuid,
  p_reason text default null
)
returns public.work_items
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.work_items;
  old_assignee uuid;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('work_item.assign') then raise exception 'Tidak berwenang menugaskan Work Item'; end if;
  if p_assigned_to is not null and not exists(
    select 1 from public.profiles where id=p_assigned_to and role in ('owner','superadmin','super_admin','admin')
  ) then raise exception 'Penanggung jawab produksi tidak ditemukan'; end if;

  select * into result_row from public.work_items
  where id=p_work_item_id and archived_at is null
  for update;
  if not found then raise exception 'Work Item aktif tidak ditemukan'; end if;
  if result_row.status not in ('draft','ready') then raise exception 'Penugasan hanya dapat diubah sebelum produksi dimulai'; end if;
  if exists(select 1 from public.job_orders where id=result_row.job_order_id and status not in ('draft','ready')) then
    raise exception 'Job Order induk sudah tidak dapat diubah';
  end if;
  old_assignee:=result_row.assigned_to;
  if old_assignee is not distinct from p_assigned_to then return result_row; end if;
  if result_row.status='ready' and reason_value is null then raise exception 'Alasan perubahan penanggung jawab wajib diisi'; end if;

  update public.work_items set assigned_to=p_assigned_to,updated_by=auth.uid(),updated_at=now()
  where id=result_row.id returning * into result_row;
  insert into public.work_item_assignment_history(work_item_id,from_user_id,to_user_id,reason,changed_by)
  values(result_row.id,old_assignee,p_assigned_to,reason_value,auth.uid());
  return result_row;
end $$;

create or replace function public.add_work_item_dependency(
  p_work_item_id uuid,
  p_depends_on_work_item_id uuid
)
returns public.work_item_dependencies
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.work_item_dependencies;
  job_id_value uuid;
  dependency_job_id uuid;
begin
  if not public.has_permission('work_item.dependency') then raise exception 'Tidak berwenang mengelola dependensi Work Item'; end if;
  if p_work_item_id=p_depends_on_work_item_id then raise exception 'Work Item tidak boleh bergantung pada dirinya sendiri'; end if;

  select job_order_id into job_id_value from public.work_items
  where id=p_work_item_id and archived_at is null and status in ('draft','ready');
  select job_order_id into dependency_job_id from public.work_items
  where id=p_depends_on_work_item_id and archived_at is null and status in ('draft','ready');
  if job_id_value is null or dependency_job_id is null or job_id_value<>dependency_job_id then
    raise exception 'Dependensi harus berasal dari Job Order yang sama dan masih dapat diedit';
  end if;
  if exists(select 1 from public.job_orders where id=job_id_value and status not in ('draft','ready')) then
    raise exception 'Job Order induk sudah tidak dapat diubah';
  end if;
  if exists(
    with recursive dependency_tree(id) as (
      select depends_on_work_item_id from public.work_item_dependencies where work_item_id=p_depends_on_work_item_id
      union
      select d.depends_on_work_item_id
      from public.work_item_dependencies d
      join dependency_tree tree on d.work_item_id=tree.id
    )
    select 1 from dependency_tree where id=p_work_item_id
  ) then raise exception 'Dependensi membentuk siklus dan tidak dapat disimpan'; end if;

  insert into public.work_item_dependencies(work_item_id,depends_on_work_item_id,created_by)
  values(p_work_item_id,p_depends_on_work_item_id,auth.uid())
  on conflict do nothing
  returning * into result_row;
  if result_row.work_item_id is null then
    select * into result_row from public.work_item_dependencies
    where work_item_id=p_work_item_id and depends_on_work_item_id=p_depends_on_work_item_id;
    return result_row;
  end if;
  insert into public.work_item_dependency_history(work_item_id,depends_on_work_item_id,action,actor_id)
  values(p_work_item_id,p_depends_on_work_item_id,'added',auth.uid());
  return result_row;
end $$;

create or replace function public.remove_work_item_dependency(
  p_work_item_id uuid,
  p_depends_on_work_item_id uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare job_id_value uuid;
begin
  if not public.has_permission('work_item.dependency') then raise exception 'Tidak berwenang mengelola dependensi Work Item'; end if;
  select job_order_id into job_id_value from public.work_items
  where id=p_work_item_id and archived_at is null and status in ('draft','ready');
  if job_id_value is null then raise exception 'Work Item aktif tidak ditemukan'; end if;
  if exists(select 1 from public.job_orders where id=job_id_value and status not in ('draft','ready')) then
    raise exception 'Job Order induk sudah tidak dapat diubah';
  end if;
  delete from public.work_item_dependencies
  where work_item_id=p_work_item_id and depends_on_work_item_id=p_depends_on_work_item_id;
  if not found then raise exception 'Dependensi tidak ditemukan'; end if;
  insert into public.work_item_dependency_history(work_item_id,depends_on_work_item_id,action,actor_id)
  values(p_work_item_id,p_depends_on_work_item_id,'removed',auth.uid());
end $$;

