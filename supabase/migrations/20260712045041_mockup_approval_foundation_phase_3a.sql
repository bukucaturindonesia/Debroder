create table if not exists public.mockup_sets (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  title text not null default 'Mockup Desain',
  status text not null default 'draft' check (status in ('draft','preparing','ready_for_review','awaiting_customer','revision_requested','approved')),
  notes text,
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mockup_sets_quotation_idx on public.mockup_sets(quotation_id);
create index if not exists mockup_sets_active_idx on public.mockup_sets(quotation_id, archived_at);

create table if not exists public.mockup_parts (
  id uuid primary key default gen_random_uuid(),
  mockup_set_id uuid not null references public.mockup_sets(id) on delete cascade,
  quotation_item_id uuid references public.quotation_items(id) on delete set null,
  name text not null,
  position text,
  is_required boolean not null default true,
  status text not null default 'draft' check (status in ('draft','preparing','ready_for_review','awaiting_customer','revision_requested','approved')),
  admin_notes text,
  customer_notes text,
  sort_order integer not null default 0,
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mockup_parts_set_idx on public.mockup_parts(mockup_set_id);
create index if not exists mockup_parts_active_idx on public.mockup_parts(mockup_set_id, archived_at);

create table if not exists public.mockup_files (
  id uuid primary key default gen_random_uuid(),
  mockup_part_id uuid not null references public.mockup_parts(id) on delete cascade,
  version_number integer not null,
  bucket_id text not null default 'customer-designs',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  notes text,
  is_current boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(mockup_part_id, version_number),
  unique(bucket_id, storage_path)
);

create index if not exists mockup_files_part_idx on public.mockup_files(mockup_part_id, version_number desc);
create unique index if not exists mockup_files_one_current_idx on public.mockup_files(mockup_part_id) where is_current;

create table if not exists public.mockup_approval_history (
  id uuid primary key default gen_random_uuid(),
  mockup_set_id uuid not null references public.mockup_sets(id) on delete cascade,
  mockup_part_id uuid references public.mockup_parts(id) on delete cascade,
  action text not null,
  from_status text,
  to_status text,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists mockup_approval_history_set_idx on public.mockup_approval_history(mockup_set_id, created_at desc);

create or replace function public.ensure_mockup_set_approved_quotation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q_status text;
  q_archived timestamptz;
begin
  select status, archived_at into q_status, q_archived
  from public.quotations
  where id = new.quotation_id;

  if q_status is null then
    raise exception 'Quotation not found';
  end if;
  if q_archived is not null then
    raise exception 'Archived quotation cannot receive mockup';
  end if;
  if q_status <> 'approved' then
    raise exception 'Quotation must be approved before creating mockup';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mockup_set_requires_approved_quotation on public.mockup_sets;
create trigger trg_mockup_set_requires_approved_quotation
before insert on public.mockup_sets
for each row execute function public.ensure_mockup_set_approved_quotation();

create or replace function public.archive_mockup_set(p_mockup_set_id uuid, p_reason text default null)
returns public.mockup_sets
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.mockup_sets;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to archive mockup';
  end if;
  update public.mockup_sets
  set archived_at = now(), archived_by = auth.uid(), archive_reason = nullif(btrim(coalesce(p_reason,'')), ''), updated_by = auth.uid()
  where id = p_mockup_set_id and archived_at is null
  returning * into result_row;
  if not found then raise exception 'Mockup not found or already archived'; end if;
  return result_row;
end;
$$;

create or replace function public.restore_mockup_set(p_mockup_set_id uuid)
returns public.mockup_sets
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.mockup_sets;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to restore mockup';
  end if;
  update public.mockup_sets
  set archived_at = null, archived_by = null, archive_reason = null, updated_by = auth.uid()
  where id = p_mockup_set_id and archived_at is not null
  returning * into result_row;
  if not found then raise exception 'Archived mockup not found'; end if;
  return result_row;
end;
$$;

create or replace function public.permanently_delete_mockup_set(p_mockup_set_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin']) then
    raise exception 'Only Super Admin can permanently delete mockup';
  end if;
  delete from public.mockup_sets where id = p_mockup_set_id and archived_at is not null;
  if not found then raise exception 'Mockup must be archived before permanent deletion'; end if;
end;
$$;

create or replace function public.archive_mockup_part(p_mockup_part_id uuid, p_reason text default null)
returns public.mockup_parts
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.mockup_parts;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to archive mockup part';
  end if;
  update public.mockup_parts
  set archived_at = now(), archived_by = auth.uid(), archive_reason = nullif(btrim(coalesce(p_reason,'')), ''), updated_by = auth.uid()
  where id = p_mockup_part_id and archived_at is null
  returning * into result_row;
  if not found then raise exception 'Mockup part not found or already archived'; end if;
  return result_row;
end;
$$;

create or replace function public.restore_mockup_part(p_mockup_part_id uuid)
returns public.mockup_parts
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.mockup_parts;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to restore mockup part';
  end if;
  update public.mockup_parts
  set archived_at = null, archived_by = null, archive_reason = null, updated_by = auth.uid()
  where id = p_mockup_part_id and archived_at is not null
  returning * into result_row;
  if not found then raise exception 'Archived mockup part not found'; end if;
  return result_row;
end;
$$;

create or replace function public.permanently_delete_mockup_part(p_mockup_part_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin']) then
    raise exception 'Only Super Admin can permanently delete mockup part';
  end if;
  delete from public.mockup_parts where id = p_mockup_part_id and archived_at is not null;
  if not found then raise exception 'Mockup part must be archived before permanent deletion'; end if;
end;
$$;

create or replace function public.register_mockup_file(
  p_mockup_part_id uuid,
  p_bucket_id text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_notes text default null
)
returns public.mockup_files
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  result_row public.mockup_files;
  set_id uuid;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to register mockup file';
  end if;
  select mockup_set_id into set_id from public.mockup_parts where id = p_mockup_part_id and archived_at is null;
  if set_id is null then raise exception 'Active mockup part not found'; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.mockup_files where mockup_part_id = p_mockup_part_id;
  update public.mockup_files set is_current = false where mockup_part_id = p_mockup_part_id and is_current;
  insert into public.mockup_files(mockup_part_id,version_number,bucket_id,storage_path,file_name,mime_type,size_bytes,notes,is_current,created_by)
  values(p_mockup_part_id,next_version,p_bucket_id,p_storage_path,p_file_name,p_mime_type,p_size_bytes,nullif(btrim(coalesce(p_notes,'')),''),true,auth.uid())
  returning * into result_row;
  update public.mockup_parts set status='preparing', updated_by=auth.uid() where id=p_mockup_part_id;
  update public.mockup_sets set status='preparing', updated_by=auth.uid() where id=set_id and status='draft';
  insert into public.mockup_approval_history(mockup_set_id,mockup_part_id,action,from_status,to_status,note,changed_by)
  values(set_id,p_mockup_part_id,'file_uploaded',null,'preparing',format('File versi %s diunggah',next_version),auth.uid());
  return result_row;
end;
$$;

create or replace function public.mark_mockup_ready_for_review(p_mockup_set_id uuid, p_note text default null)
returns public.mockup_sets
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.mockup_sets;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to update mockup status';
  end if;
  if exists (
    select 1 from public.mockup_parts mp
    where mp.mockup_set_id=p_mockup_set_id and mp.archived_at is null and mp.is_required
      and not exists(select 1 from public.mockup_files mf where mf.mockup_part_id=mp.id and mf.is_current)
  ) then
    raise exception 'All required mockup parts must have a current file';
  end if;
  update public.mockup_parts set status='ready_for_review', updated_by=auth.uid()
  where mockup_set_id=p_mockup_set_id and archived_at is null;
  update public.mockup_sets set status='ready_for_review', updated_by=auth.uid()
  where id=p_mockup_set_id and archived_at is null
  returning * into result_row;
  if not found then raise exception 'Active mockup not found'; end if;
  insert into public.mockup_approval_history(mockup_set_id,action,from_status,to_status,note,changed_by)
  values(p_mockup_set_id,'ready_for_review',null,'ready_for_review',nullif(btrim(coalesce(p_note,'')),''),auth.uid());
  return result_row;
end;
$$;

alter table public.mockup_sets enable row level security;
alter table public.mockup_parts enable row level security;
alter table public.mockup_files enable row level security;
alter table public.mockup_approval_history enable row level security;

drop policy if exists "Staff manage mockup sets" on public.mockup_sets;
create policy "Staff manage mockup sets" on public.mockup_sets for all to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "Staff manage mockup parts" on public.mockup_parts;
create policy "Staff manage mockup parts" on public.mockup_parts for all to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "Staff manage mockup files" on public.mockup_files;
create policy "Staff manage mockup files" on public.mockup_files for all to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "Staff read mockup approval history" on public.mockup_approval_history;
create policy "Staff read mockup approval history" on public.mockup_approval_history for select to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));;
