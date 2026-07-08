-- DEBRODER PIM Manager Final Setup
-- Jalankan di Supabase SQL Editor jika ingin mengunci struktur PIM dari database.
-- Alternatif: buka /admin/pim-manager lalu klik "Terapkan Struktur PIM".

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

alter table if exists public.products
  add column if not exists product_category_id uuid references public.product_categories(id) on delete set null,
  add column if not exists intent_tags text[] not null default '{}',
  add column if not exists collection_tags text[] not null default '{}',
  add column if not exists subcategory text,
  add column if not exists link_url text,
  add column if not exists stock integer not null default 0,
  add column if not exists status_aktif boolean not null default true;

alter table if exists public.product_categories
  add column if not exists show_in_collection boolean not null default true,
  add column if not exists collection_limit integer not null default 8,
  add column if not exists collection_sort text not null default 'sort_order',
  add column if not exists collection_section_order integer not null default 0;

alter table if exists public.product_categories drop constraint if exists product_categories_collection_sort_check;
alter table if exists public.product_categories add constraint product_categories_collection_sort_check check (collection_sort in ('sort_order', 'newest', 'best_seller', 'promo'));

insert into public.product_categories
  (name, slug, description, is_active, sort_order, show_in_collection, collection_limit, collection_sort, collection_section_order)
values
  ('Kaos Polos', 'kaos-polos', 'Kaos polos, kaos NSA, cotton combed, oversize, anak, dan lengan panjang.', true, 10, true, 8, 'sort_order', 10),
  ('Jersey', 'jersey', 'Jersey custom untuk futsal, sepak bola, basket, voli, badminton, esports, dan komunitas.', true, 20, true, 8, 'sort_order', 20),
  ('Jaket & Hoodie', 'jaket-hoodie', 'Hoodie, crewneck, jaket bomber, varsity, coach, dan outerwear custom.', true, 30, true, 8, 'sort_order', 30),
  ('Polo Shirt', 'polo-shirt', 'Polo shirt untuk kantor, komunitas, event, dan apparel custom.', true, 40, true, 8, 'sort_order', 40),
  ('Headwear / Topi', 'headwear', 'Topi trucker, baseball cap, snapback, bucket hat, dan headwear custom.', true, 50, true, 8, 'sort_order', 50),
  ('Kemeja', 'kemeja', 'Kemeja PDH, PDL, kantor, komunitas, dan seragam custom.', true, 60, true, 8, 'sort_order', 60),
  ('Tas & Aksesori', 'tas-aksesori', 'Tote bag, goodie bag, patch, emblem, lanyard, dan aksesori promosi.', true, 70, true, 8, 'sort_order', 70)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  sort_order = excluded.sort_order,
  show_in_collection = true,
  collection_limit = excluded.collection_limit,
  collection_sort = excluded.collection_sort,
  collection_section_order = excluded.collection_section_order;

update public.product_categories
set is_active = false, show_in_collection = false
where slug not in ('kaos-polos', 'jersey', 'jaket-hoodie', 'polo-shirt', 'headwear', 'kemeja', 'tas-aksesori');

