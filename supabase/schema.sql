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

insert into public.website_settings (
  setting_key,
  label,
  value,
  description,
  group_name
)
values (
  'site_media_defaults',
  'Gambar Default Website',
  jsonb_build_object(
    'heroDesktop', '/brand/debroder/social-preview.png',
    'heroMobile', '/brand/debroder/social-preview.png',
    'product', '/brand/debroder/open-graph-logo.png',
    'pageHeroDesktop', '/brand/debroder/social-preview.png',
    'pageHeroMobile', '/brand/debroder/social-preview.png',
    'bannerDesktop', '/brand/debroder/social-preview.png',
    'bannerMobile', '/brand/debroder/social-preview.png',
    'store', '/brand/debroder/social-preview.png',
    'benefit', '/brand/debroder/social-preview.png',
    'socialPreview', '/brand/debroder/social-preview.png'
  ),
  'Fallback media publik yang dipilih dari Media Library melalui admin.',
  'public_media'
)
on conflict (setting_key) do update set
  label = excluded.label,
  description = excluded.description,
  group_name = excluded.group_name;

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

drop policy if exists "Public can read public media settings" on public.website_settings;
create policy "Public can read public media settings"
on public.website_settings for select
to anon, authenticated
using (
  group_name = 'public_media'
  and setting_key = 'site_media_defaults'
);

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


-- ============================================================
-- DEBRODER PIM V2 - STAGE 1 MASTER DATA
-- For full fresh setup, keep this block in sync with supabase/pim-v2-stage1-master-data.sql
-- ============================================================

-- DEBRODER PIM V2 - STAGE 1
-- Database + Master Data + Backward Compatibility
-- Safe to run multiple times. Does not delete old products or old fields.

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

-- 1) Product categories are kept for physical products only.
--    Production services are separated into public.production_services.
alter table if exists public.product_categories
  add column if not exists category_kind text not null default 'product',
  add column if not exists public_label text,
  add column if not exists admin_notes text not null default '';

alter table if exists public.product_categories drop constraint if exists product_categories_category_kind_check;
alter table if exists public.product_categories
  add constraint product_categories_category_kind_check check (category_kind in ('product', 'service'));

create table if not exists public.product_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  public_label text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table if not exists public.production_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  service_type text not null default 'production_service',
  description text not null default '',
  base_price numeric not null default 0,
  pricing_mode text not null default 'fixed_price',
  unit_label text not null default '',
  required_for_product_types text[] not null default '{}',
  is_required_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.production_services drop constraint if exists production_services_service_type_check;
alter table if exists public.production_services
  add constraint production_services_service_type_check check (service_type in ('production_service', 'required_service', 'addon_service'));

alter table if exists public.production_services drop constraint if exists production_services_pricing_mode_check;
alter table if exists public.production_services
  add constraint production_services_pricing_mode_check check (pricing_mode in ('fixed_price', 'meter_based', 'area_based', 'quantity_based', 'custom_quote'));

-- 2) Master colors and sizes for consistent admin input.
create table if not exists public.product_color_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color_hex text not null,
  color_group text not null default 'basic',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_size_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  size_group text not null default 'apparel',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (size_group, slug)
);

-- 3) Product-level size guide. One product can have its own guide.
create table if not exists public.product_size_guides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  product_category_id uuid references public.product_categories(id) on delete set null,
  product_subcategory_id uuid references public.product_subcategories(id) on delete set null,
  title text not null default 'Panduan Ukuran',
  description text not null default '',
  rows jsonb not null default '[]'::jsonb,
  notes text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Upgrade existing products safely. Old products continue to work.
alter table if exists public.products
  add column if not exists product_type text not null default 'standard_product',
  add column if not exists pricing_mode text not null default 'fixed_price',
  add column if not exists product_subcategory_id uuid references public.product_subcategories(id) on delete set null,
  add column if not exists size_guide_id uuid references public.product_size_guides(id) on delete set null,
  add column if not exists sku text,
  add column if not exists has_variants boolean not null default false,
  add column if not exists uses_configurator boolean not null default false,
  add column if not exists minimum_order_qty integer not null default 1,
  add column if not exists required_services text[] not null default '{}',
  add column if not exists config_schema jsonb not null default '{}'::jsonb,
  add column if not exists admin_notes text not null default '',
  add column if not exists public_description text;

