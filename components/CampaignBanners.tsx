import type { CmsBanner } from "@/lib/types";
import { ResponsivePicture } from "@/components/ResponsivePicture";

function cleanText(value?: string | null) {
  const text = value?.trim();
  if (!text || text === "." || text === "-" || text === "—") return "";
  return text;
}

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

type CampaignBannersProps = {
  banners: CmsBanner[];
  fallbackDesktopSrc: string;
  fallbackMobileSrc?: string | null;
};

export function CampaignBanners({ banners, fallbackDesktopSrc, fallbackMobileSrc }: CampaignBannersProps) {
  const activeBanners = banners
    .filter((banner) => banner.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .slice(0, 1);

  const visibleBanners: CmsBanner[] = activeBanners.length
    ? activeBanners
    : [
        {
          id: "built-for-identity-fallback",
          name: "Built for Identity",
          media_type: "image",
          desktop_media_url: fallbackDesktopSrc,
          mobile_media_url: fallbackMobileSrc || fallbackDesktopSrc,
          poster_url: null,
          eyebrow: "",
          title: "BUILT FOR IDENTITY",
          subtitle: "Apparel custom untuk tim, komunitas, dan perusahaan yang ingin tampil beda.",
          cta_label: "Jelajahi Koleksi",
          cta_url: "/koleksi",
          text_position: "center",
          is_active: true,
          sort_order: 0
        }
      ];

  return (
    <section aria-label="Campaign DEBRODER" className="home-section home-campaign campaign-section section-space bg-white">
      <div className="section-shell">
        {visibleBanners.map((banner) => {
          const title = cleanText(banner.title) || "BUILT FOR IDENTITY";
          const subtitle = cleanText(banner.subtitle) || "Apparel custom untuk tim, komunitas, dan perusahaan yang ingin tampil beda.";
          const ctaLabel = cleanText(banner.cta_label) || "Jelajahi Koleksi";
          const ctaUrl = banner.cta_url || "/koleksi";

          return (
            <article key={banner.id || banner.name}>
              <div className="relative aspect-[4/5] overflow-hidden bg-[#efefef] sm:aspect-auto sm:h-[clamp(460px,60vh,560px)] lg:h-[clamp(560px,74vh,760px)]">
                <CampaignMedia banner={banner} />
              </div>

              <div className="mx-auto max-w-5xl px-2 pt-10 text-center sm:pt-12 lg:pt-14">
                <h2 className="campaign-copy-title whitespace-pre-line text-[#111]">
                  {title}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-6 text-black/70 sm:text-lg sm:leading-7">
                  {subtitle}
                </p>
                <a
                  href={ctaUrl}
                  className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/75"
                >
                  {ctaLabel}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
