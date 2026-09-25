-- DEBRODER Commerce Experience v1.0 — Jersey mini landing CMS alignment.
-- Safe additive migration. It extends the existing generic campaign CMS;
-- it does not create a Jersey-only source of truth or change PIM data.

alter table if exists public.page_heroes
  add column if not exists primary_cta_label text not null default '',
  add column if not exists primary_cta_url text not null default '',
  add column if not exists secondary_cta_label text not null default '',
  add column if not exists secondary_cta_url text not null default '';

alter table if exists public.cms_banners
  add column if not exists experience_key text not null default 'landing',
  add column if not exists section_type text not null default 'wide_campaign',
  add column if not exists section_key text not null default '',
  add column if not exists secondary_cta_label text not null default '',
  add column if not exists secondary_cta_url text not null default '',
  add column if not exists image_alt text not null default '',
  add column if not exists object_position text not null default 'center center',
  add column if not exists mobile_object_position text not null default 'center center',
  add column if not exists focal_x numeric,
  add column if not exists focal_y numeric,
  add column if not exists focal_zoom numeric not null default 1,
  add column if not exists mobile_focal_x numeric,
  add column if not exists mobile_focal_y numeric,
  add column if not exists mobile_focal_zoom numeric not null default 1,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.cms_banners
  drop constraint if exists cms_banners_experience_key_check;

alter table if exists public.cms_banners
  add constraint cms_banners_experience_key_check
  check (experience_key ~ '^[a-z0-9-]+$');

alter table if exists public.cms_banners
  drop constraint if exists cms_banners_section_type_check;

alter table if exists public.cms_banners
  add constraint cms_banners_section_type_check
  check (section_type in (
    'wide_campaign',
    'split_campaign',
    'poster_carousel',
    'custom_cta',
    'team_package_campaign',
    'order_steps',
    'closing_campaign'
  ));

create index if not exists cms_banners_experience_section_order_idx
  on public.cms_banners (experience_key, section_type, is_active, sort_order);

update public.page_heroes
set
  primary_cta_label = case when primary_cta_label = '' then 'Belanja Jersey' else primary_cta_label end,
  primary_cta_url = case when primary_cta_url = '' then '/jersey/shop' else primary_cta_url end,
  secondary_cta_label = case when secondary_cta_label = '' then 'Buat Jersey Custom' else secondary_cta_label end,
  secondary_cta_url = case when secondary_cta_url = '' then '/jersey/configurator' else secondary_cta_url end
where page_key = 'jersey';

comment on column public.cms_banners.experience_key is
  'Public commerce experience owner, for example landing or jersey.';
comment on column public.cms_banners.section_type is
  'Frozen commerce section role; product truth remains in PIM.';
comment on column public.cms_banners.metadata is
  'Presentation-only structured CMS data such as Cara Order items; never price, SKU, variant, or stock.';

-- Recovery: the migration is additive. To disable the Jersey experience,
-- archive or deactivate rows where experience_key = 'jersey'. Do not drop
-- shared cms_banners columns after production use because revisions may refer
-- to the stored payload.
