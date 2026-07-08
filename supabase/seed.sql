insert into public.products
  (nama, kategori, deskripsi, short_detail, badge, gambar_url, image_url, whatsapp_link, link_url, price, urutan, status_aktif)
values
  ('Kaos Polos New State Apparel', 'Kaos Polos', 'Kaos polos New State Apparel untuk brand, event, dan kebutuhan harian', 'Kaos polos New State Apparel untuk brand, event, dan kebutuhan harian', '', '/images/debroder/products/produk-kaos-polos.jpg', '/images/debroder/products/produk-kaos-polos.jpg', 'https://wa.me/6285355333364', '/kaos-polos', 45000, 1, true),
  ('Kaos Cotton Combed', 'Kaos Polos', 'Kaos cotton combed untuk custom dan kebutuhan brand', 'Kaos cotton combed untuk custom dan kebutuhan brand', '', '/images/debroder/products/produk-kaos-polos.jpg', '/images/debroder/products/produk-kaos-polos.jpg', 'https://wa.me/6285355333364', '/kaos-polos', 45000, 2, true),
  ('Sablon DTF Custom', 'Sablon DTF', 'Sablon DTF untuk logo, brand, dan komunitas', 'Sablon DTF untuk logo, brand, dan komunitas', '', '/images/debroder/products/produk-sablon-dtf.jpg', '/images/debroder/products/produk-sablon-dtf.jpg', 'https://wa.me/6285355333364', '/sablon-dtf', 5000, 3, true),
  ('Custom Jersey', 'Jersey', 'Jersey custom untuk tim dan komunitas', 'Jersey custom untuk tim dan komunitas', '', '/images/debroder/products/produk-jersey.jpg', '/images/debroder/products/produk-jersey.jpg', 'https://wa.me/6285355333364', '/jersey', 75000, 4, true),
  ('Maklon DTF', 'Maklon DTF', 'Produksi DTF untuk reseller dan brand apparel', 'Produksi DTF untuk reseller dan brand apparel', '', '/images/debroder/products/produk-maklon-dtf.jpg', '/images/debroder/products/produk-maklon-dtf.jpg', 'https://wa.me/6285355333364', '/maklon-dtf', 25000, 5, true),
  ('Cetak Sublim', 'Cetak Sublim', 'Cetak sublim untuk jersey dan apparel custom', 'Cetak sublim untuk jersey dan apparel custom', '', '/images/debroder/products/produk-cetak-sublim.jpg', '/images/debroder/products/produk-cetak-sublim.jpg', 'https://wa.me/6285355333364', '/cetak-sublim', 35000, 6, true),
  ('Distributor Kaos NSA', 'Kaos Polos', 'Pilihan kaos NSA untuk kebutuhan store dan produksi', 'Pilihan kaos NSA untuk kebutuhan store dan produksi', '', '/images/debroder/products/produk-kaos-polos.jpg', '/images/debroder/products/produk-kaos-polos.jpg', 'https://wa.me/6285355333364', '/kaos-polos', null, 7, true)
on conflict do nothing;

insert into public.service_categories
  (nama_kategori, deskripsi, gambar_url, link_slug, urutan, status_aktif)
values
  ('Kaos Polos', 'Kaos polos premium untuk brand, komunitas, dan kebutuhan harian', '/images/debroder/products/produk-kaos-polos.jpg', 'kaos-polos', 1, true),
  ('Polo Shirt', 'Polo rapi untuk bisnis, seragam, dan komunitas', '/images/debroder/products/produk-kaos-polos.jpg', 'koleksi', 2, true),
  ('Jacket', 'Jacket custom untuk tim, organisasi, dan brand', '/images/debroder/products/produk-kaos-polos.jpg', 'koleksi', 3, true),
  ('Hoodie', 'Hoodie nyaman untuk merchandise dan koleksi brand', '/images/debroder/products/produk-kaos-polos.jpg', 'koleksi', 4, true),
  ('Kaos Cotton Combed', 'Cotton combed lembut untuk custom dan kebutuhan brand', '/images/debroder/products/produk-kaos-polos.jpg', 'kaos-polos', 5, true),
  ('Jersey', 'Jersey custom untuk tim, sekolah, komunitas, dan instansi', '/images/debroder/products/produk-jersey.jpg', 'jersey', 6, true)
on conflict do nothing;

