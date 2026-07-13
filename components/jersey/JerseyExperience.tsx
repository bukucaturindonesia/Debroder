import Link from "next/link";
import type { ReactNode } from "react";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { JerseyCarousel } from "@/components/jersey/JerseyCarousel";
import {
  jerseySectionItems,
  resolvedJerseySections,
  safeJerseyHref
} from "@/lib/jersey-experience";
import type { CmsBanner, PageHeroContent, PublicContent, ServiceCategory } from "@/lib/types";
import { whatsappHref } from "@/lib/url";

function ActionLink({ href, children, variant = "dark" }: { href: string; children: ReactNode; variant?: "dark" | "light" | "outline" | "hero" }) {
  const className = variant === "hero"
    ? "inline-flex min-h-12 items-center justify-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-[#063D24] sm:bg-white sm:text-[#111] sm:hover:bg-[#f1f1ed]"
    : variant === "light"
    ? "inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#111] transition hover:bg-[#f1f1ed]"
    : variant === "outline"
      ? "inline-flex min-h-12 items-center justify-center rounded-full border border-current px-6 text-sm font-semibold transition hover:bg-white hover:text-[#111]"
      : "inline-flex min-h-12 items-center justify-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-[#063D24]";

  if (/^https?:\/\//i.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link href={href} className={className}>{children}</Link>;
}

function CampaignMedia({ item, className, priority = false }: { item: CmsBanner; className: string; priority?: boolean }) {
  if (item.media_type === "video") {
    return (
      <video
        className={className}
        src={item.desktop_media_url}
        poster={item.poster_url || undefined}
        controls
        muted
        playsInline
        preload="metadata"
      />
    );
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

function JerseyHero({ hero }: { hero: PageHeroContent | undefined }) {
  const desktopImage = hero?.image_url || "/brand/debroder/social-preview.png";
  const mobileImage = hero?.mobile_image_url || desktopImage;
  const primaryLabel = hero?.primary_cta_label || "Belanja Jersey";
  const primaryUrl = safeJerseyHref(hero?.primary_cta_url, "/jersey/shop");
  const secondaryLabel = hero?.secondary_cta_label || "Buat Jersey Custom";
  const secondaryUrl = safeJerseyHref(hero?.secondary_cta_url, "/jersey/configurator");

  return (
    <section className="bg-white">
      <div className="relative overflow-hidden bg-[#111] sm:min-h-[520px] lg:min-h-[620px]">
        <div className="aspect-[4/5] sm:absolute sm:inset-0 sm:aspect-auto">
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
          <div className="absolute inset-0 hidden bg-gradient-to-r from-black/70 via-black/20 to-transparent sm:block" />
        </div>
        <div className="relative bg-white px-5 py-8 text-[#111] sm:flex sm:min-h-[520px] sm:items-end sm:bg-transparent sm:px-10 sm:pb-12 sm:text-white lg:min-h-[620px] lg:px-16 lg:pb-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#063D24] sm:text-white/75">{hero?.label || "DEBRODER JERSEY"}</p>
            <h1 className="mt-3 font-heading text-[clamp(3rem,12vw,4.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.035em] sm:text-[clamp(4.5rem,8vw,7rem)]">
              {hero?.title || "Built for the Team"}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-black/65 sm:text-lg sm:text-white/85">
              {hero?.subtitle || "Jersey untuk bertanding, membangun identitas, dan mewakili tim Anda."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ActionLink href={primaryUrl} variant="hero">{primaryLabel}</ActionLink>
              <ActionLink href={secondaryUrl} variant="outline">{secondaryLabel}</ActionLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SplitCampaigns({ items }: { items: CmsBanner[] }) {
  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20">
      <div className="section-shell grid gap-4 md:grid-cols-2">
        {items.slice(0, 2).map((item) => (
          <article key={item.id || item.section_key} className="group">
            <div className="aspect-[4/5] overflow-hidden bg-[#efefec]">
              <CampaignMedia item={item} className="h-full w-full transition duration-500 group-hover:scale-[1.015]" />
            </div>
            <div className="pt-5">
              {item.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#063D24]">{item.eyebrow}</p> : null}
              <h2 className="mt-2 font-heading text-4xl font-bold uppercase tracking-[-0.025em] sm:text-5xl">{item.title}</h2>
              {item.subtitle ? <p className="mt-3 max-w-xl text-sm leading-6 text-black/60 sm:text-base">{item.subtitle}</p> : null}
              {item.cta_label ? <div className="mt-5"><ActionLink href={safeJerseyHref(item.cta_url, "/jersey/shop")}>{item.cta_label}</ActionLink></div> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WideEditorial({ item }: { item: CmsBanner }) {
  return (
    <section className="keep-section-bg bg-[#f4f3ef] py-14 sm:py-16 lg:py-20">
      <div className="campaign-shell">
        <div className="aspect-[4/5] overflow-hidden bg-[#e8e8e3] sm:aspect-[16/7]">
          <CampaignMedia item={item} className="h-full w-full" />
        </div>
        <div className="mx-auto max-w-4xl px-5 pt-8 text-center sm:pt-10">
          {item.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#063D24]">{item.eyebrow}</p> : null}
          <h2 className="mt-3 font-heading text-4xl font-extrabold uppercase leading-[0.95] tracking-[-0.03em] sm:text-6xl">{item.title}</h2>
          {item.subtitle ? <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/60">{item.subtitle}</p> : null}
          {item.cta_label ? <div className="mt-7"><ActionLink href={safeJerseyHref(item.cta_url, "/jersey/shop")}>{item.cta_label}</ActionLink></div> : null}
        </div>
      </div>
    </section>
  );
}

function EditorialCta({ item, id, dark = false, supportHref }: { item: CmsBanner; id?: string; dark?: boolean; supportHref?: string }) {
  const primaryFallback = item.section_type === "custom_cta" || item.section_type === "team_package_campaign"
    ? "/jersey/configurator"
    : "/jersey/shop";
  const secondaryHref = safeJerseyHref(item.secondary_cta_url, supportHref || "");

  return (
    <section id={id} className={`keep-section-bg scroll-mt-14 py-14 sm:py-16 lg:py-20 ${dark ? "bg-[#111] text-white" : "bg-white text-[#111]"}`}>
      <div className="section-shell grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="aspect-[4/5] overflow-hidden bg-[#e8e8e3] sm:aspect-[16/11] lg:aspect-[4/5]">
          <CampaignMedia item={item} className="h-full w-full" />
        </div>
        <div className="max-w-2xl lg:px-8">
          {item.eyebrow ? <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-white/60" : "text-[#063D24]"}`}>{item.eyebrow}</p> : null}
          <h2 className="mt-3 font-heading text-4xl font-extrabold uppercase leading-[0.95] tracking-[-0.03em] sm:text-6xl">{item.title}</h2>
          {item.subtitle ? <p className={`mt-5 text-base leading-7 ${dark ? "text-white/70" : "text-black/60"}`}>{item.subtitle}</p> : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ActionLink href={safeJerseyHref(item.cta_url, primaryFallback)} variant={dark ? "light" : "dark"}>{item.cta_label || "Mulai Konfigurasi Jersey"}</ActionLink>
            {item.secondary_cta_label && secondaryHref ? <ActionLink href={secondaryHref} variant="outline">{item.secondary_cta_label}</ActionLink> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderSteps({ item }: { item: CmsBanner }) {
  const steps = jerseySectionItems(item);
  return (
    <section id="cara-order-jersey" className="keep-section-bg bg-[#f4f3ef] py-14 sm:py-16 lg:py-20">
      <div className="section-shell">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#063D24]">Dari Pilihan ke Produksi</p>
          <h2 className="mt-3 font-heading text-4xl font-extrabold uppercase tracking-[-0.03em] sm:text-6xl">{item.title || "Cara Order Jersey"}</h2>
          {item.subtitle ? <p className="mt-4 text-base leading-7 text-black/60">{item.subtitle}</p> : null}
        </div>
        <ol className="mt-9 grid border-t border-black/15 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={`${index}-${step}`} className="grid grid-cols-[36px_1fr] gap-3 border-b border-black/15 py-5 sm:px-4 sm:first:pl-0 lg:min-h-36 lg:border-r lg:last:border-r-0">
              <span className="font-heading text-2xl font-bold text-[#063D24]">{String(index + 1).padStart(2, "0")}</span>
              <p className="text-sm font-medium leading-6 text-black/70">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ClosingCampaign({ item }: { item: CmsBanner }) {
  return (
    <section className="keep-section-bg relative min-h-[520px] overflow-hidden bg-[#111] text-white sm:min-h-[620px]">
      <div className="absolute inset-0">
        <CampaignMedia item={item} className="h-full w-full" />
        <div className="absolute inset-0 bg-black/45" />
      </div>
      <div className="section-shell relative flex min-h-[520px] items-end py-12 sm:min-h-[620px] sm:py-16">
        <div className="max-w-3xl">
          <h2 className="font-heading text-5xl font-extrabold uppercase leading-[0.9] tracking-[-0.035em] sm:text-7xl lg:text-8xl">{item.title}</h2>
          {item.subtitle ? <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">{item.subtitle}</p> : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ActionLink href={safeJerseyHref(item.cta_url, "/jersey/shop")} variant="light">{item.cta_label || "Belanja Semua Jersey"}</ActionLink>
            {item.secondary_cta_label ? <ActionLink href={safeJerseyHref(item.secondary_cta_url, "/jersey/configurator")} variant="outline">{item.secondary_cta_label}</ActionLink> : null}
          </div>
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
  const split = sections.filter((item) => item.section_type === "split_campaign");
  const carousel = sections.filter((item) => item.section_type === "poster_carousel");
  const wide = firstByType(sections, "wide_campaign");
  const custom = firstByType(sections, "custom_cta");
  const packageCampaign = firstByType(sections, "team_package_campaign");
  const orderSteps = firstByType(sections, "order_steps");
  const closing = firstByType(sections, "closing_campaign");
  const supportHref = whatsappHref(content.contact.whatsapp_apparel, "Halo DEBRODER, saya ingin berkonsultasi tentang Jersey Custom.");

  return (
    <>
      <JerseyHero hero={hero} />
      <SplitCampaigns items={split} />
      <JerseyCarousel items={carousel} />
      {wide ? <WideEditorial item={wide} /> : null}
      {custom ? <EditorialCta item={custom} dark supportHref={supportHref} /> : null}
      {packageCampaign ? <EditorialCta item={packageCampaign} id="paket-tim" /> : null}
      {orderSteps ? <OrderSteps item={orderSteps} /> : null}
      {closing ? <ClosingCampaign item={closing} /> : null}
    </>
  );
}
