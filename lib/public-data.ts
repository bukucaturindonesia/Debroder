import { unstable_noStore as noStore } from "next/cache";
import {
  fallbackContent,
  fallbackInstagramBanner,
  fallbackProductFilters,
  pageHeroMobileImageFallbacks
} from "@/lib/fallback-data";
import { PLAIN_CATEGORY_SECTION_SETTING } from "@/lib/homepage-settings";
import { productCategoryPresets } from "@/lib/product-category-config";
import {
  isCmsWorkflowTable,
  isPublicCmsContent,
  publicCmsStatusFilter
} from "@/lib/cms-workflow";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  DEFAULT_SITE_MEDIA,
  parseSiteMediaDefaults,
  SITE_MEDIA_SETTING_KEY,
  type SiteMediaDefaults
} from "@/lib/site-media";
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

type ActiveField = "status_aktif" | "is_active" | "is_visible";
type PublicRevisionRow = {
  content_id: string;
  data: unknown;
  publish_at?: string | null;
  created_at?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function rowIsActive(row: Record<string, unknown>, activeField?: ActiveField) {
  if (!activeField) return true;
  return row[activeField] !== false;
}

function resolveMediaUrl(value: string | null | undefined, fallback: string) {
  const normalized = (value || "").trim();
  if (!normalized || normalized.startsWith("/images/debroder/")) return fallback;
  return normalized;
}

async function readSiteMediaDefaults(): Promise<SiteMediaDefaults> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return DEFAULT_SITE_MEDIA;

  const { data, error } = await supabase
    .from("website_settings")
    .select("value")
    .eq("setting_key", SITE_MEDIA_SETTING_KEY)
    .maybeSingle();

  if (error) return DEFAULT_SITE_MEDIA;
  return parseSiteMediaDefaults(data?.value);
}

async function readDueScheduledCmsRows<T extends { id?: string }>(
  table: string,
  activeField?: ActiveField
): Promise<T[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase || !isCmsWorkflowTable(table)) return [];

  const { data, error } = await supabase.rpc("get_due_cms_revisions", {
    p_content_type: table
  });

  if (error || !data) return [];

  const rows: Record<string, unknown>[] = [];

  for (const revision of data as PublicRevisionRow[]) {
    if (!isRecord(revision.data)) continue;

    const row: Record<string, unknown> = {
      ...revision.data,
      id: String(revision.data.id || revision.content_id),
      status: "published",
      publish_at: revision.publish_at || null,
      published_at: revision.publish_at || revision.created_at || null
    };

    if (!rowIsActive(row, activeField)) continue;
    if (
      hasBlockedPublicText(
        Object.values(row).filter(
          (value): value is string => typeof value === "string"
        )
      )
    ) {
      continue;
    }

    rows.push(row);
  }

  return rows as T[];
}

function mergeDueScheduledRows<T extends { id?: string }>(
  rows: T[],
  scheduledRows: T[]
) {
  if (!scheduledRows.length) return rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  scheduledRows.forEach((scheduledRow) => {
    if (!scheduledRow.id) return;
    byId.set(scheduledRow.id, {
      ...(byId.get(scheduledRow.id) || {}),
      ...scheduledRow
    } as T);
  });
  return Array.from(byId.values());
}

async function readActive<T extends { id?: string }>(
  table: string,
  fallback: T[],
  order = "urutan",
  fallbackWhenEmpty = true
): Promise<T[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  let query = supabase
    .from(table)
    .select("*")
    .eq("status_aktif", true)
    .order(order, { ascending: true });

  if (isCmsWorkflowTable(table)) {
    query = query.or(publicCmsStatusFilter());
  }

  const { data, error } = await query;

  if (error || !data) return fallbackWhenEmpty ? fallback : [];

  const scheduledRows = await readDueScheduledCmsRows<T>(table, "status_aktif");
  const mergedRows = mergeDueScheduledRows(data as T[], scheduledRows);

  if (mergedRows.length > 0) return mergedRows;
  if (isCmsWorkflowTable(table)) return [];
  return fallbackWhenEmpty ? fallback : [];
}

