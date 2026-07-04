export type Product = {
  id?: string;
  nama: string;
  kategori: string;
  deskripsi: string;
  short_detail?: string;
  description?: string;
  subcategory?: string;
  compare_price?: number | string | null;
  specifications?: string[];
  gallery_urls?: string[];
  label_new?: boolean;
  label_promo?: boolean;
  label_best_seller?: boolean;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  focal_points?: Record<string, FocalPoint>;
  sales_count?: number;
  badge: string;
  gambar_url: string;
  image_url?: string;
  image_alt?: string;
  collection_tags?: string[];
  color_tags?: string[];
  size_tags?: string[];
  material_tags?: string[];
  brand?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  whatsapp_link: string;
  link_url?: string;
  price?: number | string | null;
  harga?: number | string | null;
  base_price?: number | string | null;
  price_label?: string | null;
  slug?: string;
  featured?: boolean;
  trending?: boolean;
  fresh_drop?: boolean;
  stock?: number;
  product_category_id?: string | null;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductCategory = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type FocalPoint = {
  focal_x: number;
  focal_y: number;
  zoom: number;
  target_ratio: string;
};

export type Service = {
  id?: string;
  nama: string;
  slug: string;
  deskripsi: string;
  image_url: string;
  image_alt?: string;
  category_key?: string;
  detail_body?: string;
  available_sizes?: string[];
  faq_items?: string[];
  production_estimate?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  harga_mulai?: number | string | null;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ServiceCategory = {
  id?: string;
  nama_kategori: string;
  deskripsi: string;
  gambar_url: string;
  image_alt?: string;
  category_key?: string;
  slug?: string;
  gallery_urls?: string[];
  color_options?: string[];
  collar_options?: string[];
  sleeve_options?: string[];
  material_options?: string[];
  size_chart?: string[];
  faq_items?: string[];
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  link_slug: string;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Store = {
  id?: string;
  nama_store: string;
  layanan_utama: string;
  alamat: string;
  whatsapp: string;
  whatsapp_link: string;
  maps_link: string;
  jam_operasional?: string;
  image_url?: string;
  image_alt?: string;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HeroBanner = {
  id?: string;
  badge?: string;
  headline: string;
  subheadline: string;
  title?: string;
  subtitle?: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  cta_text?: string;
  cta_link?: string;
  image_url: string;
  image_alt?: string;
  mobile_image_url?: string;
  hero_video_url?: string;
  video_url?: string;
  desktop_video_url?: string;
  mobile_video_url?: string;
  object_position?: string;
  mobile_object_position?: string;
  object_fit?: "cover" | "contain";
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
  mobile_focal_zoom?: number | null;
  mobile_target_ratio?: string;
  urutan?: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AboutContent = {
  id?: string;
  label: string;
  title: string;
  body: string;
  highlights: string[];
  status_aktif: boolean;
  updated_at?: string;
};

export type Testimonial = {
  id?: string;
  nama: string;
  sumber: string;
  isi_testimoni: string;
  urutan?: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ContactSettings = {
  id?: string;
  email: string;
  whatsapp_utama: string;
  whatsapp_link?: string;
  whatsapp_apparel: string;
  whatsapp_express: string;
  facebook?: string;
  instagram: string;
  copyright_text?: string;
  status_aktif?: boolean;
  updated_at?: string;
};

export type InstagramBanner = {
  id?: string;
  title: string;
  image_url: string;
  image_alt?: string;
  mobile_image_url?: string;
  link_url: string;
  object_position?: string;
  mobile_object_position?: string;
  object_fit?: "cover" | "contain";
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
  mobile_focal_zoom?: number | null;
  mobile_target_ratio?: string;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PageHeroContent = {
  id?: string;
  page_key: string;
  label: string;
  title: string;
  subtitle: string;
  image_url: string;
  image_alt?: string;
  mobile_image_url?: string;
  object_position: string;
  mobile_object_position?: string;
  object_fit?: "cover" | "contain";
  focal_x?: number | null;
  focal_y?: number | null;
  focal_zoom?: number | null;
  target_ratio?: string;
  mobile_focal_x?: number | null;
  mobile_focal_y?: number | null;
  mobile_focal_zoom?: number | null;
  mobile_target_ratio?: string;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type OrderStep = {
  id?: string;
  title: string;
  description?: string;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TrustAboutContent = {
  id?: string;
  trust_items: string[];
  about_body: string;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductFilter = {
  id?: string;
  filter_type: "collection" | "color" | "size" | "material" | "brand" | "price";
  name: string;
  slug: string;
  color_hex?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  urutan: number;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HomepageSectionItem = {
  id: string;
  section_id: string;
  product_id?: string | null;
  service_id?: string | null;
  is_active: boolean;
  sort_order: number;
  product?: Product | null;
  service?: Service | null;
  created_at?: string;
  updated_at?: string;
};

export type HomepageSection = {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  items: HomepageSectionItem[];
  created_at?: string;
  updated_at?: string;
};

export type LandingPageSettings = {
  showPlainCategorySection: boolean;
};

export type LandingSection = {
  id?: string;
  section_key: string;
  title: string;
  subtitle: string;
  is_visible: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type CmsBanner = {
  id?: string;
  name: string;
  media_type: "image" | "video";
  desktop_media_url: string;
  mobile_media_url?: string | null;
  poster_url?: string | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_url: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type PublicContent = {
  hero: HeroBanner;
  heroes: HeroBanner[];
  about: AboutContent;
  instagramBanner: InstagramBanner | null;
  pageHeroes: PageHeroContent[];
  categories: ServiceCategory[];
  services: Service[];
  products: Product[];
  productFilters: ProductFilter[];
  homepageSections: HomepageSection[];
  landingSettings: LandingPageSettings;
  landingSections: LandingSection[];
  campaignBanners: CmsBanner[];
  stores: Store[];
  orderSteps: OrderStep[];
  trustAbout: TrustAboutContent;
  testimonials: Testimonial[];
  contact: ContactSettings;
};
