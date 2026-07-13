import type { CmsBanner, PageHeroContent, ServiceCategory } from "@/lib/types";

export const JERSEY_SECTION_TYPES = [
  "poster_carousel",
  "centered_editorial_copy",
  "split_campaign",
  "wide_campaign",
  "custom_cta",
  "order_steps",
  "closing_campaign"
] as const;

export const JERSEY_ORDER_STEPS = [
  "Pilih Jersey atau mulai konfigurasi.",
  "Tentukan kebutuhan dan jumlah pemain.",
  "Tinjau total atau quotation.",
  "Bayar penuh atau DP pada order yang sama.",
  "Setujui mockup.",
  "Produksi dan quality control.",
  "Pengiriman atau pickup."
];

export const JERSEY_NAV_ITEMS = [
  { label: "Home", href: "/jersey" },
  { label: "Football", href: "/jersey#jersey-carousel-01" },
  { label: "Futsal", href: "/jersey#jersey-carousel-01" },
  { label: "Esports", href: "/jersey#jersey-carousel-01" },
  { label: "Custom", href: "/jersey/configurator" },
  { label: "Shop All", href: "/jersey/shop" }
] as const;

const supportedExternalTarget = /^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i;
const supportedAnchors = new Set([
  "jersey-carousel-01",
  "jersey-carousel-02",
  "cara-order-jersey"
]);

export function validJerseyHref(value: string | null | undefined) {
  const href = (value || "").trim();
  if (!href) return null;
  if (href.startsWith("#")) return supportedAnchors.has(href.slice(1)) ? href : null;
  if (supportedExternalTarget.test(href)) return href;

  const [pathAndQuery, fragment = ""] = href.split("#", 2);
  const pathname = pathAndQuery.split("?", 1)[0];
  if (fragment && !supportedAnchors.has(fragment)) return null;
  if (["/jersey", "/jersey/shop", "/jersey/configurator", "/koleksi", "/cara-order", "/help"].includes(pathname)) return href;
  if (/^\/produk\/[^/]+$/.test(pathname)) return href;
  return null;
}

export function safeJerseyHref(value: string | null | undefined, fallback: string) {
  return validJerseyHref(value) || validJerseyHref(fallback) || "";
}

export function isFallbackJerseyItem(item: CmsBanner) {
  return item.id?.startsWith("jersey-fallback-") === true;
}

export function jerseyItemHref(item: CmsBanner, value: string | null | undefined, fallback: string) {
  return isFallbackJerseyItem(item) ? safeJerseyHref(value, fallback) : validJerseyHref(value);
}

function fallbackMedia(pageHero: PageHeroContent | undefined, categories: ServiceCategory[]) {
  return pageHero?.image_url || categories[0]?.gambar_url || "/brand/debroder/social-preview.png";
}

function banner(
  sectionType: CmsBanner["section_type"],
  sectionKey: string,
  sortOrder: number,
  source: Partial<CmsBanner>
): CmsBanner {
  return {
    id: `jersey-fallback-${sectionKey}-${sortOrder}`,
    name: source.name || sectionKey,
    media_type: source.media_type || "image",
    desktop_media_url: source.desktop_media_url || "/brand/debroder/social-preview.png",
    mobile_media_url: source.mobile_media_url || source.desktop_media_url || "/brand/debroder/social-preview.png",
    eyebrow: source.eyebrow || "DEBRODER JERSEY",
    title: source.title || "",
    subtitle: source.subtitle || "",
    cta_label: source.cta_label || "",
    cta_url: source.cta_url || "",
    secondary_cta_label: source.secondary_cta_label || "",
    secondary_cta_url: source.secondary_cta_url || "",
    text_position: source.text_position || "left",
    experience_key: "jersey",
    section_type: sectionType,
    section_key: sectionKey,
    section_group: source.section_group || "",
    section_heading: source.section_heading || "",
    section_description: source.section_description || "",
    anchor_id: source.anchor_id || "",
    image_alt: source.image_alt || source.title || "Campaign DEBRODER Jersey",
    object_position: source.object_position || "center center",
    mobile_object_position: source.mobile_object_position || source.object_position || "center center",
    overlay_strength: source.overlay_strength ?? .42,
    theme_variant: source.theme_variant || "dark",
    metadata: source.metadata || {},
    is_active: true,
    sort_order: sortOrder,
    status: "published"
  };
}

function categoryFallbacks(media: string, categories: ServiceCategory[]) {
  return categories.length ? categories : [{
    nama_kategori: "Jersey Tim",
    deskripsi: "Jersey untuk tim, komunitas, sekolah, instansi, dan event.",
    gambar_url: media,
    link_slug: "jersey",
    urutan: 0,
    status_aktif: true
  } satisfies ServiceCategory];
}

function editorialItems({
  names,
  group,
  start,
  categories,
  media,
  heading,
  description
}: {
  names: string[];
  group: string;
  start: number;
  categories: ServiceCategory[];
  media: string;
  heading: string;
  description: string;
}) {
  return names.map((name, index) => {
    const category = categories[index % categories.length];
    return banner("poster_carousel", `${group}-${index + 1}`, start + index, {
      name,
      eyebrow: "DEBRODER JERSEY",
      title: categories.length > index ? category.nama_kategori : name,
      subtitle: categories.length > index ? category.deskripsi : `Jersey ${name.toLowerCase()} untuk identitas tim yang kuat.`,
      desktop_media_url: category.gambar_url || media,
      mobile_media_url: category.gambar_url || media,
      image_alt: category.image_alt || `Campaign Jersey ${name}`,
      object_position: category.object_position,
      section_group: group,
      section_heading: heading,
      section_description: description,
      cta_label: group === "carousel-01" ? "Jelajahi" : "Lihat Gaya",
      cta_url: "/jersey/shop"
    });
  });
}

