begin;

create temporary table canonical_physical_products (
  sku text primary key,
  slug text not null unique,
  display_name text not null,
  category_slug text not null,
  category_name text not null,
  subcategory_slug text not null,
  subcategory_name text not null,
  locked_price integer not null check (locked_price > 0),
  catalog_copy text not null,
  short_summary text not null,
  full_description text not null,
  specifications text[] not null,
  seo_title text not null,
  seo_description text not null,
  image_alt text not null
) on commit drop;

insert into canonical_physical_products values
(
  'DBR-CC24', 'cotton-combed-24s', 'Kaos Cotton Combed 24s',
  'kaos-polos', 'Kaos Polos', 'cotton-combed', 'Cotton Combed', 45000,
  'Kaos harian berbahan Cotton Combed 24s dengan pilihan warna dan ukuran yang mudah disesuaikan.',
  'Bahan Cotton Combed 24s terasa nyaman untuk pemakaian harian maupun kebutuhan cetak dan bordir.',
  'Kaos Cotton Combed 24s menawarkan ketebalan yang seimbang untuk pemakaian sehari-hari. Pilihan warna dan ukuran berasal langsung dari varian PIM, sehingga Anda dapat memilih kombinasi yang tersedia sebelum membeli. Harga akhir dihitung oleh server berdasarkan ukuran dan jumlah. Untuk menjaga kondisi kaos, cuci bersama warna sejenis, balik bagian dalam saat mencuci, dan ikuti petunjuk pada label perawatan. Warna pada layar dapat sedikit berbeda karena pencahayaan foto dan pengaturan perangkat.',
  array['Material: Cotton Combed 24s','Karakter: nyaman untuk pemakaian harian','Pilihan: warna dan ukuran mengikuti varian tersedia','Ukuran: pilih ukuran yang biasa digunakan; 2XL ke atas memiliki penyesuaian harga','Perawatan: cuci dengan warna sejenis dan ikuti label perawatan'],
  'Kaos Cotton Combed 24s | DEBRODER',
  'Kaos Cotton Combed 24s dengan pilihan warna, ukuran, stok, dan harga yang tervalidasi sebelum checkout.',
  'Kaos Cotton Combed 24s DEBRODER'
),
(
  'DBR-3600', '3600-soft-tee', 'Kaos Polos NSA',
  'kaos-polos', 'Kaos Polos', 'new-state-apparel', 'New State Apparel', 45000,
  'Kaos polos New State Apparel dengan pilihan warna dan ukuran untuk kebutuhan harian maupun produksi custom.',
  'Pilih warna, ukuran, dan jumlah yang tersedia untuk melihat harga pasti sebelum masuk ke checkout.',
  'Kaos Polos NSA disiapkan sebagai produk dasar untuk pemakaian harian dan kebutuhan produksi custom. Seluruh warna, ukuran, SKU, dan stok mengikuti varian yang tercatat di PIM. Harga akhir divalidasi oleh server setelah pilihan ukuran dan jumlah ditentukan. Informasi teknis bahan tidak diterbitkan sebelum data pemasok tercatat lengkap. Pilih ukuran yang biasa Anda gunakan; ukuran 2XL ke atas memiliki penyesuaian harga. Ikuti petunjuk pada label perawatan produk untuk proses pencucian.',
  array['Produk dasar New State Apparel','Pilihan warna dan ukuran mengikuti PIM','SKU dan stok divalidasi per varian','Ukuran 2XL ke atas memiliki penyesuaian harga','Perawatan: ikuti label perawatan produk'],
  'Kaos Polos NSA | DEBRODER',
  'Pilih Kaos Polos NSA berdasarkan warna, ukuran, stok, dan harga pasti yang divalidasi sebelum checkout.',
  'Kaos Polos NSA DEBRODER'
),
(
  'DBR-8100', '8100-polo', 'Polo Shirt Polos',
  'kaos-polos', 'Kaos Polos', 'polo-shirt', 'Polo Shirt', 60000,
  'Polo shirt polos dengan kerah untuk kebutuhan seragam, komunitas, dan tampilan kasual yang rapi.',
  'Model polo berkerah dengan pilihan warna dan ukuran yang mengikuti ketersediaan varian.',
  'Polo Shirt Polos memberi pilihan model berkerah untuk seragam, komunitas, maupun pemakaian kasual. Warna, ukuran, SKU, dan stok berasal dari PIM dan divalidasi kembali saat pembelian. Harga pasti ditampilkan setelah ukuran dan jumlah dipilih. Informasi komposisi bahan tidak diterbitkan sebelum spesifikasi pemasok tercatat lengkap. Pilih ukuran yang biasa digunakan; ukuran 2XL ke atas memiliki penyesuaian harga. Untuk perawatan, ikuti petunjuk pada label produk dan pisahkan warna saat pencucian pertama.',
  array['Model polo berkerah','Pilihan untuk seragam dan pemakaian kasual','Warna dan ukuran mengikuti varian tersedia','Harga dan stok divalidasi sebelum checkout','Perawatan: ikuti label produk'],
  'Polo Shirt Polos | DEBRODER',
  'Polo shirt polos berkerah dengan pilihan warna, ukuran, stok, dan harga pasti sebelum checkout.',
  'Polo Shirt Polos DEBRODER'
),
(
  'DBR-72Y00', '72y00-youth', 'Kaos Polos Anak Cotton Combed',
  'kaos-polos', 'Kaos Polos', 'kaos-polos-anak', 'Kaos Polos Anak', 37000,
  'Kaos polos anak berbahan Cotton Combed dengan pilihan warna dan ukuran yang tercatat per varian.',
  'Kaos anak untuk pemakaian harian dengan pemilihan warna, ukuran, dan stok yang jelas.',
  'Kaos Polos Anak Cotton Combed tersedia dalam pilihan warna dan ukuran anak yang tercatat di PIM. Setiap kombinasi memiliki SKU dan stok sendiri agar pilihan dapat divalidasi sebelum checkout. Harga akhir mengikuti ukuran dan jumlah yang dipilih, lalu dihitung ulang oleh server. Gunakan panduan ukuran dan bandingkan dengan pakaian anak yang nyaman dipakai saat ini. Cuci bersama warna sejenis, gunakan proses pencucian lembut, dan ikuti petunjuk pada label perawatan.',
  array['Material: Cotton Combed','Pilihan warna dan ukuran anak mengikuti PIM','SKU dan stok divalidasi per varian','Panduan ukuran membantu memilih dengan lebih tepat','Perawatan: cuci lembut dan ikuti label'],
  'Kaos Polos Anak Cotton Combed | DEBRODER',
  'Kaos polos anak Cotton Combed dengan pilihan warna, ukuran, stok, dan harga pasti sebelum checkout.',
  'Kaos Polos Anak Cotton Combed DEBRODER'
),
(
  'DBR-PULLOVER', 'pullover-hooded', 'Hoodie Fleece',
  'jaket-hoodie', 'Jaket & Hoodie', 'hoodie', 'Hoodie', 140000,
  'Hoodie berbahan fleece dengan pilihan warna dan ukuran untuk pemakaian harian dan kebutuhan custom.',
  'Model pullover dengan tudung; warna, ukuran, dan stok mengikuti varian yang tersedia.',
  'Hoodie Fleece menggunakan model pullover bertudung untuk pemakaian harian maupun kebutuhan custom. Pilihan warna, ukuran, SKU, dan stok berasal dari PIM sehingga kombinasi yang dipilih dapat divalidasi sebelum checkout. Harga akhir dihitung oleh server berdasarkan ukuran dan jumlah. Pilih ukuran yang biasa digunakan atau beri ruang tambahan bila menginginkan pemakaian lebih longgar. Cuci bersama warna sejenis, hindari panas berlebih, dan ikuti petunjuk pada label perawatan.',
  array['Material utama: fleece','Model: pullover bertudung','Warna dan ukuran mengikuti varian tersedia','Harga pasti dihitung setelah pilihan lengkap','Perawatan: hindari panas berlebih dan ikuti label'],
  'Hoodie Fleece | DEBRODER',
  'Hoodie Fleece model pullover dengan pilihan warna, ukuran, stok, dan harga pasti sebelum checkout.',
  'Hoodie Fleece DEBRODER'
),
(
  'DBR-CREWNECK', 'crewneck', 'Crewneck Fleece',
  'jaket-hoodie', 'Jaket & Hoodie', 'crewneck', 'Crewneck', 100000,
  'Crewneck berbahan fleece tanpa tudung dengan pilihan warna dan ukuran untuk pemakaian harian.',
  'Siluet crewneck tanpa tudung dengan harga dan stok yang divalidasi per varian.',
  'Crewneck Fleece menawarkan model tanpa tudung yang mudah dipadukan untuk pemakaian harian. Warna, ukuran, SKU, dan stok mengikuti varian yang tercatat di PIM. Harga akhir dihitung oleh server setelah ukuran dan jumlah ditentukan. Pilih ukuran yang biasa digunakan atau naikkan satu ukuran bila menginginkan ruang lebih longgar. Untuk menjaga permukaan bahan, balik pakaian saat mencuci, gunakan suhu rendah, dan ikuti petunjuk pada label perawatan.',
  array['Material utama: fleece','Model: crewneck tanpa tudung','Pilihan warna dan ukuran mengikuti PIM','SKU dan stok divalidasi per varian','Perawatan: cuci terbalik pada suhu rendah'],
  'Crewneck Fleece | DEBRODER',
  'Crewneck Fleece tanpa tudung dengan pilihan warna, ukuran, stok, dan harga pasti sebelum checkout.',
  'Crewneck Fleece hitam DEBRODER'
),
(
  'DBR-BOMBER', 'bomber-jacket', 'Bomber Jacket Custom',
  'jaket-hoodie', 'Jaket & Hoodie', 'bomber-jacket', 'Bomber Jacket', 205000,
  'Jaket model bomber untuk kebutuhan custom dengan pilihan warna dan ukuran yang tercatat per varian.',
  'Model bomber dengan alur pemilihan varian, stok, dan harga yang jelas sebelum checkout.',
  'Bomber Jacket Custom menggunakan siluet bomber dan tersedia dalam kombinasi warna serta ukuran yang tercatat di PIM. Setiap kombinasi memiliki SKU dan stok tersendiri. Harga akhir dihitung oleh server setelah pilihan ukuran dan jumlah lengkap. Informasi komposisi bahan tidak diterbitkan sebelum spesifikasi pemasok tercatat lengkap. Pilih ukuran yang biasa digunakan dan periksa panduan ukuran sebelum membeli. Ikuti petunjuk pada label produk untuk pencucian dan pengeringan.',
  array['Model: bomber jacket','Pilihan warna dan ukuran mengikuti PIM','SKU dan stok divalidasi per varian','Harga pasti ditampilkan sebelum checkout','Perawatan: ikuti label produk'],
  'Bomber Jacket Custom | DEBRODER',
  'Bomber Jacket Custom dengan pilihan warna, ukuran, stok, dan harga pasti yang tervalidasi sebelum checkout.',
  'Bomber Jacket Custom DEBRODER'
),
(
  'DBR-WINDBREAKER', 'windbreaker', 'Windbreaker Custom',
  'jaket-hoodie', 'Jaket & Hoodie', 'windbreaker', 'Windbreaker', 185000,
  'Jaket model windbreaker untuk kebutuhan custom dengan pilihan warna dan ukuran berbasis varian.',
  'Pilih kombinasi warna, ukuran, dan jumlah untuk melihat stok serta harga pasti.',
  'Windbreaker Custom disiapkan dalam model windbreaker dengan pilihan warna dan ukuran yang tercatat di PIM. SKU dan stok divalidasi pada setiap kombinasi sebelum produk dapat ditambahkan ke keranjang. Harga akhir dihitung oleh server berdasarkan ukuran dan jumlah. Informasi teknis bahan tidak diterbitkan sebelum spesifikasi pemasok tercatat lengkap. Pilih ukuran yang biasa digunakan dan ikuti petunjuk pada label produk untuk pencucian serta pengeringan.',
  array['Model: windbreaker','Warna dan ukuran mengikuti varian tersedia','SKU dan stok divalidasi per kombinasi','Harga pasti dihitung oleh server','Perawatan: ikuti label produk'],
  'Windbreaker Custom | DEBRODER',
  'Windbreaker Custom dengan pilihan warna, ukuran, stok, dan harga pasti yang divalidasi sebelum checkout.',
  'Windbreaker Custom DEBRODER'
),
(
  'DBR-ZIPHOOD', 'zip-hooded', 'Zip Hoodie Custom',
  'jaket-hoodie', 'Jaket & Hoodie', 'zip-hoodie', 'Zip Hoodie', 150000,
  'Hoodie beritsleting untuk kebutuhan custom dengan pilihan warna dan ukuran yang tercatat per varian.',
  'Model hoodie beritsleting dengan stok dan harga yang divalidasi berdasarkan pilihan Anda.',
  'Zip Hoodie Custom menggunakan model hoodie beritsleting untuk pemakaian harian dan kebutuhan custom. Pilihan warna, ukuran, SKU, dan stok mengikuti data varian di PIM. Harga akhir dihitung oleh server setelah ukuran dan jumlah lengkap. Informasi komposisi bahan tidak diterbitkan sebelum spesifikasi pemasok tercatat lengkap. Pilih ukuran yang biasa digunakan atau beri ruang tambahan sesuai preferensi. Tutup ritsleting sebelum mencuci dan ikuti petunjuk pada label perawatan.',
  array['Model: hoodie beritsleting','Warna dan ukuran mengikuti varian tersedia','SKU dan stok divalidasi per kombinasi','Harga pasti dihitung sebelum checkout','Perawatan: tutup ritsleting dan ikuti label'],
  'Zip Hoodie Custom | DEBRODER',
  'Zip Hoodie Custom dengan pilihan warna, ukuran, stok, dan harga pasti yang tervalidasi sebelum checkout.',
  'Zip Hoodie Custom DEBRODER'
),
(
  'DBD-HDWR', '6089-premium-classic-snapback', 'Topi Custom',
  'headwear', 'Headwear', 'topi', 'Topi', 30000,
  'Topi snapback custom dengan pengatur ukuran dan stok yang divalidasi sebelum checkout.',
  'Model snapback dengan pengatur ukuran untuk pemakaian harian dan kebutuhan custom.',
  'Topi Custom menggunakan model snapback dengan pengatur ukuran di bagian belakang. Data PIM mencatat komposisi 80% acrylic dan 20% wool; warna camo memiliki komposisi 60% cotton dan 40% polyester. Pilihan varian, SKU, dan stok divalidasi sebelum checkout. Harga akhir dihitung oleh server berdasarkan pilihan dan jumlah. Bersihkan noda secara lembut, hindari perendaman lama, dan ikuti petunjuk pada label perawatan agar bentuk topi tetap terjaga.',
  array['Model: snapback dengan pengatur ukuran','Komposisi utama: 80% acrylic dan 20% wool','Komposisi warna camo: 60% cotton dan 40% polyester','Varian dan stok divalidasi sebelum checkout','Perawatan: bersihkan lembut dan hindari perendaman lama'],
  'Topi Custom Snapback | DEBRODER',
  'Topi Custom model snapback dengan pilihan varian, stok, dan harga pasti sebelum checkout.',
  'Topi Custom model snapback DEBRODER'
);