alter table if exists public.products drop constraint if exists products_product_type_check;
alter table if exists public.products
  add constraint products_product_type_check check (product_type in ('standard_product', 'configurable_product', 'production_service'));

alter table if exists public.products drop constraint if exists products_pricing_mode_check;
alter table if exists public.products
  add constraint products_pricing_mode_check check (pricing_mode in ('fixed_price', 'variant_based', 'configurator_based', 'custom_quote'));

alter table if exists public.products drop constraint if exists products_minimum_order_qty_check;
alter table if exists public.products
  add constraint products_minimum_order_qty_check check (minimum_order_qty >= 1);

-- 5) Variant architecture for Kaos Polos, Jaket & Hoodie, and Headwear.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_name text not null default '',
  color_name text not null default '',
  color_hex text not null default '#111111',
  sku text,
  price_adjustment numeric not null default 0,
  image_url text,
  images text[] not null default '{}',
  object_fit text not null default 'cover',
  object_position text not null default 'center center',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.product_variants drop constraint if exists product_variants_object_fit_check;
alter table if exists public.product_variants
  add constraint product_variants_object_fit_check check (object_fit in ('cover', 'contain'));

create table if not exists public.product_variant_sizes (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  size_name text not null,
  sku text,
  stock integer not null default 0,
  price_adjustment numeric not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, size_name)
);

alter table if exists public.product_variant_sizes drop constraint if exists product_variant_sizes_stock_check;
alter table if exists public.product_variant_sizes
  add constraint product_variant_sizes_stock_check check (stock >= 0);

create table if not exists public.product_variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  object_fit text not null default 'cover',
  object_position text not null default 'center center',
  focal_x numeric not null default 50,
  focal_y numeric not null default 50,
  focal_zoom numeric not null default 1,
  target_ratio text not null default '4:5',
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.product_variant_images drop constraint if exists product_variant_images_object_fit_check;
alter table if exists public.product_variant_images
  add constraint product_variant_images_object_fit_check check (object_fit in ('cover', 'contain'));

-- 6) Pricing rules foundation for future dynamic pricing.
create table if not exists public.product_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_key text not null unique,
  product_category_id uuid references public.product_categories(id) on delete cascade,
  product_subcategory_id uuid references public.product_subcategories(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  applies_to text not null default 'product',
  adjustment_type text not null default 'fixed_amount',
  adjustment_value numeric not null default 0,
  min_quantity integer,
  max_quantity integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.product_pricing_rules drop constraint if exists product_pricing_rules_applies_to_check;
alter table if exists public.product_pricing_rules
  add constraint product_pricing_rules_applies_to_check check (applies_to in ('product', 'variant', 'size', 'material', 'collar', 'addon', 'quantity', 'service'));

alter table if exists public.product_pricing_rules drop constraint if exists product_pricing_rules_adjustment_type_check;
alter table if exists public.product_pricing_rules
  add constraint product_pricing_rules_adjustment_type_check check (adjustment_type in ('fixed_amount', 'percentage', 'override_price'));

-- 7) Jersey configurator master tables are prepared now, UI comes later.
create table if not exists public.jersey_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_price numeric not null default 0,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price_adjustment numeric not null default 0,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_collar_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_collars (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.jersey_collar_groups(id) on delete set null,
  name text not null,
  slug text not null unique,
  price_adjustment numeric not null default 0,
  image_url text,
  icon_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price_adjustment numeric not null default 0,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_required_services (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.production_services(id) on delete cascade,
  service_name text not null,
  service_slug text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_slug)
);

create table if not exists public.jersey_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8) Cart/order item compatibility for configured products.
alter table if exists public.order_items
  add column if not exists product_type text not null default 'standard_product',
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_size_id uuid references public.product_variant_sizes(id) on delete set null,
  add column if not exists sku text,
  add column if not exists config_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists required_services jsonb not null default '[]'::jsonb,
  add column if not exists estimated_total numeric;

alter table if exists public.order_items drop constraint if exists order_items_product_type_check;
alter table if exists public.order_items
  add constraint order_items_product_type_check check (product_type in ('standard_product', 'configurable_product', 'production_service'));

