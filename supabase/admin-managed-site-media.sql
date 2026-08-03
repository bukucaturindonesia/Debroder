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
    'heroDesktop', '/debroder/fallback/fallback-homepage-hero-desktop-16x7.svg',
    'heroMobile', '/debroder/fallback/fallback-homepage-hero-mobile-4x5.svg',
    'product', '/debroder/fallback/fallback-product-4x5.svg',
    'category', '/debroder/fallback/fallback-category-4x5.svg',
    'editorial', '/debroder/fallback/fallback-editorial-4x5.svg',
    'featuredDesktop', '/debroder/fallback/fallback-featured-desktop-5x4.svg',
    'featuredMobile', '/debroder/fallback/fallback-editorial-4x5.svg',
    'pageHeroDesktop', '/debroder/fallback/fallback-page-hero-desktop-12x5.svg',
    'pageHeroMobile', '/debroder/fallback/fallback-page-hero-mobile-4x5.svg',
    'serviceDetail', '/debroder/fallback/fallback-service-detail-4x3.svg',
    'bannerDesktop', '/debroder/fallback/fallback-campaign-desktop-16x7.svg',
    'bannerMobile', '/debroder/fallback/fallback-campaign-mobile-4x5.svg',
    'instagramBannerDesktop', '/debroder/fallback/fallback-instagram-banner-desktop-12x5.svg',
    'instagramBannerMobile', '/debroder/fallback/fallback-instagram-banner-mobile-4x5.svg',
    'store', '/debroder/fallback/fallback-store-4x3.svg',
    'aboutLandscape', '/debroder/fallback/fallback-about-landscape-4x3.svg',
    'aboutPortrait', '/debroder/fallback/fallback-about-portrait-4x5.svg',
    'customHeroDesktop', '/debroder/fallback/fallback-custom-hero-desktop-12x5.svg',
    'customHeroMobile', '/debroder/fallback/fallback-custom-hero-mobile-4x5.svg',
    'customPreset', '/debroder/fallback/fallback-custom-preset-4x3.svg',
    'socialPreview', '/debroder/social-preview.png'
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