do $$
declare
  mapped_count integer;
begin
  select count(*) into mapped_count
  from canonical_physical_products target
  join public.products product
    on product.slug = target.slug
   and upper(btrim(product.sku)) = target.sku;

  if mapped_count <> 10 then
    raise exception
      'CANONICAL_PRODUCT_V1_ABORT_PHYSICAL_MAPPING: expected 10, received %',
      mapped_count;
  end if;
end
$$;

insert into public.product_subcategories (
  category_id, name, slug, description, public_label, is_active, admin_notes
)
select
  category.id,
  target.subcategory_name,
  target.subcategory_slug,
  'Canonical owner-locked product subcategory.',
  target.subcategory_name,
  true,
  'Canonical Product Data V1'
from canonical_physical_products target
join public.product_categories category
  on category.slug = target.category_slug
where not exists (
  select 1
  from public.product_subcategories existing
  where existing.category_id = category.id
    and existing.slug = target.subcategory_slug
);

update public.products product
set
  nama = target.display_name,
  name = target.display_name,
  kategori = target.category_name,
  subcategory = target.subcategory_name,
  product_category_id = category.id,
  product_subcategory_id = subcategory.id,
  deskripsi = target.catalog_copy,
  short_detail = target.short_summary,
  description = target.full_description,
  specifications = target.specifications,
  seo_title = target.seo_title,
  seo_description = target.seo_description,
  canonical_url = '/produk/' || target.slug,
  image_alt = target.image_alt,
  product_type = 'standard_product',
  pricing_mode = 'variant_based',
  sales_mode = 'ready_stock',
  tier_scope = 'none',
  has_variants = true,
  uses_configurator = false,
  minimum_order_qty = 1,
  base_price = target.locked_price,
  price = target.locked_price,
  harga = target.locked_price,
  compare_price = null,
  price_label = null,
  badge = '',
  updated_at = now()
