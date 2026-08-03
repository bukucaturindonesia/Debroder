alter table public.quotations
  add column if not exists current_version integer not null default 1,
  add column if not exists latest_version_id uuid,
  add column if not exists sent_version_id uuid,
  add column if not exists approved_version_id uuid;

create table if not exists public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on update cascade on delete cascade,
  version_number integer not null check (version_number > 0),
  version_status text not null default 'draft' check (version_status in ('draft','sent','revision_requested','approved','rejected','expired','superseded')),
  snapshot jsonb not null,
  change_note text,
  created_by uuid references public.profiles(id) on update cascade on delete set null,
  sent_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quotation_id, version_number)
);

create index if not exists quotation_versions_quotation_idx
  on public.quotation_versions(quotation_id, version_number desc);
create index if not exists quotation_versions_status_idx
  on public.quotation_versions(version_status, created_at desc);

alter table public.quotations
  drop constraint if exists quotations_latest_version_id_fkey,
  add constraint quotations_latest_version_id_fkey foreign key (latest_version_id) references public.quotation_versions(id) on update cascade on delete set null;
alter table public.quotations
  drop constraint if exists quotations_sent_version_id_fkey,
  add constraint quotations_sent_version_id_fkey foreign key (sent_version_id) references public.quotation_versions(id) on update cascade on delete set null;
alter table public.quotations
  drop constraint if exists quotations_approved_version_id_fkey,
  add constraint quotations_approved_version_id_fkey foreign key (approved_version_id) references public.quotation_versions(id) on update cascade on delete set null;

alter table public.quotation_versions enable row level security;

drop policy if exists "Staff read quotation versions" on public.quotation_versions;
create policy "Staff read quotation versions"
  on public.quotation_versions for select
  to authenticated
  using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

