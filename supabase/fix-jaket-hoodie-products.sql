-- Fix produk Jaket & Hoodie agar tampil di halaman /jaket-hoodie.
-- Jalankan di Supabase SQL Editor.

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
  add column if not exists target_ratio text not null default '4:5';

with jaket_seed as (
  select *
  from (values
    (
      'Hoodie Custom',
      'hoodie-custom',
      'Hoodie custom untuk komunitas, merchandise, organisasi, dan brand apparel.',
      'Hoodie custom untuk merch dan komunitas.',
      array['Model: Hoodie', 'Ukuran: S, M, L, XL, XXL', 'Cocok untuk: Merchandise, komunitas, organisasi', 'Custom: Sablon DTF atau bordir']::text[],
      array['hitam', 'navy', 'abu', 'maroon']::text[],
      array['fleece', 'baby-terry']::text[],
      150000::numeric,
      201
    ),
    (
      'Crewneck Custom',
      'crewneck-custom',
      'Crewneck custom untuk brand, komunitas, kantor, dan merchandise dengan tampilan clean.',
      'Crewneck custom untuk brand dan komunitas.',
      array['Model: Crewneck', 'Ukuran: S, M, L, XL, XXL', 'Cocok untuk: Brand, komunitas, kantor', 'Custom: Sablon DTF atau bordir']::text[],
      array['hitam', 'navy', 'abu', 'cream']::text[],
      array['fleece', 'baby-terry']::text[],
      140000::numeric,
      202
    ),
    (
      'Jaket Custom',
      'jaket-custom',
      'Jaket custom untuk komunitas, organisasi, event, dan kebutuhan apparel outdoor.',
      'Jaket custom untuk organisasi dan event.',
      array['Model: Jaket', 'Ukuran: S, M, L, XL, XXL', 'Cocok untuk: Organisasi, event, komunitas', 'Custom: Logo, desain, dan identitas tim']::text[],
      array['hitam', 'navy', 'army', 'abu']::text[],
      array['taslan', 'drill', 'fleece']::text[],
      180000::numeric,
      203
    )
  ) as seed(nama, slug, deskripsi, short_detail, specifications, color_tags, material_tags, price, urutan)
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
  split_part(seed.nama, ' ', 1),
  seed.deskripsi,
  seed.short_detail,
  seed.deskripsi,
  seed.specifications,
  '',
  '/brand/debroder/logo-primary-black.png',
  '/brand/debroder/logo-primary-black.png',
  seed.nama,
  array['jaket-hoodie', 'premium']::text[],
  array['jaket-hoodie', 'sablon-dtf', 'bordir', 'komunitas', 'organisasi', 'brand-apparel']::text[],
  seed.color_tags,
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
from jaket_seed seed
where not exists (
  select 1
  from public.products existing
  where existing.slug = seed.slug
);

update public.products
set
  kategori = 'Jaket & Hoodie',
  link_url = '/jaket-hoodie',
  image_url = coalesce(nullif(image_url, ''), '/brand/debroder/logo-primary-black.png'),
  gambar_url = coalesce(nullif(gambar_url, ''), '/brand/debroder/logo-primary-black.png'),
  image_alt = coalesce(nullif(image_alt, ''), nama),
  object_fit = 'contain',
  object_position = 'center center',
  collection_tags = array['jaket-hoodie', 'premium'],
  intent_tags = array['jaket-hoodie', 'sablon-dtf', 'bordir', 'komunitas', 'organisasi', 'brand-apparel'],
  status_aktif = true
where nama ilike '%jaket%'
   or nama ilike '%jacket%'
   or nama ilike '%hoodie%'
   or nama ilike '%hooded%'
   or nama ilike '%crewneck%'
   or slug ilike '%jaket%'
   or slug ilike '%jacket%'
   or slug ilike '%hoodie%'
   or slug ilike '%hooded%'
   or slug ilike '%crewneck%'
   or kategori ilike '%jaket%'
   or kategori ilike '%jacket%'
   or kategori ilike '%hoodie%';

notify pgrst, 'reload schema';

select nama, slug, kategori, link_url, intent_tags, status_aktif
from public.products
where kategori = 'Jaket & Hoodie'
order by urutan, nama;