from canonical_physical_products target
join public.product_categories category
  on category.slug = target.category_slug
join public.product_subcategories subcategory
  on subcategory.category_id = category.id
 and subcategory.slug = target.subcategory_slug
where product.slug = target.slug
  and upper(btrim(product.sku)) = target.sku;

create temporary table canonical_jersey_products (
  sku text primary key,
  slug text not null unique,
  display_name text not null,
  subcategory_slug text not null,
  subcategory_name text not null,
  locked_price integer not null,
  summary text not null,
  description text not null
) on commit drop;

insert into canonical_jersey_products values
(
  'DBR-JRS-FUTSAL', 'jersey-futsal-custom', 'Jersey Futsal Custom',
  'jersey-futsal', 'Futsal', 100000,
  'Jersey futsal custom dengan konfigurasi model, warna, ukuran, identitas tim, dan jumlah pemain.',
  'Mulai dari pilihan jersey futsal, lalu lengkapi warna, ukuran, logo, nama, nomor, dan jumlah pemain melalui Jersey Configurator. Harga dasar canonical adalah Rp100.000 dan harga akhir divalidasi oleh server berdasarkan konfigurasi yang dipilih. Data desain tersimpan dalam alur sistem agar dapat ditinjau sebelum produksi.'
),
(
  'DBR-JRS-FOOTBALL', 'jersey-sepak-bola-custom', 'Jersey Sepak Bola Custom',
  'jersey-sepak-bola', 'Sepak Bola', 130000,
  'Jersey sepak bola custom dengan konfigurasi model, warna, ukuran, identitas tim, dan jumlah pemain.',
  'Mulai dari pilihan jersey sepak bola, lalu lengkapi warna, ukuran, logo, nama, nomor, dan jumlah pemain melalui Jersey Configurator. Harga dasar canonical adalah Rp130.000 dan harga akhir divalidasi oleh server berdasarkan konfigurasi yang dipilih. Data desain tersimpan dalam alur sistem agar dapat ditinjau sebelum produksi.'
);

