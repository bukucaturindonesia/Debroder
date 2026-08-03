-- DEBRODER Public Media Architecture Reconciliation V1.1
-- Add independent media fields without overwriting or duplicating existing media.

begin;

alter table if exists public.page_heroes
  add column if not exists detail_image_url text,
  add column if not exists detail_image_alt text,
  add column if not exists detail_object_position text not null default 'center center',
  add column if not exists detail_focal_x numeric,
  add column if not exists detail_focal_y numeric,
  add column if not exists detail_focal_zoom numeric not null default 1,
  add column if not exists detail_target_ratio text not null default '4:3';

alter table if exists public.trust_about_content
  add column if not exists about_page_image_url text,
  add column if not exists about_page_mobile_image_url text,
  add column if not exists about_page_object_position text not null default 'center center',
  add column if not exists about_page_mobile_object_position text not null default 'center center',
  add column if not exists about_page_focal_x numeric,
  add column if not exists about_page_focal_y numeric,
  add column if not exists about_page_focal_zoom numeric not null default 1,
  add column if not exists about_page_target_ratio text not null default '4:5',
  add column if not exists about_page_mobile_focal_x numeric,
  add column if not exists about_page_mobile_focal_y numeric,
  add column if not exists about_page_mobile_focal_zoom numeric not null default 1,
  add column if not exists about_page_mobile_target_ratio text not null default '4:5';


-- No Custom hero columns or seed are added. Custom uses the existing page_heroes
-- model through page_key = 'custom'; an admin-created row remains the content source.

commit;

-- Verification query (run after applying in development/staging):
-- select page_key, image_url, mobile_image_url, detail_image_url, detail_target_ratio
-- from public.page_heroes where page_key in ('custom', 'koleksi', 'kaos-polos');
-- Expected: existing rows remain unchanged; only nullable detail columns become available.
-- select image_url, about_page_image_url, about_page_target_ratio
-- from public.trust_about_content limit 1;
