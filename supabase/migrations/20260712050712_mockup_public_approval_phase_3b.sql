create extension if not exists pgcrypto;

create table if not exists public.mockup_review_links (
  id uuid primary key default gen_random_uuid(),
  mockup_set_id uuid not null references public.mockup_sets(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  last_opened_at timestamptz,
  unique (mockup_set_id, token_hash)
);

create index if not exists mockup_review_links_set_idx on public.mockup_review_links(mockup_set_id);
create index if not exists mockup_review_links_active_idx on public.mockup_review_links(mockup_set_id, expires_at) where revoked_at is null;

alter table public.mockup_review_links enable row level security;

create policy "Staff manage mockup review links"
on public.mockup_review_links
for all
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

create or replace function public.create_mockup_review_link(
  p_mockup_set_id uuid,
  p_expires_in_days integer default 7
)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token text;
  expiry timestamptz;
  current_status text;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to create mockup review link';
  end if;

  if p_expires_in_days < 1 or p_expires_in_days > 30 then
    raise exception 'Review link expiry must be between 1 and 30 days';
  end if;

  select status into current_status
  from public.mockup_sets
  where id = p_mockup_set_id and archived_at is null
  for update;

  if current_status is null then
    raise exception 'Active mockup not found';
  end if;

  if current_status <> 'ready_for_review' then
    raise exception 'Mockup must be ready for review before sending';
  end if;

  raw_token := encode(gen_random_bytes(32), 'hex');
  expiry := now() + make_interval(days => p_expires_in_days);

  update public.mockup_review_links
  set revoked_at = now()
  where mockup_set_id = p_mockup_set_id and revoked_at is null;

  insert into public.mockup_review_links(mockup_set_id, token_hash, expires_at, created_by)
  values(p_mockup_set_id, encode(digest(raw_token, 'sha256'),'hex'), expiry, auth.uid());

  update public.mockup_sets
  set status = 'awaiting_customer', updated_by = auth.uid()
  where id = p_mockup_set_id;

  update public.mockup_parts
  set status = 'awaiting_customer', updated_by = auth.uid()
  where mockup_set_id = p_mockup_set_id and archived_at is null;

  insert into public.mockup_approval_history(mockup_set_id, action, from_status, to_status, note, changed_by)
  values(p_mockup_set_id, 'review_link_created', current_status, 'awaiting_customer', format('Tautan publik berlaku sampai %s', expiry), auth.uid());

  return query select raw_token, expiry;
end;
$$;

create or replace function public.revoke_mockup_review_link(p_mockup_set_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to revoke mockup review link';
  end if;

  update public.mockup_review_links
  set revoked_at = now()
  where mockup_set_id = p_mockup_set_id and revoked_at is null;

  insert into public.mockup_approval_history(mockup_set_id, action, note, changed_by)
  values(p_mockup_set_id, 'review_link_revoked', 'Tautan persetujuan pelanggan dinonaktifkan', auth.uid());
end;
$$;

create or replace function public.get_public_mockup_review(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.mockup_review_links;
  set_row public.mockup_sets;
  quotation_row public.quotations;
  result jsonb;
begin
  select * into link_row
  from public.mockup_review_links
  where token_hash = encode(digest(coalesce(p_token,''), 'sha256'),'hex')
    and revoked_at is null
    and expires_at > now();

  if not found then
    raise exception 'Review link is invalid or expired';
  end if;

  update public.mockup_review_links
  set last_opened_at = now()
  where id = link_row.id;

  select * into set_row from public.mockup_sets
  where id = link_row.mockup_set_id and archived_at is null;

  if not found then raise exception 'Mockup not found'; end if;

  select * into quotation_row from public.quotations
  where id = set_row.quotation_id;

  select jsonb_build_object(
    'mockup_set', jsonb_build_object(
      'id', set_row.id,
      'title', set_row.title,
      'status', set_row.status,
      'notes', set_row.notes,
      'expires_at', link_row.expires_at
    ),
    'quotation', jsonb_build_object(
      'quotation_number', quotation_row.quotation_number,
      'customer_name', quotation_row.customer_name,
      'company_name', quotation_row.company_name
    ),
    'parts', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', mp.id,
        'name', mp.name,
        'position', mp.position,
        'is_required', mp.is_required,
        'status', mp.status,
        'customer_notes', mp.customer_notes,
        'file', case when mf.id is null then null else jsonb_build_object(
          'id', mf.id,
          'file_name', mf.file_name,
          'mime_type', mf.mime_type,
          'version_number', mf.version_number
        ) end
      ) order by mp.sort_order, mp.created_at
    ) filter (where mp.id is not null), '[]'::jsonb)
  ) into result
  from public.mockup_parts mp
  left join public.mockup_files mf on mf.mockup_part_id = mp.id and mf.is_current
  where mp.mockup_set_id = set_row.id and mp.archived_at is null;

  return result;
