export const PLAIN_CATEGORY_SECTION_SETTING = {
  slug: "pakaian-polos-berdasarkan-kategori",
  title: "Pakaian Polos Berdasarkan Kategori",
  sortOrder: 40
} as const;

export const LANDING_SECTION_DEFAULTS = [
  { section_key: "hero", title: "Hero / Hero Slider", subtitle: "", is_visible: true, sort_order: 10, metadata: {} },
  { section_key: "benefits", title: "4 Keunggulan", subtitle: "", is_visible: true, sort_order: 20, metadata: {} },
  { section_key: "featured-products", title: "Featured", subtitle: "", is_visible: true, sort_order: 30, metadata: {} },
  { section_key: "trending", title: "Trending", subtitle: "", is_visible: true, sort_order: 40, metadata: {} },
  { section_key: "fresh-drop", title: "Fresh Drops", subtitle: "", is_visible: true, sort_order: 50, metadata: {} },
  { section_key: "campaign-banners", title: "Campaign Banner", subtitle: "", is_visible: true, sort_order: 55, metadata: {} },
  { section_key: "services-products", title: "Shop by Category", subtitle: "", is_visible: true, sort_order: 60, metadata: {} },
  {
    section_key: "plain-category",
    title: "Pakaian Polos berdasarkan Kategori",
    subtitle: "Pilih dasar apparel yang sesuai, lalu custom bersama tim DEBRODER.",
    is_visible: true,
    sort_order: 70,
    metadata: {}
  },
  { section_key: "instagram-banner", title: "Banner Instagram", subtitle: "", is_visible: true, sort_order: 80, metadata: {} },
  {
    section_key: "stores",
    title: "Store DEBRODER",
    subtitle: "Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami.",
    is_visible: true,
    sort_order: 90,
    metadata: {}
  },
  { section_key: "about", title: "Tentang DEBRODER", subtitle: "", is_visible: true, sort_order: 100, metadata: {} }
] as const;
