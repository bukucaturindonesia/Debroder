create table if not exists public.quotation_number_sequences (
  year integer primary key,
  last_value integer not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.next_quotation_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from timezone('Asia/Makassar', now()))::integer;
  next_value integer;
begin
  insert into public.quotation_number_sequences(year, last_value)
  values (current_year, 1)
  on conflict (year)
  do update set last_value = public.quotation_number_sequences.last_value + 1,
                updated_at = now()
  returning last_value into next_value;

  return format('QTN-DEB-%s-%s', current_year, lpad(next_value::text, 4, '0'));
end;
$$;

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null default public.next_quotation_number(),
  source_draft_id uuid null references public.quotation_drafts(id) on update cascade on delete set null,
  customer_id uuid null,
  customer_name text not null,
  company_name text null,
  customer_email text null,
  customer_phone text not null,
  billing_address text null,
  shipping_address text null,
  po_number text null,
  status text not null default 'draft',
  currency text not null default 'IDR',
  valid_until timestamptz null,
  public_notes text null,
  internal_notes text null,
  product_subtotal bigint not null default 0,
  service_subtotal bigint not null default 0,
  additional_cost bigint not null default 0,
  discount_total bigint not null default 0,
  confirmed_total bigint null,
  estimated_total bigint null,
  has_pending_pricing boolean not null default false,
  created_by uuid null,
  updated_by uuid null,
  submitted_at timestamptz null,
  sent_at timestamptz null,
  approved_at timestamptz null,
  rejected_at timestamptz null,
  expired_at timestamptz null,
  converted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_quotation_number_unique unique (quotation_number),
  constraint quotations_status_check check (status in (
    'draft','submitted','under_review','pricing','sent','revision_requested',
    'approved','rejected','expired','converted_to_order'
  )),
  constraint quotations_currency_check check (currency = 'IDR'),
  constraint quotations_money_nonnegative check (
    product_subtotal >= 0 and service_subtotal >= 0 and additional_cost >= 0 and discount_total >= 0
    and (confirmed_total is null or confirmed_total >= 0)
    and (estimated_total is null or estimated_total >= 0)
  ),
  constraint quotations_customer_name_not_blank check (btrim(customer_name) <> ''),
  constraint quotations_customer_phone_not_blank check (btrim(customer_phone) <> '')
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on update cascade on delete cascade,
  product_id uuid null references public.products(id) on update cascade on delete set null,
  product_variant_id uuid null references public.product_variants(id) on update cascade on delete set null,
  product_variant_size_id uuid null references public.product_variant_sizes(id) on update cascade on delete set null,
  product_name_snapshot text not null,
  product_slug_snapshot text null,
  variant_name_snapshot text null,
  color_name_snapshot text null,
  color_hex_snapshot text null,
  size_name_snapshot text null,
  sku_snapshot text null,
  quantity integer not null,
  base_price_snapshot bigint null,
  tier_price_snapshot bigint null,
  variant_adjustment_snapshot bigint not null default 0,
  size_adjustment_snapshot bigint not null default 0,
  unit_price bigint null,
  pricing_status text not null default 'pending',
  subtotal bigint null,
  customer_notes text null,
  production_notes text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_items_quantity_positive check (quantity > 0),
  constraint quotation_items_pricing_status_check check (pricing_status in ('confirmed','estimated','pending')),
  constraint quotation_items_money_nonnegative check (
    (base_price_snapshot is null or base_price_snapshot >= 0)
    and (tier_price_snapshot is null or tier_price_snapshot >= 0)
    and variant_adjustment_snapshot >= 0
    and size_adjustment_snapshot >= 0
    and (unit_price is null or unit_price >= 0)
    and (subtotal is null or subtotal >= 0)
  ),
  constraint quotation_items_confirmed_price_check check (
    pricing_status <> 'confirmed' or (unit_price is not null and subtotal = quantity::bigint * unit_price)
  ),
  constraint quotation_items_name_not_blank check (btrim(product_name_snapshot) <> '')
);

create table if not exists public.quotation_item_services (
  id uuid primary key default gen_random_uuid(),
  quotation_item_id uuid not null references public.quotation_items(id) on update cascade on delete cascade,
  custom_service_id uuid null references public.custom_services(id) on update cascade on delete set null,
  service_name_snapshot text not null,
  quantity integer not null,
  position text null,
  pricing_status text not null default 'pending',
  unit_price bigint null,
  flat_price bigint null,
  subtotal bigint null,
  notes text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_item_services_quantity_positive check (quantity > 0),
  constraint quotation_item_services_pricing_status_check check (pricing_status in ('confirmed','estimated','pending')),
  constraint quotation_item_services_money_nonnegative check (
    (unit_price is null or unit_price >= 0)
    and (flat_price is null or flat_price >= 0)
    and (subtotal is null or subtotal >= 0)
  ),
  constraint quotation_item_services_confirmed_price_check check (
    pricing_status <> 'confirmed' or subtotal is not null
  ),
  constraint quotation_item_services_name_not_blank check (btrim(service_name_snapshot) <> '')
);

