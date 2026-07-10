export const PLAIN_CATEGORY_SECTION_SETTING = {
  slug: "pakaian-polos-berdasarkan-kategori",
  title: "Pakaian Polos Berdasarkan Kategori",
  sortOrder: 70
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
  "services-products": 40,
  trending: 50,
  "fresh-drop": 60,
  "plain-category": 70,
  "campaign-banners": 80,
  "instagram-banner": 90,
  stores: 100,
  about: 110
} as const;

export type LandingSectionKey = keyof typeof LANDING_SECTION_ORDER;

export function getLandingSectionOrder(sectionKey: string, fallback = 999) {
  return LANDING_SECTION_ORDER[sectionKey as LandingSectionKey] ?? fallback;
}

export const LANDING_SECTION_POSITION_LABELS: Record<LandingSectionKey, string> = {
  hero: "1. Hero Slider",
  benefits: "2. Keunggulan DEBRODER",
  "featured-products": "3. Featured",
  "services-products": "4. Shop by Category",
  trending: "5. Trending",
  "fresh-drop": "6. Fresh Drop",
  "plain-category": "7. Pakaian Polos",
  "campaign-banners": "8. Campaign Banner",
  "instagram-banner": "9. Instagram",
  stores: "10. Store DEBRODER",
  about: "11. Tentang DEBRODER"
};

export const LANDING_SECTION_DEFAULTS = [
  { section_key: "hero", title: "Hero / Hero Slider", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.hero, metadata: {} },
  { section_key: "benefits", title: "4 Keunggulan", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.benefits, metadata: {} },
  { section_key: "featured-products", title: "Featured", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["featured-products"], metadata: {} },
  { section_key: "services-products", title: "Shop by Category", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["services-products"], metadata: {} },
  { section_key: "trending", title: "Trending", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.trending, metadata: {} },
  { section_key: "fresh-drop", title: "Fresh Drops", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["fresh-drop"], metadata: {} },
  {
    section_key: "plain-category",
    title: "Pakaian Polos berdasarkan Kategori",
    subtitle: "Pilih dasar apparel yang sesuai, lalu custom bersama tim DEBRODER.",
    is_visible: false,
    sort_order: LANDING_SECTION_ORDER["plain-category"],
    metadata: {}
  },
  { section_key: "campaign-banners", title: "Campaign Banner", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["campaign-banners"], metadata: {} },
  { section_key: "instagram-banner", title: "Banner Instagram", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER["instagram-banner"], metadata: {} },
  {
    section_key: "stores",
    title: "Store DEBRODER",
    subtitle: "Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami.",
    is_visible: true,
    sort_order: LANDING_SECTION_ORDER.stores,
    metadata: {}
  },
  { section_key: "about", title: "Tentang DEBRODER", subtitle: "", is_visible: true, sort_order: LANDING_SECTION_ORDER.about, metadata: {} }
] as const;
