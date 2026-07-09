-- DEBRODER PIM Manager Final Setup V1
-- Struktur dikunci sesuai blueprint final:
-- Produk utama: Kaos Polos, Jersey, Jaket & Hoodie, Kemeja, Headwear
-- Layanan: Sablon DTF, Bordir Komputer, Sublim Printing, Maklon DTF

begin;

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
  ('Kaos Polos', 'kaos-polos', 'Kaos polos, kaos NSA, cotton combed, polo shirt NSA, kaos anak, dan lengan panjang.', true, 10, true, 8, 'sort_order', 10),
  ('Jersey', 'jersey', 'Jersey custom untuk futsal, sepak bola, basket, voli, badminton, esports, dan komunitas.', true, 20, true, 8, 'sort_order', 20),
  ('Jaket & Hoodie', 'jaket-hoodie', 'Hoodie, crewneck, jaket bomber, varsity, coach, dan outerwear custom.', true, 30, true, 8, 'sort_order', 30),
  ('Kemeja', 'kemeja', 'Kemeja PDH, PDL, kantor, komunitas, dan seragam custom.', true, 40, true, 8, 'sort_order', 40),
  ('Headwear', 'headwear', 'Topi trucker, baseball cap, snapback, bucket hat, dan headwear custom.', true, 50, true, 8, 'sort_order', 50)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  sort_order = excluded.sort_order,
  show_in_collection = true,
  collection_limit = excluded.collection_limit,
  collection_sort = excluded.collection_sort,
  collection_section_order = excluded.collection_section_order,
  updated_at = now();

update public.product_categories
set is_active = false, show_in_collection = false, updated_at = now()
where slug not in ('kaos-polos', 'jersey', 'jaket-hoodie', 'kemeja', 'headwear');

-- Migrasi kategori lama tanpa menghapus produk.
update public.products
set category_key = 'kaos-polos', subcategory = coalesce(nullif(subcategory, ''), 'Polo Shirt NSA'), updated_at = now()
where category_key = 'polo-shirt';

update public.products
set category_key = 'headwear', updated_at = now()
where category_key in ('aksesori-lainnya', 'tas-aksesori');

with category_ids as (
  select slug, id from public.product_categories where slug in ('kaos-polos', 'headwear')
), old_category_ids as (
  select slug, id from public.product_categories where slug in ('polo-shirt', 'aksesori-lainnya', 'tas-aksesori')
)
update public.products p
set
  product_category_id = case
    when old.slug = 'polo-shirt' then (select id from category_ids where slug = 'kaos-polos')
    else (select id from category_ids where slug = 'headwear')
  end,
  category_key = case when old.slug = 'polo-shirt' then 'kaos-polos' else 'headwear' end,
  subcategory = case when old.slug = 'polo-shirt' then coalesce(nullif(p.subcategory, ''), 'Polo Shirt NSA') else p.subcategory end,
  updated_at = now()
from old_category_ids old
where p.product_category_id = old.id;

with model_values(nama_kategori, slug, category_key, link_slug, deskripsi, urutan) as (
  values
    ('Kaos Cotton Combed', 'kaos-cotton-combed', 'kaos-polos', 'kaos-polos', 'Kaos cotton combed untuk sablon dan kebutuhan apparel.', 10),
    ('Kaos Lengan Panjang', 'kaos-lengan-panjang', 'kaos-polos', 'kaos-polos', 'Kaos lengan panjang untuk komunitas, event, dan custom apparel.', 20),
    ('Kaos Anak', 'kaos-anak', 'kaos-polos', 'kaos-polos', 'Kaos polos anak untuk custom desain dan kebutuhan keluarga.', 30),
    ('Polo Shirt NSA', 'polo-shirt-nsa', 'kaos-polos', 'kaos-polos', 'Polo Shirt NSA sebagai model di dalam kategori Kaos Polos.', 40),
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
    ('Kemeja PDH', 'kemeja-pdh', 'kemeja', 'kemeja', 'Kemeja PDH untuk seragam kantor, instansi, dan organisasi.', 160),
    ('Kemeja PDL', 'kemeja-pdl', 'kemeja', 'kemeja', 'Kemeja PDL untuk lapangan, komunitas, dan organisasi.', 170),
    ('Kemeja Kantor', 'kemeja-kantor', 'kemeja', 'kemeja', 'Kemeja kantor custom untuk perusahaan dan tim.', 180),
    ('Kemeja Komunitas', 'kemeja-komunitas', 'kemeja', 'kemeja', 'Kemeja custom untuk komunitas, organisasi, dan event.', 190),
    ('Topi Trucker', 'topi-trucker', 'headwear', 'headwear', 'Topi trucker untuk merchandise dan bordir logo.', 200),
    ('Topi Baseball', 'topi-baseball', 'headwear', 'headwear', 'Topi baseball custom untuk komunitas dan brand.', 210),
    ('Snapback', 'snapback', 'headwear', 'headwear', 'Snapback custom untuk brand, event, dan komunitas.', 220),
    ('Bucket Hat', 'bucket-hat', 'headwear', 'headwear', 'Bucket hat custom untuk merchandise dan event.', 230)
)
insert into public.service_categories
  (nama_kategori, slug, category_key, link_slug, deskripsi, gambar_url, image_alt, object_fit, object_position, urutan, status_aktif, updated_at)
