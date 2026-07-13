import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { JerseyCarousel } from "@/components/jersey/JerseyCarousel";
import {
  jerseyItemHref,
  jerseyRowsByGroup,
  jerseySectionItems,
  resolvedJerseySections,
  validJerseyHref
} from "@/lib/jersey-experience";
import type { CmsBanner, PageHeroContent, PublicContent, ServiceCategory } from "@/lib/types";
import { whatsappHref } from "@/lib/url";

function ActionLink({ href, children, variant = "white" }: { href: string | null; children: ReactNode; variant?: "white" | "neon" | "outline" }) {
  if (!href) return null;
  const className = variant === "neon"
    ? "inline-flex min-h-12 items-center justify-center rounded-full bg-[#39FF88] px-6 text-sm font-semibold text-black transition hover:bg-[#72ffa9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF88]"
    : variant === "outline"
      ? "inline-flex min-h-12 items-center justify-center rounded-full border border-white/55 px-6 text-sm font-semibold text-white transition hover:border-[#39FF88] hover:text-[#39FF88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF88]"
      : "inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-[#39FF88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF88]";

  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  return <Link href={href} className={className}>{children}</Link>;
}

function CampaignMedia({ item, className, priority = false }: { item: CmsBanner; className: string; priority?: boolean }) {
  if (item.media_type === "video") {
    return <video className={className} src={item.desktop_media_url} poster={item.poster_url || undefined} controls muted playsInline preload="metadata" />;
  }
  return (
    <ResponsivePicture
      desktopSrc={item.desktop_media_url}
      mobileSrc={item.mobile_media_url || item.desktop_media_url}
      alt={item.image_alt || item.title || item.name}
      className={className}
      priority={priority}
      desktopObjectPosition={item.object_position}
      mobileObjectPosition={item.mobile_object_position || item.object_position}
      desktopZoom={item.focal_zoom}
      mobileZoom={item.mobile_focal_zoom}
    />
  );
}

function heroHref(value: string | undefined, fallback: string) {
  return value?.trim() ? validJerseyHref(value) : fallback;
}

function JerseyHero({ hero }: { hero: PageHeroContent | undefined }) {
  const desktopImage = hero?.image_url || "/brand/debroder/social-preview.png";
  const mobileImage = hero?.mobile_image_url || desktopImage;
  const primaryUrl = heroHref(hero?.primary_cta_url, "/jersey/shop");
  const secondaryUrl = heroHref(hero?.secondary_cta_url, "/jersey/configurator");

  return (
    <section className="keep-section-bg bg-[#050505] text-white">
      <div className="h-[clamp(380px,115vw,560px)] overflow-hidden bg-[#101010] md:h-[clamp(480px,62vw,760px)]">
        <ResponsivePicture
          desktopSrc={desktopImage}
          mobileSrc={mobileImage}
          alt={hero?.image_alt || hero?.title || "DEBRODER Jersey campaign"}
          className="h-full w-full"
          priority
          desktopObjectPosition={hero?.object_position}
          mobileObjectPosition={hero?.mobile_object_position || hero?.object_position}
          objectFit={hero?.object_fit || "cover"}
          desktopZoom={hero?.focal_zoom}
          mobileZoom={hero?.mobile_focal_zoom}
        />
      </div>
      <div className="jersey-shell py-[clamp(36px,4vw,64px)] text-center">
        <p className="jersey-neon text-xs font-semibold uppercase tracking-[0.2em]">{hero?.label || "DEBRODER JERSEY"}</p>
        <h1 className="mx-auto mt-4 max-w-5xl font-heading text-[clamp(2.8rem,7vw,7rem)] font-extrabold uppercase leading-[.9] tracking-[-0.04em]">{hero?.title || "Built for the Team"}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{hero?.subtitle || "Jersey untuk bertanding, membangun identitas, dan mewakili tim Anda."}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ActionLink href={primaryUrl}>{hero?.primary_cta_label || "Belanja Jersey"}</ActionLink>
          <ActionLink href={secondaryUrl} variant="outline">{hero?.secondary_cta_label || "Buat Jersey Custom"}</ActionLink>
        </div>
      </div>
    </section>
  );
}

