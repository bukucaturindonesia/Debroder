export const PLAIN_CATEGORY_SECTION_SETTING = {
  slug: "pakaian-polos-berdasarkan-kategori",
  title: "Pakaian Polos Berdasarkan Kategori",
  sortOrder: 900
} as const;

/**
 * Canonical DEBRODER landing-page sequence.
 *
 * The public homepage renders these sections in this exact DOM order so the
 * visual order, keyboard order, screen-reader order, and SEO reading order stay
 * consistent. Admins can still edit visibility and content, but cannot
 * accidentally move the company story above the hero.
 */
export const LANDING_SECTION_ORDER = {
  hero: 10,
  benefits: 20,
  "featured-products": 30,
  trending: 40,
  "campaign-banners": 50,
  "fresh-drop": 60,
  "services-products": 70,
  stores: 80,
  about: 90,
  "plain-category": 900,
  "instagram-banner": 910
} as const;

export type LandingSectionKey = keyof typeof LANDING_SECTION_ORDER;

export function getLandingSectionOrder(sectionKey: string, fallback = 999) {
  return LANDING_SECTION_ORDER[sectionKey as LandingSectionKey] ?? fallback;
}

export const LANDING_SECTION_POSITION_LABELS: Record<LandingSectionKey, string> = {
  hero: "1. Hero Slider",
  benefits: "2. Keunggulan DEBRODER",
  "featured-products": "3. Featured",
  trending: "4. Trending",
  "campaign-banners": "5. Editorial Campaign",
  "fresh-drop": "6. Fresh Drop",
  "services-products": "7. Shop by Category",
  stores: "8. Store & Cara Order",
  about: "9. Tentang DEBRODER",
  "plain-category": "Legacy — tidak dirender di Blueprint v1.0",
  "instagram-banner": "Legacy — tidak dirender di Blueprint v1.0"
};

export const LANDING_SECTION_DEFAULTS = [
  { section_key: "hero", title: "Hero / Hero Slider", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.hero, metadata: {} },
  { section_key: "benefits", title: "Trust Strip", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.benefits, metadata: {} },
  { section_key: "featured-products", title: "Featured", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["featured-products"], metadata: {} },
  { section_key: "trending", title: "Trending", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.trending, metadata: {} },
  { section_key: "campaign-banners", title: "Editorial Campaign", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["campaign-banners"], metadata: {} },
  { section_key: "fresh-drop", title: "Fresh Drop", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["fresh-drop"], metadata: {} },
  { section_key: "services-products", title: "Shop by Category", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["services-products"], metadata: {} },
  {
    section_key: "stores",
    title: "Store DEBRODER",
    subtitle: "Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami.",
    is_visible: true,
    sort_order: LANDING_SECTION_ORDER.stores,
    metadata: {}
  },
  { section_key: "about", title: "Built to Create", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.about, metadata: {} },
  {
    section_key: "plain-category",
    title: "Pakaian Polos berdasarkan Kategori",
    subtitle: "Pilih dasar apparel yang sesuai, lalu custom bersama tim DEBRODER.",
    is_visible: false,
    sort_order: LANDING_SECTION_ORDER["plain-category"],
    metadata: {}
  },
  { section_key: "instagram-banner", title: "Banner Instagram", subtitle: "", is_visible: false, sort_order: LANDING_SECTION_ORDER["instagram-banner"], metadata: {} }
] as const;
