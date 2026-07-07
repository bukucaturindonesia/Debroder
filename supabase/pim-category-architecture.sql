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

with category_map as (
  select id, name, slug from public.product_categories
)
update public.products product
set
  product_category_id = category.id,
  kategori = category.name,
  link_url = '/' || category.slug,
  intent_tags = case category.slug
    when 'kaos-polos' then array['kaos-polos', 'sablon-dtf', 'komunitas', 'brand-apparel']
    when 'jaket-hoodie' then array['jaket-hoodie', 'sablon-dtf', 'bordir', 'komunitas', 'organisasi', 'brand-apparel']
    when 'headwear' then array['headwear', 'bordir', 'merchandise', 'event', 'komunitas']
    when 'sablon-dtf' then array['sablon-dtf', 'kaos-polos', 'desain-custom', 'tanpa-minimum']
    when 'jersey' then array['jersey', 'cetak-sublim', 'sublim', 'tim', 'nama-nomor']
    when 'cetak-sublim' then array['cetak-sublim', 'sublim', 'jersey', 'tim', 'partai-besar']
    when 'maklon-dtf' then array['maklon-dtf', 'reseller', 'brand-apparel', 'partai-besar']
    else product.intent_tags
  end,
  collection_tags = case category.slug
    when 'kaos-polos' then array['kaos-polos', 'basic']
    when 'jaket-hoodie' then array['jaket-hoodie', 'premium']
    when 'headwear' then array['headwear', 'merchandise']
    when 'sablon-dtf' then array['sablon-dtf', 'tanpa-minimum']
    when 'jersey' then array['jersey', 'custom']
    when 'cetak-sublim' then array['cetak-sublim', 'jersey']
    when 'maklon-dtf' then array['maklon-dtf', 'brand-apparel']
    else product.collection_tags
  end
from category_map category
where (
  (category.slug = 'kaos-polos' and (
    product.kategori ilike '%kaos%'
    or product.nama ilike '%kaos%'
    or product.nama ilike '%cotton%'
    or product.nama ilike '%polo%'
    or product.slug ilike '%kaos%'
    or product.link_url = '/kaos-polos'
    or 'kaos-polos' = any(product.intent_tags)
  ) and not (
    product.nama ilike '%jaket%' or product.nama ilike '%hoodie%' or product.nama ilike '%crewneck%' or product.nama ilike '%jersey%' or product.nama ilike '%dtf%' or product.nama ilike '%sublim%'
  ))
  or (category.slug = 'jaket-hoodie' and (
    product.kategori ilike '%jaket%'
    or product.kategori ilike '%hoodie%'
    or product.nama ilike '%jaket%'
    or product.nama ilike '%jacket%'
    or product.nama ilike '%hoodie%'
    or product.nama ilike '%hooded%'
    or product.nama ilike '%crewneck%'
    or product.slug ilike '%jaket%'
    or product.slug ilike '%jacket%'
    or product.slug ilike '%hoodie%'
    or product.slug ilike '%crewneck%'
    or product.link_url = '/jaket-hoodie'
    or 'jaket-hoodie' = any(product.intent_tags)
  ))
  or (category.slug = 'headwear' and (
    product.kategori ilike '%headwear%'
    or product.kategori ilike '%topi%'
    or product.nama ilike '%headwear%'
    or product.nama ilike '%topi%'
    or product.nama ilike '%cap%'
    or product.slug ilike '%headwear%'
    or product.slug ilike '%topi%'
    or product.link_url = '/headwear'
    or 'headwear' = any(product.intent_tags)
  ))
  or (category.slug = 'sablon-dtf' and (
    product.kategori ilike '%sablon%'
    or product.nama ilike '%sablon%'
    or product.nama ilike '%dtf%'
    or product.slug ilike '%sablon%'
    or product.slug ilike '%dtf%'
    or product.link_url = '/sablon-dtf'
    or 'sablon-dtf' = any(product.intent_tags)
  ) and not (
    product.nama ilike '%maklon%' or product.kategori ilike '%maklon%'
  ))
  or (category.slug = 'jersey' and (
    product.kategori ilike '%jersey%'
    or product.nama ilike '%jersey%'
    or product.slug ilike '%jersey%'
    or product.link_url = '/jersey'
    or 'jersey' = any(product.intent_tags)
  ) and not (
    product.kategori ilike '%sublim%' or product.nama ilike '%sublim%'
  ))
  or (category.slug = 'cetak-sublim' and (
    product.kategori ilike '%sublim%'
    or product.nama ilike '%sublim%'
    or product.slug ilike '%sublim%'
    or product.link_url = '/cetak-sublim'
    or 'cetak-sublim' = any(product.intent_tags)
  ))
  or (category.slug = 'maklon-dtf' and (
    product.kategori ilike '%maklon%'
    or product.nama ilike '%maklon%'
    or product.slug ilike '%maklon%'
    or product.link_url = '/maklon-dtf'
    or 'maklon-dtf' = any(product.intent_tags)
  ))
);

notify pgrst, 'reload schema';

select
  category.name as kategori,
  category.slug,
  count(product.id) as jumlah_produk
from public.product_categories category
left join public.products product on product.product_category_id = category.id and product.status_aktif = true
group by category.name, category.slug, category.collection_section_order
order by category.collection_section_order;