insert into public.services
  (nama, slug, deskripsi, image_url, harga_mulai, urutan, status_aktif)
values
  ('Sablon DTF', 'sablon-dtf', 'Hasil tajam dan fleksibel untuk kaos, brand, serta komunitas.', '/images/debroder/products/produk-sablon-dtf.jpg', 5000, 1, true),
  ('Custom Jersey', 'jersey', 'Jersey custom untuk tim olahraga, sekolah, dan instansi.', '/images/debroder/products/produk-jersey.jpg', 75000, 2, true),
  ('Maklon DTF', 'maklon-dtf', 'Partner produksi DTF untuk reseller dan brand apparel.', '/images/debroder/products/produk-maklon-dtf.jpg', 25000, 3, true),
  ('Cetak Sublim', 'cetak-sublim', 'Cetak warna menyeluruh untuk jersey dan apparel custom.', '/images/debroder/products/produk-cetak-sublim.jpg', 35000, 4, true),
  ('Kaos NSA', 'kaos-polos', 'Kaos New State Apparel siap pakai atau siap custom.', '/images/debroder/products/produk-kaos-polos.jpg', 45000, 5, true),
  ('Cotton Combed', 'kaos-polos', 'Kaos cotton combed nyaman untuk brand dan kebutuhan harian.', '/images/debroder/products/produk-kaos-polos.jpg', 45000, 6, true)
on conflict do nothing;

insert into public.stores
  (nama_store, layanan_utama, alamat, whatsapp, whatsapp_link, maps_link, image_url, urutan, status_aktif)
values
  ('STORE PETTARANI', 'Sablon Kaos dan Jersey', 'Jl. AP Pettarani, Ruko New Zamrud Blok G No.7', '0853-5533-3364', 'https://wa.me/6285355333364', 'https://www.google.com/maps/search/?api=1&query=Jl.%20AP%20Pettarani%2C%20Ruko%20New%20Zamrud%20Blok%20G%20No.7%20Makassar', '/images/debroder/stores/store-pettarani.jpg', 1, true),
  ('STORE TELLO', 'Cetak DTF dan Sablon Kaos', 'Jl. Urip Sumoharjo, Depan PLTU', '0812-4400-3505', 'https://wa.me/6281244003505', 'https://www.google.com/maps/search/?api=1&query=Jl.%20Urip%20Sumoharjo%20Depan%20PLTU%20Makassar', '/images/debroder/stores/store-tello.jpg', 2, true),
  ('STORE LANDAK', 'Cetak DTF dan Jersey', 'Jl. Andy Djemma LR 8B No.108', '0811-4470-1984', 'https://wa.me/6281144701984', 'https://www.google.com/maps/search/?api=1&query=Jl.%20Andy%20Djemma%20LR%208B%20No.108%20Makassar', '/images/debroder/stores/store-landak.jpg', 3, true),
  ('STORE PAREPARE', 'Cetak DTF, Sablon, dan Kaos Polos', 'Jl. Lorong 3 No.10, Sumpang Minangae, belakang Warkop Chilos, Parepare', '0821-5658-8066', 'https://wa.me/6282156588066', 'https://www.google.com/maps/search/?api=1&query=Jl.%20Lorong%203%20No.10%20Sumpang%20Minangae%20Belakang%20Warkop%20Chilos%20Parepare', '/images/debroder/stores/store-parepare.jpg', 4, true)
on conflict do nothing;

insert into public.hero_banners
  (badge, headline, subheadline, title, subtitle, cta_primary_text, cta_primary_link, cta_secondary_text, cta_secondary_link, cta_text, cta_link, image_url, mobile_image_url, object_position, mobile_object_position, urutan, status_aktif)
values
  ('KAOS POLOS NEW STATE APPAREL', 'KAOS POLOS NEW STATE APPAREL', 'Sablon DTF, Jersey, dan Custom Apparel', 'KAOS POLOS NEW STATE APPAREL', 'Sablon DTF, Jersey, dan Custom Apparel', 'Beli Sekarang', '/koleksi', '', '', 'Beli Sekarang', '/koleksi', '/images/debroder/hero/hero-1.jpg', '/images/debroder/hero/hero-1-mobile.jpg', 'center center', 'center center', 1, true),
  ('SABLON DTF', 'SABLON DTF', 'Custom Jersey, Maklon DTF, dan Cetak Sublim', 'SABLON DTF', 'Custom Jersey, Maklon DTF, dan Cetak Sublim', 'Konsultasi', '/sablon-dtf', '', '', 'Konsultasi', '/sablon-dtf', '/images/debroder/hero/hero-2.jpg', '/images/debroder/hero/hero-2-mobile.jpg', 'center center', 'center center', 2, true)