update public.products product
set
  nama = target.display_name,
  name = target.display_name,
  kategori = 'Jersey',
  subcategory = target.subcategory_name,
  product_category_id = category.id,
  product_subcategory_id = subcategory.id,
  deskripsi = target.summary,
  short_detail = target.summary,
  description = target.description,
  specifications = array[
    'Alur: Jersey Configurator',
    'Pilihan: model, warna, ukuran, logo, nama, dan nomor',
    'Harga: divalidasi oleh server berdasarkan konfigurasi',
    'Produksi: dimulai setelah detail pesanan dan desain disetujui'
  ],
  seo_title = target.display_name || ' | DEBRODER',
  seo_description = target.summary,
  canonical_url = '/produk/' || target.slug,
  image_alt = target.display_name || ' DEBRODER',
  product_type = 'configurable_product',
  pricing_mode = 'configurator_based',
  sales_mode = 'custom',
  tier_scope = 'none',
  has_variants = false,
  uses_configurator = true,
  minimum_order_qty = 1,
  base_price = target.locked_price,
  price = target.locked_price,
  harga = target.locked_price,
  price_label = null,
  badge = '',
  link_url = '/jersey/configurator?product=' || target.slug,
  config_schema = jsonb_build_object('entry_type', 'jersey_configurator'),
  updated_at = now()
