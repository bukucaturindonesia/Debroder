-- DEBRODER PIM Category Architecture
-- Jalankan di Supabase SQL Editor setelah deploy kode terbaru.
-- Tujuan: product_categories menjadi sumber utama kategori produk.

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  show_in_collection boolean not null default true,
  collection_limit integer not null default 8,
  collection_sort text not null default 'sort_order',
  collection_section_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.product_categories
  add column if not exists show_in_collection boolean not null default true,
  add column if not exists collection_limit integer not null default 8,
  add column if not exists collection_sort text not null default 'sort_order',
  add column if not exists collection_section_order integer not null default 0;

alter table if exists public.product_categories drop constraint if exists product_categories_collection_sort_check;
alter table if exists public.product_categories add constraint product_categories_collection_sort_check check (collection_sort in ('sort_order', 'newest', 'best_seller', 'promo'));

alter table public.product_categories enable row level security;

drop policy if exists "Public can read active product categories" on public.product_categories;
create policy "Public can read active product categories"
on public.product_categories for select
using (is_active = true);

drop policy if exists "Superadmin can manage product categories" on public.product_categories;
create policy "Superadmin can manage product categories"
on public.product_categories for all
using (public.is_superadmin())
with check (public.is_superadmin());

alter table if exists public.products
  add column if not exists product_category_id uuid references public.product_categories(id) on delete set null,
  add column if not exists intent_tags text[] not null default '{}',
  add column if not exists collection_tags text[] not null default '{}',
  add column if not exists subcategory text,
  add column if not exists link_url text,
  add column if not exists stock integer not null default 0,
  add column if not exists status_aktif boolean not null default true;

update public.products
set
  intent_tags = coalesce(intent_tags, '{}'),
  collection_tags = coalesce(collection_tags, '{}')
where intent_tags is null or collection_tags is null;

alter table if exists public.products
  alter column intent_tags set default '{}',
  alter column collection_tags set default '{}';

with duplicate_product_slugs as (
  select
    id,
    slug,
    row_number() over (partition by slug order by created_at nulls last, id) as duplicate_rank
  from public.products
  where slug is not null and slug <> ''
)
update public.products product
set slug = duplicate_product_slugs.slug || '-' || left(product.id::text, 8)
from duplicate_product_slugs
where product.id = duplicate_product_slugs.id
  and duplicate_product_slugs.duplicate_rank > 1;

create unique index if not exists products_slug_unique_idx
on public.products (slug)
where slug is not null and slug <> '';

insert into public.product_categories
  (name, slug, description, is_active, sort_order, show_in_collection, collection_limit, collection_sort, collection_section_order)
values
  ('Kaos Polos', 'kaos-polos', 'Kaos polos, cotton combed, New State Apparel, dan polo shirt untuk kebutuhan custom apparel.', true, 10, true, 8, 'sort_order', 10),
  ('Jaket & Hoodie', 'jaket-hoodie', 'Jaket, hoodie, dan crewneck custom untuk komunitas, organisasi, event, dan brand apparel.', true, 20, true, 8, 'sort_order', 20),
  ('Headwear', 'headwear', 'Topi dan headwear custom untuk merchandise, event, komunitas, dan brand.', true, 30, true, 8, 'sort_order', 30),
  ('Sablon DTF', 'sablon-dtf', 'Sablon DTF A4, A3, dan meteran untuk apparel custom.', true, 40, true, 8, 'sort_order', 40),
  ('Jersey', 'jersey', 'Jersey custom untuk tim olahraga, sekolah, komunitas, dan event.', true, 50, true, 8, 'sort_order', 50),
  ('Cetak Sublim', 'cetak-sublim', 'Cetak sublim untuk jersey dan apparel custom full print.', true, 60, true, 8, 'sort_order', 60),
  ('Maklon DTF', 'maklon-dtf', 'Maklon DTF untuk reseller, brand apparel, vendor, dan produksi partai besar.', true, 70, true, 8, 'sort_order', 70)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  sort_order = excluded.sort_order,
  show_in_collection = excluded.show_in_collection,
  collection_limit = excluded.collection_limit,
  collection_sort = excluded.collection_sort,
  collection_section_order = excluded.collection_section_order;

