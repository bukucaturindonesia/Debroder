import type { CmsBanner } from "@/lib/types";
import { ResponsivePicture } from "@/components/ResponsivePicture";

function CampaignMedia({ banner }: { banner: CmsBanner }) {
  if (banner.media_type === "video") {
    const mobileUrl = banner.mobile_media_url || banner.desktop_media_url;

    return (
      <>
        <video
          className="absolute inset-0 hidden h-full w-full object-cover sm:block"
          src={banner.desktop_media_url}
          poster={banner.poster_url || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <video
          className="absolute inset-0 h-full w-full object-cover sm:hidden"
          src={mobileUrl}
          poster={banner.poster_url || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      </>
    );
  }

  return (
    <ResponsivePicture
      desktopSrc={banner.desktop_media_url}
      mobileSrc={banner.mobile_media_url || banner.desktop_media_url}
      alt={banner.title || banner.name}
      className="h-full w-full object-cover"
      objectFit="cover"
    />
  );
}

export function CampaignBanners({ banners }: { banners: CmsBanner[] }) {
  const activeBanners = banners.filter((banner) => banner.is_active !== false);
  if (!activeBanners.length) return null;

  return (
    <section aria-label="Campaign DEBRODER" className="campaign-section bg-white py-10 sm:py-14 lg:py-20">
      <div className="section-shell grid gap-20 sm:gap-24">
        {activeBanners.map((banner) => {
          const ctaVisible = Boolean(banner.cta_label && banner.cta_url);

          return (
            <article key={banner.id || banner.name}>
              <div className="relative aspect-[4/5] overflow-hidden bg-[#efefef] sm:aspect-[16/7]">
                <CampaignMedia banner={banner} />
              </div>

              <div className="mx-auto max-w-5xl px-2 pt-9 text-center sm:pt-12">
                {banner.eyebrow ? (
                  <p className="text-sm font-medium text-[#111]">{banner.eyebrow}</p>
                ) : null}
                {banner.title ? (
                  <h2 className="campaign-copy-title mt-2 whitespace-pre-line text-[#111]">
                    {banner.title}
                  </h2>
                ) : null}
                {banner.subtitle ? (
                  <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-6 text-black/70 sm:text-lg">
                    {banner.subtitle}
                  </p>
                ) : null}
                {ctaVisible ? (
                  <a
                    href={banner.cta_url}
                    className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/75"
                  >
                    {banner.cta_label}
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