async function readSingle<T extends { id?: string }>(
  table: string,
  fallback: T,
  filterActive = true
): Promise<T> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  let query = supabase
    .from(table)
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (filterActive) {
    query = query.eq("status_aktif", true);
  }

  if (isCmsWorkflowTable(table)) {
    query = query.or(publicCmsStatusFilter());
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    const [scheduled] = await readDueScheduledCmsRows<T>(table, filterActive ? "status_aktif" : undefined);
    return scheduled || fallback;
  }

  const [scheduled] = await readDueScheduledCmsRows<T>(table, filterActive ? "status_aktif" : undefined);
  if (scheduled && (scheduled as { id?: string }).id === (data as { id?: string }).id) {
    return { ...(data as T), ...scheduled };
  }
  return data as T;
}

async function readOptionalActiveSingle<T extends { id?: string }>(
  table: string,
  fallback: T
): Promise<T | null> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  let query = supabase
    .from(table)
    .select("*")
    .eq("status_aktif", true)
    .limit(1);

  if (isCmsWorkflowTable(table)) {
    query = query.or(publicCmsStatusFilter());
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    const [scheduled] = await readDueScheduledCmsRows<T>(table, "status_aktif");
    return scheduled || fallback;
  }

  if (!data) {
    const [scheduled] = await readDueScheduledCmsRows<T>(table, "status_aktif");
    return scheduled || null;
  }

  const [scheduled] = await readDueScheduledCmsRows<T>(table, "status_aktif");
  if (scheduled && (scheduled as { id?: string }).id === (data as { id?: string }).id) {
    return { ...(data as T), ...scheduled };
  }

  return data as T;
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