with model_values(nama_kategori, slug, category_key, link_slug, deskripsi, urutan) as (
  values
    ('Kaos Cotton Combed', 'kaos-cotton-combed', 'kaos-polos', 'kaos-polos', 'Kaos cotton combed untuk sablon dan kebutuhan apparel.', 10),
    ('Kaos Oversize', 'kaos-oversize', 'kaos-polos', 'kaos-polos', 'Kaos oversize untuk brand clothing dan koleksi kasual.', 20),
    ('Kaos Lengan Panjang', 'kaos-lengan-panjang', 'kaos-polos', 'kaos-polos', 'Kaos lengan panjang untuk komunitas, event, dan custom apparel.', 30),
    ('Kaos Anak', 'kaos-anak', 'kaos-polos', 'kaos-polos', 'Kaos polos anak untuk custom desain dan kebutuhan keluarga.', 40),
    ('Jersey Futsal', 'jersey-futsal', 'jersey', 'jersey', 'Jersey futsal custom untuk tim dan komunitas.', 50),
    ('Jersey Sepak Bola', 'jersey-sepak-bola', 'jersey', 'jersey', 'Jersey sepak bola custom dengan nama dan nomor.', 60),
    ('Jersey Basket', 'jersey-basket', 'jersey', 'jersey', 'Jersey basket custom untuk tim, sekolah, dan event.', 70),
    ('Jersey Voli', 'jersey-voli', 'jersey', 'jersey', 'Jersey voli custom untuk tim dan turnamen.', 80),
    ('Jersey Badminton', 'jersey-badminton', 'jersey', 'jersey', 'Jersey badminton untuk klub, komunitas, dan event.', 90),
    ('Jersey Esports', 'jersey-esports', 'jersey', 'jersey', 'Jersey esports custom untuk tim dan komunitas gaming.', 100),
    ('Hoodie', 'hoodie', 'jaket-hoodie', 'jaket-hoodie', 'Hoodie custom untuk komunitas, event, dan brand apparel.', 110),
    ('Crewneck', 'crewneck', 'jaket-hoodie', 'jaket-hoodie', 'Crewneck custom untuk merchandise dan brand apparel.', 120),
    ('Jaket Bomber', 'jaket-bomber', 'jaket-hoodie', 'jaket-hoodie', 'Jaket bomber custom untuk komunitas dan organisasi.', 130),
    ('Jaket Varsity', 'jaket-varsity', 'jaket-hoodie', 'jaket-hoodie', 'Jaket varsity custom untuk sekolah, kampus, dan komunitas.', 140),
    ('Jaket Coach', 'jaket-coach', 'jaket-hoodie', 'jaket-hoodie', 'Jaket coach custom untuk event, brand, dan komunitas.', 150),
    ('Polo Lacoste', 'polo-lacoste', 'polo-shirt', 'polo-shirt', 'Polo lacoste untuk seragam kantor dan komunitas.', 160),
    ('Polo CVC', 'polo-cvc', 'polo-shirt', 'polo-shirt', 'Polo CVC untuk kebutuhan custom apparel.', 170),
    ('Polo Dry Fit', 'polo-dry-fit', 'polo-shirt', 'polo-shirt', 'Polo dry fit untuk olahraga, event, dan komunitas.', 180),
    ('Topi Trucker', 'topi-trucker', 'headwear', 'headwear', 'Topi trucker untuk merchandise dan bordir logo.', 190),
    ('Topi Baseball', 'topi-baseball', 'headwear', 'headwear', 'Topi baseball custom untuk komunitas dan brand.', 200),
    ('Snapback', 'snapback', 'headwear', 'headwear', 'Snapback custom untuk brand, event, dan komunitas.', 210),
    ('Bucket Hat', 'bucket-hat', 'headwear', 'headwear', 'Bucket hat custom untuk merchandise dan event.', 220),
    ('Kemeja PDH', 'kemeja-pdh', 'kemeja', 'kemeja', 'Kemeja PDH untuk seragam kantor, instansi, dan organisasi.', 230),
    ('Kemeja PDL', 'kemeja-pdl', 'kemeja', 'kemeja', 'Kemeja PDL untuk lapangan, komunitas, dan organisasi.', 240),
    ('Kemeja Kantor', 'kemeja-kantor', 'kemeja', 'kemeja', 'Kemeja kantor custom untuk perusahaan dan tim.', 250),
    ('Tote Bag', 'tote-bag', 'tas-aksesori', 'tas-aksesori', 'Tote bag custom untuk event, merchandise, dan brand.', 260),
    ('Goodie Bag', 'goodie-bag', 'tas-aksesori', 'tas-aksesori', 'Goodie bag custom untuk event dan promosi.', 270),
    ('Patch / Emblem', 'patch-emblem', 'tas-aksesori', 'tas-aksesori', 'Patch dan emblem untuk seragam, jaket, dan komunitas.', 280),
    ('Lanyard', 'lanyard', 'tas-aksesori', 'tas-aksesori', 'Lanyard custom untuk event, kantor, dan komunitas.', 290)
)
update public.service_categories target
set
  nama_kategori = model_values.nama_kategori,
  deskripsi = model_values.deskripsi,
  link_slug = model_values.link_slug,
  gambar_url = coalesce(nullif(target.gambar_url, ''), '/images/debroder/fallback/fallback-product.jpg'),
  image_alt = coalesce(nullif(target.image_alt, ''), model_values.nama_kategori),
  urutan = model_values.urutan,
  status_aktif = true,
  updated_at = now()