from canonical_jersey_products target
join public.product_categories category on category.slug = 'jersey'
join public.product_subcategories subcategory
  on subcategory.category_id = category.id
 and subcategory.slug = target.subcategory_slug
where product.slug = target.slug
  and upper(btrim(product.sku)) = target.sku;

update public.services
set
  nama = case slug
    when 'sablon-dtf-a4' then 'Sablon DTF A4'
    when 'sablon-dtf-a3' then 'Sablon DTF A3'
    else 'Sablon DTF Meteran'
  end,
  category_key = 'sablon-dtf',
  deskripsi = case slug
    when 'sablon-dtf-a4' then 'Layanan Sablon DTF ukuran A4 dengan harga exact Rp20.000.'
    when 'sablon-dtf-a3' then 'Layanan Sablon DTF ukuran A3 dengan harga exact Rp25.000.'
    else 'Layanan Sablon DTF meteran dengan harga exact Rp30.000 per meter.'
  end,
  detail_body = case slug
    when 'sablon-dtf-a4' then 'Pilih layanan A4 untuk bidang cetak sesuai ukuran A4. File desain dan detail kebutuhan diperiksa dalam alur layanan sebelum produksi.'
    when 'sablon-dtf-a3' then 'Pilih layanan A3 untuk bidang cetak sesuai ukuran A3. File desain dan detail kebutuhan diperiksa dalam alur layanan sebelum produksi.'
    else 'Pilih layanan meteran untuk kebutuhan cetak DTF per meter. File desain dan detail kebutuhan diperiksa dalam alur layanan sebelum produksi.'
  end,
  harga_mulai = case slug
    when 'sablon-dtf-a4' then 20000
    when 'sablon-dtf-a3' then 25000
    else 30000
  end,
  image_alt = case
    when nullif(btrim(coalesce(image_url, '')), '') is null then image_alt
    else case slug
      when 'sablon-dtf-a4' then 'Layanan Sablon DTF A4 DEBRODER'
      when 'sablon-dtf-a3' then 'Layanan Sablon DTF A3 DEBRODER'
      else 'Layanan Sablon DTF Meteran DEBRODER'
    end
  end,
  updated_at = now()