function CenteredEditorial({ item }: { item: CmsBanner }) {
  const href = jerseyItemHref(item, item.cta_url, "/jersey/shop");
  return (
    <section className="jersey-section keep-section-bg border-y border-white/10 bg-[#050505] text-center text-white">
      <div className="jersey-shell mx-auto max-w-5xl">
        {item.eyebrow ? <p className="jersey-neon text-xs font-semibold uppercase tracking-[0.18em]">{item.eyebrow}</p> : null}
        <h2 className="mt-3 font-heading text-[clamp(2.5rem,6vw,6rem)] font-extrabold uppercase leading-[.92] tracking-[-0.035em]">{item.title}</h2>
        {item.subtitle ? <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">{item.subtitle}</p> : null}
        {item.cta_label && href ? <div className="mt-7"><ActionLink href={href}>{item.cta_label}</ActionLink></div> : null}
      </div>
    </section>
  );
}

function SplitCampaign({ items, label }: { items: CmsBanner[]; label: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={label} className="jersey-section keep-section-bg bg-[#050505] text-white">
      <div className="jersey-shell grid gap-[var(--jersey-split-gap)] md:grid-cols-2">
        {items.slice(0, 2).map((item) => {
          const href = jerseyItemHref(item, item.cta_url, "/jersey/shop");
          const overlay = Math.min(.82, Math.max(.18, Number(item.overlay_strength ?? .48)));
          const content = (
            <div className="group relative aspect-[4/5] overflow-hidden bg-[#101010]">
              <CampaignMedia item={item} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.012]" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" style={{ "--tw-gradient-from": `rgba(0,0,0,${overlay})` } as CSSProperties} />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                {item.eyebrow ? <p className="jersey-neon text-[11px] font-semibold uppercase tracking-[0.18em]">{item.eyebrow}</p> : null}
                <h2 className="mt-2 font-heading text-[clamp(2rem,4vw,4.5rem)] font-bold uppercase leading-[.92] tracking-[-0.03em]">{item.title}</h2>
                {item.subtitle ? <p className="mt-3 max-w-lg text-sm leading-6 text-white/72 sm:text-base">{item.subtitle}</p> : null}
                {item.cta_label && href ? <span className="mt-5 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-xs font-semibold text-black">{item.cta_label}</span> : null}
              </div>
            </div>
          );
          return <article id={item.anchor_id || undefined} className="jersey-anchor" key={item.id || item.section_key}>{href ? <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF88]">{content}</Link> : content}</article>;
        })}
      </div>
    </section>
  );
}