from model_values
where target.slug = model_values.slug
  and target.category_key = model_values.category_key;

with model_values(nama_kategori, slug, category_key, link_slug, deskripsi, urutan) as (
  values
    ('Kaos Cotton Combed', 'kaos-cotton-combed', 'kaos-polos', 'kaos-polos', 'Kaos cotton combed untuk sablon dan kebutuhan apparel.', 10),
    ('Kaos Oversize', 'kaos-oversize', 'kaos-polos', 'kaos-polos', 'Kaos oversize untuk brand clothing dan koleksi kasual.', 20),
    ('Kaos Lengan Panjang', 'kaos-lengan-panjang', 'kaos-polos', 'kaos-polos', 'Kaos lengan panjang untuk komunitas, event, dan custom apparel.', 30),
    ('Kaos Anak', 'kaos-anak', 'kaos-polos', 'kaos-polos', 'Kaos polos anak untuk custom desain dan kebutuhan keluarga.', 40),
    ('Jersey Futsal', 'jersey-futsal', 'jersey', 'jersey', 'Jersey futsal custom untuk tim dan komunitas.', 50),
    ('Jersey Sepak Bola', 'jersey-sepak-bola', 'jersey', 'jersey', 'Jersey sepak bola custom dengan nama dan nomor.', 60),
    ('Jersey Basket', 'jersey-basket', 'jersey', 'jersey', 'Jersey basket custom untuk tim, sekolah, dan event.', 70),
    ('Jersey Voli', 'jersey-voli', 'jersey', 'jersey', 'Jersey voli custom untuk tim dan turnamen.', 80),
    ('Jersey Badminton', 'jersey-badminton', 'jersey', 'jersey', 'Jersey badminton untuk klub, komunitas, dan event.', 90),
    ('Jersey Esports', 'jersey-esports', 'jersey', 'jersey', 'Jersey esports custom untuk tim dan komunitas gaming.', 100),
    ('Hoodie', 'hoodie', 'jaket-hoodie', 'jaket-hoodie', 'Hoodie custom untuk komunitas, event, dan brand apparel.', 110),
    ('Crewneck', 'crewneck', 'jaket-hoodie', 'jaket-hoodie', 'Crewneck custom untuk merchandise dan brand apparel.', 120),
    ('Jaket Bomber', 'jaket-bomber', 'jaket-hoodie', 'jaket-hoodie', 'Jaket bomber custom untuk komunitas dan organisasi.', 130),
    ('Jaket Varsity', 'jaket-varsity', 'jaket-hoodie', 'jaket-hoodie', 'Jaket varsity custom untuk sekolah, kampus, dan komunitas.', 140),
    ('Jaket Coach', 'jaket-coach', 'jaket-hoodie', 'jaket-hoodie', 'Jaket coach custom untuk event, brand, dan komunitas.', 150),
    ('Polo Lacoste', 'polo-lacoste', 'polo-shirt', 'polo-shirt', 'Polo lacoste untuk seragam kantor dan komunitas.', 160),
    ('Polo CVC', 'polo-cvc', 'polo-shirt', 'polo-shirt', 'Polo CVC untuk kebutuhan custom apparel.', 170),
    ('Polo Dry Fit', 'polo-dry-fit', 'polo-shirt', 'polo-shirt', 'Polo dry fit untuk olahraga, event, dan komunitas.', 180),
    ('Topi Trucker', 'topi-trucker', 'headwear', 'headwear', 'Topi trucker untuk merchandise dan bordir logo.', 190),
    ('Topi Baseball', 'topi-baseball', 'headwear', 'headwear', 'Topi baseball custom untuk komunitas dan brand.', 200),
    ('Snapback', 'snapback', 'headwear', 'headwear', 'Snapback custom untuk brand, event, dan komunitas.', 210),
    ('Bucket Hat', 'bucket-hat', 'headwear', 'headwear', 'Bucket hat custom untuk merchandise dan event.', 220),
    ('Kemeja PDH', 'kemeja-pdh', 'kemeja', 'kemeja', 'Kemeja PDH untuk seragam kantor, instansi, dan organisasi.', 230),
    ('Kemeja PDL', 'kemeja-pdl', 'kemeja', 'kemeja', 'Kemeja PDL untuk lapangan, komunitas, dan organisasi.', 240),
    ('Kemeja Kantor', 'kemeja-kantor', 'kemeja', 'kemeja', 'Kemeja kantor custom untuk perusahaan dan tim.', 250),
    ('Tote Bag', 'tote-bag', 'tas-aksesori', 'tas-aksesori', 'Tote bag custom untuk event, merchandise, dan brand.', 260),
    ('Goodie Bag', 'goodie-bag', 'tas-aksesori', 'tas-aksesori', 'Goodie bag custom untuk event dan promosi.', 270),
    ('Patch / Emblem', 'patch-emblem', 'tas-aksesori', 'tas-aksesori', 'Patch dan emblem untuk seragam, jaket, dan komunitas.', 280),
    ('Lanyard', 'lanyard', 'tas-aksesori', 'tas-aksesori', 'Lanyard custom untuk event, kantor, dan komunitas.', 290)
)
insert into public.service_categories
  (nama_kategori, slug, category_key, link_slug, deskripsi, gambar_url, image_alt, object_fit, object_position, urutan, status_aktif)