-- 9) Indexes.
create index if not exists product_subcategories_category_idx on public.product_subcategories (category_id, is_active, sort_order);
create index if not exists production_services_active_idx on public.production_services (is_active, sort_order);
create index if not exists product_color_master_active_idx on public.product_color_master (is_active, sort_order);
create index if not exists product_size_master_active_idx on public.product_size_master (size_group, is_active, sort_order);
create index if not exists products_pim_v2_type_idx on public.products (product_type, pricing_mode, status_aktif, urutan);
create index if not exists products_subcategory_idx on public.products (product_subcategory_id);
create index if not exists product_variants_product_idx on public.product_variants (product_id, is_active, sort_order);
create index if not exists product_variant_sizes_variant_idx on public.product_variant_sizes (variant_id, is_active, sort_order);
create index if not exists product_variant_images_variant_idx on public.product_variant_images (variant_id, is_cover desc, sort_order);
create index if not exists product_size_guides_product_idx on public.product_size_guides (product_id, is_active);
create index if not exists jersey_packages_active_idx on public.jersey_packages (is_active, sort_order);
create index if not exists jersey_materials_active_idx on public.jersey_materials (is_active, sort_order);
create index if not exists jersey_collars_active_idx on public.jersey_collars (is_active, sort_order);
create index if not exists jersey_addons_active_idx on public.jersey_addons (is_active, sort_order);

-- 10) Triggers.
drop trigger if exists set_product_subcategories_updated_at on public.product_subcategories;
create trigger set_product_subcategories_updated_at before update on public.product_subcategories for each row execute function public.set_updated_at();

drop trigger if exists set_production_services_updated_at on public.production_services;
create trigger set_production_services_updated_at before update on public.production_services for each row execute function public.set_updated_at();

drop trigger if exists set_product_color_master_updated_at on public.product_color_master;
create trigger set_product_color_master_updated_at before update on public.product_color_master for each row execute function public.set_updated_at();

drop trigger if exists set_product_size_master_updated_at on public.product_size_master;
create trigger set_product_size_master_updated_at before update on public.product_size_master for each row execute function public.set_updated_at();

drop trigger if exists set_product_size_guides_updated_at on public.product_size_guides;
create trigger set_product_size_guides_updated_at before update on public.product_size_guides for each row execute function public.set_updated_at();

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();

drop trigger if exists set_product_variant_sizes_updated_at on public.product_variant_sizes;
create trigger set_product_variant_sizes_updated_at before update on public.product_variant_sizes for each row execute function public.set_updated_at();

drop trigger if exists set_product_variant_images_updated_at on public.product_variant_images;
create trigger set_product_variant_images_updated_at before update on public.product_variant_images for each row execute function public.set_updated_at();

drop trigger if exists set_product_pricing_rules_updated_at on public.product_pricing_rules;
create trigger set_product_pricing_rules_updated_at before update on public.product_pricing_rules for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_packages_updated_at on public.jersey_packages;
create trigger set_jersey_packages_updated_at before update on public.jersey_packages for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_materials_updated_at on public.jersey_materials;
create trigger set_jersey_materials_updated_at before update on public.jersey_materials for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_collar_groups_updated_at on public.jersey_collar_groups;
create trigger set_jersey_collar_groups_updated_at before update on public.jersey_collar_groups for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_collars_updated_at on public.jersey_collars;
create trigger set_jersey_collars_updated_at before update on public.jersey_collars for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_addons_updated_at on public.jersey_addons;
create trigger set_jersey_addons_updated_at before update on public.jersey_addons for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_required_services_updated_at on public.jersey_required_services;
create trigger set_jersey_required_services_updated_at before update on public.jersey_required_services for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_settings_updated_at on public.jersey_settings;
create trigger set_jersey_settings_updated_at before update on public.jersey_settings for each row execute function public.set_updated_at();

