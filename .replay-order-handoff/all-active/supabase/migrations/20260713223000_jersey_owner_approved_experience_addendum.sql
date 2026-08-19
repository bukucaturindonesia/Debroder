-- Owner-approved `/jersey` visual addendum.
-- Additive extension of the shared campaign CMS; PIM and transaction tables are untouched.

alter table if exists public.cms_banners
  add column if not exists section_group text not null default '',
  add column if not exists section_heading text not null default '',
  add column if not exists section_description text not null default '',
  add column if not exists anchor_id text not null default '',
  add column if not exists overlay_strength numeric not null default 0.42,
  add column if not exists theme_variant text not null default 'dark';

alter table if exists public.cms_banners
  drop constraint if exists cms_banners_overlay_strength_check;

alter table if exists public.cms_banners
  add constraint cms_banners_overlay_strength_check
  check (overlay_strength between 0 and 1);

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
    'closing_campaign'
  ));

-- Preserve existing owner content and assign deterministic visual slots only
-- where the newer grouping field is still empty.
with carousel_rows as (
  select id, row_number() over (order by sort_order, created_at, id) as row_number
  from public.cms_banners
  where experience_key = 'jersey'
    and section_type = 'poster_carousel'
    and section_group = ''
)
update public.cms_banners banner
set section_group = case when carousel_rows.row_number <= 7 then 'carousel-01' else 'carousel-02' end
from carousel_rows
where banner.id = carousel_rows.id;

with split_rows as (
  select id, row_number() over (order by sort_order, created_at, id) as row_number
  from public.cms_banners
  where experience_key = 'jersey'
    and section_type = 'split_campaign'
    and section_group = ''
)
update public.cms_banners banner
set section_group = case when split_rows.row_number <= 2 then 'split-01' else 'split-02' end
from split_rows
where banner.id = split_rows.id;

create index if not exists cms_banners_jersey_group_order_idx
  on public.cms_banners (experience_key, section_type, section_group, is_active, sort_order);

comment on column public.cms_banners.section_group is
  'Presentation slot inside a shared section type, e.g. carousel-01 or split-02.';
comment on column public.cms_banners.overlay_strength is
  'Restricted visual overlay opacity from 0 to 1; never product data.';

-- Recovery plan: archive affected Jersey rows or clear section_group to disable
-- grouping. Columns remain additive so CMS revision payloads are not destroyed.
