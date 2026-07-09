-- Seed 10 produk Jaket & Hoodie DEBRODER.
-- Jalankan di Supabase SQL Editor.
-- Semua produk aktif dan memakai logo DEBRODER sebagai placeholder gambar.

alter table if exists public.products
  add column if not exists slug text,
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists collection_tags text[] not null default '{}',
  add column if not exists intent_tags text[] not null default '{}',
  add column if not exists color_tags text[] not null default '{}',
  add column if not exists size_tags text[] not null default '{}',
  add column if not exists material_tags text[] not null default '{}',
  add column if not exists brand text,
  add column if not exists object_fit text not null default 'cover',
  add column if not exists object_position text not null default 'center center',
  add column if not exists price_label text,
  add column if not exists stock integer not null default 0,
  add column if not exists specifications text[] not null default '{}',
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists target_ratio text not null default '4:5';

with jacket_products as (
  select *
  from (values
    ('Jaket Coach Custom', 'jaket-coach-custom', 'Jaket', 'Jaket coach custom untuk komunitas, kantor, event, dan merchandise brand.', 165000::numeric, array['taslan', 'drill']::text[], 301),
    ('Jaket Bomber Custom', 'jaket-bomber-custom', 'Jaket', 'Jaket bomber custom untuk komunitas, organisasi, dan apparel premium.', 185000::numeric, array['taslan', 'fleece']::text[], 302),
    ('Jaket Windbreaker Custom', 'jaket-windbreaker-custom', 'Jaket', 'Jaket windbreaker custom ringan untuk event, komunitas, dan kebutuhan outdoor.', 175000::numeric, array['taslan', 'polyester']::text[], 303),
    ('Jaket Varsity Custom', 'jaket-varsity-custom', 'Jaket', 'Jaket varsity custom untuk sekolah, kampus, komunitas, dan brand apparel.', 195000::numeric, array['fleece', 'drill']::text[], 304),
    ('Hoodie Pullover Custom', 'hoodie-pullover-custom', 'Hoodie', 'Hoodie pullover custom untuk komunitas, merchandise, dan brand apparel.', 150000::numeric, array['fleece', 'baby-terry']::text[], 305),
    ('Hoodie Zipper Custom', 'hoodie-zipper-custom', 'Hoodie', 'Hoodie zipper custom untuk organisasi, komunitas, dan kebutuhan apparel premium.', 165000::numeric, array['fleece', 'baby-terry']::text[], 306),
    ('Hoodie Oversize Custom', 'hoodie-oversize-custom', 'Hoodie', 'Hoodie oversize custom untuk brand apparel, merchandise, dan koleksi komunitas.', 170000::numeric, array['fleece', 'baby-terry']::text[], 307),
    ('Crewneck Basic Custom', 'crewneck-basic-custom', 'Crewneck', 'Crewneck basic custom untuk komunitas, kantor, event, dan brand apparel.', 135000::numeric, array['fleece', 'baby-terry']::text[], 308),
    ('Crewneck Oversize Custom', 'crewneck-oversize-custom', 'Crewneck', 'Crewneck oversize custom untuk merchandise, komunitas, dan brand apparel.', 145000::numeric, array['fleece', 'baby-terry']::text[], 309),
    ('Crewneck Premium Custom', 'crewneck-premium-custom', 'Crewneck', 'Crewneck premium custom untuk apparel komunitas, organisasi, dan brand.', 155000::numeric, array['fleece', 'baby-terry']::text[], 310)
  ) as seed(nama, slug, subcategory, deskripsi, price, material_tags, urutan)
)
insert into public.products (
  nama,
  slug,
  kategori,
  subcategory,
  deskripsi,
  short_detail,
  description,
  specifications,
  badge,
  gambar_url,
  image_url,
  image_alt,
  collection_tags,
  intent_tags,
  color_tags,
  size_tags,
  material_tags,
  brand,
  object_fit,
  object_position,
  whatsapp_link,
  link_url,
  price,
  harga,
  price_label,
  stock,
  target_ratio,
  urutan,
  status_aktif
)
select
  seed.nama,
  seed.slug,
  'Jaket & Hoodie',
  seed.subcategory,
  seed.deskripsi,
  seed.deskripsi,
  seed.deskripsi,
  array[
    'Kategori: Jaket & Hoodie',
    'Tipe: ' || seed.subcategory,
    'Ukuran: S, M, L, XL, XXL',
    'Cocok untuk: Komunitas, event, organisasi, dan brand apparel',
    'Custom: Sablon DTF atau bordir sesuai kebutuhan'
  ]::text[],
  '',
  '/brand/debroder/logo-primary-black.png',
  '/brand/debroder/logo-primary-black.png',
  seed.nama,
  array['jaket-hoodie', 'premium']::text[],
  array['jaket-hoodie', 'sablon-dtf', 'bordir', 'komunitas', 'organisasi', 'brand-apparel']::text[],
  array['hitam', 'navy', 'abu', 'army', 'maroon']::text[],
  array['s', 'm', 'l', 'xl', 'xxl']::text[],
  seed.material_tags,
  'DEBRODER',
  'contain',
  'center center',
  'https://wa.me/6285355333364',
  '/jaket-hoodie',
  seed.price,
  seed.price,
  'Mulai dari',
  999,
  '4:5',
  seed.urutan,
  true
from jacket_products seed
where not exists (
  select 1
  from public.products existing
  where existing.slug = seed.slug
);

notify pgrst, 'reload schema';

select nama, slug, kategori, subcategory, link_url, intent_tags, status_aktif
from public.products
where kategori = 'Jaket & Hoodie'
order by urutan, nama;