select
  nama_kategori, slug, category_key, link_slug, deskripsi, '/images/debroder/fallback/fallback-product.jpg', nama_kategori, 'cover', 'center center', urutan, true
from model_values
where not exists (
  select 1 from public.service_categories target
  where target.slug = model_values.slug
    and target.category_key = model_values.category_key
);

with service_values(nama, slug, category_key, deskripsi, urutan) as (
  values
    ('Sablon DTF', 'sablon-dtf', 'sablon-dtf', 'Teknik sablon full color untuk kaos, hoodie, polo, dan apparel custom.', 10),
    ('Bordir Komputer', 'bordir-komputer', 'bordir', 'Bordir logo dan identitas brand untuk polo, topi, jaket, dan kemeja.', 20),
    ('Sublim Printing', 'sublim-printing', 'cetak-sublim', 'Cetak sublim untuk jersey dan apparel berbahan polyester.', 30),
    ('Cutting Polyflex', 'cutting-polyflex', 'polyflex', 'Cutting polyflex untuk nama, nomor, dan desain sederhana pada apparel.', 40),
    ('Maklon DTF', 'maklon-dtf', 'maklon-dtf', 'Layanan produksi DTF untuk brand, reseller, dan produksi partai.', 50),
    ('Heat Press', 'heat-press', 'heat-press', 'Proses press untuk transfer desain ke berbagai produk apparel.', 60),
    ('Screen Printing', 'screen-printing', 'screen-printing', 'Sablon manual untuk kebutuhan produksi tertentu dan partai besar.', 70)
)
update public.services target
set
  nama = service_values.nama,
  category_key = service_values.category_key,
  deskripsi = service_values.deskripsi,
  detail_body = service_values.deskripsi,
  image_url = coalesce(nullif(target.image_url, ''), '/images/debroder/fallback/fallback-product.jpg'),
  image_alt = coalesce(nullif(target.image_alt, ''), service_values.nama),
  urutan = service_values.urutan,
  status_aktif = true,
  updated_at = now()
from service_values
where target.slug = service_values.slug;