end;
$$;

create or replace function public.submit_mockup_part_decision(
  p_token text,
  p_mockup_part_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.mockup_review_links;
  part_row public.mockup_parts;
  set_status text;
  all_required_approved boolean;
begin
  if p_decision not in ('approved','revision_requested') then
    raise exception 'Invalid mockup decision';
  end if;

  if p_decision = 'revision_requested' and nullif(btrim(coalesce(p_note,'')), '') is null then
    raise exception 'Revision note is required';
  end if;

  select * into link_row
  from public.mockup_review_links
  where token_hash = encode(digest(coalesce(p_token,''), 'sha256'),'hex')
    and revoked_at is null
    and expires_at > now();

  if not found then raise exception 'Review link is invalid or expired'; end if;

  select mp.* into part_row
  from public.mockup_parts mp
  where mp.id = p_mockup_part_id
    and mp.mockup_set_id = link_row.mockup_set_id
    and mp.archived_at is null
  for update;

  if not found then raise exception 'Mockup part not found'; end if;

  if part_row.status not in ('awaiting_customer','revision_requested') then
    raise exception 'Mockup part is not awaiting customer decision';
  end if;

  update public.mockup_parts
  set status = p_decision,
      customer_notes = nullif(btrim(coalesce(p_note,'')), ''),
      updated_at = now()
  where id = part_row.id;

  insert into public.mockup_approval_history(mockup_set_id,mockup_part_id,action,from_status,to_status,note,changed_by)
  values(link_row.mockup_set_id,part_row.id,'customer_decision',part_row.status,p_decision,nullif(btrim(coalesce(p_note,'')),''),null);

  select not exists(
    select 1 from public.mockup_parts
    where mockup_set_id = link_row.mockup_set_id
      and archived_at is null
      and is_required
      and status <> 'approved'
  ) into all_required_approved;

  if p_decision = 'revision_requested' then
    set_status := 'revision_requested';
  elsif all_required_approved then
    set_status := 'approved';
  else
    set_status := 'awaiting_customer';
  end if;

  update public.mockup_sets
  set status = set_status, updated_at = now()
  where id = link_row.mockup_set_id;

  if set_status = 'approved' then
    update public.mockup_review_links
    set revoked_at = now()
    where id = link_row.id;

    insert into public.mockup_approval_history(mockup_set_id,action,from_status,to_status,note,changed_by)
    values(link_row.mockup_set_id,'all_required_parts_approved','awaiting_customer','approved','Semua bagian wajib disetujui pelanggan',null);
  end if;

  return jsonb_build_object(
    'part_id', part_row.id,
    'part_status', p_decision,
    'mockup_status', set_status,
    'all_required_approved', all_required_approved
  );
end;
$$;

create or replace function public.prepare_mockup_part_revision(
  p_mockup_part_id uuid,
  p_note text default null
)
returns public.mockup_parts
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.mockup_parts;
  old_status text;
  set_id uuid;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to prepare mockup revision';
  end if;

  select status, mockup_set_id into old_status, set_id
  from public.mockup_parts
  where id = p_mockup_part_id and archived_at is null
  for update;

  if old_status <> 'revision_requested' then
    raise exception 'Mockup part is not awaiting revision';
  end if;

  update public.mockup_parts
  set status = 'preparing', admin_notes = coalesce(nullif(btrim(coalesce(p_note,'')),''), admin_notes), updated_by = auth.uid()
  where id = p_mockup_part_id
  returning * into result_row;

  update public.mockup_sets
  set status = 'preparing', updated_by = auth.uid()
  where id = set_id;

  update public.mockup_review_links
  set revoked_at = now()
  where mockup_set_id = set_id and revoked_at is null;

  insert into public.mockup_approval_history(mockup_set_id,mockup_part_id,action,from_status,to_status,note,changed_by)
  values(set_id,p_mockup_part_id,'revision_started',old_status,'preparing',nullif(btrim(coalesce(p_note,'')),''),auth.uid());

  return result_row;
end;
$$;

grant execute on function public.get_public_mockup_review(text) to anon, authenticated;
grant execute on function public.submit_mockup_part_decision(text,uuid,text,text) to anon, authenticated;
grant execute on function public.create_mockup_review_link(uuid,integer) to authenticated;
grant execute on function public.revoke_mockup_review_link(uuid) to authenticated;
grant execute on function public.prepare_mockup_part_revision(uuid,text) to authenticated;;
