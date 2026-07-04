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
      alt={banner.title}
      className="h-full w-full object-cover"
      objectFit="cover"
    />
  );
}

export function CampaignBanners({ banners }: { banners: CmsBanner[] }) {
  if (!banners.length) return null;

  return (
    <section data-reveal aria-label="Campaign DEBRODER" className="snap-section bg-white py-4 sm:py-6">
      <div className="section-shell grid gap-4">
        {banners.map((banner) => {
          const alignment = banner.text_position === "center" ? "mx-auto text-center" : banner.text_position === "right" ? "ml-auto text-right" : "";
          return (
          <article key={banner.id || banner.name} className="relative aspect-[4/5] overflow-hidden bg-[#101713] sm:aspect-[16/7]">
            <CampaignMedia banner={banner} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent sm:bg-gradient-to-r" />
            <div className={`absolute inset-x-0 bottom-0 max-w-3xl p-6 text-white sm:p-10 lg:p-14 ${alignment}`}>
              {banner.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{banner.eyebrow}</p> : null}
              <h2 className="mt-2 text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-5xl">{banner.title}</h2>
              {banner.subtitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">{banner.subtitle}</p> : null}
              {banner.cta_label && banner.cta_url ? (
                <a href={banner.cta_url} className="mt-6 inline-flex min-h-11 items-center justify-center bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
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