-- 11) RLS policies. Public can read active master data. Superadmin manages.
alter table public.product_subcategories enable row level security;
alter table public.production_services enable row level security;
alter table public.product_color_master enable row level security;
alter table public.product_size_master enable row level security;
alter table public.product_size_guides enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_sizes enable row level security;
alter table public.product_variant_images enable row level security;
alter table public.product_pricing_rules enable row level security;
alter table public.jersey_packages enable row level security;
alter table public.jersey_materials enable row level security;
alter table public.jersey_collar_groups enable row level security;
alter table public.jersey_collars enable row level security;
alter table public.jersey_addons enable row level security;
alter table public.jersey_required_services enable row level security;
alter table public.jersey_settings enable row level security;

drop policy if exists "Public can read active product subcategories" on public.product_subcategories;
create policy "Public can read active product subcategories" on public.product_subcategories for select using (is_active = true);
drop policy if exists "Superadmin can manage product subcategories" on public.product_subcategories;
create policy "Superadmin can manage product subcategories" on public.product_subcategories for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active production services" on public.production_services;
create policy "Public can read active production services" on public.production_services for select using (is_active = true);
drop policy if exists "Superadmin can manage production services" on public.production_services;
create policy "Superadmin can manage production services" on public.production_services for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active color master" on public.product_color_master;
create policy "Public can read active color master" on public.product_color_master for select using (is_active = true);
drop policy if exists "Superadmin can manage color master" on public.product_color_master;
create policy "Superadmin can manage color master" on public.product_color_master for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active size master" on public.product_size_master;
create policy "Public can read active size master" on public.product_size_master for select using (is_active = true);
drop policy if exists "Superadmin can manage size master" on public.product_size_master;
create policy "Superadmin can manage size master" on public.product_size_master for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active size guides" on public.product_size_guides;
create policy "Public can read active size guides" on public.product_size_guides for select using (is_active = true);
drop policy if exists "Superadmin can manage size guides" on public.product_size_guides;
create policy "Superadmin can manage size guides" on public.product_size_guides for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants" on public.product_variants for select using (is_active = true);
drop policy if exists "Superadmin can manage product variants" on public.product_variants;
create policy "Superadmin can manage product variants" on public.product_variants for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active variant sizes" on public.product_variant_sizes;
create policy "Public can read active variant sizes" on public.product_variant_sizes for select using (is_active = true);
drop policy if exists "Superadmin can manage variant sizes" on public.product_variant_sizes;
create policy "Superadmin can manage variant sizes" on public.product_variant_sizes for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read variant images" on public.product_variant_images;
create policy "Public can read variant images" on public.product_variant_images for select using (true);
drop policy if exists "Superadmin can manage variant images" on public.product_variant_images;
create policy "Superadmin can manage variant images" on public.product_variant_images for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active pricing rules" on public.product_pricing_rules;
create policy "Public can read active pricing rules" on public.product_pricing_rules for select using (is_active = true);
drop policy if exists "Superadmin can manage pricing rules" on public.product_pricing_rules;
create policy "Superadmin can manage pricing rules" on public.product_pricing_rules for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey packages" on public.jersey_packages;
create policy "Public can read active jersey packages" on public.jersey_packages for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey packages" on public.jersey_packages;
create policy "Superadmin can manage jersey packages" on public.jersey_packages for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey materials" on public.jersey_materials;
create policy "Public can read active jersey materials" on public.jersey_materials for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey materials" on public.jersey_materials;
create policy "Superadmin can manage jersey materials" on public.jersey_materials for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey collar groups" on public.jersey_collar_groups;
create policy "Public can read active jersey collar groups" on public.jersey_collar_groups for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey collar groups" on public.jersey_collar_groups;
create policy "Superadmin can manage jersey collar groups" on public.jersey_collar_groups for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey collars" on public.jersey_collars;
create policy "Public can read active jersey collars" on public.jersey_collars for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey collars" on public.jersey_collars;
create policy "Superadmin can manage jersey collars" on public.jersey_collars for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey addons" on public.jersey_addons;
create policy "Public can read active jersey addons" on public.jersey_addons for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey addons" on public.jersey_addons;
create policy "Superadmin can manage jersey addons" on public.jersey_addons for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey required services" on public.jersey_required_services;
create policy "Public can read active jersey required services" on public.jersey_required_services for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey required services" on public.jersey_required_services;
create policy "Superadmin can manage jersey required services" on public.jersey_required_services for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read jersey settings" on public.jersey_settings;
create policy "Public can read jersey settings" on public.jersey_settings for select using (true);
drop policy if exists "Superadmin can manage jersey settings" on public.jersey_settings;
create policy "Superadmin can manage jersey settings" on public.jersey_settings for all using (public.is_superadmin()) with check (public.is_superadmin());

