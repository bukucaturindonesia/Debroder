import { unstable_noStore as noStore } from "next/cache";
import {
  fallbackContent,
  fallbackInstagramBanner,
  fallbackProductFilters,
  pageHeroMobileImageFallbacks
} from "@/lib/fallback-data";
import { PLAIN_CATEGORY_SECTION_SETTING } from "@/lib/homepage-settings";
import { createSupabaseServerClient } from "@/lib/supabase";
import type {
  ContactSettings,
  HeroBanner,
  HomepageSection,
  HomepageSectionItem,
  InstagramBanner,
  LandingPageSettings,
  OrderStep,
  PageHeroContent,
  Product,
  ProductFilter,
  PublicContent,
  Service,
  ServiceCategory,
  Store,
  Testimonial,
  TrustAboutContent
} from "@/lib/types";

async function readActive<T>(
  table: string,
  fallback: T[],
  order = "urutan",
  fallbackWhenEmpty = true
): Promise<T[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("status_aktif", true)
    .order(order, { ascending: true });

  if (error || !data) return fallbackWhenEmpty ? fallback : [];
  if (data.length === 0) return fallbackWhenEmpty ? fallback : [];

  return data as T[];
}

async function readSingle<T>(
  table: string,
  fallback: T,
  filterActive = true
): Promise<T> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  let query = supabase.from(table).select("*").limit(1);

  if (filterActive) {
    query = query.eq("status_aktif", true);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return fallback;
  }

  return data as T;
}

async function readOptionalActiveSingle<T>(
  table: string,
  fallback: T
): Promise<T | null> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("status_aktif", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    return fallback;
  }

  return data ? (data as T) : null;
}

const blockedPublicPattern = /\b(express|ekspedisi|pengiriman|distribusi)\b/i;
const finalPageHeroKeys = [
  "koleksi",
  "kaos-polos",
  "sablon-dtf",
  "maklon-dtf",
  "jersey",
  "cetak-sublim",
  "store",
  "cara-order"
];

function displayBrand(value?: string | null) {
  return (value || "")
    .replace(/\bDEBRODER\b/g, "DE BRODER")
    .replace(/\bDebroder\b/g, "De Broder");
}

function hasBlockedPublicText(values: Array<string | null | undefined>) {
  return values.some((value) => blockedPublicPattern.test(value || ""));
}

function focalPosition(
  focalX: number | null | undefined,
  focalY: number | null | undefined,
  fallback: string
) {
  return typeof focalX === "number" && typeof focalY === "number"
    ? `${Math.max(0, Math.min(100, focalX))}% ${Math.max(0, Math.min(100, focalY))}%`
    : fallback;
}

function cleanHero(hero: HeroBanner) {
  return {
    ...hero,
    mobile_image_url:
      hero.mobile_image_url || fallbackContent.hero.mobile_image_url,
    object_position: focalPosition(
      hero.focal_x,
      hero.focal_y,
      hero.object_position || "center center"
    ),
    mobile_object_position:
      focalPosition(hero.mobile_focal_x, hero.mobile_focal_y, hero.mobile_object_position || hero.object_position || "center center"),
    image_alt:
      hero.image_alt || hero.headline || hero.title || "Hero DE BRODER",
    badge: displayBrand(hero.badge),
    headline: displayBrand(hero.headline),
    subheadline: displayBrand(hero.subheadline),
    title: displayBrand(hero.title),
    subtitle: displayBrand(hero.subtitle),
    cta_primary_text: displayBrand(hero.cta_primary_text),
    cta_secondary_text: displayBrand(hero.cta_secondary_text),
    cta_text: displayBrand(hero.cta_text)
  };
}

function cleanCategory(category: ServiceCategory) {
  return {
    ...category,
    image_alt: category.image_alt || category.nama_kategori,
    gallery_urls: category.gallery_urls || [],
    color_options: category.color_options || [],
    collar_options: category.collar_options || [],
    sleeve_options: category.sleeve_options || [],
    material_options: category.material_options || [],
    size_chart: category.size_chart || [],
    faq_items: category.faq_items || [],
    nama_kategori: displayBrand(category.nama_kategori),
    deskripsi: displayBrand(category.deskripsi)
  };
}

function cleanProduct(product: Product) {
  const normalizedName =
    product.nama === "Kaos Polos Import"
      ? "Kaos Polos New State Apparel"
      : product.nama;
  return {
    ...product,
    image_alt: product.image_alt || normalizedName,
    collection_tags: product.collection_tags || [],
    color_tags: product.color_tags || [],
    size_tags: product.size_tags || [],
    material_tags: product.material_tags || [],
    gallery_urls: product.gallery_urls || [],
    specifications: product.specifications || [],
    focal_points: product.focal_points || {},
    nama: displayBrand(normalizedName),
    kategori: displayBrand(product.kategori),
    deskripsi: displayBrand(
      product.deskripsi?.replace(/kaos polos import/gi, "kaos polos New State Apparel")
    ),
    short_detail: displayBrand(
      product.short_detail?.replace(
        /kaos polos import/gi,
        "kaos polos New State Apparel"
      )
    ),
    description: displayBrand(product.description),
    badge: displayBrand(product.badge)
  };
}

