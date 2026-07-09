import type { CmsBanner } from "@/lib/types";
import { ResponsivePicture } from "@/components/ResponsivePicture";

function safeBannerCta(href: string, text: string) {
  const normalizedHref = href.toLowerCase();
  const normalizedText = text.toLowerCase();
  const directOrder = normalizedHref.includes("wa.me") || normalizedHref.includes("whatsapp") || normalizedHref === "/order" || normalizedHref.includes("pesan");
  const orderText = /pesan|order|beli/.test(normalizedText);

  if (directOrder || orderText) {
    return { href: "/koleksi", text: "Lihat Koleksi" };
  }

  return { href, text };
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
      alt={banner.title}
      className="h-full w-full object-cover"
      objectFit="cover"
    />
  );
}

export function CampaignBanners({ banners }: { banners: CmsBanner[] }) {
  if (!banners.length) return null;

  return (
    <section data-reveal aria-label="Campaign DEBRODER" className="snap-section bg-brand-offWhite py-4 sm:py-5">
      <div className="section-shell grid gap-4">
        {banners.map((banner) => {
          const alignment = banner.text_position === "center" ? "mx-auto text-center" : banner.text_position === "right" ? "ml-auto text-right" : "";
          const cta = banner.cta_label && banner.cta_url ? safeBannerCta(banner.cta_url, banner.cta_label) : null;
          return (
          <article key={banner.id || banner.name} className="relative aspect-[4/5] overflow-hidden bg-[#101713] sm:aspect-[16/7]">
            <CampaignMedia banner={banner} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/58 via-black/18 to-transparent" />
            <div className={`absolute inset-x-5 bottom-5 max-w-3xl text-white sm:inset-x-10 sm:bottom-10 ${alignment}`}>
              {banner.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/82 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">{banner.eyebrow}</p> : null}
              <h2 className="banner-title mt-2 text-[34px] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-[56px]">{banner.title}</h2>
              {banner.subtitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82 drop-shadow-[0_1px_8px_rgba(0,0,0,0.40)] sm:text-base">{banner.subtitle}</p> : null}
              {cta ? (
                <a href={cta.href} className="cta mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-3 text-sm text-[#111] shadow-[0_10px_26px_rgba(0,0,0,0.18)] transition hover:bg-[#e9eee9]">
                  {cta.text}
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
