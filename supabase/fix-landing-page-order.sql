-- DEBRODER canonical landing-page order
-- Safe to run repeatedly. This only updates section ordering values.

begin;

update public.landing_sections
set sort_order = case section_key
  when 'hero' then 10
  when 'benefits' then 20
  when 'featured-products' then 30
  when 'services-products' then 40
  when 'trending' then 50
  when 'fresh-drop' then 60
  when 'plain-category' then 70
  when 'campaign-banners' then 80
  when 'instagram-banner' then 90
  when 'stores' then 100
  when 'about' then 110
  else sort_order
end,
updated_at = now()
where section_key in (
  'hero',
  'benefits',
  'featured-products',
  'services-products',
  'trending',
  'fresh-drop',
  'plain-category',
  'campaign-banners',
  'instagram-banner',
  'stores',
  'about'
);

update public.homepage_sections
set sort_order = case slug
  when 'featured' then 30
  when 'services-products' then 40
  when 'trending' then 50
  when 'fresh-drops' then 60
  when 'pakaian-polos-berdasarkan-kategori' then 70
  else sort_order
end,
updated_at = now()
where slug in (
  'featured',
  'services-products',
  'trending',
  'fresh-drops',
  'pakaian-polos-berdasarkan-kategori'
);

commit;