function cleanService(service: Service) {
  return {
    ...service,
    image_alt: service.image_alt || service.nama,
    available_sizes: service.available_sizes || [],
    faq_items: service.faq_items || [],
    nama: displayBrand(service.nama),
    deskripsi: displayBrand(service.deskripsi)
  };
}

function cleanStore(store: Store) {
  return {
    ...store,
    image_alt: store.image_alt || `Foto ${store.nama_store} DE BRODER`,
    nama_store: displayBrand(store.nama_store),
    layanan_utama: displayBrand(store.layanan_utama),
    alamat: displayBrand(store.alamat)
  };
}

function cleanOrderStep(step: OrderStep) {
  return {
    ...step,
    title: displayBrand(step.title),
    description: displayBrand(step.description)
  };
}

function cleanTrustAbout(trustAbout: TrustAboutContent) {
  const hasBlockedTrust = hasBlockedPublicText([
    trustAbout.about_body,
    ...(trustAbout.trust_items || [])
  ]);

  if (hasBlockedTrust) {
    return fallbackContent.trustAbout;
  }

  return {
    ...trustAbout,
    about_body: displayBrand(trustAbout.about_body),
    trust_items: (trustAbout.trust_items || []).map(displayBrand)
  };
}

function cleanContact(contact: ContactSettings) {
  return {
    ...contact,
    copyright_text: displayBrand(contact.copyright_text)
  };
}

function cleanInstagramBanner(banner: InstagramBanner | null) {
  if (!banner) return banner;
  if (hasBlockedPublicText([banner.title])) return fallbackInstagramBanner;

  return {
    ...banner,
    image_alt: banner.image_alt || banner.title || "Banner Instagram DE BRODER",
    image_url: banner.image_url || fallbackInstagramBanner.image_url,
    mobile_image_url:
      banner.mobile_image_url || fallbackInstagramBanner.mobile_image_url,
    object_position: focalPosition(
      banner.focal_x,
      banner.focal_y,
      banner.object_position || "center center"
    ),
    mobile_object_position:
      focalPosition(banner.mobile_focal_x, banner.mobile_focal_y, banner.mobile_object_position || banner.object_position || "center center"),
    title: displayBrand(banner.title)
  };
}

function publicHeroes(heroes: HeroBanner[]) {
  const filtered = heroes.filter(
    (hero) =>
      !hasBlockedPublicText([
        hero.badge,
        hero.headline,
        hero.subheadline,
        hero.title,
        hero.subtitle,
        hero.cta_primary_text,
        hero.cta_secondary_text,
        hero.cta_text
      ])
  );

  return (filtered.length ? filtered : fallbackContent.heroes).map(
    (hero, index) => {
      const fallbackHero =
        fallbackContent.heroes[index] || fallbackContent.hero;

      return cleanHero({
        ...fallbackHero,
        ...hero,
        image_url: hero.image_url || fallbackHero.image_url,
        mobile_image_url:
          hero.mobile_image_url || fallbackHero.mobile_image_url,
        object_position: hero.object_position || fallbackHero.object_position,
        mobile_object_position:
          hero.mobile_object_position ||
          fallbackHero.mobile_object_position ||
          hero.object_position ||
          fallbackHero.object_position
      });
    }
  );
}

function publicCategories(categories: ServiceCategory[]) {
  const filtered = categories.filter(
    (category) =>
      !hasBlockedPublicText([
        category.nama_kategori,
        category.deskripsi,
        category.link_slug
      ])
  );

  return filtered.map(cleanCategory);
}

function publicProducts(products: Product[]) {
  const filtered = products.filter(
    (product) =>
      !hasBlockedPublicText([
        product.nama,
        product.kategori,
        product.deskripsi,
        product.short_detail,
        product.description,
        product.badge,
        product.link_url
      ])
  );

  return filtered.map(cleanProduct);
}

function publicOrderSteps(orderSteps: OrderStep[]) {
  const filtered = orderSteps.filter(
    (step) => !hasBlockedPublicText([step.title, step.description])
  );

  return (filtered.length ? filtered : fallbackContent.orderSteps).map(
    cleanOrderStep
  );
}