with product_text as (
  select
    product.*,
    lower(concat_ws(' ',
      product.nama,
      product.kategori,
      product.subcategory,
      product.slug,
      product.link_url,
      array_to_string(coalesce(product.intent_tags, '{}'), ' '),
      array_to_string(coalesce(product.collection_tags, '{}'), ' ')
    )) as search_text
  from public.products product
),
category_defaults as (
  select * from (values
    ('kaos-polos', 10, array['kaos-polos', 'sablon-dtf', 'komunitas', 'brand-apparel']::text[], array['kaos-polos', 'basic']::text[]),
    ('jaket-hoodie', 20, array['jaket-hoodie', 'sablon-dtf', 'bordir', 'komunitas', 'organisasi', 'brand-apparel']::text[], array['jaket-hoodie', 'premium']::text[]),
    ('headwear', 30, array['headwear', 'bordir', 'merchandise', 'event', 'komunitas']::text[], array['headwear', 'merchandise']::text[]),
    ('maklon-dtf', 35, array['maklon-dtf', 'reseller', 'brand-apparel', 'partai-besar']::text[], array['maklon-dtf', 'brand-apparel']::text[]),
    ('sablon-dtf', 40, array['sablon-dtf', 'kaos-polos', 'desain-custom', 'tanpa-minimum']::text[], array['sablon-dtf', 'tanpa-minimum']::text[]),
    ('jersey', 50, array['jersey', 'cetak-sublim', 'sublim', 'tim', 'nama-nomor']::text[], array['jersey', 'custom']::text[]),
    ('cetak-sublim', 60, array['cetak-sublim', 'sublim', 'jersey', 'tim', 'partai-besar']::text[], array['cetak-sublim', 'jersey']::text[])
  ) as defaults(slug, category_rank, intent_tags, collection_tags)
),
category_candidates as (
  select
    product.id as product_id,
    category.id as category_id,
    category.name,
    category.slug,
    defaults.category_rank,
    defaults.intent_tags,
    defaults.collection_tags,
    case
      when coalesce(product.link_url, '') = '/' || category.slug then 10
      when category.slug = any(coalesce(product.intent_tags, '{}')) then 20
      when lower(coalesce(product.kategori, '')) in (lower(category.name), category.slug) then 30
      when category.slug = 'kaos-polos'
        and (
          product.search_text like '%kaos%'
          or product.search_text like '%cotton%'
          or product.search_text like '%combed%'
          or product.search_text like '%polo%'
          or product.search_text like '%new-state%'
          or product.search_text like '%nsa%'
        )
        and product.search_text not like '%jaket%'
        and product.search_text not like '%jacket%'
        and product.search_text not like '%hoodie%'
        and product.search_text not like '%hooded%'
        and product.search_text not like '%crewneck%'
        and product.search_text not like '%headwear%'
        and product.search_text not like '%topi%'
        and product.search_text not like '%cap%'
        and product.search_text not like '%hat%'
        and product.search_text not like '%jersey%'
        and product.search_text not like '%sablon%'
        and product.search_text not like '%dtf%'
        and product.search_text not like '%maklon%'
        and product.search_text not like '%sublim%' then 40
      when category.slug = 'jaket-hoodie'
        and (
          product.search_text like '%jaket%'
          or product.search_text like '%jacket%'
          or product.search_text like '%hoodie%'
          or product.search_text like '%hooded%'
          or product.search_text like '%crewneck%'
          or product.search_text like '%sweater%'
          or product.search_text like '%windbreaker%'
          or product.search_text like '%bomber%'
        ) then 40
      when category.slug = 'headwear'
        and (
          product.search_text like '%headwear%'
          or product.search_text like '%topi%'
          or product.search_text like '%cap%'
          or product.search_text like '%hat%'
        ) then 40
      when category.slug = 'maklon-dtf'
        and (
          product.search_text like '%maklon%'
          or product.search_text like '%reseller%'
          or product.search_text like '%vendor%'
        ) then 40
      when category.slug = 'sablon-dtf'
        and (
          product.search_text like '%sablon%'
          or product.search_text like '%dtf%'
        )
        and product.search_text not like '%maklon%' then 40
      when category.slug = 'jersey'
        and product.search_text like '%jersey%'
        and product.search_text not like '%sublim%' then 40
      when category.slug = 'cetak-sublim'
        and (
          product.search_text like '%cetak-sublim%'
          or product.search_text like '%sublim%'
          or product.search_text like '%sublimasi%'
        ) then 40
      else 999
    end as priority
  from product_text product
  join public.product_categories category
    on category.slug in ('kaos-polos', 'jaket-hoodie', 'headwear', 'sablon-dtf', 'jersey', 'cetak-sublim', 'maklon-dtf')
  join category_defaults defaults on defaults.slug = category.slug
),
ranked_category_candidates as (
  select
    *,
    row_number() over (partition by product_id order by priority asc, category_rank asc, slug asc) as candidate_rank
  from category_candidates
  where priority < 999
)
update public.products product
set
  product_category_id = candidate.category_id,
  kategori = candidate.name,
  link_url = '/' || candidate.slug,
  intent_tags = candidate.intent_tags,
  collection_tags = candidate.collection_tags
from ranked_category_candidates candidate
where product.id = candidate.product_id
  and candidate.candidate_rank = 1;

alter table if exists public.products drop constraint if exists products_product_category_required;
alter table if exists public.products
  add constraint products_product_category_required check (product_category_id is not null) not valid;

notify pgrst, 'reload schema';

select
  category.name as kategori,
  category.slug,
  count(product.id) as jumlah_produk
from public.product_categories category
left join public.products product on product.product_category_id = category.id and product.status_aktif = true
group by category.name, category.slug, category.collection_section_order
order by category.collection_section_order;

select
  product.id,
  product.nama,
  product.kategori,
  product.slug
from public.products product
where product.product_category_id is null
order by product.nama
limit 50;
