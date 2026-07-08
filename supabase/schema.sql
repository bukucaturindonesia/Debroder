create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('viewer', 'superadmin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'superadmin'
  );
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null,
  deskripsi text not null,
  short_detail text,
  badge text not null default '',
  gambar_url text not null default '/images/debroder-hero.png',
  image_url text,
  image_alt text,
  collection_tags text[] not null default '{}',
  intent_tags text[] not null default '{}',
  color_tags text[] not null default '{}',
  size_tags text[] not null default '{}',
  material_tags text[] not null default '{}',
  brand text,
  object_fit text not null default 'cover' check (object_fit in ('cover', 'contain')),
  object_position text not null default 'center center',
  whatsapp_link text not null default '',
  link_url text,
  price numeric,
  harga numeric,
  base_price numeric,
  price_label text,
  compare_price numeric,
  subcategory text,
  description text,
  specifications text[] not null default '{}',
  gallery_urls text[] not null default '{}',
  label_new boolean not null default false,
  label_promo boolean not null default false,
  label_best_seller boolean not null default false,
  seo_title text,
  seo_description text,
  og_image_url text,
  canonical_url text,
  focal_x numeric not null default 50,
  focal_y numeric not null default 50,
  focal_zoom numeric not null default 1,
  target_ratio text not null default '4:5',
  focal_points jsonb not null default '{}'::jsonb,
  sales_count integer not null default 0,
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  nama_kategori text not null,
  deskripsi text not null,
  gambar_url text not null default '/images/debroder-hero.png',
  image_alt text,
  category_key text,
  slug text,
  gallery_urls text[] not null default '{}',
  color_options text[] not null default '{}',
  collar_options text[] not null default '{}',
  sleeve_options text[] not null default '{}',
  material_options text[] not null default '{}',
  size_chart text[] not null default '{}',
  faq_items text[] not null default '{}',
  object_fit text not null default 'cover' check (object_fit in ('cover', 'contain')),
  object_position text not null default 'center center',
  link_slug text not null default 'koleksi',
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  slug text not null,
  deskripsi text not null default '',
  image_url text not null default '/images/debroder/fallback/fallback-product.jpg',
  image_alt text,
  category_key text,
  detail_body text,
  available_sizes text[] not null default '{}',
  faq_items text[] not null default '{}',
  production_estimate text,
  object_fit text not null default 'cover' check (object_fit in ('cover', 'contain')),
  object_position text not null default 'center center',
  harga_mulai numeric,
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  nama_store text not null,
  layanan_utama text not null,
  alamat text not null,
  whatsapp text not null,
  whatsapp_link text not null,
  maps_link text not null,
  image_url text,
  image_alt text,
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  badge text not null default '',
  headline text not null default '',
  subheadline text not null default '',
  cta_primary_text text not null default '',
  cta_primary_link text not null default '/koleksi',
  cta_secondary_text text not null default '',
  cta_secondary_link text not null default '',
  image_url text not null default '/images/debroder-hero.png',
  image_alt text,
  mobile_image_url text,
  hero_video_url text,
  video_url text,
  object_position text not null default 'center center',
  mobile_object_position text not null default 'center center',
  object_fit text not null default 'cover' check (object_fit in ('cover', 'contain')),
  focal_x numeric,
  focal_y numeric,
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.about_content (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  title text not null,
  body text not null,
  highlights text[] not null default '{}',
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  sumber text not null,
  isi_testimoni text not null,
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_settings (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  whatsapp_utama text not null,
  whatsapp_link text not null default 'https://wa.me/6285355333364',
  whatsapp_apparel text not null,
  whatsapp_express text not null,
  facebook text not null default 'https://www.facebook.com/debroderapparel/',
  instagram text not null,
  copyright_text text not null default '© 2026 DEBRODER. All rights reserved.',
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Instagram DEBRODER',
  image_url text not null default '/images/debroder/banners/instagram-banner.jpg',
  image_alt text,
  mobile_image_url text,
  link_url text not null default 'https://instagram.com/de_broder',
  object_position text not null default 'center center',
  mobile_object_position text not null default 'center center',
  object_fit text not null default 'cover' check (object_fit in ('cover', 'contain')),
  focal_x numeric,
  focal_y numeric,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_heroes (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  label text not null,
  title text not null,
  subtitle text not null,
  image_url text not null default '/images/debroder/hero/page-hero.jpg',
  image_alt text,
  mobile_image_url text,
  object_position text not null default 'center center',
  mobile_object_position text not null default 'center center',
  object_fit text not null default 'cover' check (object_fit in ('cover', 'contain')),
  focal_x numeric,
  focal_y numeric,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trust_about_content (
  id uuid primary key default gen_random_uuid(),
  trust_items text[] not null default '{}',
  about_body text not null default '',
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  bucket_id text not null default 'website-images',
  public_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  alt_text text not null default '',
  tags text[] not null default '{}',
  content_hash text,
  folder text not null default 'Gallery',
  thumbnail_url text,
  uploaded_by uuid references auth.users(id) on delete set null,
  used_by text[] not null default '{}',
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_filters (
  id uuid primary key default gen_random_uuid(),
  filter_type text not null check (filter_type in ('collection', 'color', 'size', 'material', 'brand', 'price')),
  name text not null,
  slug text not null,
  color_hex text,
  min_price numeric,
  max_price numeric,
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (filter_type, slug)
);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.homepage_sections(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  custom_label text not null default '',
  custom_title text not null default '',
  custom_subtitle text not null default '',
  custom_button_label text not null default '',
  custom_link_url text not null default '',
  custom_image_url text not null default '',
  custom_mobile_image_url text,
  custom_image_alt text,
  custom_object_fit text not null default 'cover' check (custom_object_fit in ('cover', 'contain')),
  custom_object_position text not null default 'center center',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_section_items_one_source check (
    (product_id is not null and service_id is null)
    or (product_id is null and service_id is not null)
    or (
      product_id is null
      and service_id is null
      and nullif(custom_title, '') is not null
      and nullif(custom_link_url, '') is not null
      and nullif(custom_image_url, '') is not null
    )
  )
);

create table if not exists public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text not null,
  subtitle text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  desktop_image_url text,
  mobile_image_url text,
  video_url text,
  cta_label text not null default '',
  cta_url text not null default '',
  text_position text not null default 'left' check (text_position in ('left', 'center', 'right')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  show_in_collection boolean not null default true,
  collection_limit integer not null default 8,
  collection_sort text not null default 'sort_order' check (collection_sort in ('sort_order', 'newest', 'best_seller', 'promo')),
  collection_section_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_banners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  desktop_media_url text not null,
  mobile_media_url text,
  poster_url text,
  eyebrow text not null default '',
  title text not null,
  subtitle text not null default '',
  cta_label text not null default '',
  cta_url text not null default '',
  text_position text not null default 'left' check (text_position in ('left', 'center', 'right')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  status text not null default 'baru' check (status in (
    'baru',
    'menunggu_pembayaran',
    'sudah_dibayar',
    'masuk_produksi',
    'proses_produksi',
    'quality_check',
    'siap_diambil',
    'siap_dikirim',
    'selesai',
    'dibatalkan'
  )),
  total_amount numeric not null default 0,
  admin_notes text not null default '',
  customer_notes text not null default '',
  delivery_method text not null default 'pickup' check (delivery_method in ('pickup', 'shipping')),
  shipping_address text not null default '',
  design_file_path text,
  payment_status text not null default 'belum_bayar' check (payment_status in ('belum_bayar', 'menunggu_verifikasi', 'terverifikasi', 'ditolak')),
  payment_proof_path text,
  payment_submitted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric not null default 0,
  subtotal numeric not null default 0,
  color text not null default '',
  size text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.website_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  label text not null,
  value jsonb not null default '{}'::jsonb,
  description text not null default '',
  group_name text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.products
  add column if not exists product_category_id uuid references public.product_categories(id) on delete set null,
  add column if not exists intent_tags text[] not null default '{}',
  add column if not exists stock integer not null default 0,
  add column if not exists trending boolean not null default false,
  add column if not exists fresh_drop boolean not null default false;

alter table if exists public.product_categories
  add column if not exists show_in_collection boolean not null default true,
  add column if not exists collection_limit integer not null default 8,
  add column if not exists collection_sort text not null default 'sort_order',
  add column if not exists collection_section_order integer not null default 0;

alter table if exists public.product_categories drop constraint if exists product_categories_collection_sort_check;
alter table if exists public.product_categories add constraint product_categories_collection_sort_check check (collection_sort in ('sort_order', 'newest', 'best_seller', 'promo'));

alter table if exists public.landing_sections
  add column if not exists desktop_image_url text,
  add column if not exists mobile_image_url text,
  add column if not exists video_url text,
  add column if not exists cta_label text not null default '',
  add column if not exists cta_url text not null default '',
  add column if not exists text_position text not null default 'left';

alter table if exists public.cms_banners
  add column if not exists text_position text not null default 'left';

alter table if exists public.homepage_section_items
  add column if not exists custom_label text not null default '',
  add column if not exists custom_title text not null default '',
  add column if not exists custom_subtitle text not null default '',
  add column if not exists custom_button_label text not null default '',
  add column if not exists custom_link_url text not null default '',
  add column if not exists custom_image_url text not null default '',
  add column if not exists custom_mobile_image_url text,
  add column if not exists custom_image_alt text,
  add column if not exists custom_object_fit text not null default 'cover',
  add column if not exists custom_object_position text not null default 'center center';

alter table if exists public.homepage_section_items
  drop constraint if exists homepage_section_items_one_source;

alter table if exists public.homepage_section_items
  add constraint homepage_section_items_one_source check (
    (product_id is not null and service_id is null)
    or (product_id is null and service_id is not null)
    or (
      product_id is null
      and service_id is null
      and nullif(custom_title, '') is not null
      and nullif(custom_link_url, '') is not null
      and nullif(custom_image_url, '') is not null
    )
  );

alter table if exists public.homepage_section_items
  drop constraint if exists homepage_section_items_custom_object_fit_check;

alter table if exists public.homepage_section_items
  add constraint homepage_section_items_custom_object_fit_check
  check (custom_object_fit in ('cover', 'contain'));

alter table if exists public.orders
  add column if not exists customer_notes text not null default '',
  add column if not exists delivery_method text not null default 'pickup',
  add column if not exists shipping_address text not null default '',
  add column if not exists design_file_path text,
  add column if not exists payment_status text not null default 'belum_bayar',
  add column if not exists payment_proof_path text,
  add column if not exists payment_submitted_at timestamptz;

alter table if exists public.order_items
  add column if not exists color text not null default '',
  add column if not exists size text not null default '';

create unique index if not exists homepage_section_product_unique
  on public.homepage_section_items (section_id, product_id)
  where product_id is not null;

create unique index if not exists homepage_section_service_unique
  on public.homepage_section_items (section_id, service_id)
  where service_id is not null;

create index if not exists homepage_sections_order_idx
  on public.homepage_sections (is_active, sort_order);

create index if not exists homepage_section_items_order_idx
  on public.homepage_section_items (section_id, is_active, sort_order);

create index if not exists landing_sections_order_idx
  on public.landing_sections (is_visible, sort_order);

create index if not exists cms_banners_order_idx
  on public.cms_banners (is_active, sort_order);

create index if not exists products_category_idx
  on public.products (product_category_id);

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);

create index if not exists order_items_order_idx
  on public.order_items (order_id);

create index if not exists order_status_history_order_idx
  on public.order_status_history (order_id, created_at desc);

alter table if exists public.product_filters
  add column if not exists min_price numeric,
  add column if not exists max_price numeric;

alter table if exists public.hero_banners
  add column if not exists badge text not null default '',
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists cta_text text,
  add column if not exists cta_link text,
  add column if not exists hero_video_url text,
  add column if not exists video_url text,
  add column if not exists object_position text not null default 'center center',
  add column if not exists mobile_image_url text,
  add column if not exists mobile_object_position text not null default 'center center',
  add column if not exists image_alt text,
  add column if not exists object_fit text not null default 'cover',
  add column if not exists focal_x numeric,
  add column if not exists focal_y numeric,
  add column if not exists text_position text not null default 'left',
  add column if not exists urutan integer not null default 0;

alter table if exists public.products
  add column if not exists short_detail text,
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists link_url text,
  add column if not exists price numeric,
  add column if not exists harga numeric,
  add column if not exists base_price numeric,
  add column if not exists price_label text,
  add column if not exists slug text,
  add column if not exists featured boolean not null default false;

alter table if exists public.products
  add column if not exists collection_tags text[] not null default '{}',
  add column if not exists color_tags text[] not null default '{}',
  add column if not exists size_tags text[] not null default '{}',
  add column if not exists material_tags text[] not null default '{}',
  add column if not exists brand text,
  add column if not exists object_fit text not null default 'cover',
  add column if not exists object_position text not null default 'center center',
  add column if not exists compare_price numeric,
  add column if not exists subcategory text,
  add column if not exists description text,
  add column if not exists specifications text[] not null default '{}',
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists label_new boolean not null default false,
  add column if not exists label_promo boolean not null default false,
  add column if not exists label_best_seller boolean not null default false,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists og_image_url text,
  add column if not exists canonical_url text,
  add column if not exists focal_x numeric not null default 50,
  add column if not exists focal_y numeric not null default 50,
  add column if not exists focal_zoom numeric not null default 1,
  add column if not exists target_ratio text not null default '4:5',
  add column if not exists focal_points jsonb not null default '{}'::jsonb,
  add column if not exists sales_count integer not null default 0;

alter table if exists public.stores
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists jam_operasional text;

alter table if exists public.hero_banners
  add column if not exists desktop_video_url text,
  add column if not exists mobile_video_url text,
  add column if not exists focal_zoom numeric not null default 1,
  add column if not exists target_ratio text not null default '16:7',
  add column if not exists mobile_focal_x numeric,
  add column if not exists mobile_focal_y numeric,
  add column if not exists mobile_focal_zoom numeric not null default 1,
  add column if not exists mobile_target_ratio text not null default '4:5';

alter table if exists public.page_heroes
  add column if not exists mobile_image_url text,
  add column if not exists image_alt text,
  add column if not exists object_fit text not null default 'cover',
  add column if not exists focal_x numeric,
  add column if not exists focal_y numeric,
  add column if not exists mobile_object_position text not null default 'center center',
  add column if not exists focal_zoom numeric not null default 1,
  add column if not exists target_ratio text not null default '16:7',
  add column if not exists mobile_focal_x numeric,
  add column if not exists mobile_focal_y numeric,
  add column if not exists mobile_focal_zoom numeric not null default 1,
  add column if not exists mobile_target_ratio text not null default '4:5';

alter table if exists public.instagram_banners
  add column if not exists mobile_image_url text,
  add column if not exists image_alt text,
  add column if not exists object_fit text not null default 'cover',
  add column if not exists focal_x numeric,
  add column if not exists focal_y numeric,
  add column if not exists object_position text not null default 'center center',
  add column if not exists mobile_object_position text not null default 'center center',
  add column if not exists focal_zoom numeric not null default 1,
  add column if not exists target_ratio text not null default '12:5',
  add column if not exists mobile_focal_x numeric,
  add column if not exists mobile_focal_y numeric,
  add column if not exists mobile_focal_zoom numeric not null default 1,
  add column if not exists mobile_target_ratio text not null default '4:5';

alter table if exists public.instagram_banners
  add column if not exists media_type text not null default 'image',
  add column if not exists video_url text,
  add column if not exists mobile_video_url text,
  add column if not exists eyebrow text not null default 'Instagram',
  add column if not exists subtitle text not null default '',
  add column if not exists cta_label text not null default '',
  add column if not exists text_position text not null default 'left',
  add column if not exists urutan integer not null default 0;

alter table if exists public.contact_settings
  add column if not exists whatsapp_link text not null default 'https://wa.me/6285355333364',
  add column if not exists facebook text not null default 'https://www.facebook.com/debroderapparel/',
  add column if not exists copyright_text text not null default '© 2026 DEBRODER. All rights reserved.';

alter table if exists public.testimonials
  add column if not exists urutan integer not null default 0;

alter table if exists public.service_categories
  add column if not exists image_alt text,
  add column if not exists category_key text,
  add column if not exists slug text,
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists color_options text[] not null default '{}',
  add column if not exists collar_options text[] not null default '{}',
  add column if not exists sleeve_options text[] not null default '{}',
  add column if not exists material_options text[] not null default '{}',
  add column if not exists size_chart text[] not null default '{}',
  add column if not exists faq_items text[] not null default '{}',
  add column if not exists object_fit text not null default 'cover',
  add column if not exists object_position text not null default 'center center',
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists og_image_url text,
  add column if not exists canonical_url text,
  add column if not exists focal_x numeric not null default 50,
  add column if not exists focal_y numeric not null default 50,
  add column if not exists focal_zoom numeric not null default 1,
  add column if not exists target_ratio text not null default '4:5';

alter table if exists public.services
  add column if not exists image_alt text,
  add column if not exists category_key text,
  add column if not exists detail_body text,
  add column if not exists available_sizes text[] not null default '{}',
  add column if not exists faq_items text[] not null default '{}',
  add column if not exists production_estimate text,
  add column if not exists object_fit text not null default 'cover',
  add column if not exists object_position text not null default 'center center',
  add column if not exists focal_x numeric not null default 50,
  add column if not exists focal_y numeric not null default 50,
  add column if not exists focal_zoom numeric not null default 1,
  add column if not exists target_ratio text not null default '4:5';

alter table if exists public.media_assets
  add column if not exists bucket_id text not null default 'website-images',
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists alt_text text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists content_hash text;

alter table if exists public.media_assets
  drop constraint if exists media_assets_folder_check;

alter table if exists public.trust_about_content
  add column if not exists image_url text,
  add column if not exists mobile_image_url text,
  add column if not exists video_url text,
  add column if not exists cta_label text not null default '',
  add column if not exists cta_url text not null default '',
  add column if not exists text_position text not null default 'left',
  add column if not exists urutan integer not null default 0;

alter table if exists public.landing_sections drop constraint if exists landing_sections_text_position_check;
alter table if exists public.landing_sections add constraint landing_sections_text_position_check check (text_position in ('left', 'center', 'right'));
alter table if exists public.cms_banners drop constraint if exists cms_banners_text_position_check;
alter table if exists public.cms_banners add constraint cms_banners_text_position_check check (text_position in ('left', 'center', 'right'));
alter table if exists public.hero_banners drop constraint if exists hero_banners_text_position_check;
alter table if exists public.hero_banners add constraint hero_banners_text_position_check check (text_position in ('left', 'center', 'right'));
alter table if exists public.instagram_banners drop constraint if exists instagram_banners_media_type_check;
alter table if exists public.instagram_banners add constraint instagram_banners_media_type_check check (media_type in ('image', 'video'));
alter table if exists public.instagram_banners drop constraint if exists instagram_banners_text_position_check;
alter table if exists public.instagram_banners add constraint instagram_banners_text_position_check check (text_position in ('left', 'center', 'right'));
alter table if exists public.trust_about_content drop constraint if exists trust_about_content_text_position_check;
alter table if exists public.trust_about_content add constraint trust_about_content_text_position_check check (text_position in ('left', 'center', 'right'));
alter table if exists public.orders drop constraint if exists orders_delivery_method_check;
alter table if exists public.orders add constraint orders_delivery_method_check check (delivery_method in ('pickup', 'shipping'));
alter table if exists public.orders drop constraint if exists orders_payment_status_check;
alter table if exists public.orders add constraint orders_payment_status_check check (payment_status in ('belum_bayar', 'menunggu_verifikasi', 'terverifikasi', 'ditolak'));

create index if not exists products_slug_idx on public.products (slug);
create unique index if not exists products_slug_unique_idx
on public.products (slug)
where slug is not null and slug <> '';
create index if not exists products_catalog_idx on public.products (status_aktif, urutan);
create index if not exists media_assets_content_hash_idx on public.media_assets (content_hash);
create index if not exists media_assets_folder_idx on public.media_assets (folder);

update public.media_assets
set bucket_id = 'public-assets'
where public_url like '%/storage/v1/object/public/public-assets/%';

alter table if exists public.products alter column urutan set default 0;
alter table if exists public.service_categories alter column urutan set default 0;
alter table if exists public.stores alter column urutan set default 0;
alter table if exists public.hero_banners alter column urutan set default 0;
alter table if exists public.testimonials alter column urutan set default 0;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_service_categories_updated_at on public.service_categories;
create trigger set_service_categories_updated_at
before update on public.service_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists set_hero_banners_updated_at on public.hero_banners;
create trigger set_hero_banners_updated_at
before update on public.hero_banners
for each row execute function public.set_updated_at();

drop trigger if exists set_about_content_updated_at on public.about_content;
create trigger set_about_content_updated_at
before update on public.about_content
for each row execute function public.set_updated_at();

drop trigger if exists set_testimonials_updated_at on public.testimonials;
create trigger set_testimonials_updated_at
before update on public.testimonials
for each row execute function public.set_updated_at();

drop trigger if exists set_contact_settings_updated_at on public.contact_settings;
create trigger set_contact_settings_updated_at
before update on public.contact_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_instagram_banners_updated_at on public.instagram_banners;
create trigger set_instagram_banners_updated_at
before update on public.instagram_banners
for each row execute function public.set_updated_at();

drop trigger if exists set_page_heroes_updated_at on public.page_heroes;
create trigger set_page_heroes_updated_at
before update on public.page_heroes
for each row execute function public.set_updated_at();

drop trigger if exists set_order_steps_updated_at on public.order_steps;
create trigger set_order_steps_updated_at
before update on public.order_steps
for each row execute function public.set_updated_at();

drop trigger if exists set_trust_about_content_updated_at on public.trust_about_content;
create trigger set_trust_about_content_updated_at
before update on public.trust_about_content
for each row execute function public.set_updated_at();

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_product_filters_updated_at on public.product_filters;
create trigger set_product_filters_updated_at
before update on public.product_filters
for each row execute function public.set_updated_at();

drop trigger if exists set_homepage_sections_updated_at on public.homepage_sections;
create trigger set_homepage_sections_updated_at
before update on public.homepage_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_homepage_section_items_updated_at on public.homepage_section_items;
create trigger set_homepage_section_items_updated_at
before update on public.homepage_section_items
for each row execute function public.set_updated_at();

drop trigger if exists set_landing_sections_updated_at on public.landing_sections;
create trigger set_landing_sections_updated_at
before update on public.landing_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_product_categories_updated_at on public.product_categories;
create trigger set_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_cms_banners_updated_at on public.cms_banners;
create trigger set_cms_banners_updated_at
before update on public.cms_banners
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_order_items_updated_at on public.order_items;
create trigger set_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

drop trigger if exists set_website_settings_updated_at on public.website_settings;
create trigger set_website_settings_updated_at
before update on public.website_settings
for each row execute function public.set_updated_at();

create or replace function public.create_public_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_product_id uuid,
  p_product_name text,
  p_color text,
  p_size text,
  p_quantity integer,
  p_customer_notes text,
  p_design_file_path text,
  p_delivery_method text,
  p_shipping_address text
)
returns table (created_order_id uuid, created_order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_product_name text;
  v_unit_price numeric := 0;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Nama customer tidak valid';
  end if;
  if length(regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g')) < 8 then
    raise exception 'Nomor WhatsApp tidak valid';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10000 then
    raise exception 'Jumlah pesanan tidak valid';
  end if;
  if p_delivery_method not in ('pickup', 'shipping') then
    raise exception 'Metode penerimaan tidak valid';
  end if;
  if p_delivery_method = 'shipping' and length(trim(coalesce(p_shipping_address, ''))) < 8 then
    raise exception 'Alamat pengiriman wajib diisi';
  end if;

  if p_product_id is not null then
    select
      product.nama,
      coalesce(product.price, product.harga, product.base_price, 0)
    into v_product_name, v_unit_price
    from public.products product
    where product.id = p_product_id
      and product.status_aktif = true;
  end if;

  v_product_name := coalesce(nullif(trim(v_product_name), ''), nullif(trim(p_product_name), ''));
  if v_product_name is null then
    raise exception 'Produk tidak valid';
  end if;

  v_order_number := 'DBR-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (
    order_number,
    customer_name,
    customer_phone,
    customer_email,
    status,
    total_amount,
    customer_notes,
    delivery_method,
    shipping_address,
    design_file_path,
    payment_status
  ) values (
    v_order_number,
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    'baru',
    v_unit_price * p_quantity,
    trim(coalesce(p_customer_notes, '')),
    p_delivery_method,
    trim(coalesce(p_shipping_address, '')),
    nullif(trim(coalesce(p_design_file_path, '')), ''),
    'belum_bayar'
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    color,
    size,
    notes
  ) values (
    v_order_id,
    p_product_id,
    v_product_name,
    p_quantity,
    v_unit_price,
    v_unit_price * p_quantity,
    trim(coalesce(p_color, '')),
    trim(coalesce(p_size, '')),
    ''
  );

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order_id, null, 'baru', 'Pesanan dibuat melalui website.');

  return query select v_order_id, v_order_number;
end;
$$;

create or replace function public.submit_public_payment_proof(
  p_order_id uuid,
  p_order_number text,
  p_customer_phone text,
  p_payment_proof_path text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(p_payment_proof_path, ''))) < 8 then
    raise exception 'Bukti pembayaran tidak valid';
  end if;

  update public.orders
  set
    payment_proof_path = trim(p_payment_proof_path),
    payment_status = 'menunggu_verifikasi',
    payment_submitted_at = now()
  where id = p_order_id
    and order_number = p_order_number
    and regexp_replace(customer_phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');

  if not found then
    raise exception 'Pesanan tidak ditemukan';
  end if;

  return true;
end;
$$;

revoke all on function public.create_public_order(text, text, text, uuid, text, text, text, integer, text, text, text, text) from public;
grant execute on function public.create_public_order(text, text, text, uuid, text, text, text, integer, text, text, text, text) to anon, authenticated;
revoke all on function public.submit_public_payment_proof(uuid, text, text, text) from public;
grant execute on function public.submit_public_payment_proof(uuid, text, text, text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.stores enable row level security;
alter table public.hero_banners enable row level security;
alter table public.about_content enable row level security;
alter table public.testimonials enable row level security;
alter table public.contact_settings enable row level security;
alter table public.instagram_banners enable row level security;
alter table public.page_heroes enable row level security;
alter table public.order_steps enable row level security;
alter table public.trust_about_content enable row level security;
alter table public.media_assets enable row level security;
alter table public.product_filters enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_items enable row level security;
alter table public.landing_sections enable row level security;
alter table public.product_categories enable row level security;
alter table public.cms_banners enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.website_settings enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_superadmin());

drop policy if exists "Superadmin can manage profiles" on public.profiles;
create policy "Superadmin can manage profiles"
on public.profiles for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage products" on public.products;
create policy "Superadmin can manage products"
on public.products for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active service categories" on public.service_categories;
create policy "Public can read active service categories"
on public.service_categories for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage service categories" on public.service_categories;
create policy "Superadmin can manage service categories"
on public.service_categories for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services"
on public.services for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage services" on public.services;
create policy "Superadmin can manage services"
on public.services for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active stores" on public.stores;
create policy "Public can read active stores"
on public.stores for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage stores" on public.stores;
create policy "Superadmin can manage stores"
on public.stores for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active hero banners" on public.hero_banners;
create policy "Public can read active hero banners"
on public.hero_banners for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage hero banners" on public.hero_banners;
create policy "Superadmin can manage hero banners"
on public.hero_banners for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active about content" on public.about_content;
create policy "Public can read active about content"
on public.about_content for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage about content" on public.about_content;
create policy "Superadmin can manage about content"
on public.about_content for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active testimonials" on public.testimonials;
create policy "Public can read active testimonials"
on public.testimonials for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage testimonials" on public.testimonials;
create policy "Superadmin can manage testimonials"
on public.testimonials for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active contact settings" on public.contact_settings;
create policy "Public can read active contact settings"
on public.contact_settings for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage contact settings" on public.contact_settings;
create policy "Superadmin can manage contact settings"
on public.contact_settings for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active instagram banners" on public.instagram_banners;
create policy "Public can read active instagram banners"
on public.instagram_banners for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage instagram banners" on public.instagram_banners;
create policy "Superadmin can manage instagram banners"
on public.instagram_banners for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active page heroes" on public.page_heroes;
create policy "Public can read active page heroes"
on public.page_heroes for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage page heroes" on public.page_heroes;
create policy "Superadmin can manage page heroes"
on public.page_heroes for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active order steps" on public.order_steps;
create policy "Public can read active order steps"
on public.order_steps for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage order steps" on public.order_steps;
create policy "Superadmin can manage order steps"
on public.order_steps for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active trust about content" on public.trust_about_content;
create policy "Public can read active trust about content"
on public.trust_about_content for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage trust about content" on public.trust_about_content;
create policy "Superadmin can manage trust about content"
on public.trust_about_content for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Superadmin can read media assets" on public.media_assets;
create policy "Superadmin can read media assets"
on public.media_assets for select
using (public.is_superadmin());

drop policy if exists "Superadmin can manage media assets" on public.media_assets;
create policy "Superadmin can manage media assets"
on public.media_assets for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active product filters" on public.product_filters;
create policy "Public can read active product filters"
on public.product_filters for select
using (status_aktif = true);

drop policy if exists "Superadmin can manage product filters" on public.product_filters;
create policy "Superadmin can manage product filters"
on public.product_filters for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active homepage sections" on public.homepage_sections;
create policy "Public can read active homepage sections"
on public.homepage_sections for select
using (is_active = true);

drop policy if exists "Public can read plain category section setting" on public.homepage_sections;
create policy "Public can read plain category section setting"
on public.homepage_sections for select
using (slug = 'pakaian-polos-berdasarkan-kategori');

drop policy if exists "Superadmin can manage homepage sections" on public.homepage_sections;
create policy "Superadmin can manage homepage sections"
on public.homepage_sections for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active homepage section items" on public.homepage_section_items;
create policy "Public can read active homepage section items"
on public.homepage_section_items for select
using (
  is_active = true
  and exists (
    select 1
    from public.homepage_sections section
    where section.id = section_id
      and section.is_active = true
  )
);

drop policy if exists "Superadmin can manage homepage section items" on public.homepage_section_items;
create policy "Superadmin can manage homepage section items"
on public.homepage_section_items for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read landing section settings" on public.landing_sections;
create policy "Public can read landing section settings"
on public.landing_sections for select
using (true);

drop policy if exists "Superadmin can manage landing sections" on public.landing_sections;
create policy "Superadmin can manage landing sections"
on public.landing_sections for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active product categories" on public.product_categories;
create policy "Public can read active product categories"
on public.product_categories for select
using (is_active = true);

drop policy if exists "Superadmin can manage product categories" on public.product_categories;
create policy "Superadmin can manage product categories"
on public.product_categories for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Public can read active CMS banners" on public.cms_banners;
create policy "Public can read active CMS banners"
on public.cms_banners for select
using (is_active = true);

drop policy if exists "Superadmin can manage CMS banners" on public.cms_banners;
create policy "Superadmin can manage CMS banners"
on public.cms_banners for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Superadmin can manage orders" on public.orders;
create policy "Superadmin can manage orders"
on public.orders for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Superadmin can manage order items" on public.order_items;
create policy "Superadmin can manage order items"
on public.order_items for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Superadmin can manage order status history" on public.order_status_history;
create policy "Superadmin can manage order status history"
on public.order_status_history for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Superadmin can manage website settings" on public.website_settings;
create policy "Superadmin can manage website settings"
on public.website_settings for all
using (public.is_superadmin())
with check (public.is_superadmin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'website-images',
  'website-images',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-uploads',
  'order-uploads',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view website images" on storage.objects;
create policy "Public can view website images"
on storage.objects for select
using (bucket_id = 'website-images');

drop policy if exists "Superadmin can upload website images" on storage.objects;
create policy "Superadmin can upload website images"
on storage.objects for insert
with check (bucket_id = 'website-images' and public.is_superadmin());

drop policy if exists "Superadmin can update website images" on storage.objects;
create policy "Superadmin can update website images"
on storage.objects for update
using (bucket_id = 'website-images' and public.is_superadmin())
with check (bucket_id = 'website-images' and public.is_superadmin());

drop policy if exists "Superadmin can delete website images" on storage.objects;
create policy "Superadmin can delete website images"
on storage.objects for delete
using (bucket_id = 'website-images' and public.is_superadmin());

drop policy if exists "Customers can upload order files" on storage.objects;
create policy "Customers can upload order files"
on storage.objects for insert
with check (
  bucket_id = 'order-uploads'
  and array_length(storage.foldername(name), 1) >= 1
);

drop policy if exists "Superadmin can view order files" on storage.objects;
create policy "Superadmin can view order files"
on storage.objects for select
using (bucket_id = 'order-uploads' and public.is_superadmin());

drop policy if exists "Superadmin can delete order files" on storage.objects;
create policy "Superadmin can delete order files"
on storage.objects for delete
using (bucket_id = 'order-uploads' and public.is_superadmin());
