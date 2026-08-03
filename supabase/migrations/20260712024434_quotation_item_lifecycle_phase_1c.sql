alter table public.quotation_items
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists archive_reason text;

create index if not exists quotation_items_active_idx
  on public.quotation_items (quotation_id, sort_order, created_at)
  where archived_at is null;

create index if not exists quotation_items_archive_idx
  on public.quotation_items (quotation_id, archived_at desc)
  where archived_at is not null;

create or replace function public.refresh_quotation_totals(p_quotation_id uuid)
returns public.quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.quotations;
  item_confirmed bigint := 0;
  item_estimated bigint := 0;
  service_confirmed bigint := 0;
  service_estimated bigint := 0;
  pending boolean := false;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to refresh quotation totals';
  end if;

  select
    coalesce(sum(case when pricing_status = 'confirmed' then subtotal else 0 end),0),
    coalesce(sum(case when pricing_status in ('confirmed','estimated') then subtotal else 0 end),0),
    coalesce(bool_or(pricing_status = 'pending'), false)
  into item_confirmed, item_estimated, pending
  from public.quotation_items
  where quotation_id = p_quotation_id
    and archived_at is null;

  select
    coalesce(sum(case when qis.pricing_status = 'confirmed' then qis.subtotal else 0 end),0),
    coalesce(sum(case when qis.pricing_status in ('confirmed','estimated') then qis.subtotal else 0 end),0),
    pending or coalesce(bool_or(qis.pricing_status = 'pending'), false)
  into service_confirmed, service_estimated, pending
  from public.quotation_item_services qis
  join public.quotation_items qi on qi.id = qis.quotation_item_id
  where qi.quotation_id = p_quotation_id
    and qi.archived_at is null;

  update public.quotations
  set product_subtotal = item_confirmed,
      service_subtotal = service_confirmed,
      confirmed_total = greatest(item_confirmed + service_confirmed + additional_cost - discount_total, 0),
      estimated_total = greatest(item_estimated + service_estimated + additional_cost - discount_total, 0),
      has_pending_pricing = pending,
      updated_by = auth.uid()
  where id = p_quotation_id
  returning * into result_row;

  if not found then
    raise exception 'Quotation not found';
  end if;

  return result_row;
end;
$$;

create or replace function public.archive_quotation_item(
  p_item_id uuid,
  p_reason text default null
)
returns public.quotation_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.quotation_items;
  q_status text;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to archive quotation item';
  end if;

  select q.status into q_status
  from public.quotation_items qi
  join public.quotations q on q.id = qi.quotation_id
  where qi.id = p_item_id;

  if q_status is null then raise exception 'Quotation item not found'; end if;
  if q_status <> 'draft' then raise exception 'Only draft quotation items can be archived'; end if;

  update public.quotation_items
  set archived_at = now(),
      archived_by = auth.uid(),
      archive_reason = nullif(btrim(p_reason), ''),
      updated_at = now()
  where id = p_item_id and archived_at is null
  returning * into result_row;

  if not found then raise exception 'Quotation item is already archived'; end if;
  perform public.refresh_quotation_totals(result_row.quotation_id);
  return result_row;
end;
$$;

create or replace function public.restore_quotation_item(p_item_id uuid)
returns public.quotation_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.quotation_items;
  q_status text;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to restore quotation item';
  end if;

  select q.status into q_status
  from public.quotation_items qi
  join public.quotations q on q.id = qi.quotation_id
  where qi.id = p_item_id;

  if q_status is null then raise exception 'Quotation item not found'; end if;
  if q_status <> 'draft' then raise exception 'Only draft quotation items can be restored'; end if;

  update public.quotation_items
  set archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_at = now()
  where id = p_item_id and archived_at is not null
  returning * into result_row;

  if not found then raise exception 'Quotation item is not archived'; end if;
  perform public.refresh_quotation_totals(result_row.quotation_id);
  return result_row;
end;
$$;

create or replace function public.permanently_delete_quotation_item(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  q_id uuid;
  actor_role text;
begin
  select lower(role) into actor_role from public.profiles where id = auth.uid();
  if actor_role not in ('owner','superadmin','super_admin') then
    raise exception 'Only owner or super admin can permanently delete quotation items';
  end if;

  select quotation_id into q_id
  from public.quotation_items
  where id = p_item_id and archived_at is not null;

  if q_id is null then raise exception 'Only archived quotation items can be permanently deleted'; end if;

  delete from public.quotation_items where id = p_item_id and archived_at is not null;
  perform public.refresh_quotation_totals(q_id);
  return p_item_id;
end;
$$;

grant execute on function public.archive_quotation_item(uuid,text) to authenticated;
grant execute on function public.restore_quotation_item(uuid) to authenticated;
grant execute on function public.permanently_delete_quotation_item(uuid) to authenticated;;
