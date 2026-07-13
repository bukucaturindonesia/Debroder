import type { CmsBanner, PageHeroContent, ServiceCategory } from "@/lib/types";

export const JERSEY_SECTION_TYPES = [
  "split_campaign",
  "poster_carousel",
  "wide_campaign",
  "custom_cta",
  "team_package_campaign",
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
  { label: "Football", href: "/jersey#team-styles" },
  { label: "Futsal", href: "/jersey#team-styles" },
  { label: "Esports", href: "/jersey#team-styles" },
  { label: "Custom", href: "/jersey/configurator" },
  { label: "Paket Tim", href: "/jersey#paket-tim" },
  { label: "Shop All", href: "/jersey/shop" }
] as const;

const supportedExternalTarget = /^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i;

export function safeJerseyHref(value: string | null | undefined, fallback: string) {
  const href = (value || "").trim();
  if (!href) return fallback;
  if (href.startsWith("#")) return href;
  const pathname = href.split(/[?#]/, 1)[0];
  if (["/jersey", "/jersey/shop", "/jersey/configurator", "/koleksi", "/cara-order", "/help"].includes(pathname)) return href;
  if (/^\/produk\/[^/]+$/.test(pathname)) return href;
  if (supportedExternalTarget.test(href)) return href;
  return fallback;
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
    image_alt: source.image_alt || source.title || "Campaign DEBRODER Jersey",
    object_position: source.object_position || "center center",
    mobile_object_position: source.mobile_object_position || source.object_position || "center center",
    metadata: source.metadata || {},
    is_active: true,
    sort_order: sortOrder,
    status: "published"
  };
}

export function jerseyFallbackSections(
  pageHero: PageHeroContent | undefined,
  categories: ServiceCategory[]
) {
  const media = fallbackMedia(pageHero, categories);
  const categoryRows = categories.length ? categories : [{
    nama_kategori: "Jersey Tim",
    deskripsi: "Jersey untuk tim, komunitas, sekolah, instansi, dan event.",
    gambar_url: media,
    link_slug: "jersey",
    urutan: 0,
    status_aktif: true
  } satisfies ServiceCategory];

  const splitSources = categoryRows.length > 1
    ? categoryRows.slice(0, 2)
    : [
        categoryRows[0],
        {
          ...categoryRows[0],
          id: "jersey-fallback-futsal-esports",
          nama_kategori: "Futsal & Esports",
          deskripsi: "Jersey untuk tim futsal dan esports dengan identitas yang kuat."
        }
      ];
  const split = splitSources.map((category, index) => banner(
    "split_campaign",
    index === 0 ? "football" : "futsal-esports",
    10 + index,
    {
      name: category.nama_kategori,
      title: category.nama_kategori,
      subtitle: category.deskripsi,
      desktop_media_url: category.gambar_url || media,
      mobile_media_url: category.gambar_url || media,
      image_alt: category.image_alt || category.nama_kategori,
      object_position: category.object_position,
      cta_label: "Lihat Jersey",
      cta_url: "/jersey/shop"
    }
  ));

  const styleNames = ["Football", "Futsal", "Esports", "Komunitas", "Sekolah", "Instansi", "Event"];
  const carouselSources = styleNames.map((name, index) => {
    const category = categoryRows[index % categoryRows.length];
    return {
      ...category,
      nama_kategori: categoryRows.length > index ? category.nama_kategori : name,
      deskripsi: categoryRows.length > index
        ? category.deskripsi
        : `Jersey ${name.toLowerCase()} yang dirancang untuk memperkuat identitas tim.`
    };
  });
  const carousel = carouselSources.map((category, index) => banner(
    "poster_carousel",
    `style-${index + 1}`,
    20 + index,
    {
      name: category.nama_kategori,
      title: category.nama_kategori,
      subtitle: category.deskripsi,
      desktop_media_url: category.gambar_url || media,
      mobile_media_url: category.gambar_url || media,
      image_alt: category.image_alt || category.nama_kategori,
      object_position: category.object_position,
      cta_label: "Jelajahi",
      cta_url: "/jersey/shop"
    }
  ));

  return [
    ...split,
    ...carousel,
    banner("wide_campaign", "identity", 40, {
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
    banner("custom_cta", "custom-jersey", 50, {
      title: "Buat Jersey yang Mewakili Tim Anda",
      subtitle: "Atur model, bahan, kerah, lengan, warna, logo, sponsor, nama, nomor, dan kebutuhan pemain dalam satu alur.",
      desktop_media_url: categoryRows[0]?.gambar_url || media,
      mobile_media_url: categoryRows[0]?.gambar_url || media,
      image_alt: categoryRows[0]?.image_alt || "Jersey custom DEBRODER",
      cta_label: "Mulai Konfigurasi Jersey",
      cta_url: "/jersey/configurator",
      secondary_cta_label: "Konsultasi dengan Admin",
      secondary_cta_url: ""
    }),
    banner("team_package_campaign", "paket-tim", 60, {
      title: "Satu Tim, Satu Identitas",
      subtitle: "Untuk klub, sekolah, komunitas, perusahaan, instansi, dan event.",
      desktop_media_url: categoryRows[1]?.gambar_url || media,
      mobile_media_url: categoryRows[1]?.gambar_url || media,
      image_alt: categoryRows[1]?.image_alt || "Paket tim DEBRODER Jersey",
      cta_label: "Mulai Paket Tim",
      cta_url: "/jersey/configurator"
    }),
    banner("order_steps", "cara-order", 70, {
      title: "Cara Order Jersey",
      subtitle: "Satu alur dari pilihan awal hingga jersey diterima.",
      desktop_media_url: media,
      metadata: { items: JERSEY_ORDER_STEPS }
    }),
    banner("closing_campaign", "closing", 80, {
      title: "Your Team. Your Identity.",
      subtitle: "Temukan jersey yang tepat atau mulai membangun desain tim Anda.",
      desktop_media_url: media,
      mobile_media_url: pageHero?.mobile_image_url || media,
      image_alt: pageHero?.image_alt || "Closing campaign DEBRODER Jersey",
      object_position: pageHero?.object_position,
      mobile_object_position: pageHero?.mobile_object_position,
      cta_label: "Belanja Semua Jersey",
      cta_url: "/jersey/shop",
      secondary_cta_label: "Mulai Jersey Custom",
      secondary_cta_url: "/jersey/configurator"
    })
  ];
}

export function resolvedJerseySections(
  managed: CmsBanner[],
  pageHero: PageHeroContent | undefined,
  categories: ServiceCategory[]
) {
  const fallbacks = jerseyFallbackSections(pageHero, categories);
  return JERSEY_SECTION_TYPES.flatMap((type) => {
    const rows = managed.filter((item) => item.section_type === type && item.is_active !== false);
    return rows.length ? rows : fallbacks.filter((item) => item.section_type === type);
  });
}

export function jerseySectionItems(section: CmsBanner) {
  const items = section.metadata?.items;
  return Array.isArray(items)
    ? items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}