select model_values.nama_kategori, model_values.slug, model_values.category_key, model_values.link_slug, model_values.deskripsi, '/images/debroder/fallback/fallback-product.jpg', model_values.nama_kategori, 'cover', 'center center', model_values.urutan, true, now()
from model_values
where not exists (
  select 1 from public.service_categories existing
  where existing.slug = model_values.slug and existing.category_key = model_values.category_key
);

with model_values(slug, category_key, link_slug, nama_kategori, deskripsi, urutan) as (
  values
    ('kaos-cotton-combed', 'kaos-polos', 'kaos-polos', 'Kaos Cotton Combed', 'Kaos cotton combed untuk sablon dan kebutuhan apparel.', 10),
    ('kaos-lengan-panjang', 'kaos-polos', 'kaos-polos', 'Kaos Lengan Panjang', 'Kaos lengan panjang untuk komunitas, event, dan custom apparel.', 20),
    ('kaos-anak', 'kaos-polos', 'kaos-polos', 'Kaos Anak', 'Kaos polos anak untuk custom desain dan kebutuhan keluarga.', 30),
    ('polo-shirt-nsa', 'kaos-polos', 'kaos-polos', 'Polo Shirt NSA', 'Polo Shirt NSA sebagai model di dalam kategori Kaos Polos.', 40),
    ('jersey-futsal', 'jersey', 'jersey', 'Jersey Futsal', 'Jersey futsal custom untuk tim dan komunitas.', 50),
    ('jersey-sepak-bola', 'jersey', 'jersey', 'Jersey Sepak Bola', 'Jersey sepak bola custom dengan nama dan nomor.', 60),
    ('jersey-basket', 'jersey', 'jersey', 'Jersey Basket', 'Jersey basket custom untuk tim, sekolah, dan event.', 70),
    ('jersey-voli', 'jersey', 'jersey', 'Jersey Voli', 'Jersey voli custom untuk tim dan turnamen.', 80),
    ('jersey-badminton', 'jersey', 'jersey', 'Jersey Badminton', 'Jersey badminton untuk klub, komunitas, dan event.', 90),
    ('jersey-esports', 'jersey', 'jersey', 'Jersey Esports', 'Jersey esports custom untuk tim dan komunitas gaming.', 100),
    ('hoodie', 'jaket-hoodie', 'jaket-hoodie', 'Hoodie', 'Hoodie custom untuk komunitas, event, dan brand apparel.', 110),
    ('crewneck', 'jaket-hoodie', 'jaket-hoodie', 'Crewneck', 'Crewneck custom untuk merchandise dan brand apparel.', 120),
    ('jaket-bomber', 'jaket-hoodie', 'jaket-hoodie', 'Jaket Bomber', 'Jaket bomber custom untuk komunitas dan organisasi.', 130),
    ('jaket-varsity', 'jaket-hoodie', 'jaket-hoodie', 'Jaket Varsity', 'Jaket varsity custom untuk sekolah, kampus, dan komunitas.', 140),
    ('jaket-coach', 'jaket-hoodie', 'jaket-hoodie', 'Jaket Coach', 'Jaket coach custom untuk event, brand, dan komunitas.', 150),
    ('kemeja-pdh', 'kemeja', 'kemeja', 'Kemeja PDH', 'Kemeja PDH untuk seragam kantor, instansi, dan organisasi.', 160),
    ('kemeja-pdl', 'kemeja', 'kemeja', 'Kemeja PDL', 'Kemeja PDL untuk lapangan, komunitas, dan organisasi.', 170),
    ('kemeja-kantor', 'kemeja', 'kemeja', 'Kemeja Kantor', 'Kemeja kantor custom untuk perusahaan dan tim.', 180),
    ('kemeja-komunitas', 'kemeja', 'kemeja', 'Kemeja Komunitas', 'Kemeja custom untuk komunitas, organisasi, dan event.', 190),
    ('topi-trucker', 'headwear', 'headwear', 'Topi Trucker', 'Topi trucker untuk merchandise dan bordir logo.', 200),
    ('topi-baseball', 'headwear', 'headwear', 'Topi Baseball', 'Topi baseball custom untuk komunitas dan brand.', 210),
    ('snapback', 'headwear', 'headwear', 'Snapback', 'Snapback custom untuk brand, event, dan komunitas.', 220),
    ('bucket-hat', 'headwear', 'headwear', 'Bucket Hat', 'Bucket hat custom untuk merchandise dan event.', 230)
)
update public.service_categories target
set
  nama_kategori = model_values.nama_kategori,
  deskripsi = model_values.deskripsi,
  category_key = model_values.category_key,
  link_slug = model_values.link_slug,
  image_alt = coalesce(nullif(target.image_alt, ''), model_values.nama_kategori),
  urutan = model_values.urutan,
  status_aktif = true,
  updated_at = now()