where slug in ('sablon-dtf-a4', 'sablon-dtf-a3', 'sablon-dtf-meteran');

update public.product_variant_sizes sellable
set
  price_adjustment = case
    when upper(regexp_replace(btrim(sellable.size_name), '[^A-Za-z0-9]+', '', 'g'))
      in ('S', 'M', 'L', 'XL') then 0
    when upper(regexp_replace(btrim(sellable.size_name), '[^A-Za-z0-9]+', '', 'g'))
      in ('2XL', 'XXL') then 10000
    when upper(regexp_replace(btrim(sellable.size_name), '[^A-Za-z0-9]+', '', 'g'))
      in ('3XL', 'XXXL') then 20000
    when upper(regexp_replace(btrim(sellable.size_name), '[^A-Za-z0-9]+', '', 'g'))
      in ('4XL', 'XXXXL') then 30000
    when upper(regexp_replace(btrim(sellable.size_name), '[^A-Za-z0-9]+', '', 'g'))
      = '5XL' then 40000
    else sellable.price_adjustment
  end,
  updated_at = now()
from public.product_variants variant
join public.products product on product.id = variant.product_id
join canonical_physical_products target
  on target.slug = product.slug
 and target.sku = upper(btrim(product.sku))
where sellable.variant_id = variant.id
  and upper(regexp_replace(btrim(sellable.size_name), '[^A-Za-z0-9]+', '', 'g'))
    in ('S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', 'XXXXL', '5XL');

do $$
declare
  target_location_count integer;