on conflict do nothing;

insert into public.instagram_banners
  (title, image_url, mobile_image_url, link_url, object_position, mobile_object_position, status_aktif)
values
  ('Instagram DE BRODER', '/images/debroder/banners/banner-instagram.jpg', '/images/debroder/banners/banner-instagram-mobile.jpg', 'https://instagram.com/de_broder', 'center center', 'center center', true)
on conflict do nothing;

insert into public.page_heroes
  (page_key, label, title, subtitle, image_url, mobile_image_url, object_position, mobile_object_position, status_aktif)
values
  ('koleksi', 'KOLEKSI', 'Layanan & Produk DE BRODER', 'Temukan kebutuhan apparel, sablon, jersey, dan layanan custom dalam satu tempat.', '/images/debroder/page-heroes/hero-1.jpg', '/images/debroder/page-heroes/hero-1-mobile.jpg', 'center center', 'center center', true),
  ('kaos-polos', 'KAOS POLOS', 'Kaos Polos New State Apparel & Cotton Combed', 'Pilihan kaos polos untuk brand, komunitas, event, dan kebutuhan harian.', '/images/debroder/page-heroes/hero-kaos-polos.jpg', '/images/debroder/page-heroes/hero-kaos-polos-mobile.jpg', 'center center', 'center center', true),
  ('jaket-hoodie', 'JAKET & HOODIE', 'Jaket & Hoodie Custom', 'Pilihan jaket dan hoodie untuk brand, komunitas, event, dan kebutuhan harian.', '/images/debroder/page-heroes/hero-jaket-hoodie.jpg', '/images/debroder/page-heroes/hero-jaket-hoodie-mobile.jpg', 'center center', 'center center', true),
  ('headwear', 'HEADWEAR', 'Headwear Custom', 'Topi dan headwear untuk brand, komunitas, event, dan kebutuhan merchandise.', '/images/debroder/page-heroes/hero-headwear.jpg', '/images/debroder/page-heroes/hero-headwear-mobile.jpg', 'center center', 'center center', true),
  ('sablon-dtf', 'SABLON DTF', 'Sablon DTF untuk Apparel Custom', 'Hasil sablon rapi untuk logo, desain brand, komunitas, dan produksi apparel.', '/images/debroder/page-heroes/hero-sablon-dtf.jpg', '/images/debroder/page-heroes/hero-sablon-dtf-mobile.jpg', 'center center', 'center center', true),
  ('maklon-dtf', 'MAKLON DTF', 'Maklon DTF untuk Kebutuhan Produksi', 'Layanan produksi DTF untuk reseller, brand apparel, dan kebutuhan bisnis.', '/images/debroder/page-heroes/hero-maklon-dtf.jpg', '/images/debroder/page-heroes/hero-maklon-dtf-mobile.jpg', 'center center', 'center center', true),
  ('jersey', 'CUSTOM JERSEY', 'Jersey Custom untuk Tim dan Komunitas', 'Produksi jersey untuk tim olahraga, sekolah, instansi, dan event.', '/images/debroder/page-heroes/hero-jersey.jpg', '/images/debroder/page-heroes/hero-jersey-mobile.jpg', 'center center', 'center center', true),
  ('cetak-sublim', 'CETAK SUBLIM', 'Cetak Sublim untuk Apparel Custom', 'Cetak sublim untuk jersey dan apparel custom dengan hasil rapi.', '/images/debroder/page-heroes/hero-cetak-sublim.jpg', '/images/debroder/page-heroes/hero-cetak-sublim-mobile.jpg', 'center center', 'center center', true),
  ('store', 'STORE', 'Temukan Store DE BRODER Terdekat', 'Pettarani, Tello, Landak, dan Parepare.', '/images/debroder/page-heroes/hero-store.jpg', '/images/debroder/page-heroes/hero-store-mobile.jpg', 'center center', 'center center', true),
  ('cara-order', 'CARA ORDER', 'Cara Order di DE BRODER', 'Alur singkat untuk konsultasi dan memesan kebutuhan apparel.', '/images/debroder/page-heroes/hero-cara-order.jpg', '/images/debroder/page-heroes/hero-cara-order-mobile.jpg', 'center center', 'center center', true)