from model_values
where target.slug = model_values.slug;

update public.service_categories
set status_aktif = false, updated_at = now()
where coalesce(category_key, '') || ':' || coalesce(slug, '') not in (
  'kaos-polos:kaos-cotton-combed', 'kaos-polos:kaos-lengan-panjang', 'kaos-polos:kaos-anak', 'kaos-polos:polo-shirt-nsa',
  'jersey:jersey-futsal', 'jersey:jersey-sepak-bola', 'jersey:jersey-basket', 'jersey:jersey-voli', 'jersey:jersey-badminton', 'jersey:jersey-esports',
  'jaket-hoodie:hoodie', 'jaket-hoodie:crewneck', 'jaket-hoodie:jaket-bomber', 'jaket-hoodie:jaket-varsity', 'jaket-hoodie:jaket-coach',
  'kemeja:kemeja-pdh', 'kemeja:kemeja-pdl', 'kemeja:kemeja-kantor', 'kemeja:kemeja-komunitas',
  'headwear:topi-trucker', 'headwear:topi-baseball', 'headwear:snapback', 'headwear:bucket-hat'
);

with service_values(nama, slug, category_key, deskripsi, urutan, production_estimate) as (
  values
    ('Sablon DTF', 'sablon-dtf', 'sablon-dtf', 'Teknik sablon full color untuk kaos, hoodie, kemeja, headwear tertentu, dan apparel custom.', 10, '1-3 hari kerja'),
    ('Bordir Komputer', 'bordir-komputer', 'bordir', 'Bordir logo dan identitas brand untuk polo, topi, jaket, dan kemeja.', 20, '2-5 hari kerja'),
    ('Sublim Printing', 'cetak-sublim', 'cetak-sublim', 'Cetak sublim untuk jersey dan apparel berbahan polyester.', 30, '3-7 hari kerja'),
    ('Maklon DTF', 'maklon-dtf', 'maklon-dtf', 'Layanan produksi DTF untuk brand, reseller, dan produksi partai.', 40, 'Sesuai jumlah pesanan')
)
insert into public.services
  (nama, slug, category_key, deskripsi, detail_body, production_estimate, image_url, image_alt, object_fit, object_position, urutan, status_aktif, updated_at)
select service_values.nama, service_values.slug, service_values.category_key, service_values.deskripsi, service_values.deskripsi, service_values.production_estimate, '/images/debroder/fallback/fallback-product.jpg', service_values.nama, 'cover', 'center center', service_values.urutan, true, now()
from service_values
where not exists (
  select 1 from public.services existing where existing.slug = service_values.slug
);

with service_values(slug, category_key, nama, deskripsi, urutan, production_estimate) as (
  values
    ('sablon-dtf', 'sablon-dtf', 'Sablon DTF', 'Teknik sablon full color untuk kaos, hoodie, kemeja, headwear tertentu, dan apparel custom.', 10, '1-3 hari kerja'),
    ('bordir-komputer', 'bordir', 'Bordir Komputer', 'Bordir logo dan identitas brand untuk polo, topi, jaket, dan kemeja.', 20, '2-5 hari kerja'),
    ('cetak-sublim', 'cetak-sublim', 'Sublim Printing', 'Cetak sublim untuk jersey dan apparel berbahan polyester.', 30, '3-7 hari kerja'),
    ('maklon-dtf', 'maklon-dtf', 'Maklon DTF', 'Layanan produksi DTF untuk brand, reseller, dan produksi partai.', 40, 'Sesuai jumlah pesanan')
)
update public.services target
set
  nama = service_values.nama,
  category_key = service_values.category_key,
  deskripsi = service_values.deskripsi,
  detail_body = coalesce(nullif(target.detail_body, ''), service_values.deskripsi),
  production_estimate = service_values.production_estimate,
  image_alt = coalesce(nullif(target.image_alt, ''), service_values.nama),
  urutan = service_values.urutan,
  status_aktif = true,
  updated_at = now()
from service_values
where target.slug = service_values.slug;

update public.services
set status_aktif = false, updated_at = now()
where slug not in ('sablon-dtf', 'bordir-komputer', 'cetak-sublim', 'maklon-dtf');

commit;
