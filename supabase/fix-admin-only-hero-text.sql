-- DEBRODER: Hero text must come from admin only.
-- This clears old seed/default hero copy while keeping images, order, and active status.
-- Run in Supabase SQL Editor after deploying this fix if old text still appears.

begin;

-- Landing hero slider: keep images, clear old text/buttons that came from seed/defaults.
update public.hero_banners
set
  badge = '',
  headline = '',
  subheadline = '',
  title = '',
  subtitle = '',
  cta_text = '',
  cta_primary_text = '',
  cta_secondary_text = '',
  updated_at = now()
where
  coalesce(badge, '') <> ''
  or coalesce(headline, '') <> ''
  or coalesce(subheadline, '') <> ''
  or coalesce(title, '') <> ''
  or coalesce(subtitle, '') <> ''
  or coalesce(cta_text, '') <> ''
  or coalesce(cta_primary_text, '') <> ''
  or coalesce(cta_secondary_text, '') <> '';

-- Page heroes: keep images, clear old page title/subtitle/label seed text.
update public.page_heroes
set
  label = '',
  title = '',
  subtitle = '',
  updated_at = now()
where page_key in (
  'koleksi',
  'kaos-polos',
  'jaket-hoodie',
  'headwear',
  'sablon-dtf',
  'maklon-dtf',
  'jersey',
  'cetak-sublim',
  'store',
  'cara-order',
  'polo-shirt',
  'kemeja',
  'aksesori-lainnya'
);

commit;

-- Check remaining hero text.
select 'hero_banners' as source, id, badge, headline, subheadline, title, subtitle
from public.hero_banners
where coalesce(badge, '') <> ''
   or coalesce(headline, '') <> ''
   or coalesce(subheadline, '') <> ''
   or coalesce(title, '') <> ''
   or coalesce(subtitle, '') <> ''
union all
select 'page_heroes' as source, id, label, title, subtitle, null::text, null::text
from public.page_heroes
where page_key in (
  'koleksi', 'kaos-polos', 'jaket-hoodie', 'headwear', 'sablon-dtf',
  'maklon-dtf', 'jersey', 'cetak-sublim', 'store', 'cara-order',
  'polo-shirt', 'kemeja', 'aksesori-lainnya'
)
  and (coalesce(label, '') <> '' or coalesce(title, '') <> '' or coalesce(subtitle, '') <> '');