create table if not exists public.quotation_status_history (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on update cascade on delete cascade,
  from_status text null,
  to_status text not null,
  note text null,
  changed_by uuid null,
  created_at timestamptz not null default now(),
  constraint quotation_status_history_status_check check (
    (from_status is null or from_status in (
      'draft','submitted','under_review','pricing','sent','revision_requested',
      'approved','rejected','expired','converted_to_order'
    ))
    and to_status in (
      'draft','submitted','under_review','pricing','sent','revision_requested',
      'approved','rejected','expired','converted_to_order'
    )
  )
);

create index if not exists quotations_status_idx on public.quotations(status);
create index if not exists quotations_customer_name_idx on public.quotations(customer_name);
create index if not exists quotations_company_name_idx on public.quotations(company_name);
create index if not exists quotations_created_at_idx on public.quotations(created_at desc);
create index if not exists quotations_valid_until_idx on public.quotations(valid_until);
create index if not exists quotation_items_quotation_id_idx on public.quotation_items(quotation_id, sort_order);
create index if not exists quotation_items_product_id_idx on public.quotation_items(product_id);
create index if not exists quotation_item_services_item_id_idx on public.quotation_item_services(quotation_item_id, sort_order);
create index if not exists quotation_status_history_quotation_id_idx on public.quotation_status_history(quotation_id, created_at desc);

create trigger quotations_set_updated_at
before update on public.quotations
for each row execute function public.set_updated_at();

create trigger quotation_items_set_updated_at
before update on public.quotation_items
for each row execute function public.set_updated_at();

create trigger quotation_item_services_set_updated_at
before update on public.quotation_item_services
for each row execute function public.set_updated_at();

create or replace function public.transition_quotation_status(
  p_quotation_id uuid,
  p_to_status text,
  p_note text default null
)
returns public.quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.quotations;
  actor uuid := auth.uid();
  allowed boolean := false;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to change quotation status';
  end if;

  select * into current_row
  from public.quotations
  where id = p_quotation_id
  for update;

  if not found then
    raise exception 'Quotation not found';
  end if;

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
    if not exists (select 1 from public.quotation_items qi where qi.quotation_id = current_row.id) then
      raise exception 'At least one quotation item is required before sending';
    end if;
  end if;

  if p_to_status = 'approved' then
    if current_row.has_pending_pricing then
      raise exception 'Quotation with pending pricing cannot be approved';
    end if;
    if exists (
      select 1 from public.quotation_items qi
      where qi.quotation_id = current_row.id and qi.pricing_status = 'pending'
    ) or exists (
      select 1
      from public.quotation_item_services qis
      join public.quotation_items qi on qi.id = qis.quotation_item_id
      where qi.quotation_id = current_row.id and qis.pricing_status = 'pending'
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
    p_quotation_id,
    (select status from public.quotations where id = p_quotation_id),
    p_to_status,
    p_note,
    actor
  );

  return current_row;
end;
$$;

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
  where quotation_id = p_quotation_id;

  select
    coalesce(sum(case when qis.pricing_status = 'confirmed' then qis.subtotal else 0 end),0),
    coalesce(sum(case when qis.pricing_status in ('confirmed','estimated') then qis.subtotal else 0 end),0),
    pending or coalesce(bool_or(qis.pricing_status = 'pending'), false)
  into service_confirmed, service_estimated, pending
  from public.quotation_item_services qis
  join public.quotation_items qi on qi.id = qis.quotation_item_id
  where qi.quotation_id = p_quotation_id;

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

alter table public.quotation_number_sequences enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.quotation_item_services enable row level security;
alter table public.quotation_status_history enable row level security;

drop policy if exists "Staff manage quotation sequences" on public.quotation_number_sequences;
create policy "Staff manage quotation sequences"
on public.quotation_number_sequences
for all
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "Staff manage quotations" on public.quotations;
create policy "Staff manage quotations"
on public.quotations
for all
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "Staff manage quotation items" on public.quotation_items;
create policy "Staff manage quotation items"
on public.quotation_items
for all
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "Staff manage quotation item services" on public.quotation_item_services;
create policy "Staff manage quotation item services"
on public.quotation_item_services
for all
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "Staff read quotation history" on public.quotation_status_history;
create policy "Staff read quotation history"
on public.quotation_status_history
for select
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

grant execute on function public.next_quotation_number() to authenticated;
grant execute on function public.transition_quotation_status(uuid,text,text) to authenticated;
grant execute on function public.refresh_quotation_totals(uuid) to authenticated;
;
