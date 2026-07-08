-- DEBRODER: Sync kartu/model Jersey agar muncul di Admin > Kategori / Model
-- Jalankan di Supabase SQL Editor jika halaman /jersey tampil, tetapi data tidak terlihat di admin.
-- Aman dijalankan berulang: data dengan slug yang sama akan di-update, yang belum ada akan di-insert.

with jersey_defaults(nama_kategori, deskripsi, slug, urutan) as (
  values
    ('Jersey', 'Jersey custom untuk tim, sekolah, komunitas, dan instansi.', 'jersey', 10),
    ('Jersey Badminton', 'Jersey fleksibel untuk klub badminton dan turnamen.', 'jersey-badminton', 11),
    ('Jersey Basket', 'Jersey basket custom untuk tim, sekolah, dan kompetisi.', 'jersey-basket', 12),
    ('Jersey Voli', 'Jersey voli custom untuk klub, komunitas, dan event.', 'jersey-voli', 13),
    ('Jersey Futsal', 'Jersey futsal custom untuk tim, sekolah, komunitas, dan turnamen.', 'jersey-futsal', 14),
    ('Jersey Sepak Bola', 'Jersey sepak bola custom untuk tim, akademi, dan komunitas.', 'jersey-sepak-bola', 15),
    ('Jersey Esports', 'Jersey esports custom untuk tim, komunitas, dan event gaming.', 'jersey-esports', 16),
    ('Jersey Sepeda', 'Jersey sepeda custom dengan pilihan lengan dan detail tim.', 'jersey-sepeda', 17)
), updated as (
  update public.service_categories sc
  set
    nama_kategori = jd.nama_kategori,
    deskripsi = jd.deskripsi,
    category_key = 'jersey',
    link_slug = 'jersey',
    image_alt = coalesce(sc.image_alt, jd.nama_kategori || ' custom DE BRODER'),
    gambar_url = coalesce(nullif(sc.gambar_url, ''), '/brand/debroder/social-preview.png'),
    color_options = case when coalesce(array_length(sc.color_options, 1), 0) = 0 then array['Warna custom sesuai desain']::text[] else sc.color_options end,
    collar_options = case when coalesce(array_length(sc.collar_options, 1), 0) = 0 then array['O-neck', 'V-neck', 'Polo']::text[] else sc.collar_options end,
    sleeve_options = case when coalesce(array_length(sc.sleeve_options, 1), 0) = 0 then array['Pendek', 'Panjang']::text[] else sc.sleeve_options end,
    material_options = case when coalesce(array_length(sc.material_options, 1), 0) = 0 then array['Dryfit', 'Milano']::text[] else sc.material_options end,
    size_chart = case when coalesce(array_length(sc.size_chart, 1), 0) = 0 then array['S', 'M', 'L', 'XL', 'XXL']::text[] else sc.size_chart end,
    faq_items = case when coalesce(array_length(sc.faq_items, 1), 0) = 0 then array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[] else sc.faq_items end,
    object_fit = coalesce(nullif(sc.object_fit, ''), 'cover'),
    object_position = coalesce(nullif(sc.object_position, ''), 'center center'),
    urutan = jd.urutan,
    status_aktif = true,
    updated_at = now()
  from jersey_defaults jd
  where sc.slug = jd.slug
  returning sc.slug
)
insert into public.service_categories (
  nama_kategori,
  deskripsi,
  gambar_url,
  image_alt,
  category_key,
  slug,
  link_slug,
  color_options,
  collar_options,
  sleeve_options,
  material_options,
  size_chart,
  faq_items,
  object_fit,
  object_position,
  urutan,
  status_aktif
)
select
  jd.nama_kategori,
  jd.deskripsi,
  '/brand/debroder/social-preview.png',
  jd.nama_kategori || ' custom DE BRODER',
  'jersey',
  jd.slug,
  'jersey',
  array['Warna custom sesuai desain']::text[],
  array['O-neck', 'V-neck', 'Polo']::text[],
  array['Pendek', 'Panjang']::text[],
  array['Dryfit', 'Milano']::text[],
  array['S', 'M', 'L', 'XL', 'XXL']::text[],
  array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[],
  'cover',
  'center center',
  jd.urutan,
  true
from jersey_defaults jd
where not exists (
  select 1 from public.service_categories sc where sc.slug = jd.slug
);