-- 12) Seed product categories.
insert into public.product_categories (name, slug, description, category_kind, sort_order, show_in_collection, collection_limit, collection_sort, collection_section_order)
values
  ('Kaos Polos', 'kaos-polos', 'Produk kaos polos dan produk berbasis kaos untuk kebutuhan custom dan retail.', 'product', 10, true, 8, 'sort_order', 10),
  ('Jaket & Hoodie', 'jaket-hoodie', 'Produk jaket, hoodie, crewneck, bomber, varsity, dan zipper hoodie.', 'product', 20, true, 8, 'sort_order', 20),
  ('Jersey', 'jersey', 'Produk jersey custom berbasis configurator.', 'product', 30, true, 8, 'sort_order', 30),
  ('Headwear', 'headwear', 'Produk topi dan headwear custom.', 'product', 40, true, 8, 'sort_order', 40)
on conflict (slug) do nothing;

-- 13) Seed subcategories.
insert into public.product_subcategories (category_id, name, slug, description, sort_order)
select c.id, s.name, s.slug, s.description, s.sort_order
from public.product_categories c
join (values
  ('kaos-polos', 'Cotton Combed', 'cotton-combed', 'Kaos cotton combed untuk kebutuhan polos dan custom.', 10),
  ('kaos-polos', 'Polo Shirt', 'polo-shirt', 'Kaos polo untuk kebutuhan komunitas, kantor, dan semi-formal.', 20),
  ('kaos-polos', 'Long Sleeve', 'long-sleeve', 'Kaos lengan panjang untuk kebutuhan polos dan custom.', 30),
  ('kaos-polos', 'Heavy Cotton', 'heavy-cotton', 'Kaos bahan tebal untuk tampilan premium.', 40),
  ('kaos-polos', 'Dryfit', 'dryfit', 'Kaos dryfit untuk olahraga dan aktivitas harian.', 50),
  ('kaos-polos', 'Kaos Anak', 'kaos-anak', 'Kaos anak untuk custom dan kebutuhan seragam.', 60),
  ('jaket-hoodie', 'Hoodie', 'hoodie', 'Hoodie custom untuk komunitas dan brand.', 10),
  ('jaket-hoodie', 'Crewneck', 'crewneck', 'Crewneck custom untuk komunitas dan brand.', 20),
  ('jaket-hoodie', 'Bomber', 'bomber', 'Jaket bomber custom.', 30),
  ('jaket-hoodie', 'Varsity', 'varsity', 'Jaket varsity custom.', 40),
  ('jaket-hoodie', 'Zipper Hoodie', 'zipper-hoodie', 'Hoodie resleting custom.', 50),
  ('jersey', 'Jersey Futsal', 'jersey-futsal', 'Jersey futsal custom.', 10),
  ('jersey', 'Jersey Sepak Bola', 'jersey-sepak-bola', 'Jersey sepak bola custom.', 20),
  ('jersey', 'Jersey Baseball', 'jersey-baseball', 'Jersey baseball custom.', 30),
  ('jersey', 'Jersey Biliar', 'jersey-biliar', 'Jersey biliar custom.', 40),
  ('jersey', 'Jersey Custom', 'jersey-custom', 'Jersey custom sesuai kebutuhan tim.', 50),
  ('headwear', 'Topi Trucker', 'topi-trucker', 'Topi trucker custom.', 10),
  ('headwear', 'Topi Baseball', 'topi-baseball', 'Topi baseball custom.', 20),
  ('headwear', 'Snapback', 'snapback', 'Snapback custom.', 30),
  ('headwear', 'Bucket Hat', 'bucket-hat', 'Bucket hat custom.', 40)
) as s(category_slug, name, slug, description, sort_order) on c.slug = s.category_slug
on conflict (category_id, slug) do nothing;

