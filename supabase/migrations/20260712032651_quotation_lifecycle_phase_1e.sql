alter table public.quotations
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists archive_reason text;

create index if not exists quotations_active_created_idx
  on public.quotations (created_at desc)
  where archived_at is null;

create index if not exists quotations_archived_created_idx
  on public.quotations (archived_at desc)
  where archived_at is not null;

create or replace function public.archive_quotation(
  p_quotation_id uuid,
  p_reason text default null
)
returns public.quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.quotations;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to archive quotation';
  end if;

  update public.quotations
  set archived_at = now(),
      archived_by = auth.uid(),
      archive_reason = nullif(btrim(coalesce(p_reason,'')), ''),
      updated_by = auth.uid()
  where id = p_quotation_id
    and archived_at is null
  returning * into result_row;

  if not found then
    raise exception 'Quotation not found or already archived';
  end if;

  return result_row;
end;
$$;

create or replace function public.restore_quotation(p_quotation_id uuid)
returns public.quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.quotations;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to restore quotation';
  end if;

  update public.quotations
  set archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_by = auth.uid()
  where id = p_quotation_id
    and archived_at is not null
  returning * into result_row;

  if not found then
    raise exception 'Archived quotation not found';
  end if;

  return result_row;
end;
$$;

create or replace function public.permanently_delete_quotation(p_quotation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin']) then
    raise exception 'Only Super Admin can permanently delete quotation';
  end if;

  delete from public.quotations
  where id = p_quotation_id
    and archived_at is not null;

  if not found then
    raise exception 'Quotation must be archived before permanent deletion';
  end if;
end;
$$;

create or replace function public.transition_quotation_status(p_quotation_id uuid, p_to_status text, p_note text default null)
returns public.quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.quotations;
  previous_status text;
  actor uuid := auth.uid();
  allowed boolean := false;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to change quotation status';
  end if;

  select * into current_row
  from public.quotations
  where id = p_quotation_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Quotation not found or archived';
  end if;

  previous_status := current_row.status;

  if p_to_status = 'converted_to_order' then
    raise exception 'converted_to_order is disabled in Phase 1';
  end if;

  allowed := case current_row.status
    when 'draft' then p_to_status in ('submitted')
    when 'submitted' then p_to_status in ('under_review','draft')
    when 'under_review' then p_to_status in ('pricing','submitted')
    when 'pricing' then p_to_status in ('sent','under_review')
    when 'sent' then p_to_status in ('approved','revision_requested','rejected','expired')
    else false
  end;

  if not allowed then
    raise exception 'Invalid quotation transition: % -> %', current_row.status, p_to_status;
  end if;

  if p_to_status in ('rejected','revision_requested') and nullif(btrim(coalesce(p_note,'')), '') is null then
    raise exception 'A note is required for this transition';
  end if;

  if p_to_status = 'sent' then
    if nullif(btrim(current_row.customer_name), '') is null or nullif(btrim(current_row.customer_phone), '') is null then
      raise exception 'Customer contact is required before sending';
    end if;
    if not exists (
      select 1 from public.quotation_items qi
      where qi.quotation_id = current_row.id and qi.archived_at is null
    ) then
      raise exception 'At least one active quotation item is required before sending';
    end if;
  end if;

  if p_to_status = 'approved' then
    if current_row.has_pending_pricing then
      raise exception 'Quotation with pending pricing cannot be approved';
    end if;
    if exists (
      select 1 from public.quotation_items qi
      where qi.quotation_id = current_row.id
        and qi.archived_at is null
        and qi.pricing_status = 'pending'
    ) or exists (
      select 1
      from public.quotation_item_services qis
      join public.quotation_items qi on qi.id = qis.quotation_item_id
      where qi.quotation_id = current_row.id
        and qi.archived_at is null
        and qis.archived_at is null
        and qis.pricing_status = 'pending'
    ) then
      raise exception 'Quotation with pending item pricing cannot be approved';
    end if;
  end if;

  if p_to_status = 'expired' and current_row.valid_until is not null and current_row.valid_until > now() then
    if nullif(btrim(coalesce(p_note,'')), '') is null then
      raise exception 'Early expiration requires an explicit note';
    end if;
  end if;

  update public.quotations
  set status = p_to_status,
      updated_by = actor,
      submitted_at = case when p_to_status = 'submitted' and submitted_at is null then now() else submitted_at end,
      sent_at = case when p_to_status = 'sent' and sent_at is null then now() else sent_at end,
      approved_at = case when p_to_status = 'approved' and approved_at is null then now() else approved_at end,
      rejected_at = case when p_to_status = 'rejected' and rejected_at is null then now() else rejected_at end,
      expired_at = case when p_to_status = 'expired' and expired_at is null then now() else expired_at end
  where id = p_quotation_id
  returning * into current_row;

  insert into public.quotation_status_history(
    quotation_id, from_status, to_status, note, changed_by
  ) values (
    p_quotation_id, previous_status, p_to_status, nullif(btrim(coalesce(p_note,'')), ''), actor
  );

  return current_row;
end;
$$;

grant execute on function public.archive_quotation(uuid,text) to authenticated;
grant execute on function public.restore_quotation(uuid) to authenticated;
grant execute on function public.permanently_delete_quotation(uuid) to authenticated;
grant execute on function public.transition_quotation_status(uuid,text,text) to authenticated;;