with service_values(nama, slug, category_key, deskripsi, urutan) as (
  values
    ('Sablon DTF', 'sablon-dtf', 'sablon-dtf', 'Teknik sablon full color untuk kaos, hoodie, polo, dan apparel custom.', 10),
    ('Bordir Komputer', 'bordir-komputer', 'bordir', 'Bordir logo dan identitas brand untuk polo, topi, jaket, dan kemeja.', 20),
    ('Sublim Printing', 'sublim-printing', 'cetak-sublim', 'Cetak sublim untuk jersey dan apparel berbahan polyester.', 30),
    ('Cutting Polyflex', 'cutting-polyflex', 'polyflex', 'Cutting polyflex untuk nama, nomor, dan desain sederhana pada apparel.', 40),
    ('Maklon DTF', 'maklon-dtf', 'maklon-dtf', 'Layanan produksi DTF untuk brand, reseller, dan produksi partai.', 50),
    ('Heat Press', 'heat-press', 'heat-press', 'Proses press untuk transfer desain ke berbagai produk apparel.', 60),
    ('Screen Printing', 'screen-printing', 'screen-printing', 'Sablon manual untuk kebutuhan produksi tertentu dan partai besar.', 70)
)
insert into public.services
  (nama, slug, category_key, deskripsi, detail_body, image_url, image_alt, object_fit, object_position, urutan, status_aktif)
select
  nama, slug, category_key, deskripsi, deskripsi, '/images/debroder/fallback/fallback-product.jpg', nama, 'cover', 'center center', urutan, true
from service_values
where not exists (
  select 1 from public.services target where target.slug = service_values.slug
);

with product_text as (
  select
    product.id,
    lower(concat_ws(' ', product.nama, product.kategori, product.subcategory, product.slug, product.link_url, array_to_string(coalesce(product.intent_tags, '{}'), ' '), array_to_string(coalesce(product.collection_tags, '{}'), ' '))) as text_value
  from public.products product
),
matched as (
  select
    product_text.id,
    case
      when text_value like '%jersey%' then 'jersey'
      when text_value like '%hoodie%' or text_value like '%jaket%' or text_value like '%jacket%' or text_value like '%crewneck%' or text_value like '%bomber%' or text_value like '%varsity%' then 'jaket-hoodie'
      when text_value like '%polo%' or text_value like '%lacoste%' then 'polo-shirt'
      when text_value like '%topi%' or text_value like '%cap%' or text_value like '%hat%' or text_value like '%headwear%' then 'headwear'
      when text_value like '%kemeja%' or text_value like '%pdh%' or text_value like '%pdl%' then 'kemeja'
      when text_value like '%tote%' or text_value like '%goodie%' or text_value like '%patch%' or text_value like '%emblem%' or text_value like '%lanyard%' then 'tas-aksesori'
      else 'kaos-polos'
    end as category_slug
  from product_text
)
update public.products product
set
  product_category_id = category.id,
  kategori = category.name,
  link_url = '/' || category.slug
from matched
join public.product_categories category on category.slug = matched.category_slug
where product.id = matched.id;


-- Kunci model dan layanan agar item lama/ambigu tidak tampil lagi.
update public.service_categories
set status_aktif = false
where coalesce(category_key, '') || ':' || coalesce(slug, '') not in ('kaos-polos:kaos-cotton-combed', 'kaos-polos:kaos-oversize', 'kaos-polos:kaos-lengan-panjang', 'kaos-polos:kaos-anak', 'jersey:jersey-futsal', 'jersey:jersey-sepak-bola', 'jersey:jersey-basket', 'jersey:jersey-voli', 'jersey:jersey-badminton', 'jersey:jersey-esports', 'jaket-hoodie:hoodie', 'jaket-hoodie:crewneck', 'jaket-hoodie:jaket-bomber', 'jaket-hoodie:jaket-varsity', 'jaket-hoodie:jaket-coach', 'polo-shirt:polo-lacoste', 'polo-shirt:polo-cvc', 'polo-shirt:polo-dry-fit', 'headwear:topi-trucker', 'headwear:topi-baseball', 'headwear:snapback', 'headwear:bucket-hat', 'kemeja:kemeja-pdh', 'kemeja:kemeja-pdl', 'kemeja:kemeja-kantor', 'tas-aksesori:tote-bag', 'tas-aksesori:goodie-bag', 'tas-aksesori:patch-emblem', 'tas-aksesori:lanyard');

update public.services
set status_aktif = false
where slug not in ('sablon-dtf', 'bordir-komputer', 'sublim-printing', 'cutting-polyflex', 'maklon-dtf', 'heat-press', 'screen-printing');