-- 14) Seed production services.
insert into public.production_services (name, slug, service_type, description, base_price, pricing_mode, unit_label, sort_order)
values
  ('Sablon DTF', 'sablon-dtf', 'production_service', 'Layanan sablon DTF untuk apparel custom.', 0, 'custom_quote', 'pcs/lembar/meter', 10),
  ('Bordir Komputer', 'bordir-komputer', 'production_service', 'Layanan bordir komputer untuk apparel dan headwear.', 0, 'custom_quote', 'pcs', 20),
  ('Cetak Sublim', 'cetak-sublim', 'production_service', 'Layanan cetak sublim untuk jersey dan produk polyester.', 0, 'custom_quote', 'pcs', 30),
  ('Maklon DTF', 'maklon-dtf', 'production_service', 'Layanan maklon DTF untuk produksi reseller dan brand.', 0, 'custom_quote', 'meter/lembar', 40)
on conflict (slug) do nothing;

-- 15) Seed 20+ basic colors.
insert into public.product_color_master (name, slug, color_hex, color_group, sort_order)
values
  ('Black', 'black', '#111111', 'basic', 10),
  ('White', 'white', '#F7F7F4', 'basic', 20),
  ('Sport Grey', 'sport-grey', '#BFC2C5', 'basic', 30),
  ('Charcoal', 'charcoal', '#3A3A3A', 'basic', 40),
  ('Navy', 'navy', '#1F2A44', 'basic', 50),
  ('Royal Blue', 'royal-blue', '#1D4ED8', 'basic', 60),
  ('Sky Blue', 'sky-blue', '#8EC5E8', 'basic', 70),
  ('Forest Green', 'forest-green', '#063D24', 'basic', 80),
  ('Army Green', 'army-green', '#4B5320', 'basic', 90),
  ('Mint Green', 'mint-green', '#A7E8C4', 'basic', 100),
  ('Red', 'red', '#DC2626', 'basic', 110),
  ('Maroon', 'maroon', '#6F1D1B', 'basic', 120),
  ('Orange', 'orange', '#F97316', 'basic', 130),
  ('Yellow', 'yellow', '#FACC15', 'basic', 140),
  ('Mustard', 'mustard', '#D97706', 'basic', 150),
  ('Cream', 'cream', '#EADFCB', 'basic', 160),
  ('Beige', 'beige', '#D6C4A5', 'basic', 170),
  ('Brown', 'brown', '#7C4A32', 'basic', 180),
  ('Purple', 'purple', '#6D28D9', 'basic', 190),
  ('Pink', 'pink', '#E7A7C8', 'basic', 200),
  ('Turquoise', 'turquoise', '#40E0D0', 'basic', 210),
  ('Silver', 'silver', '#D1D5DB', 'basic', 220)
on conflict (slug) do nothing;

-- 16) Seed sizes.
insert into public.product_size_master (name, slug, size_group, sort_order)
values
  ('XS', 'xs', 'apparel', 10),
  ('S', 's', 'apparel', 20),
  ('M', 'm', 'apparel', 30),
  ('L', 'l', 'apparel', 40),
  ('XL', 'xl', 'apparel', 50),
  ('2XL', '2xl', 'apparel', 60),
  ('3XL', '3xl', 'apparel', 70),
  ('4XL', '4xl', 'apparel', 80),
  ('All Size', 'all-size', 'headwear', 10),
  ('S/M', 's-m', 'headwear', 20),
  ('L/XL', 'l-xl', 'headwear', 30)
on conflict (size_group, slug) do nothing;

-- 17) Seed jersey configurator master data.
insert into public.jersey_packages (name, slug, base_price, sort_order)
values
  ('Atasan Fullprint', 'atasan-fullprint', 100000, 10),
  ('Setelan Halfprint', 'setelan-halfprint', 120000, 20),
  ('Setelan Fullprint', 'setelan-fullprint', 130000, 30)
on conflict (slug) do nothing;

insert into public.jersey_materials (name, slug, price_adjustment, sort_order)
values
  ('Milano', 'milano', 0, 10),
  ('Brazil', 'brazil', 0, 20),
  ('Benzema', 'benzema', 0, 30),
  ('Drop Needle', 'drop-needle', 0, 40),
  ('Emboss Topo', 'emboss-topo', 15000, 50),
  ('Emboss Straw', 'emboss-straw', 15000, 60),
  ('Emboss Mixart', 'emboss-mixart', 15000, 70),
  ('Emboss Monochrome', 'emboss-monochrome', 15000, 80)
