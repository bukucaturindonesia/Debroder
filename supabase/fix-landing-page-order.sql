-- DEBRODER Landing Page Blueprint v1.0
-- Safe to run repeatedly. Updates canonical order and disables legacy sections
-- that are no longer rendered by the frozen public-homepage blueprint.

begin;

update public.landing_sections
set sort_order = case section_key
  when 'hero' then 10
  when 'benefits' then 20
  when 'featured-products' then 30
  when 'trending' then 40
  when 'campaign-banners' then 50
  when 'fresh-drop' then 60
  when 'services-products' then 70
  when 'stores' then 80
  when 'about' then 90
  when 'plain-category' then 900
  when 'instagram-banner' then 910
  else sort_order
end,
updated_at = now()
where section_key in (
  'hero',
  'benefits',
  'featured-products',
  'trending',
  'campaign-banners',
  'fresh-drop',
  'services-products',
  'stores',
  'about',
  'plain-category',
  'instagram-banner'
);

update public.landing_sections
set is_visible = false,
    updated_at = now()
where section_key in ('plain-category', 'instagram-banner');

update public.homepage_sections
set sort_order = case slug
  when 'featured' then 30
  when 'trending' then 40
  when 'fresh-drops' then 60
  when 'services-products' then 70
  when 'pakaian-polos-berdasarkan-kategori' then 900
  else sort_order
end,
updated_at = now()
where slug in (
  'featured',
  'trending',
  'fresh-drops',
  'services-products',
  'pakaian-polos-berdasarkan-kategori'
);

commit;