function publicPageHeroes(pageHeroes: PageHeroContent[]) {
  const safeByKey = new Map(
    pageHeroes
      .filter(
        (hero) =>
          finalPageHeroKeys.includes(hero.page_key) &&
          !hasBlockedPublicText([
            hero.page_key,
            hero.label,
            hero.title,
            hero.subtitle
          ])
      )
      .map((hero) => [hero.page_key, hero])
  );

  return fallbackContent.pageHeroes.map((fallbackHero) => {
    const hero = safeByKey.get(fallbackHero.page_key);
    const merged = hero
      ? {
          ...fallbackHero,
          ...hero,
          image_url: hero.image_url || fallbackHero.image_url,
          mobile_image_url:
            hero.mobile_image_url ||
            fallbackHero.mobile_image_url ||
            pageHeroMobileImageFallbacks[fallbackHero.page_key],
          object_position: focalPosition(
            hero.focal_x,
            hero.focal_y,
            hero.object_position || fallbackHero.object_position || "center center"
          ),
          mobile_object_position:
            focalPosition(hero.mobile_focal_x, hero.mobile_focal_y, hero.mobile_object_position || fallbackHero.mobile_object_position || hero.object_position || "center center")
        }
      : fallbackHero;

    return {
      ...merged,
      image_alt: merged.image_alt || merged.title,
      label: displayBrand(merged.label),
      title: displayBrand(merged.title),
      subtitle: displayBrand(merged.subtitle)
    };
  });
}

async function readHomepageSections(): Promise<HomepageSection[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("homepage_sections")
    .select(`
      id,
      title,
      slug,
      is_active,
      sort_order,
      created_at,
      updated_at,
      items:homepage_section_items(
        id,
        section_id,
        product_id,
        service_id,
        is_active,
        sort_order,
        created_at,
        updated_at,
        product:products(*),
        service:services(*)
      )
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data
    .map((section) => {
      const items = ((section.items || []) as unknown as HomepageSectionItem[])
        .filter((item) => item.is_active && (item.product || item.service))
        .map((item) => ({
          ...item,
          product: item.product ? cleanProduct(item.product) : null,
          service: item.service ? cleanService(item.service) : null
        }))
        .sort((a, b) => a.sort_order - b.sort_order);

      return { ...section, items } as HomepageSection;
    })
    .filter((section) => section.items.length > 0);
}

async function readLandingPageSettings(): Promise<LandingPageSettings> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return fallbackContent.landingSettings;

  const { data, error } = await supabase
    .from("homepage_sections")
    .select("slug,is_active")
    .eq("slug", PLAIN_CATEGORY_SECTION_SETTING.slug)
    .maybeSingle();

  if (error || !data) return fallbackContent.landingSettings;

  return {
    showPlainCategorySection: data.is_active !== false
  };
}

export async function getPublicContent(): Promise<PublicContent> {
  noStore();

  const [
    heroes,
    instagramBanner,
    pageHeroes,
    categories,
    services,
    products,
    productFilters,
    homepageSections,
    landingSettings,
    stores,
    orderSteps,
    trustAbout,
    testimonials,
    contact
  ] = await Promise.all([
    readActive<HeroBanner>("hero_banners", fallbackContent.heroes),
    readOptionalActiveSingle<InstagramBanner>(
      "instagram_banners",
      fallbackInstagramBanner
    ),
    readActive<PageHeroContent>(
      "page_heroes",
      fallbackContent.pageHeroes,
      "page_key"
    ),
    readActive<ServiceCategory>(
      "service_categories",
      fallbackContent.categories,
      "urutan",
      false
    ),
    readActive<Service>("services", fallbackContent.services, "urutan", false),
    readActive<Product>("products", fallbackContent.products, "urutan", false),
    readActive<ProductFilter>("product_filters", fallbackProductFilters),
    readHomepageSections(),
    readLandingPageSettings(),
    readActive<Store>("stores", fallbackContent.stores),
    readActive<OrderStep>("order_steps", fallbackContent.orderSteps),
    readSingle<TrustAboutContent>(
      "trust_about_content",
      fallbackContent.trustAbout
    ),
    readActive<Testimonial>("testimonials", fallbackContent.testimonials),
    readSingle<ContactSettings>(
      "contact_settings",
      fallbackContent.contact,
      true
    )
  ]);

  const cleanHeroes = publicHeroes(heroes);

  return {
    hero: cleanHeroes[0] || fallbackContent.hero,
    heroes: cleanHeroes,
    about: fallbackContent.about,
    instagramBanner: cleanInstagramBanner(instagramBanner),
    pageHeroes: publicPageHeroes(pageHeroes),
    categories: publicCategories(categories),
    services: services.map(cleanService),
    products: publicProducts(products),
    productFilters,
    homepageSections,
    landingSettings,
    stores: stores.map(cleanStore),
    orderSteps: publicOrderSteps(orderSteps),
    trustAbout: cleanTrustAbout(trustAbout),
    testimonials,
    contact: cleanContact({
      ...fallbackContent.contact,
      ...contact
    })
  };
}