on conflict (slug) do nothing;

insert into public.jersey_collar_groups (name, slug, sort_order)
values
  ('Regular', 'regular', 10),
  ('Classic', 'classic', 20)
on conflict (slug) do nothing;

insert into public.jersey_collars (group_id, name, slug, price_adjustment, sort_order)
select g.id, c.name, c.slug, c.price_adjustment, c.sort_order
from public.jersey_collar_groups g
join (values
  ('regular', 'O Neck', 'o-neck', 0, 10),
  ('regular', 'V Neck', 'v-neck', 0, 20),
  ('regular', 'V Silang', 'v-silang', 0, 30),
  ('regular', 'V Silang Tumpul', 'v-silang-tumpul', 0, 40),
  ('regular', 'V Tumpul', 'v-tumpul', 0, 50),
  ('regular', 'V Narrow', 'v-narrow', 0, 60),
  ('regular', 'V Narrow Adidas', 'v-narrow-adidas', 0, 70),
  ('regular', 'V Neck Lapisan', 'v-neck-lapisan', 0, 80),
  ('classic', 'Wangki Klasik', 'wangki-klasik', 0, 10),
  ('classic', 'Wangki Adidas', 'wangki-adidas', 0, 20),
  ('classic', 'Wangki Segitiga', 'wangki-segitiga', 0, 30),
  ('classic', 'Wangki Tumpul Adidas', 'wangki-tumpul-adidas', 0, 40),
  ('classic', 'Wangki Silang Adidas', 'wangki-silang-adidas', 0, 50),
  ('classic', 'Wangki Kancing 1', 'wangki-kancing-1', 0, 60),
  ('classic', 'Wangki Kancing 2', 'wangki-kancing-2', 0, 70),
  ('classic', 'Wangki Klasik O', 'wangki-klasik-o', 0, 80)
) as c(group_slug, name, slug, price_adjustment, sort_order) on g.slug = c.group_slug
on conflict (slug) do nothing;

insert into public.jersey_addons (name, slug, price_adjustment, sort_order)
values
  ('Lengan Panjang', 'lengan-panjang', 10000, 10),
  ('RIB', 'rib', 5000, 20)
on conflict (slug) do nothing;

insert into public.jersey_required_services (service_id, service_name, service_slug, sort_order)
select id, name, slug, 10
from public.production_services
where slug = 'cetak-sublim'
on conflict (service_slug) do nothing;

insert into public.jersey_settings (setting_key, setting_value, description)
values
  ('default_minimum_order', '{"quantity":6}'::jsonb, 'Minimum order default untuk jersey configurator.'),
  ('price_formula', '{"formula":"(package_price + material_adjustment + collar_adjustment + addon_total + size_adjustment) * quantity"}'::jsonb, 'Formula harga jersey configurator.'),
  ('required_service', '{"service":"Cetak Sublim","removable":false}'::jsonb, 'Layanan wajib untuk semua produk jersey.')
on conflict (setting_key) do nothing;

-- 18) Backward compatibility defaults.
update public.products
set
  product_type = coalesce(nullif(product_type, ''), 'standard_product'),
  pricing_mode = coalesce(nullif(pricing_mode, ''), 'fixed_price'),
  minimum_order_qty = greatest(coalesce(minimum_order_qty, 1), 1),
  has_variants = coalesce(has_variants, false),
  uses_configurator = coalesce(uses_configurator, false),
  required_services = coalesce(required_services, '{}')
where true;

-- Mark existing jersey products as configurable-ready without breaking their old fixed display.
update public.products
set
  product_type = 'configurable_product',
  pricing_mode = case when pricing_mode = 'fixed_price' then 'configurator_based' else pricing_mode end,
  uses_configurator = true,
  minimum_order_qty = greatest(coalesce(minimum_order_qty, 1), 6),
  required_services = array['Cetak Sublim']
where lower(coalesce(kategori, '')) like '%jersey%'
   or lower(coalesce(subcategory, '')) like '%jersey%'
   or lower(coalesce(nama, '')) like '%jersey%';
