-- DEBRODER: admin-managed website fallback images.
-- Safe to run more than once. Review before production execution.

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
  group_name = excluded.group_name,
  updated_at = now();

alter table public.website_settings enable row level security;

drop policy if exists "Public can read public media settings" on public.website_settings;
create policy "Public can read public media settings"
on public.website_settings for select
to anon, authenticated
using (
  group_name = 'public_media'
  and setting_key = 'site_media_defaults'
);
