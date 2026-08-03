begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'custom_service_status') then
    create type public.custom_service_status as enum ('active','inactive','archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'service_pricing_type') then
    create type public.service_pricing_type as enum ('fixed_per_item','fixed_per_order','tiered','estimated','manual_quote');
  end if;
  if not exists (select 1 from pg_type where typname = 'quotation_status') then
    create type public.quotation_status as enum ('draft','submitted','reviewing','quoted','expired','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'upload_status') then
    create type public.upload_status as enum ('uploaded','linked','deleted');
  end if;
end $$;

create table if not exists public.product_price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update cascade,
  min_quantity integer not null check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  unit_price integer check (unit_price is null or unit_price >= 0),
  quote_required boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_minimum_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update cascade,
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  minimum_for_tier_quantity integer check (minimum_for_tier_quantity is null or minimum_for_tier_quantity > 0),
  quotation_quantity integer check (quotation_quantity is null or quotation_quantity > 0),
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id)
);

create table if not exists public.custom_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status public.custom_service_status not null default 'active',
  pricing_type public.service_pricing_type not null default 'fixed_per_item',
  base_price integer not null default 0 check (base_price >= 0),
  estimated_min_price integer check (estimated_min_price is null or estimated_min_price >= 0),
  estimated_max_price integer check (estimated_max_price is null or estimated_max_price >= 0),
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  maximum_quantity integer check (maximum_quantity is null or maximum_quantity > 0),
  requires_review boolean not null default false,
  requires_upload boolean not null default false,
  requires_notes boolean not null default false,
  allowed_file_types text[] not null default array['png','jpg','jpeg','pdf','svg','ai','eps','zip'],
  is_stackable boolean not null default true,
  exclusive_group text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.custom_services(id) on delete cascade on update cascade,
  min_quantity integer not null default 1 check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  unit_price integer check (unit_price is null or unit_price >= 0),
  flat_price integer check (flat_price is null or flat_price >= 0),
  quote_required boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  session_token text not null,
  bucket_id text not null default 'customer-designs',
  storage_path text not null unique,
  original_filename text not null,
  sanitized_filename text not null,
  mime_type text not null,
  extension text not null,
  size_bytes bigint not null check (size_bytes > 0),
  status public.upload_status not null default 'uploaded',
  linked_configuration_id uuid,
  linked_item_key text,
  linked_service_id uuid references public.custom_services(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_configurations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null on update cascade,
  owner_id uuid references auth.users(id) on delete set null,
  session_token text not null,
  share_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  share_expires_at timestamptz,
  is_shareable boolean not null default true,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','submitted','archived')),
  configuration_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.configuration_item_services (
  id uuid primary key default gen_random_uuid(),
  saved_configuration_id uuid references public.saved_configurations(id) on delete cascade,
  item_key text not null,
  service_id uuid not null references public.custom_services(id) on update cascade,
  quantity integer not null check (quantity > 0),
  option_values jsonb not null default '{}'::jsonb,
  fixed_price integer check (fixed_price is null or fixed_price >= 0),
  estimated_price integer check (estimated_price is null or estimated_price >= 0),
  status text not null default 'active' check (status in ('active','inactive','requires_review')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_drafts (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique default ('DBQ-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,10))),
  product_id uuid references public.products(id) on delete set null on update cascade,
  owner_id uuid references auth.users(id) on delete set null,
  session_token text not null,
  contact_name text,
  contact_whatsapp text,
  contact_email text,
  general_note text,
  status public.quotation_status not null default 'draft',
  total_quantity integer not null default 0 check(total_quantity >= 0),
  final_total integer not null default 0 check(final_total >= 0),
  estimated_total integer not null default 0 check(estimated_total >= 0),
  requires_review boolean not null default false,
  configuration_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_draft_items (
  id uuid primary key default gen_random_uuid(),
  quotation_draft_id uuid not null references public.quotation_drafts(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null on update cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null on update cascade,
  product_variant_size_id uuid references public.product_variant_sizes(id) on delete set null on update cascade,
  snapshot jsonb not null,
  quantity integer not null check(quantity > 0),
  unit_price integer,
  tier_snapshot jsonb,
  service_snapshot jsonb not null default '[]'::jsonb,
  file_snapshot jsonb not null default '[]'::jsonb,
  item_note text,
  final_total integer not null default 0 check(final_total >= 0),
  estimated_total integer not null default 0 check(estimated_total >= 0),
  requires_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_price_tiers_product_status_idx on public.product_price_tiers(product_id,status,min_quantity);
create index if not exists product_minimum_rules_product_status_idx on public.product_minimum_rules(product_id,status);
create index if not exists custom_services_status_sort_idx on public.custom_services(status,sort_order);
create index if not exists service_pricing_rules_service_status_idx on public.service_pricing_rules(service_id,status,min_quantity);
create index if not exists customer_uploads_owner_idx on public.customer_uploads(owner_id,session_token,status);
create index if not exists saved_configurations_share_idx on public.saved_configurations(share_token,is_shareable,share_expires_at);
create index if not exists quotation_drafts_session_status_idx on public.quotation_drafts(session_token,status,created_at desc);

insert into public.custom_services (
  name,slug,description,pricing_type,base_price,estimated_min_price,estimated_max_price,
  minimum_quantity,maximum_quantity,requires_review,requires_upload,requires_notes,
  allowed_file_types,is_stackable,exclusive_group,sort_order
)
values
('Sablon DTF','sablon-dtf','Cetak DTF untuk apparel custom.','estimated',18000,15000,35000,1,null,true,true,true,array['png','jpg','jpeg','pdf','svg','ai','eps','zip'],false,'print-method',10),
('Bordir komputer','bordir-komputer','Bordir logo dan identitas brand.','estimated',25000,20000,50000,1,null,true,true,true,array['png','jpg','jpeg','pdf','svg','ai','eps','zip'],false,'print-method',20),
('Cetak sublim','cetak-sublim','Cetak sublim untuk jersey dan apparel polyester.','estimated',25000,20000,60000,1,null,true,true,true,array['png','jpg','jpeg','pdf','zip'],false,'print-method',30),
('Tambah logo','tambah-logo','Tambahan logo pada posisi tertentu.','fixed_per_item',8000,null,null,1,null,false,true,true,array['png','jpg','jpeg','pdf','svg','ai','eps','zip'],true,null,40),
('Tambah nama','tambah-nama','Nama personal pada apparel.','fixed_per_item',10000,null,null,1,null,false,false,true,array['png','jpg','jpeg','pdf'],true,null,50),
('Tambah nomor','tambah-nomor','Nomor punggung atau nomor event.','fixed_per_item',10000,null,null,1,null,false,false,true,array['png','jpg','jpeg','pdf'],true,null,60),
('Packaging khusus','packaging-khusus','Packing per item atau kebutuhan event.','fixed_per_order',50000,null,null,1,null,false,false,false,array['png','jpg','jpeg','pdf'],true,null,70)
on conflict(slug) do update set
name=excluded.name,description=excluded.description,pricing_type=excluded.pricing_type,
base_price=excluded.base_price,estimated_min_price=excluded.estimated_min_price,
estimated_max_price=excluded.estimated_max_price,minimum_quantity=excluded.minimum_quantity,
maximum_quantity=excluded.maximum_quantity,requires_review=excluded.requires_review,
requires_upload=excluded.requires_upload,requires_notes=excluded.requires_notes,
allowed_file_types=excluded.allowed_file_types,is_stackable=excluded.is_stackable,
exclusive_group=excluded.exclusive_group,sort_order=excluded.sort_order,status='active';

insert into storage.buckets(id,name,public)
values ('customer-designs','customer-designs',false)
on conflict(id) do update set public=false;

alter table public.product_price_tiers enable row level security;
alter table public.product_minimum_rules enable row level security;
alter table public.custom_services enable row level security;
alter table public.service_pricing_rules enable row level security;
alter table public.customer_uploads enable row level security;
alter table public.saved_configurations enable row level security;
alter table public.configuration_item_services enable row level security;
alter table public.quotation_drafts enable row level security;
alter table public.quotation_draft_items enable row level security;

-- Policies are recreated idempotently and accept legacy/new admin role names.
drop policy if exists "Public can read active price tiers" on public.product_price_tiers;
create policy "Public can read active price tiers" on public.product_price_tiers for select to anon,authenticated using(status='active');
drop policy if exists "Public can read active minimum rules" on public.product_minimum_rules;
create policy "Public can read active minimum rules" on public.product_minimum_rules for select to anon,authenticated using(status='active');
drop policy if exists "Public can read active custom services" on public.custom_services;
create policy "Public can read active custom services" on public.custom_services for select to anon,authenticated using(status='active');
drop policy if exists "Public can read active service pricing rules" on public.service_pricing_rules;
create policy "Public can read active service pricing rules" on public.service_pricing_rules for select to anon,authenticated using(status='active');

insert into public.debroder_schema_versions(version_key,description)
values
('v1.1_bulk_custom_ordering','Bulk ordering, services, uploads, quotation'),
('consolidated_compatibility_v1','Production compatibility migration')
on conflict(version_key) do update set description=excluded.description,applied_at=now();

commit;
