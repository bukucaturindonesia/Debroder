import { unstable_noStore as noStore } from "next/cache";
import {
  fallbackContent,
  fallbackInstagramBanner,
  fallbackProductFilters,
  pageHeroMobileImageFallbacks
} from "@/lib/fallback-data";
import { PLAIN_CATEGORY_SECTION_SETTING } from "@/lib/homepage-settings";
import { productCategoryPresets } from "@/lib/product-category-config";
import { createSupabaseServerClient } from "@/lib/supabase";
import type {
  CmsBanner,
  ContactSettings,
  HeroBanner,
  HomepageSection,
  HomepageSectionItem,
  InstagramBanner,
  JerseyRequiredService,
  JerseyPackage,
  JerseyMaterial,
  JerseyConfiguratorData,
  JerseyCollarGroup,
  JerseyCollar,
  JerseyAddon,
  LandingPageSettings,
  LandingSection,
  OrderStep,
  PageHeroContent,
  Product,
  ProductCategory,
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


const fallbackJerseyConfigurator: JerseyConfiguratorData = {
  packages: [
    { name: "Atasan Fullprint", slug: "atasan-fullprint", base_price: 100000, description: "Atasan jersey fullprint." },
    { name: "Setelan Halfprint", slug: "setelan-halfprint", base_price: 120000, description: "Setelan dengan kombinasi area print." },
    { name: "Setelan Fullprint", slug: "setelan-fullprint", base_price: 130000, description: "Setelan jersey fullprint." }
  ],
  materials: [
    { name: "Milano", slug: "milano", price_adjustment: 0 },
    { name: "Brazil", slug: "brazil", price_adjustment: 0 },
    { name: "Benzema", slug: "benzema", price_adjustment: 0 },
    { name: "Drop Needle", slug: "drop-needle", price_adjustment: 0 },
    { name: "Emboss Topo", slug: "emboss-topo", price_adjustment: 15000 },
    { name: "Emboss Straw", slug: "emboss-straw", price_adjustment: 15000 },
    { name: "Emboss Mixart", slug: "emboss-mixart", price_adjustment: 15000 },
    { name: "Emboss Monochrome", slug: "emboss-monochrome", price_adjustment: 15000 }
  ],
  collarGroups: [
    { name: "Regular", slug: "regular", sort_order: 10 },
    { name: "Classic", slug: "classic", sort_order: 20 }
  ],
  collars: [
    { name: "O Neck", slug: "o-neck", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "V Neck", slug: "v-neck", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "V Silang", slug: "v-silang", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "V Silang Tumpul", slug: "v-silang-tumpul", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "V Tumpul", slug: "v-tumpul", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "V Narrow", slug: "v-narrow", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "V Narrow Adidas", slug: "v-narrow-adidas", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "V Neck Lapisan", slug: "v-neck-lapisan", group_slug: "regular", group_name: "Regular", price_adjustment: 0 },
    { name: "Wangki Klasik", slug: "wangki-klasik", group_slug: "classic", group_name: "Classic", price_adjustment: 0 },
    { name: "Wangki Adidas", slug: "wangki-adidas", group_slug: "classic", group_name: "Classic", price_adjustment: 0 },
    { name: "Wangki Segitiga", slug: "wangki-segitiga", group_slug: "classic", group_name: "Classic", price_adjustment: 0 },
    { name: "Wangki Tumpul Adidas", slug: "wangki-tumpul-adidas", group_slug: "classic", group_name: "Classic", price_adjustment: 0 },
    { name: "Wangki Silang Adidas", slug: "wangki-silang-adidas", group_slug: "classic", group_name: "Classic", price_adjustment: 0 },
    { name: "Wangki Kancing 1", slug: "wangki-kancing-1", group_slug: "classic", group_name: "Classic", price_adjustment: 0 },
    { name: "Wangki Kancing 2", slug: "wangki-kancing-2", group_slug: "classic", group_name: "Classic", price_adjustment: 0 },
    { name: "Wangki Klasik O", slug: "wangki-klasik-o", group_slug: "classic", group_name: "Classic", price_adjustment: 0 }
  ],
  addons: [
    { name: "Lengan Panjang", slug: "lengan-panjang", price_adjustment: 10000 },
    { name: "RIB", slug: "rib", price_adjustment: 5000 }
  ],
  requiredServices: [
    { service_name: "Cetak Sublim", service_slug: "cetak-sublim" }
  ],
  settings: {
    minimum_order_qty: 6,
    price_formula: "(package_price + material_adjustment + collar_adjustment + addon_total + size_adjustment) * quantity"
  }
};

function numberValue(value: number | string | null | undefined, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readMinimumOrder(settings: Array<{ setting_key: string; setting_value: unknown }>) {
  const setting = settings.find((item) => item.setting_key === "default_minimum_order");
  const value = setting?.setting_value as { quantity?: number } | number | undefined;
  if (typeof value === "number") return Math.max(1, Math.floor(value));
  if (value && typeof value.quantity === "number") return Math.max(1, Math.floor(value.quantity));
  return fallbackJerseyConfigurator.settings.minimum_order_qty;
}

async function readJerseyConfiguratorData(): Promise<JerseyConfiguratorData> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return fallbackJerseyConfigurator;

  try {
    const [packagesResult, materialsResult, groupsResult, collarsResult, addonsResult, servicesResult, settingsResult] = await Promise.all([
      supabase.from("jersey_packages").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("jersey_materials").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("jersey_collar_groups").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("jersey_collars").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("jersey_addons").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("jersey_required_services").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("jersey_settings").select("*")
    ]);

    if (packagesResult.error || materialsResult.error || collarsResult.error) {
      return fallbackJerseyConfigurator;
    }

    const groups = ((groupsResult.data || []) as JerseyCollarGroup[]);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const collars = ((collarsResult.data || []) as JerseyCollar[]).map((collar) => {
      const group = collar.group_id ? groupById.get(collar.group_id) : undefined;
      return {
        ...collar,
        group_name: collar.group_name || group?.name || "Regular",
        group_slug: collar.group_slug || group?.slug || "regular",
        price_adjustment: numberValue(collar.price_adjustment)
      };
    });

    return {
      packages: ((packagesResult.data || []) as JerseyPackage[]).map((item) => ({ ...item, base_price: numberValue(item.base_price) })),
      materials: ((materialsResult.data || []) as JerseyMaterial[]).map((item) => ({ ...item, price_adjustment: numberValue(item.price_adjustment) })),
      collarGroups: groups.length ? groups : fallbackJerseyConfigurator.collarGroups,
      collars: collars.length ? collars : fallbackJerseyConfigurator.collars,
      addons: ((addonsResult.data || []) as JerseyAddon[]).map((item) => ({ ...item, price_adjustment: numberValue(item.price_adjustment) })),
      requiredServices: ((servicesResult.data || []) as JerseyRequiredService[]),
      settings: {
        minimum_order_qty: readMinimumOrder((settingsResult.data || []) as Array<{ setting_key: string; setting_value: unknown }>),
        price_formula: fallbackJerseyConfigurator.settings.price_formula
      }
    };
  } catch {
    return fallbackJerseyConfigurator;
  }
}

const blockedPublicPattern = /\b(express|ekspedisi|pengiriman|distribusi)\b/i;
const finalPageHeroKeys = [
  "koleksi",
  "kaos-polos",
  "jaket-hoodie",
  "headwear",
  "sablon-dtf",
  "maklon-dtf",
  "jersey",
  "cetak-sublim",
  "store",
  "cara-order",
  "kemeja"
];

function displayBrand(value?: string | null) {
  return (value || "")
    .replace(/\bDEBRODER\b/g, "DE BRODER")
    .replace(/\bDebroder\b/g, "De Broder");
}

function cleanCmsText(value?: string | null) {
  const text = (value || "").trim();
  if (!text || text === "." || text === "-" || text === "—") return "";
  return displayBrand(text);
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
  const badge = cleanCmsText(hero.badge);
  const headline = cleanCmsText(hero.headline);
  const title = cleanCmsText(hero.title);
  const subheadline = cleanCmsText(hero.subheadline);
  const subtitle = cleanCmsText(hero.subtitle);
  const ctaPrimaryText = cleanCmsText(hero.cta_primary_text);
  const ctaSecondaryText = cleanCmsText(hero.cta_secondary_text);
  const ctaText = cleanCmsText(hero.cta_text);

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
      cleanCmsText(hero.image_alt) || headline || title || "Hero DE BRODER",
    badge,
    headline,
    subheadline,
    title,
    subtitle,
    cta_primary_text: ctaPrimaryText,
    cta_secondary_text: ctaSecondaryText,
    cta_text: ctaText
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
    size_chart: product.size_chart || [],
    bulk_order_note: displayBrand(product.bulk_order_note),
    material_tags: product.material_tags || [],
    gallery_urls: product.gallery_urls || [],
    specifications: product.specifications || [],
    focal_points: product.focal_points || {},
    variants: (product.variants || []).map((variant) => ({
      ...variant,
      variant_name: displayBrand(variant.variant_name),
      color_name: displayBrand(variant.color_name),
      sizes: variant.sizes || [],
      variant_images: variant.variant_images || []
    })),
    size_guide: product.size_guide || null,
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

function cleanProductCategory(category: ProductCategory): ProductCategory {
  return {
    ...category,
    name: displayBrand(category.name),
    description: displayBrand(category.description),
    show_in_collection: category.show_in_collection ?? true,
    collection_limit: Number(category.collection_limit || 8),
    collection_sort: category.collection_sort || "sort_order",
    collection_section_order: Number(category.collection_section_order ?? category.sort_order ?? 0)
  };
}

async function readProductCategories(): Promise<ProductCategory[]> {
  const fallback = productCategoryPresets.map((preset, index) => ({
    name: preset.name,
    slug: preset.slug,
    description: "",
    is_active: true,
    sort_order: (index + 1) * 10,
    show_in_collection: true,
    collection_limit: 8,
    collection_sort: "sort_order" as const,
    collection_section_order: (index + 1) * 10
  }));
  const supabase = createSupabaseServerClient();

  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("is_active", true)
    .order("collection_section_order", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return fallback;
  return (data as ProductCategory[]).map(cleanProductCategory);
}

async function readProducts(): Promise<Product[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallbackContent.products;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status_aktif", true)
    .order("urutan", { ascending: true });

  if (error || !data?.length) return fallbackContent.products;

  const products = data as Product[];
  const productIds = products.map((product) => product.id).filter(Boolean) as string[];

  if (!productIds.length) return products;

  try {
    const { data: variantsData } = await supabase
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const variants = (variantsData || []) as NonNullable<Product["variants"]>;
    const variantIds = variants.map((variant) => variant.id).filter(Boolean) as string[];

    const [sizesResult, imagesResult, guidesResult] = await Promise.all([
      variantIds.length
        ? supabase
            .from("product_variant_sizes")
            .select("*")
            .in("variant_id", variantIds)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] }),
      variantIds.length
        ? supabase
            .from("product_variant_images")
            .select("*")
            .in("variant_id", variantIds)
            .order("is_cover", { ascending: false })
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from("product_size_guides")
        .select("*")
        .in("product_id", productIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    ]);

    const sizesByVariant = new Map<string, NonNullable<NonNullable<Product["variants"]>[number]["sizes"]>>();
    ((sizesResult.data || []) as NonNullable<NonNullable<Product["variants"]>[number]["sizes"]>).forEach((size) => {
      const list = sizesByVariant.get(size.variant_id) || [];
      list.push(size);
      sizesByVariant.set(size.variant_id, list);
    });

    const imagesByVariant = new Map<string, NonNullable<NonNullable<Product["variants"]>[number]["variant_images"]>>();
    ((imagesResult.data || []) as NonNullable<NonNullable<Product["variants"]>[number]["variant_images"]>).forEach((image) => {
      const list = imagesByVariant.get(image.variant_id) || [];
      list.push(image);
      imagesByVariant.set(image.variant_id, list);
    });

    const variantsByProduct = new Map<string, NonNullable<Product["variants"]>>();
    variants.forEach((variant) => {
      const next = {
        ...variant,
        sizes: variant.id ? (sizesByVariant.get(variant.id) || []) : [],
        variant_images: variant.id ? (imagesByVariant.get(variant.id) || []) : []
      };
      const list = variantsByProduct.get(variant.product_id) || [];
      list.push(next);
      variantsByProduct.set(variant.product_id, list);
    });

    const guideByProduct = new Map<string, NonNullable<Product["size_guide"]>>();
    ((guidesResult.data || []) as NonNullable<Product["size_guide"]>[]).forEach((guide) => {
      if (guide.product_id && !guideByProduct.has(guide.product_id)) {
        guideByProduct.set(guide.product_id, guide);
      }
    });

    return products.map((product) => {
      const variants = product.id ? (variantsByProduct.get(product.id) || []) : [];
      return {
        ...product,
        variants,
        has_variants: product.has_variants || variants.length > 0,
        size_guide: product.id ? (guideByProduct.get(product.id) || null) : null
      };
    });
  } catch {
    return products;
  }
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

function emptyTextHeroFromFallback(fallbackHero: HeroBanner, index = 0): HeroBanner {
  return {
    ...fallbackHero,
    id: fallbackHero.id || `fallback-hero-${index}`,
    badge: "",
    headline: "",
    subheadline: "",
    title: "",
    subtitle: "",
    cta_text: "",
    cta_primary_text: "",
    cta_secondary_text: "",
    status_aktif: true
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

  const source = filtered.length
    ? filtered
    : fallbackContent.heroes.map((hero, index) => emptyTextHeroFromFallback(hero, index));

  return source.map((hero, index) => {
    const fallbackHero = fallbackContent.heroes[index] || fallbackContent.hero;

    return cleanHero({
      ...hero,
      image_url: hero.image_url || fallbackHero.image_url,
      mobile_image_url: hero.mobile_image_url || fallbackHero.mobile_image_url,
      object_position: hero.object_position || fallbackHero.object_position,
      mobile_object_position:
        hero.mobile_object_position ||
        fallbackHero.mobile_object_position ||
        hero.object_position ||
        fallbackHero.object_position
    });
  });
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
          label: cleanCmsText(hero.label),
          title: cleanCmsText(hero.title),
          subtitle: cleanCmsText(hero.subtitle),
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
      : {
          ...fallbackHero,
          label: "",
          title: "",
          subtitle: ""
        };

    return {
      ...merged,
      image_alt: cleanCmsText(merged.image_alt) || cleanCmsText(merged.title) || "Hero DE BRODER",
      label: cleanCmsText(merged.label),
      title: cleanCmsText(merged.title),
      subtitle: cleanCmsText(merged.subtitle)
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
        custom_label,
        custom_title,
        custom_subtitle,
        custom_button_label,
        custom_link_url,
        custom_image_url,
        custom_mobile_image_url,
        custom_image_alt,
        custom_object_fit,
        custom_object_position,
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
        .filter((item) => item.is_active && (
          item.product
          || item.service
          || (item.custom_title && item.custom_image_url && item.custom_link_url)
        ))
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

  const { data: landingSection } = await supabase
    .from("landing_sections")
    .select("is_visible")
    .eq("section_key", "plain-category")
    .maybeSingle();

  if (landingSection) {
    return { showPlainCategorySection: landingSection.is_visible !== false };
  }

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

async function readLandingSections(): Promise<LandingSection[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return fallbackContent.landingSections;

  const { data, error } = await supabase
    .from("landing_sections")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return fallbackContent.landingSections;

  const stored = new Map(
    (data as LandingSection[]).map((section) => [section.section_key, section])
  );
  const defaults = fallbackContent.landingSections.map((section) => ({
    ...section,
    ...(stored.get(section.section_key) || {})
  }));
  const defaultKeys = new Set(defaults.map((section) => section.section_key));
  const custom = (data as LandingSection[]).filter(
    (section) => !defaultKeys.has(section.section_key)
  );

  return [...defaults, ...custom].sort((a, b) => a.sort_order - b.sort_order);
}

async function readCampaignBanners(): Promise<CmsBanner[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("cms_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return error || !data ? [] : (data as CmsBanner[]);
}

export async function getPublicContent(): Promise<PublicContent> {
  noStore();

  const [
    heroes,
    instagramBanner,
    pageHeroes,
    categories,
    productCategories,
    services,
    products,
    productFilters,
    homepageSections,
    landingSettings,
    landingSections,
    campaignBanners,
    stores,
    orderSteps,
    trustAbout,
    testimonials,
    contact,
    jerseyConfigurator
  ] = await Promise.all([
    readActive<HeroBanner>("hero_banners", [], "urutan", false),
    readOptionalActiveSingle<InstagramBanner>(
      "instagram_banners",
      fallbackInstagramBanner
    ),
    readActive<PageHeroContent>(
      "page_heroes",
      [],
      "page_key",
      false
    ),
    readActive<ServiceCategory>(
      "service_categories",
      fallbackContent.categories,
      "urutan",
      false
    ),
    readProductCategories(),
    readActive<Service>("services", fallbackContent.services, "urutan", false),
    readProducts(),
    readActive<ProductFilter>("product_filters", fallbackProductFilters),
    readHomepageSections(),
    readLandingPageSettings(),
    readLandingSections(),
    readCampaignBanners(),
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
    ),
    readJerseyConfiguratorData()
  ]);

  const cleanHeroes = publicHeroes(heroes);

  return {
    hero: cleanHeroes[0] || fallbackContent.hero,
    heroes: cleanHeroes,
    about: fallbackContent.about,
    instagramBanner: cleanInstagramBanner(instagramBanner),
    pageHeroes: publicPageHeroes(pageHeroes),
    categories: publicCategories(categories),
    productCategories,
    services: services.map(cleanService),
    products: publicProducts(products),
    productFilters,
    homepageSections,
    landingSettings,
    landingSections,
    campaignBanners,
    stores: stores.map(cleanStore),
    orderSteps: publicOrderSteps(orderSteps),
    trustAbout: cleanTrustAbout(trustAbout),
    testimonials,
    contact: cleanContact({
      ...fallbackContent.contact,
      ...contact
    }),
    jerseyConfigurator
  };
}