begin
  select count(*) into target_location_count
  from public.inventory_locations
  where active
    and location_type = 'store'
    and upper(btrim(name)) = 'STORE PETTARANI';

  if target_location_count <> 1 then
    raise exception
      'CANONICAL_PRODUCT_V1_ABORT_INVENTORY_LOCATION: expected STORE PETTARANI once, received %',
      target_location_count;
  end if;
end
$$;

insert into public.inventory_balances (
  location_id, variant_size_id, on_hand_quantity, reserved_quantity
)
select location.id, sellable.id, 0, 0
from public.inventory_locations location
cross join canonical_physical_products target
join public.products product
  on product.slug = target.slug
 and upper(btrim(product.sku)) = target.sku
join public.product_variants variant
  on variant.product_id = product.id
 and variant.status = 'active'
 and variant.is_active is not false
join public.product_variant_sizes sellable
  on sellable.variant_id = variant.id
 and sellable.status = 'active'
 and sellable.is_active is not false
where location.active
  and location.location_type = 'store'
  and upper(btrim(location.name)) = 'STORE PETTARANI'
on conflict(location_id, variant_size_id) do nothing;

create temporary table canonical_opening_adjustments on commit drop as
select
  target_location.id location_id,
  sellable.id variant_size_id,
  balance.on_hand_quantity before_on_hand,
  100 - coalesce(sum(all_balance.on_hand_quantity) filter (
    where all_location.active and all_location.location_type <> 'legacy'
  ), 0)::integer quantity_delta
from canonical_physical_products target
join public.products product
  on product.slug = target.slug
 and upper(btrim(product.sku)) = target.sku
join public.product_variants variant
  on variant.product_id = product.id
 and variant.status = 'active'
 and variant.is_active is not false
join public.product_variant_sizes sellable
  on sellable.variant_id = variant.id
 and sellable.status = 'active'
 and sellable.is_active is not false
join public.inventory_locations target_location
  on target_location.active
 and target_location.location_type = 'store'
 and upper(btrim(target_location.name)) = 'STORE PETTARANI'
join public.inventory_balances balance
  on balance.location_id = target_location.id
 and balance.variant_size_id = sellable.id
left join public.inventory_balances all_balance
  on all_balance.variant_size_id = sellable.id
left join public.inventory_locations all_location
  on all_location.id = all_balance.location_id
where not exists (
  select 1
  from public.inventory_movements movement
  where movement.idempotency_key = 'canonical-product-v1:' || sellable.id::text
)
group by target_location.id, sellable.id, balance.on_hand_quantity
having coalesce(sum(all_balance.on_hand_quantity) filter (
  where all_location.active and all_location.location_type <> 'legacy'
), 0) < 100;

update public.inventory_balances balance
set
  on_hand_quantity = balance.on_hand_quantity + adjustment.quantity_delta,
  updated_at = now()
from canonical_opening_adjustments adjustment
where balance.location_id = adjustment.location_id
  and balance.variant_size_id = adjustment.variant_size_id;

insert into public.inventory_movements (
  idempotency_key,
  variant_size_id,
  location_id,
  movement_type,
  quantity_delta,
  balance_after,
  on_hand_after,
  reserved_after,
  available_after,
  reason
)
select
  'canonical-product-v1:' || adjustment.variant_size_id::text,
  adjustment.variant_size_id,
  adjustment.location_id,
  'adjustment',
  adjustment.quantity_delta,
  adjustment.before_on_hand + adjustment.quantity_delta,
  adjustment.before_on_hand + adjustment.quantity_delta,
  balance.reserved_quantity,
  adjustment.before_on_hand + adjustment.quantity_delta - balance.reserved_quantity,
  'Owner-locked canonical opening stock: aggregate 100 units per valid trial variant'
from canonical_opening_adjustments adjustment
join public.inventory_balances balance
  on balance.location_id = adjustment.location_id
 and balance.variant_size_id = adjustment.variant_size_id
on conflict(idempotency_key) do nothing;

do $$
declare
  product_mismatch integer;
  jersey_mismatch integer;
  service_mismatch integer;
  stock_mismatch integer;
  duplicate_sku_count integer;