export async function readProducts(): Promise<Product[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("urutan", { ascending: true });

  if (error || !data || data.length === 0) return [];

  const products = data as Product[];
  const productIds = products.map((product) => product.id).filter(Boolean) as string[];

  if (!productIds.length) return products;

  try {
    const { data: variantsData } = await supabase
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    const variants = (variantsData || []) as NonNullable<Product["variants"]>;
    const variantIds = variants.map((variant) => variant.id).filter(Boolean) as string[];

    const [sizesResult, imagesResult, guidesResult] = await Promise.all([
      variantIds.length
        ? supabase
            .from("product_variant_sizes")
            .select("*")
            .in("variant_id", variantIds)
            .eq("status", "active")
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

async function hydrateHomepageSectionItems(
  items: HomepageSectionItem[]
): Promise<HomepageSectionItem[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase || items.length === 0) return items;

  const productIds = Array.from(
    new Set(
      items
        .map((item) => item.product_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const serviceIds = Array.from(
    new Set(
      items
        .map((item) => item.service_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [productResult, serviceResult] = await Promise.all([
    productIds.length
      ? supabase
          .from("products")
          .select("*")
          .in("id", productIds)
          .eq("status", "active")
      : Promise.resolve({ data: [], error: null }),
    serviceIds.length
      ? supabase
          .from("services")
          .select("*")
          .in("id", serviceIds)
          .eq("status_aktif", true)
      : Promise.resolve({ data: [], error: null })
  ]);

  const productsById = new Map(
    ((productResult.data || []) as Product[])
      .filter((product) => Boolean(product.id))
      .map((product) => [String(product.id), cleanProduct(product)])
  );
  const servicesById = new Map(
    ((serviceResult.data || []) as Service[])
      .filter((service) => Boolean(service.id))
      .map((service) => [String(service.id), cleanService(service)])
  );

  return items.map((item) => ({
    ...item,
    product: item.product_id
      ? productsById.get(item.product_id) || null
      : null,
    service: item.service_id
      ? servicesById.get(item.service_id) || null
      : null
  }));
}

async function readHomepageSections(): Promise<HomepageSection[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const now = new Date().toISOString();
  const sectionQuery = supabase
    .from("homepage_sections")
    .select(
      "id,title,slug,is_active,sort_order,status,publish_at,published_at,archived_at,updated_by,created_at,updated_at"
    )
    .eq("is_active", true)
    .or(publicCmsStatusFilter(now))
    .order("sort_order", { ascending: true });

  const { data: baseSections, error: sectionError } = await sectionQuery;
  if (sectionError || !baseSections) return [];

  const dueSections = await readDueScheduledCmsRows<HomepageSection>(
    "homepage_sections",
    "is_active"
  );
  const sections = mergeDueScheduledRows(
    baseSections as HomepageSection[],
    dueSections
  )
    .filter(
      (section) => section.is_active && isPublicCmsContent(section, now)
    )
    .sort((a, b) => a.sort_order - b.sort_order);

  if (sections.length === 0) return [];

  const sectionIds = sections.map((section) => section.id);
  const { data: baseItems, error: itemError } = await supabase
    .from("homepage_section_items")
    .select(
      "id,section_id,product_id,service_id,custom_label,custom_title,custom_subtitle,custom_button_label,custom_link_url,custom_image_url,custom_mobile_image_url,custom_image_alt,custom_object_fit,custom_object_position,is_active,sort_order,status,publish_at,published_at,archived_at,updated_by,created_at,updated_at"
    )
    .in("section_id", sectionIds)
    .eq("is_active", true)
    .or(publicCmsStatusFilter(now))
    .order("sort_order", { ascending: true });

  if (itemError || !baseItems) return [];

  const dueItems = await readDueScheduledCmsRows<HomepageSectionItem>(
    "homepage_section_items",
    "is_active"
  );
  const sectionIdSet = new Set(sectionIds);
  const mergedItems = mergeDueScheduledRows(
    baseItems as HomepageSectionItem[],
    dueItems
  )
    .filter(
      (item) =>
        sectionIdSet.has(item.section_id) &&
        item.is_active &&
        isPublicCmsContent(item, now) &&
        Boolean(
          item.product_id ||
            item.service_id ||
            (item.custom_title &&
              item.custom_image_url &&
              item.custom_link_url)
        )
    )
    .sort((a, b) => a.sort_order - b.sort_order);

  const hydratedItems = await hydrateHomepageSectionItems(mergedItems);
  const itemsBySection = new Map<string, HomepageSectionItem[]>();

  hydratedItems.forEach((item) => {
    const current = itemsBySection.get(item.section_id) || [];
    current.push(item);
    itemsBySection.set(item.section_id, current);
  });

  return sections
    .map((section) => ({
      ...section,
      items: (itemsBySection.get(section.id) || []).sort(
        (a, b) => a.sort_order - b.sort_order
      )
    }))
    .filter((section) => section.items.length > 0);
}

async function readLandingPageSettings(): Promise<LandingPageSettings> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return fallbackContent.landingSettings;

  const now = new Date().toISOString();
  const { data: landingSection, error: landingError } = await supabase
    .from("landing_sections")
    .select(
      "id,section_key,is_visible,status,publish_at,published_at,archived_at,updated_by"
    )
    .eq("section_key", "plain-category")
    .or(publicCmsStatusFilter(now))
    .maybeSingle();

  if (!landingError) {
    const dueLandingSections =
      await readDueScheduledCmsRows<LandingSection>("landing_sections");
    const dueLandingSection = dueLandingSections.find(
      (section) => section.section_key === "plain-category"
    );
    const effectiveLandingSection = dueLandingSection
      ? {
          ...(landingSection || {}),
          ...dueLandingSection
        }
      : landingSection;

    if (
      effectiveLandingSection &&
      isPublicCmsContent(effectiveLandingSection, now)
    ) {
      return {
        showPlainCategorySection:
          effectiveLandingSection.is_visible !== false
      };
    }
  }

  const { data: homepageSection, error: homepageError } = await supabase
    .from("homepage_sections")
    .select(
      "id,slug,is_active,status,publish_at,published_at,archived_at,updated_by"
    )
    .eq("slug", PLAIN_CATEGORY_SECTION_SETTING.slug)
    .or(publicCmsStatusFilter(now))
    .maybeSingle();

  if (homepageError) return fallbackContent.landingSettings;

  const dueHomepageSections =
    await readDueScheduledCmsRows<HomepageSection>("homepage_sections");
  const dueHomepageSection = dueHomepageSections.find(
    (section) => section.slug === PLAIN_CATEGORY_SECTION_SETTING.slug
  );
  const effectiveHomepageSection = dueHomepageSection
    ? {
        ...(homepageSection || {}),
        ...dueHomepageSection
      }
    : homepageSection;

  if (
    !effectiveHomepageSection ||
    !isPublicCmsContent(effectiveHomepageSection, now)
  ) {
    return fallbackContent.landingSettings;
  }

  return {
    showPlainCategorySection: effectiveHomepageSection.is_active !== false
  };
}

async function readLandingSections(): Promise<LandingSection[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return fallbackContent.landingSections;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("landing_sections")
    .select(
      "id,section_key,title,subtitle,is_visible,sort_order,metadata,desktop_image_url,mobile_image_url,video_url,cta_label,cta_url,text_position,status,publish_at,published_at,archived_at,updated_by,created_at,updated_at"
    )
    .or(publicCmsStatusFilter(now))
    .order("sort_order", { ascending: true });

  if (error || !data) return fallbackContent.landingSections;

  const scheduledRows =
    await readDueScheduledCmsRows<LandingSection>("landing_sections");

  return mergeDueScheduledRows(data as LandingSection[], scheduledRows)
    .filter((section) => isPublicCmsContent(section, now))
    .sort((a, b) => a.sort_order - b.sort_order);
}

async function readCampaignBanners(): Promise<CmsBanner[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("cms_banners")
    .select(
      "id,name,media_type,desktop_media_url,mobile_media_url,poster_url,eyebrow,title,subtitle,cta_label,cta_url,text_position,experience_key,section_type,section_key,section_group,section_heading,section_description,anchor_id,overlay_strength,theme_variant,secondary_cta_label,secondary_cta_url,image_alt,object_position,mobile_object_position,focal_x,focal_y,focal_zoom,mobile_focal_x,mobile_focal_y,mobile_focal_zoom,metadata,is_active,sort_order,status,publish_at,published_at,archived_at,updated_by,created_at,updated_at"
    )
    .eq("is_active", true)
    .or(publicCmsStatusFilter(now))
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  const scheduledRows = await readDueScheduledCmsRows<CmsBanner>(
    "cms_banners",
    "is_active"
  );

  return mergeDueScheduledRows(data as CmsBanner[], scheduledRows)
    .filter(
      (banner) => banner.is_active && isPublicCmsContent(banner, now)
    )
    .sort((a, b) => a.sort_order - b.sort_order);
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
    siteMedia,
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
    readSiteMediaDefaults(),
    readJerseyConfiguratorData()
  ]);

  const cleanHeroes = publicHeroes(heroes).map((hero) => ({
    ...hero,
    image_url: resolveMediaUrl(hero.image_url, siteMedia.heroDesktop),
    mobile_image_url: resolveMediaUrl(hero.mobile_image_url, siteMedia.heroMobile)
  }));
  const resolvedInstagramBanner = cleanInstagramBanner(instagramBanner);
  const resolvedPageHeroes = publicPageHeroes(pageHeroes).map((hero) => ({
    ...hero,
    image_url: resolveMediaUrl(hero.image_url, siteMedia.pageHeroDesktop),
    mobile_image_url: resolveMediaUrl(hero.mobile_image_url, siteMedia.pageHeroMobile)
  }));
  const resolvedCategories = publicCategories(categories).map((category) => ({
    ...category,
    gambar_url: resolveMediaUrl(category.gambar_url, siteMedia.product),
    gallery_urls: (category.gallery_urls || []).filter((url) => !url.startsWith("/images/debroder/"))
  }));
  const resolvedServices = services.map(cleanService).map((service) => ({
    ...service,
    image_url: resolveMediaUrl(service.image_url, siteMedia.product)
  }));
  const resolvedProducts = publicProducts(products).map((product) => {
    const primaryImage = resolveMediaUrl(product.image_url || product.gambar_url, siteMedia.product);
    return {
      ...product,
      image_url: primaryImage,
      gambar_url: primaryImage,
      gallery_urls: (product.gallery_urls || []).filter((url) => !url.startsWith("/images/debroder/"))
    };
  });
  const resolvedHomepageSections = homepageSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      custom_image_url: item.custom_image_url
        ? resolveMediaUrl(item.custom_image_url, siteMedia.product)
        : item.custom_image_url,
      custom_mobile_image_url: item.custom_mobile_image_url
        ? resolveMediaUrl(item.custom_mobile_image_url, siteMedia.product)
        : item.custom_mobile_image_url,
      product: item.product
        ? {
            ...item.product,
            image_url: resolveMediaUrl(item.product.image_url || item.product.gambar_url, siteMedia.product),
            gambar_url: resolveMediaUrl(item.product.image_url || item.product.gambar_url, siteMedia.product)
          }
        : item.product,
      service: item.service
        ? {
            ...item.service,
            image_url: resolveMediaUrl(item.service.image_url, siteMedia.product)
          }
        : item.service
    }))
  }));
  const resolvedStores = stores.map(cleanStore).map((store) => ({
    ...store,
    image_url: resolveMediaUrl(store.image_url, siteMedia.store)
  }));
  const resolvedTrustAbout = {
    ...cleanTrustAbout(trustAbout),
    image_url: resolveMediaUrl(trustAbout.image_url, siteMedia.benefit),
    mobile_image_url: resolveMediaUrl(trustAbout.mobile_image_url, siteMedia.benefit)
  };
  const resolvedCampaignBanners = campaignBanners.map((banner) => ({
    ...banner,
    desktop_media_url: resolveMediaUrl(banner.desktop_media_url, siteMedia.bannerDesktop),
    mobile_media_url: resolveMediaUrl(banner.mobile_media_url, siteMedia.bannerMobile),
    poster_url: banner.poster_url ? resolveMediaUrl(banner.poster_url, siteMedia.bannerDesktop) : banner.poster_url
  }));
  const landingCampaignBanners = resolvedCampaignBanners.filter(
    (banner) => !banner.experience_key || banner.experience_key === "landing"
  );
  const jerseySections = resolvedCampaignBanners.filter(
    (banner) => banner.experience_key === "jersey"
  );

  return {
    hero: cleanHeroes[0] || {
      ...fallbackContent.hero,
      image_url: siteMedia.heroDesktop,
      mobile_image_url: siteMedia.heroMobile
    },
    heroes: cleanHeroes,
    about: fallbackContent.about,
    instagramBanner: resolvedInstagramBanner
      ? {
          ...resolvedInstagramBanner,
          image_url: resolveMediaUrl(resolvedInstagramBanner.image_url, siteMedia.bannerDesktop),
          mobile_image_url: resolveMediaUrl(resolvedInstagramBanner.mobile_image_url, siteMedia.bannerMobile)
        }
      : null,
    pageHeroes: resolvedPageHeroes,
    categories: resolvedCategories,
    productCategories,
    services: resolvedServices,
    products: resolvedProducts,
    productFilters,
    homepageSections: resolvedHomepageSections,
    landingSettings,
    landingSections,
    campaignBanners: landingCampaignBanners,
    jerseySections,
    stores: resolvedStores,
    orderSteps: publicOrderSteps(orderSteps),
    trustAbout: resolvedTrustAbout,
    testimonials,
    contact: cleanContact({
      ...fallbackContent.contact,
      ...contact
    }),
    jerseyConfigurator
  };
}