on conflict (page_key) do nothing;

update public.products
set
  nama = 'Kaos Polos New State Apparel',
  deskripsi = replace(deskripsi, 'kaos polos import', 'kaos polos New State Apparel'),
  short_detail = replace(short_detail, 'kaos polos import', 'kaos polos New State Apparel')
where nama = 'Kaos Polos Import';

update public.products set price = 5000 where nama ilike 'Sablon DTF%';
update public.products set price = 75000 where nama = 'Custom Jersey';
update public.products set price = 25000 where nama = 'Maklon DTF';

update public.hero_banners
set
  badge = replace(badge, 'KAOS POLOS IMPORT', 'KAOS POLOS NEW STATE APPAREL'),
  headline = replace(headline, 'KAOS POLOS IMPORT', 'KAOS POLOS NEW STATE APPAREL'),
  title = replace(title, 'KAOS POLOS IMPORT', 'KAOS POLOS NEW STATE APPAREL'),
  mobile_image_url = coalesce(mobile_image_url, '/images/debroder/hero/hero-1-mobile.jpg'),
  mobile_object_position = coalesce(mobile_object_position, object_position, 'center center')
where urutan = 1 or headline ilike '%KAOS POLOS%';

update public.hero_banners
set
  mobile_image_url = coalesce(mobile_image_url, '/images/debroder/hero/hero-2-mobile.jpg'),
  mobile_object_position = coalesce(mobile_object_position, object_position, 'center center')
where headline ilike '%SABLON DTF%';

update public.page_heroes
set
  title = 'Kaos Polos New State Apparel & Cotton Combed',
  mobile_image_url = coalesce(mobile_image_url, '/images/debroder/page-heroes/hero-kaos-polos-mobile.jpg'),
  mobile_object_position = coalesce(mobile_object_position, object_position, 'center center')
where page_key = 'kaos-polos';

update public.instagram_banners
set
  mobile_image_url = coalesce(mobile_image_url, '/images/debroder/banners/banner-instagram-mobile.jpg'),
  object_position = coalesce(object_position, 'center center'),
  mobile_object_position = coalesce(mobile_object_position, object_position, 'center center');

insert into public.order_steps
  (title, description, urutan, status_aktif)
values
  ('Pilih layanan', 'Tentukan kebutuhan apparel, sablon, jersey, atau custom.', 1, true),
  ('Konsultasi kebutuhan', 'Diskusikan bahan, desain, jumlah, ukuran, dan estimasi.', 2, true),
  ('Kirim desain/detail', 'Kirim file, logo, referensi, atau detail pesanan.', 3, true),
  ('Proses produksi', 'Pesanan diproses sesuai detail yang disepakati.', 4, true),
  ('Ambil di store', 'Ambil pesanan di store DE BRODER pilihan Anda.', 5, true)
on conflict do nothing;

insert into public.trust_about_content
  (trust_items, about_body, status_aktif)