begin
  select count(*) into product_mismatch
  from canonical_physical_products target
  left join public.products product
    on product.slug = target.slug
   and upper(btrim(product.sku)) = target.sku
  where product.id is null
    or product.nama is distinct from target.display_name
    or product.kategori is distinct from target.category_name
    or product.subcategory is distinct from target.subcategory_name
    or product.base_price is distinct from target.locked_price
    or product.price is distinct from target.locked_price
    or product.harga is distinct from target.locked_price
    or product.sales_mode is distinct from 'ready_stock'
    or nullif(btrim(product.short_detail), '') is null
    or nullif(btrim(product.description), '') is null
    or nullif(btrim(product.seo_title), '') is null
    or nullif(btrim(product.seo_description), '') is null;

  select count(*) into jersey_mismatch
  from canonical_jersey_products target
  left join public.products product
    on product.slug = target.slug
   and upper(btrim(product.sku)) = target.sku
  where product.id is null
    or product.nama is distinct from target.display_name
    or product.base_price is distinct from target.locked_price
    or product.sales_mode is distinct from 'custom'
    or not product.uses_configurator;

  select count(*) into service_mismatch
  from (values
    ('sablon-dtf-a4', 'Sablon DTF A4', 20000),
    ('sablon-dtf-a3', 'Sablon DTF A3', 25000),
    ('sablon-dtf-meteran', 'Sablon DTF Meteran', 30000)
  ) target(slug, display_name, locked_price)
  left join public.services service on service.slug = target.slug
  where service.id is null
    or service.nama is distinct from target.display_name
    or service.harga_mulai is distinct from target.locked_price;

  with sellable_totals as (
    select sellable.id,
      coalesce(sum(balance.on_hand_quantity) filter (
        where location.active and location.location_type <> 'legacy'
      ), 0) aggregate_on_hand
    from canonical_physical_products target
    join public.products product
      on product.slug = target.slug
     and upper(btrim(product.sku)) = target.sku
    join public.product_variants variant
      on variant.product_id = product.id
     and variant.status = 'active'
     and variant.is_active is not false
    join public.product_variant_sizes sellable
      on sellable.variant_id = variant.id
     and sellable.status = 'active'
     and sellable.is_active is not false
    left join public.inventory_balances balance
      on balance.variant_size_id = sellable.id
    left join public.inventory_locations location
      on location.id = balance.location_id
    group by sellable.id
  )
  select count(*) into stock_mismatch
  from sellable_totals
  where aggregate_on_hand <> 100;

  select count(*) into duplicate_sku_count
  from (
    select upper(btrim(sellable.sku))
    from canonical_physical_products target
    join public.products product
      on product.slug = target.slug
     and upper(btrim(product.sku)) = target.sku
    join public.product_variants variant on variant.product_id = product.id
    join public.product_variant_sizes sellable on sellable.variant_id = variant.id
    where nullif(btrim(sellable.sku), '') is not null
    group by upper(btrim(sellable.sku))
    having count(*) > 1
  ) duplicate;

  if product_mismatch <> 0
     or jersey_mismatch <> 0
     or service_mismatch <> 0
     or stock_mismatch <> 0
     or duplicate_sku_count <> 0 then
    raise exception
      'CANONICAL_PRODUCT_V1_ABORT_POSTCHECK: physical %, jersey %, services %, stock %, duplicate_sku %',
      product_mismatch, jersey_mismatch, service_mismatch,
      stock_mismatch, duplicate_sku_count;
  end if;
end
$$;

insert into public.system_audit_log (
  entity_type, action, actor_role, source, reason, metadata
)
values (
  'product_catalog',
  'canonical_product_data_publication_readiness_v1_applied',
  'owner',
  'migration',
  'Owner-locked canonical product identity, content, SEO, price, size adjustment, and idempotent opening inventory.',
  jsonb_build_object(
    'physical_products', 10,
    'jersey_products', 2,
    'services', 3,
    'opening_stock_per_valid_variant', 100,
    'opening_inventory_location', 'STORE PETTARANI',
    'publication_state_changed', false,
    'rls_changed', false,
    'historical_orders_changed', false
  )
);

commit;
