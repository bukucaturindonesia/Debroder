import Link from "next/link";
import { AccessibleAutoplayVideo } from "@/components/AccessibleAutoplayVideo";
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
      <AccessibleAutoplayVideo
        src={banner.desktop_media_url}
        mobileSrc={mobileUrl}
        poster={banner.poster_url}
        label={banner.image_alt || banner.title || banner.name || "Video campaign DEBRODER"}
      />
    );
  }

  return (
    <ResponsivePicture
      desktopSrc={banner.desktop_media_url}
      mobileSrc={banner.mobile_media_url || banner.desktop_media_url}
      alt={banner.image_alt || banner.title || banner.name}
      className="h-full w-full object-cover"
      objectFit="cover"
      desktopObjectPosition={banner.object_position}
      mobileObjectPosition={banner.mobile_object_position || banner.object_position}
      desktopZoom={banner.focal_zoom}
      mobileZoom={banner.mobile_focal_zoom}
    />
  );
}

function CampaignAction({ href, children }: { href: string; children: string }) {
  const className = "landing-campaign-cta mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a]";
  const external = /^(https?:|mailto:|tel:)/.test(href);

  if (external) {
    return <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>;
  }

  return <Link href={href} className={className}>{children}</Link>;
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
    <section aria-label="Campaign DEBRODER" className="home-section home-campaign campaign-section landing-campaign section-space bg-white">
      <div className="campaign-shell">
        {visibleBanners.map((banner) => {
          const title = cleanText(banner.title) || "BUILT FOR IDENTITY";
          const subtitle = cleanText(banner.subtitle) || "Apparel custom untuk tim, komunitas, dan perusahaan yang ingin tampil beda.";
          const ctaLabel = cleanText(banner.cta_label) || "Jelajahi Koleksi";
          const ctaUrl = banner.cta_url || "/koleksi";

          return (
            <article key={banner.id || banner.name}>
              <div className="landing-campaign-media relative aspect-[4/5] overflow-hidden bg-[#efefef] sm:aspect-[16/7]">
                <CampaignMedia banner={banner} />
              </div>

              <div className="campaign-copy landing-campaign-copy mx-auto max-w-5xl px-5 pt-8 text-center sm:pt-10 lg:pt-12">
                <h2 className="campaign-copy-title whitespace-pre-line text-[#111]">
                  {title}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-6 text-black/70 sm:text-lg sm:leading-7">
                  {subtitle}
                </p>
                <CampaignAction href={ctaUrl}>{ctaLabel}</CampaignAction>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