function WideEditorial({ item }: { item: CmsBanner }) {
  const href = jerseyItemHref(item, item.cta_url, "/jersey/shop");
  const overlay = Math.min(.82, Math.max(.18, Number(item.overlay_strength ?? .52)));
  return (
    <section className="jersey-section keep-section-bg bg-[#050505] text-white">
      <div className="jersey-shell relative aspect-[4/5] overflow-hidden bg-[#101010] md:aspect-[16/7]">
        <CampaignMedia item={item} className="h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" style={{ "--tw-gradient-from": `rgba(0,0,0,${overlay})` } as CSSProperties} />
        <div className="absolute inset-x-0 bottom-0 max-w-3xl p-5 sm:p-8 lg:p-12">
          {item.eyebrow ? <p className="jersey-neon text-xs font-semibold uppercase tracking-[0.18em]">{item.eyebrow}</p> : null}
          <h2 className="mt-3 font-heading text-[clamp(2.5rem,5vw,5.5rem)] font-extrabold uppercase leading-[.92] tracking-[-0.035em]">{item.title}</h2>
          {item.subtitle ? <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 sm:text-base sm:leading-7">{item.subtitle}</p> : null}
          {item.cta_label && href ? <div className="mt-6"><ActionLink href={href}>{item.cta_label}</ActionLink></div> : null}
        </div>
      </div>
    </section>
  );
}

function EditorialCampaign({ item, id, supportHref }: { item: CmsBanner; id?: string; supportHref?: string }) {
  const fallback = item.section_type === "custom_cta" || item.section_type === "team_package_campaign" ? "/jersey/configurator" : "/jersey/shop";
  const primary = jerseyItemHref(item, item.cta_url, fallback);
  const secondary = jerseyItemHref(item, item.secondary_cta_url, supportHref || "");
  return (
    <section id={id} className="jersey-anchor jersey-section keep-section-bg border-t border-white/10 bg-[#050505] text-white">
      <div className="jersey-shell grid gap-8 lg:grid-cols-2 lg:items-center">
        {item.desktop_media_url ? <div className="aspect-[4/5] overflow-hidden bg-[#101010] sm:aspect-[16/11] lg:aspect-[4/5]"><CampaignMedia item={item} className="h-full w-full" /></div> : null}
        <div className="max-w-2xl lg:px-8">
          {item.eyebrow ? <p className="jersey-neon text-xs font-semibold uppercase tracking-[0.18em]">{item.eyebrow}</p> : null}
          <h2 className="mt-3 font-heading text-[clamp(2.5rem,5vw,5.5rem)] font-extrabold uppercase leading-[.92] tracking-[-0.035em]">{item.title}</h2>
          {item.subtitle ? <p className="mt-5 text-base leading-7 text-white/68">{item.subtitle}</p> : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {item.cta_label ? <ActionLink href={primary} variant="neon">{item.cta_label}</ActionLink> : null}
            {item.secondary_cta_label ? <ActionLink href={secondary} variant="outline">{item.secondary_cta_label}</ActionLink> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderSteps({ item }: { item: CmsBanner }) {
  const steps = jerseySectionItems(item);
  if (!steps.length) return null;
  return (
    <section id="cara-order-jersey" className="jersey-anchor jersey-section keep-section-bg border-t border-white/10 bg-[#050505] text-white">
      <div className="jersey-shell">
        <p className="jersey-neon text-xs font-semibold uppercase tracking-[0.18em]">Dari Pilihan ke Produksi</p>
        <h2 className="mt-3 font-heading text-[clamp(2.5rem,5vw,5.5rem)] font-extrabold uppercase tracking-[-0.035em]">{item.title || "Cara Order Jersey"}</h2>
        {item.subtitle ? <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">{item.subtitle}</p> : null}
        <ol className="mt-[var(--jersey-heading-gap)] grid border-t border-white/12 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={`${index}-${step}`} className="grid grid-cols-[40px_1fr] gap-3 border-b border-white/12 py-5 md:px-4 md:first:pl-0 lg:min-h-36 lg:border-r lg:last:border-r-0">
              <span className="jersey-neon font-heading text-2xl font-bold">{String(index + 1).padStart(2, "0")}</span>
              <p className="text-sm font-medium leading-6 text-white/68">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ClosingCampaign({ item }: { item: CmsBanner }) {
  const primary = jerseyItemHref(item, item.cta_url, "/jersey/shop");
  const secondary = jerseyItemHref(item, item.secondary_cta_url, "/jersey/configurator");
  return (
    <section className="keep-section-bg relative overflow-hidden border-y border-white/10 bg-[#050505] py-[clamp(72px,9vw,144px)] text-center text-white">
      {item.desktop_media_url ? <div className="absolute inset-0 opacity-20"><CampaignMedia item={item} className="h-full w-full" /><div className="absolute inset-0 bg-black/55" /></div> : null}
      <div className="jersey-shell relative">
        <p className="jersey-neon font-heading text-[clamp(3.5rem,10vw,10rem)] font-extrabold uppercase leading-[.82] tracking-[-0.045em]">{item.title || "DEBRODER JERSEY"}</p>
        {item.subtitle ? <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">{item.subtitle}</p> : null}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {item.cta_label ? <ActionLink href={primary}>{item.cta_label}</ActionLink> : null}
          {item.secondary_cta_label ? <ActionLink href={secondary} variant="outline">{item.secondary_cta_label}</ActionLink> : null}
        </div>
      </div>
    </section>
  );
}

function firstByType(items: CmsBanner[], type: string) {
  return items.find((item) => item.section_type === type);
}

export function JerseyExperience({ content, hero, categories }: { content: PublicContent; hero: PageHeroContent | undefined; categories: ServiceCategory[] }) {
  const sections = resolvedJerseySections(content.jerseySections, hero, categories);
  const carousel01 = jerseyRowsByGroup(sections, "poster_carousel", "carousel-01");
  const carousel02 = jerseyRowsByGroup(sections, "poster_carousel", "carousel-02");
  const split01 = jerseyRowsByGroup(sections, "split_campaign", "split-01");
  const split02 = jerseyRowsByGroup(sections, "split_campaign", "split-02");
  const centered = firstByType(sections, "centered_editorial_copy");
  const wide = firstByType(sections, "wide_campaign");
  const custom = firstByType(sections, "custom_cta");
  const packageCampaign = firstByType(sections, "team_package_campaign");
  const orderSteps = firstByType(sections, "order_steps");
  const closing = firstByType(sections, "closing_campaign");
  const supportHref = whatsappHref(content.contact.whatsapp_apparel, "Halo DEBRODER, saya ingin berkonsultasi tentang Jersey Custom.");

  return (
    <>
      <JerseyHero hero={hero} />
      <JerseyCarousel id="jersey-carousel-01" eyebrow={carousel01[0]?.eyebrow || "Team / Community"} title={carousel01[0]?.section_heading || "Dibuat untuk Cara Tim Anda Bergerak"} description={carousel01[0]?.section_description} items={carousel01} />
      {centered ? <CenteredEditorial item={centered} /> : null}
      <SplitCampaign items={split01} label="Campaign Jersey Football dan Futsal" />
      <JerseyCarousel id="jersey-carousel-02" eyebrow={carousel02[0]?.eyebrow || "Jersey Looks"} title={carousel02[0]?.section_heading || "Gaya yang Membawa Identitas Tim"} description={carousel02[0]?.section_description} items={carousel02} />
      {wide ? <WideEditorial item={wide} /> : null}
      <SplitCampaign items={split02} label="Campaign Jersey Komunitas dan Instansi" />
      {custom ? <EditorialCampaign item={custom} supportHref={supportHref} /> : null}
      {packageCampaign ? <EditorialCampaign item={packageCampaign} id="paket-tim" /> : null}
      {orderSteps ? <OrderSteps item={orderSteps} /> : null}
      {closing ? <ClosingCampaign item={closing} /> : null}
    </>
  );
}
