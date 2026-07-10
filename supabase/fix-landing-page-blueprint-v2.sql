-- DEBRODER Landing Page Blueprint v2.0
-- Safe to run repeatedly.
-- Creates missing blueprint rows, restores canonical visibility/order,
-- and keeps legacy sections disabled.

begin;

insert into public.landing_sections
  (section_key, title, subtitle, is_visible, sort_order, metadata)
values
  ('hero', 'Hero / Hero Slider', '', true, 10, '{}'::jsonb),
  ('benefits', 'Trust Strip', '', true, 20, '{}'::jsonb),
  ('featured-products', 'Featured', '', true, 30, '{}'::jsonb),
  ('trending', 'Trending', '', true, 40, '{}'::jsonb),
  ('campaign-banners', 'Editorial Campaign', '', true, 50, '{}'::jsonb),
  ('fresh-drop', 'Fresh Drop', '', true, 60, '{}'::jsonb),
  ('services-products', 'Shop by Category', '', true, 70, '{}'::jsonb),
  ('stores', 'Store DEBRODER', 'Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami.', true, 80, '{}'::jsonb),
  ('about', 'Built to Create', '', true, 90, '{}'::jsonb),
  ('plain-category', 'Pakaian Polos berdasarkan Kategori', '', false, 900, '{}'::jsonb),
  ('instagram-banner', 'Banner Instagram', '', false, 910, '{}'::jsonb)
on conflict (section_key) do update
set title = excluded.title,
    is_visible = excluded.is_visible,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.homepage_sections
  (title, slug, is_active, sort_order)
values
  ('Featured', 'featured', true, 30),
  ('Trending', 'trending', true, 40),
  ('Fresh Drop', 'fresh-drops', true, 60),
  ('Shop by Category', 'services-products', true, 70)
on conflict (slug) do update
set title = excluded.title,
    is_active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

update public.homepage_sections
set is_active = false,
    sort_order = 900,
    updated_at = now()
where slug = 'pakaian-polos-berdasarkan-kategori';

commit;