function splitItems(group: string, start: number, sources: ServiceCategory[], media: string, names: [string, string]) {
  return names.map((name, index) => {
    const category = sources[index % sources.length];
    return banner("split_campaign", `${group}-${index + 1}`, start + index, {
      name,
      title: sources.length > index ? category.nama_kategori : name,
      subtitle: sources.length > index ? category.deskripsi : `Jersey ${name.toLowerCase()} dengan komposisi yang mewakili tim Anda.`,
      desktop_media_url: category.gambar_url || media,
      mobile_media_url: category.gambar_url || media,
      image_alt: category.image_alt || `Campaign Jersey ${name}`,
      object_position: category.object_position,
      section_group: group,
      cta_label: "Lihat Jersey",
      cta_url: "/jersey/shop"
    });
  });
}

export function jerseyFallbackSections(pageHero: PageHeroContent | undefined, categories: ServiceCategory[]) {
  const media = fallbackMedia(pageHero, categories);
  const sources = categoryFallbacks(media, categories);
  const carousel01 = editorialItems({
    names: ["Football", "Futsal", "Esports", "Komunitas", "Sekolah", "Instansi", "Event"],
    group: "carousel-01",
    start: 10,
    categories: sources,
    media,
    heading: "Dibuat untuk Cara Tim Anda Bergerak",
    description: "Jersey untuk pertandingan, komunitas, sekolah, instansi, dan event."
  });
  const carousel02 = editorialItems({
    names: ["Match Day", "Training", "Away Identity", "Supporter", "Youth", "Community", "Event Team"],
    group: "carousel-02",
    start: 40,
    categories: sources,
    media,
    heading: "Gaya yang Membawa Identitas Tim",
    description: "Pilihan visual untuk kebutuhan pertandingan dan aktivitas tim."
  });

  return [
    ...carousel01,
    banner("centered_editorial_copy", "centered-copy", 20, {
      title: "Satu Jersey. Satu Identitas.",
      subtitle: "Bangun tampilan yang menyatukan pemain dan membuat tim mudah dikenali.",
      desktop_media_url: media,
      cta_label: "Belanja Jersey",
      cta_url: "/jersey/shop"
    }),
    ...splitItems("split-01", 30, sources, media, ["Football", "Futsal & Esports"]),
    ...carousel02,
    banner("wide_campaign", "wide-editorial", 50, {
      title: "Identitas yang Menyatukan Tim",
      subtitle: "Dari ide awal hingga jersey siap dipakai, setiap detail dibangun untuk mewakili tim Anda.",
      desktop_media_url: media,
      mobile_media_url: pageHero?.mobile_image_url || media,
      image_alt: pageHero?.image_alt || "Identitas tim DEBRODER Jersey",
      object_position: pageHero?.object_position,
      mobile_object_position: pageHero?.mobile_object_position,
      cta_label: "Belanja Jersey",
      cta_url: "/jersey/shop"
    }),
    ...splitItems("split-02", 60, sources.slice().reverse(), media, ["Komunitas", "Sekolah & Instansi"]),
    banner("custom_cta", "custom-jersey", 70, {
      title: "Buat Jersey yang Mewakili Tim Anda",
      subtitle: "Atur model, bahan, kerah, lengan, warna, logo, sponsor, nama, nomor, dan kebutuhan pemain dalam satu alur.",
      desktop_media_url: sources[0]?.gambar_url || media,
      mobile_media_url: sources[0]?.gambar_url || media,
      image_alt: sources[0]?.image_alt || "Jersey custom DEBRODER",
      cta_label: "Mulai Konfigurasi Jersey",
      cta_url: "/jersey/configurator",
      secondary_cta_label: "Konsultasi dengan Admin",
      secondary_cta_url: ""
    }),
    banner("order_steps", "cara-order", 80, {
      title: "Cara Order Jersey",
      subtitle: "Satu alur resmi dari pilihan awal hingga jersey diterima.",
      desktop_media_url: media,
      metadata: { items: JERSEY_ORDER_STEPS }
    }),
    banner("closing_campaign", "closing", 90, {
      title: "DEBRODER JERSEY",
      subtitle: "Dibuat untuk tim yang membawa identitasnya ke setiap pertandingan.",
      desktop_media_url: media,
      mobile_media_url: pageHero?.mobile_image_url || media,
      image_alt: pageHero?.image_alt || "Closing campaign DEBRODER Jersey",
      object_position: pageHero?.object_position,
      mobile_object_position: pageHero?.mobile_object_position,
      cta_label: "Belanja Jersey",
      cta_url: "/jersey/shop",
      secondary_cta_label: "Mulai Jersey Custom",
      secondary_cta_url: "/jersey/configurator"
    })
  ];
}

export function resolvedJerseySections(managed: CmsBanner[], pageHero: PageHeroContent | undefined, categories: ServiceCategory[]) {
  const published = managed
    .filter((item) => item.is_active !== false && item.section_type !== "team_package_campaign")
    .sort((a, b) => a.sort_order - b.sort_order);
  return published.length ? published : jerseyFallbackSections(pageHero, categories);
}

export function jerseyRowsByGroup(items: CmsBanner[], type: string, group: string) {
  return items.filter((item) => item.section_type === type && item.section_group === group).sort((a, b) => a.sort_order - b.sort_order);
}

export function jerseySectionItems(section: CmsBanner) {
  const items = section.metadata?.items;
  return Array.isArray(items)
    ? items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}