create or replace function public.build_quotation_snapshot(p_quotation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path='public'
as $$
  select jsonb_build_object(
    'quotation', to_jsonb(q) - 'latest_version_id' - 'sent_version_id' - 'approved_version_id',
    'items', coalesce((
      select jsonb_agg(
        (to_jsonb(qi) - 'archived_by' - 'archive_reason') ||
        jsonb_build_object(
          'services', coalesce((
            select jsonb_agg(to_jsonb(qis) - 'archived_by' - 'archive_reason' order by qis.sort_order, qis.created_at)
            from public.quotation_item_services qis
            where qis.quotation_item_id = qi.id and qis.archived_at is null
          ), '[]'::jsonb)
        )
        order by qi.sort_order, qi.created_at
      )
      from public.quotation_items qi
      where qi.quotation_id = q.id and qi.archived_at is null
    ), '[]'::jsonb)
  )
  from public.quotations q
  where q.id = p_quotation_id and q.archived_at is null;
$$;

create or replace function public.ensure_current_quotation_version(
  p_quotation_id uuid,
  p_note text default null
)
returns public.quotation_versions
language plpgsql
security definer
set search_path='public'
as $$
declare
  q public.quotations;
  result_row public.quotation_versions;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to create quotation version';
  end if;

  select * into q from public.quotations
  where id = p_quotation_id and archived_at is null
  for update;

  if not found then raise exception 'Quotation not found or archived'; end if;

  select * into result_row
  from public.quotation_versions
  where quotation_id = q.id and version_number = q.current_version;

  if found then return result_row; end if;

  insert into public.quotation_versions(
    quotation_id, version_number, version_status, snapshot, change_note, created_by
  ) values (
    q.id,
    q.current_version,
    'draft',
    public.build_quotation_snapshot(q.id),
    nullif(btrim(coalesce(p_note,'')),''),
    auth.uid()
  ) returning * into result_row;

  update public.quotations
  set latest_version_id = result_row.id,
      updated_by = auth.uid()
  where id = q.id;

  return result_row;
end;
$$;

create or replace function public.create_quotation_revision(
  p_quotation_id uuid,
  p_note text
)
returns public.quotations
language plpgsql
security definer
set search_path='public'
as $$
declare
  q public.quotations;
  previous_status text;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to create quotation revision';
  end if;

  if nullif(btrim(coalesce(p_note,'')), '') is null then
    raise exception 'Revision note is required';
  end if;

  select * into q from public.quotations
  where id = p_quotation_id and archived_at is null
  for update;

  if not found then raise exception 'Quotation not found or archived'; end if;
  if q.status <> 'revision_requested' then
    raise exception 'New revision can only be created after revision_requested';
  end if;

  previous_status := q.status;

  update public.quotation_versions
  set version_status = 'superseded'
  where id = q.sent_version_id and version_status in ('sent','revision_requested');

  update public.quotations
  set current_version = current_version + 1,
      latest_version_id = null,
      sent_version_id = null,
      approved_version_id = null,
      status = 'draft',
      updated_by = auth.uid(),
      updated_at = now()
  where id = q.id
  returning * into q;

  insert into public.quotation_status_history(
    quotation_id, from_status, to_status, note, changed_by
  ) values (
    q.id, previous_status, 'draft', 'Versi revisi baru: ' || btrim(p_note), auth.uid()
  );

  return q;
end;
$$;

create or replace function public.transition_quotation_status(p_quotation_id uuid, p_to_status text, p_note text default null)
returns public.quotations
language plpgsql
security definer
set search_path='public'
as $$
declare
  current_row public.quotations;
  previous_status text;
  actor uuid := auth.uid();
  allowed boolean := false;
  version_row public.quotation_versions;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to change quotation status';
  end if;

  select * into current_row
  from public.quotations
  where id = p_quotation_id and archived_at is null
  for update;

  if not found then raise exception 'Quotation not found or archived'; end if;

  previous_status := current_row.status;

  if p_to_status = 'converted_to_order' then
    raise exception 'converted_to_order is disabled until Phase 4';
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

    version_row := public.ensure_current_quotation_version(current_row.id, p_note);
    update public.quotation_versions
    set version_status = 'sent', sent_at = coalesce(sent_at, now())
    where id = version_row.id;

    update public.quotations
    set latest_version_id = version_row.id,
        sent_version_id = version_row.id
    where id = current_row.id;
  end if;

  if p_to_status = 'approved' then
    if current_row.has_pending_pricing then
      raise exception 'Quotation with pending pricing cannot be approved';
    end if;
    if current_row.sent_version_id is null then
      raise exception 'Quotation must have a sent version before approval';
    end if;
    select * into version_row from public.quotation_versions where id = current_row.sent_version_id;
    if not found or version_row.version_number <> current_row.current_version then
      raise exception 'Only the latest quotation version can be approved';
    end if;
    if exists (
      select 1 from public.quotation_items qi
      where qi.quotation_id = current_row.id and qi.archived_at is null and qi.pricing_status = 'pending'
    ) or exists (
      select 1 from public.quotation_item_services qis
      join public.quotation_items qi on qi.id = qis.quotation_item_id
      where qi.quotation_id = current_row.id and qi.archived_at is null and qis.archived_at is null and qis.pricing_status = 'pending'
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
      expired_at = case when p_to_status = 'expired' and expired_at is null then now() else expired_at end,
      approved_version_id = case when p_to_status = 'approved' then sent_version_id else approved_version_id end
  where id = p_quotation_id
  returning * into current_row;

  if p_to_status = 'approved' then
    update public.quotation_versions set version_status='approved', approved_at=coalesce(approved_at,now())
    where id=current_row.approved_version_id;
  elsif p_to_status = 'revision_requested' then
    update public.quotation_versions set version_status='revision_requested'
    where id=current_row.sent_version_id;
  elsif p_to_status = 'rejected' then
    update public.quotation_versions set version_status='rejected'
    where id=current_row.sent_version_id;
  elsif p_to_status = 'expired' then
    update public.quotation_versions set version_status='expired'
    where id=current_row.sent_version_id;
  end if;

  insert into public.quotation_status_history(
    quotation_id, from_status, to_status, note, changed_by
  ) values (
    p_quotation_id, previous_status, p_to_status, nullif(btrim(coalesce(p_note,'')), ''), actor
  );

  return current_row;
end;
$$;

grant execute on function public.build_quotation_snapshot(uuid) to authenticated;
grant execute on function public.ensure_current_quotation_version(uuid,text) to authenticated;
grant execute on function public.create_quotation_revision(uuid,text) to authenticated;

-- Backfill a version snapshot for existing quotations that already reached sent or later.
do $$
declare r record; v public.quotation_versions;
begin
  for r in select id from public.quotations where archived_at is null and status in ('sent','approved','revision_requested','rejected','expired') loop
    begin
      v := public.ensure_current_quotation_version(r.id, 'Backfill Phase 2');
      update public.quotation_versions
      set version_status = case (select status from public.quotations where id=r.id)
        when 'approved' then 'approved'
        when 'revision_requested' then 'revision_requested'
        when 'rejected' then 'rejected'
        when 'expired' then 'expired'
        else 'sent' end,
        sent_at = coalesce(sent_at, now()),
        approved_at = case when (select status from public.quotations where id=r.id)='approved' then coalesce(approved_at,now()) else approved_at end
      where id=v.id;
      update public.quotations
      set latest_version_id=v.id,
          sent_version_id=v.id,
          approved_version_id=case when status='approved' then v.id else approved_version_id end
      where id=r.id;
    exception when others then
      null;
    end;
  end loop;
end $$;;