values
  (array['Berdiri sejak 2016', 'Store Makassar & Parepare', 'Sablon DTF', 'Custom Jersey', 'Maklon DTF'], 'De Broder adalah perusahaan percetakan yang berdiri sejak tahun 2016. Kami fokus mengerjakan:

Sablon Kaos
Custom Jersey
Maklon DTF
Cetak Sublim
Distributor Kaos NSA
Kaos Cotton Combed

Kami telah dipercaya oleh berbagai perusahaan, instansi, dan event besar di Indonesia Timur, khususnya di kota Makassar.', true)
on conflict do nothing;

insert into public.product_filters
  (filter_type, name, slug, color_hex, min_price, max_price, urutan, status_aktif)
values
  ('collection', 'Semua Produk', 'semua-produk', null, null, null, 1, true),
  ('collection', 'Best Seller', 'best-seller', null, null, null, 2, true),
  ('collection', 'New Arrival', 'new-arrival', null, null, null, 3, true),
  ('color', 'Putih', 'putih', '#ffffff', null, null, 1, true),
  ('color', 'Hitam', 'hitam', '#111111', null, null, 2, true),
  ('color', 'Navy', 'navy', '#172554', null, null, 3, true),
  ('size', 'S', 's', null, null, null, 1, true),
  ('size', 'M', 'm', null, null, null, 2, true),
  ('size', 'L', 'l', null, null, null, 3, true),
  ('size', 'XL', 'xl', null, null, null, 4, true),
  ('material', 'Cotton Combed 24s', 'cotton-combed-24s', null, null, null, 1, true),
  ('material', 'Cotton Combed 30s', 'cotton-combed-30s', null, null, null, 2, true),
  ('brand', 'NSA', 'nsa', null, null, null, 1, true),
  ('price', 'Di bawah Rp 50.000', 'di-bawah-50000', null, 0, 50000, 1, true),
  ('price', 'Rp 50.000 ke atas', 'mulai-50000', null, 50000, null, 2, true)
on conflict (filter_type, slug) do update set
  name = excluded.name,
  color_hex = excluded.color_hex,
  min_price = excluded.min_price,
  max_price = excluded.max_price,
  urutan = excluded.urutan;

update public.products
set
  collection_tags = array['best-seller'],
  intent_tags = array['kaos-polos', 'sablon-dtf', 'komunitas', 'brand-apparel'],
  color_tags = array['putih', 'hitam', 'navy'],
  size_tags = array['s', 'm', 'l', 'xl'],
  material_tags = array['cotton-combed-24s'],
  brand = 'NSA'
where nama ilike '%New State%' or nama ilike '%NSA%';

update public.products
set
  collection_tags = array['new-arrival'],
  intent_tags = array['kaos-polos', 'sablon-dtf', 'brand-apparel'],
  color_tags = array['putih', 'hitam', 'navy'],
  size_tags = array['s', 'm', 'l', 'xl'],
  material_tags = array['cotton-combed-30s'],
  brand = coalesce(nullif(brand, ''), 'DE BRODER')
where nama ilike '%Cotton Combed%';

update public.products
set intent_tags = array['sablon-dtf', 'kaos-polos', 'maklon-dtf']
where kategori ilike '%sablon%' or nama ilike '%dtf%';

update public.products
set intent_tags = array['jersey', 'sublim', 'tim', 'komunitas']
where kategori ilike '%jersey%' or nama ilike '%jersey%';

update public.products
set intent_tags = array['cetak-sublim', 'jersey', 'tim', 'partai-besar']
where kategori ilike '%sublim%' or nama ilike '%sublim%';

update public.products
set intent_tags = array['maklon-dtf', 'reseller', 'brand-apparel', 'partai-besar']
where kategori ilike '%maklon%' or nama ilike '%maklon%';

update public.services
set
  category_key = 'sablon-dtf',
  image_alt = coalesce(nullif(image_alt, ''), nama),
  detail_body = coalesce(nullif(detail_body, ''), deskripsi),
  available_sizes = case when cardinality(available_sizes) = 0 then array['A4', 'A3', 'Lebar maksimal 58 cm'] else available_sizes end,
  production_estimate = coalesce(nullif(production_estimate, ''), 'Estimasi mengikuti jumlah dan antrean produksi.')
where slug = 'sablon-dtf';

insert into public.services
  (nama, slug, category_key, deskripsi, detail_body, image_url, image_alt, available_sizes, faq_items, production_estimate, harga_mulai, urutan, status_aktif)
select seed.*
from (values
  ('Sablon DTF Ukuran A4', 'sablon-dtf-a4', 'sablon-dtf', 'Pilihan praktis untuk logo, desain dada, dan artwork berukuran kecil.', 'Cocok untuk desain depan, belakang, logo komunitas, dan kebutuhan custom dengan bidang cetak hingga A4.', '/images/debroder/products/produk-sablon-dtf.jpg', 'Sablon DTF ukuran A4 DE BRODER', array['Maksimal A4']::text[], array['File apa yang disarankan? Gunakan PNG transparan beresolusi tinggi atau file desain siap cetak.']::text[], 'Mulai 1 hari kerja, menyesuaikan jumlah.', 5000::numeric, 2, true),
  ('Sablon DTF Ukuran A3', 'sablon-dtf-a3', 'sablon-dtf', 'Bidang cetak lebih besar untuk desain utama pada apparel.', 'Pilihan untuk artwork besar dengan detail warna tajam pada kaos dan apparel berbahan sesuai rekomendasi produksi.', '/images/debroder/products/produk-sablon-dtf.jpg', 'Sablon DTF ukuran A3 DE BRODER', array['Maksimal A3']::text[], array['Apakah bisa penuh warna? Bisa, hasil mengikuti kualitas dan profil warna file desain.']::text[], 'Mulai 1 hari kerja, menyesuaikan jumlah.', 10000::numeric, 3, true),
  ('Sablon DTF Meteran', 'sablon-dtf-meteran', 'sablon-dtf', 'Efisien untuk banyak desain dan kebutuhan produksi apparel.', 'Layanan cetak lembaran meteran untuk brand, reseller, dan produksi dengan banyak artwork dalam satu susunan desain.', '/images/debroder/products/produk-sablon-dtf.jpg', 'Sablon DTF meteran DE BRODER', array['Lebar maksimal 58 cm', 'Panjang sesuai kebutuhan']::text[], array['Apakah file bisa disusun? Susunan artwork dapat dikonsultasikan sebelum cetak.']::text[], 'Estimasi mengikuti panjang cetak dan antrean produksi.', 35000::numeric, 4, true)
) as seed(nama, slug, category_key, deskripsi, detail_body, image_url, image_alt, available_sizes, faq_items, production_estimate, harga_mulai, urutan, status_aktif)
where not exists (select 1 from public.services existing where existing.slug = seed.slug);

insert into public.service_categories
  (nama_kategori, deskripsi, gambar_url, image_alt, category_key, slug, link_slug, color_options, collar_options, sleeve_options, material_options, faq_items, urutan, status_aktif)
select seed.*
from (values
  ('Jersey Futsal', 'Jersey ringan untuk tim futsal, turnamen, dan komunitas.', '/images/debroder/products/produk-jersey.jpg', 'Jersey futsal custom DE BRODER', 'jersey', 'jersey-futsal', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Milano']::text[], array['Minimum order? Konsultasikan jumlah pesanan melalui WhatsApp.']::text[], 7, true),
  ('Jersey Sepak Bola', 'Jersey custom lengkap untuk klub, sekolah, dan kompetisi.', '/images/debroder/products/produk-jersey.jpg', 'Jersey sepak bola custom DE BRODER', 'jersey', 'jersey-sepak-bola', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck', 'Polo']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Milano']::text[], array['Bisa pakai nama dan nomor? Bisa, detail dapat dibuat untuk setiap pemain.']::text[], 8, true),
  ('Jersey Esports', 'Jersey esports penuh warna untuk roster, komunitas, dan event.', '/images/debroder/products/produk-jersey.jpg', 'Jersey esports custom DE BRODER', 'jersey', 'jersey-esports', 'jersey', array['Warna custom sesuai identitas tim']::text[], array['O-neck', 'V-neck', 'Polo']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Milano']::text[], array['Apakah desain dibantu? Tim dapat mengarahkan penyesuaian desain sebelum produksi.']::text[], 9, true),
  ('Jersey Sepeda', 'Jersey sepeda custom dengan pilihan lengan dan detail tim.', '/images/debroder/products/produk-jersey.jpg', 'Jersey sepeda custom DE BRODER', 'jersey', 'jersey-sepeda', 'jersey', array['Warna custom sesuai desain']::text[], array['Kerah rendah', 'Kerah tinggi']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Microfiber']::text[], array['Bisa menambah saku belakang? Detail model dapat dikonsultasikan sebelum produksi.']::text[], 10, true),
  ('Jersey Badminton', 'Jersey fleksibel untuk klub badminton dan turnamen.', '/images/debroder/products/produk-jersey.jpg', 'Jersey badminton custom DE BRODER', 'jersey', 'jersey-badminton', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Milano']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 11, true),
  ('Jersey Basket', 'Jersey basket custom untuk tim, sekolah, dan kompetisi.', '/images/debroder/products/produk-jersey.jpg', 'Jersey basket custom DE BRODER', 'jersey', 'jersey-basket', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck']::text[], array['Tanpa lengan', 'Pendek']::text[], array['Dryfit', 'Milano']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 12, true),
  ('Jersey Voli', 'Jersey voli custom untuk klub, komunitas, dan event.', '/images/debroder/products/produk-jersey.jpg', 'Jersey voli custom DE BRODER', 'jersey', 'jersey-voli', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Milano']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 13, true),
  ('Jersey Running', 'Jersey running ringan untuk komunitas dan race event.', '/images/debroder/products/produk-jersey.jpg', 'Jersey running custom DE BRODER', 'jersey', 'jersey-running', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck']::text[], array['Tanpa lengan', 'Pendek']::text[], array['Dryfit', 'Microfiber']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 14, true),
  ('Jersey Fishing', 'Jersey fishing custom untuk komunitas dan kegiatan luar ruang.', '/images/debroder/products/produk-jersey.jpg', 'Jersey fishing custom DE BRODER', 'jersey', 'jersey-fishing', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'Polo']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Microfiber']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 15, true),
  ('Jersey Touring', 'Jersey touring custom untuk klub dan perjalanan komunitas.', '/images/debroder/products/produk-jersey.jpg', 'Jersey touring custom DE BRODER', 'jersey', 'jersey-touring', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'Polo']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Microfiber']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 16, true),
  ('Jersey Komunitas', 'Jersey identitas untuk komunitas, organisasi, dan gathering.', '/images/debroder/products/produk-jersey.jpg', 'Jersey komunitas custom DE BRODER', 'jersey', 'jersey-komunitas', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck', 'Polo']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Milano']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 17, true),
  ('Jersey Event', 'Jersey custom untuk panitia, peserta, dan merchandise event.', '/images/debroder/products/produk-jersey.jpg', 'Jersey event custom DE BRODER', 'jersey', 'jersey-event', 'jersey', array['Warna custom sesuai desain']::text[], array['O-neck', 'V-neck', 'Polo']::text[], array['Pendek', 'Panjang']::text[], array['Dryfit', 'Milano']::text[], array['Detail desain dan jumlah pesanan dapat dikonsultasikan melalui WhatsApp.']::text[], 18, true)
) as seed(nama_kategori, deskripsi, gambar_url, image_alt, category_key, slug, link_slug, color_options, collar_options, sleeve_options, material_options, faq_items, urutan, status_aktif)
where not exists (select 1 from public.service_categories existing where existing.slug = seed.slug);

update public.service_categories
set size_chart = array['S', 'M', 'L', 'XL', 'XXL']
where category_key = 'jersey' and cardinality(size_chart) = 0;

insert into public.contact_settings
  (email, whatsapp_utama, whatsapp_link, whatsapp_apparel, whatsapp_express, facebook, instagram, copyright_text, status_aktif)
values
  ('debroderapparel@gmail.com', '0853-5533-3364', 'https://wa.me/6285355333364', '0853-5533-3364', '0853-5533-3364', 'https://www.facebook.com/debroderapparel/', 'https://instagram.com/de_broder', '© 2026 DE BRODER. All rights reserved.', true)
on conflict do nothing;

insert into public.homepage_sections (title, slug, is_active, sort_order)
values
  ('Featured', 'featured', true, 10),
  ('Trending', 'trending', true, 20),
  ('Fresh Drops', 'fresh-drops', true, 30),
  ('Shop by Category', 'services-products', true, 60)
on conflict (slug) do nothing;

insert into public.homepage_sections (title, slug, is_active, sort_order)
values
  ('Pakaian Polos Berdasarkan Kategori', 'pakaian-polos-berdasarkan-kategori', true, 40)
on conflict (slug) do update set
  title = excluded.title;

insert into public.homepage_section_items (section_id, service_id, is_active, sort_order)
select section.id, service.id, true, placement.sort_order
from (
  values
    ('featured', 'jersey', 10),
    ('featured', 'sablon-dtf', 20),
    ('trending', 'kaos-polos', 10),
    ('trending', 'maklon-dtf', 20),
    ('trending', 'cetak-sublim', 30)
) as placement(section_slug, service_slug, sort_order)
join public.homepage_sections section on section.slug = placement.section_slug
join lateral (
  select candidate.id
  from public.services candidate
  where candidate.slug = placement.service_slug
  order by candidate.urutan, candidate.created_at
  limit 1
) service on true
where not exists (
  select 1
  from public.homepage_section_items existing
  where existing.section_id = section.id
    and existing.service_id = service.id
);

insert into public.homepage_section_items (section_id, product_id, is_active, sort_order)
select
  section.id,
  product.id,
  true,
  row_number() over (order by product.urutan, product.created_at)::integer * 10
from public.homepage_sections section
cross join lateral (
  select item.*
  from public.products item
  where item.status_aktif = true
  order by item.urutan, item.created_at
  limit 5
) product
where section.slug = 'fresh-drops'
  and not exists (
    select 1
    from public.homepage_section_items existing
    where existing.section_id = section.id
      and existing.product_id = product.id
  );

insert into public.landing_sections
  (section_key, title, subtitle, is_visible, sort_order, metadata)
values
  ('hero', 'Hero / Hero Slider', '', true, 10, '{}'::jsonb),
  ('benefits', '4 Keunggulan', '', true, 20, '{}'::jsonb),
  ('featured-products', 'Featured', '', true, 30, '{}'::jsonb),
  ('trending', 'Trending', '', true, 40, '{}'::jsonb),
  ('fresh-drop', 'Fresh Drops', '', true, 50, '{}'::jsonb),
  ('campaign-banners', 'Campaign Banner', '', true, 55, '{}'::jsonb),
  ('services-products', 'Shop by Category', '', true, 60, '{}'::jsonb),
  ('plain-category', 'Pakaian Polos berdasarkan Kategori', 'Pilih dasar apparel yang sesuai, lalu custom bersama tim DEBRODER.', false, 70, '{}'::jsonb),
  ('instagram-banner', 'Banner Instagram', '', true, 80, '{}'::jsonb),
  ('stores', 'Store DEBRODER', 'Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami.', true, 90, '{}'::jsonb),
  ('about', 'Tentang DEBRODER', '', true, 100, '{}'::jsonb)
on conflict (section_key) do nothing;

-- Product category architecture: keep product_categories as MAIN categories only.
-- Subtypes such as Hoodie, Jacket, Jersey Futsal, Cotton Combed, and Topi must live as subcategories, not top-level product categories.
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

with subcategory_category_slugs as (
  select * from (values
    ('kaos-cotton-combed'), ('cotton-combed'), ('new-state-apparel'), ('nsa'), ('polo-shirt'), ('polo'), ('kaos-polos-anak'), ('kaos-anak'), ('kids-t-shirt'),
    ('jacket'), ('jaket'), ('hoodie'), ('hooded'), ('crewneck'), ('crewnek'), ('bomber-jacket'), ('windbreaker'), ('zip-hoodie'), ('pullover-hoodie'),
    ('topi'), ('cap'), ('baseball-cap'), ('trucker-cap'), ('snapback'), ('bucket-hat'), ('dad-hat'), ('visor'), ('beanie'), ('kupluk'),
    ('jersey-futsal'), ('jersey-sepak-bola'), ('jersey-esports'), ('jersey-basket'), ('jersey-sepeda'), ('jersey-badminton'), ('jersey-voli'), ('jersey-running'), ('jersey-fishing'), ('jersey-touring'), ('jersey-komunitas'), ('jersey-event'),
    ('dtf-a4'), ('a4'), ('dtf-a3'), ('a3'), ('dtf-meteran'), ('meteran')
  ) as old(slug)
)
update public.product_categories category
set
  is_active = false,
  show_in_collection = false
from subcategory_category_slugs old
where category.slug = old.slug
  and category.slug not in ('kaos-polos', 'jaket-hoodie', 'headwear', 'sablon-dtf', 'jersey', 'cetak-sublim', 'maklon-dtf');

insert into public.website_settings (setting_key, label, value, description, group_name)
values
  ('site_identity', 'Identitas Website', '{"brand_name":"DEBRODER"}'::jsonb, 'Identitas dasar website.', 'general'),
  ('default_contact', 'Kontak Default', '{"whatsapp":"https://wa.me/6285355333364"}'::jsonb, 'Kontak fallback untuk CTA publik.', 'contact'),
  ('manual_payment', 'Pembayaran Manual', '{"enabled":true,"instructions":"Transfer sesuai arahan tim DEBRODER lalu upload bukti pembayaran."}'::jsonb, 'Instruksi pembayaran manual untuk order website.', 'payment')
on conflict (setting_key) do nothing;

update public.products product
set
  featured = exists (
    select 1 from public.homepage_section_items item
    join public.homepage_sections section on section.id = item.section_id
    where item.product_id = product.id and section.slug = 'featured' and item.is_active = true
  ),
  trending = exists (
    select 1 from public.homepage_section_items item
    join public.homepage_sections section on section.id = item.section_id
    where item.product_id = product.id and section.slug = 'trending' and item.is_active = true
  ),
  fresh_drop = exists (
    select 1 from public.homepage_section_items item
    join public.homepage_sections section on section.id = item.section_id
    where item.product_id = product.id and section.slug = 'fresh-drops' and item.is_active = true
  );
