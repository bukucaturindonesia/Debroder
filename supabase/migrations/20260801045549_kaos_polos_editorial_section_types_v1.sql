-- DEBRODER Kaos Polos Editorial CMS section types.
-- Additive compatibility migration for the shared cms_banners source of truth.
-- Product, pricing, inventory, order and transaction tables are untouched.

alter table if exists public.cms_banners
  drop constraint if exists cms_banners_section_type_check;

alter table if exists public.cms_banners
  add constraint cms_banners_section_type_check
  check (section_type in (
    'wide_campaign',
    'split_campaign',
    'poster_carousel',
    'centered_editorial_copy',
    'custom_cta',
    'team_package_campaign',
    'order_steps',
    'closing_campaign',
    'featured_editorial',
    'banner_editorial_left',
    'banner_editorial_right'
  ));

comment on constraint cms_banners_section_type_check on public.cms_banners is
  'Allowed shared CMS presentation roles, including Kaos Polos editorial slots.';
