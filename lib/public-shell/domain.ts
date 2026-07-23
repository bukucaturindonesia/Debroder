import { contactLinks, storeContacts } from "@/lib/contact";
import { CONTRACT_VERSIONS } from "@/lib/contracts/version";
import { buildPublicNavigationFacets } from "@/lib/public-navigation";
import type { Product, ProductCategory, ProductVariant } from "@/lib/types";
import { emailHref, facebookHref, instagramHref, whatsappLinkWithMessage } from "@/lib/url";
import type {
  PublicShellFooterViewModel,
  PublicShellHeaderViewModel,
  PublicShellPageModel,
  PublicShellWarning
} from "./model";
import type {
  PublicShellContactRow,
  PublicShellSource,
  PublicShellStoreRow
} from "./source";

const shopLinks = [
  { label: "Kaos Polos", href: "/kaos-polos" },
  { label: "Jaket & Hoodie", href: "/jaket-hoodie" },
  { label: "Jersey", href: "/jersey" },
  { label: "Headwear", href: "/headwear" },
  { label: "Sablon DTF", href: "/sablon-dtf" },
  { label: "Cetak Sublim", href: "/cetak-sublim" }
] as const;

const helpLinks = [
  { label: "Cara Pemesanan", href: "/cara-order" },
  { label: "Keranjang", href: "/keranjang" },
  { label: "Toko", href: "/store" },
  { label: "Koleksi", href: "/koleksi" }
] as const;

const brandDescription =
  "Apparel dan percetakan asal Makassar sejak 2016. Spesialis sablon kaos, custom jersey, maklon DTF, cetak sublim, dan kebutuhan kaos polos untuk perusahaan, instansi, serta event di Indonesia Timur.";

const fallbackContact: PublicShellContactRow = {
  email: contactLinks.email,
  whatsapp_utama: contactLinks.whatsapp,
  whatsapp_link: contactLinks.whatsapp,
  facebook: contactLinks.facebook,
  instagram: contactLinks.instagram
};

const fallbackStores: PublicShellStoreRow[] = storeContacts.slice(0, 4).map((store, index) => ({
  nama_store: store.name,
  urutan: index + 1,
  status_aktif: true
}));

function catalogProducts(source: PublicShellSource): Product[] {
  const sizesByVariant = new Map<string, Array<{ variant_id: string; status: "active" | "inactive" | "out_of_stock"; is_active: boolean; stock: number; stock_quantity: number | null; size_name: string; sort_order: number }>>();
  source.variantSizes.data.forEach((size, index) => {
    const list = sizesByVariant.get(size.variant_id) || [];
    list.push({
      variant_id: size.variant_id,
      status: size.status || (size.is_active ? "active" : "inactive"),
      is_active: size.is_active,
      stock: Number(size.stock || 0),
      stock_quantity: size.stock_quantity,
      size_name: "",
      sort_order: index
    });
    sizesByVariant.set(size.variant_id, list);
  });

  const variantsByProduct = new Map<string, ProductVariant[]>();
  source.variants.data.forEach((variant, index) => {
    const list = variantsByProduct.get(variant.product_id) || [];
    list.push({
      id: variant.id,
      product_id: variant.product_id,
      status: variant.status || (variant.is_active ? "active" : "inactive"),
      is_active: variant.is_active,
      color_name: variant.color_name || undefined,
      variant_name: variant.variant_name || undefined,
      sort_order: index,
      sizes: sizesByVariant.get(variant.id) || []
    });
    variantsByProduct.set(variant.product_id, list);
  });

  return source.products.data.map((product, index) => ({
    id: product.id,
    nama: product.nama,
    kategori: product.kategori,
    deskripsi: "",
    subcategory: product.subcategory || undefined,
    badge: "",
    gambar_url: "",
    whatsapp_link: "",
    slug: product.slug || undefined,
    link_url: product.link_url || undefined,
    product_category_id: product.product_category_id,
    status: product.status || (product.status_aktif ? "active" : "archived"),
    status_aktif: product.status_aktif,
    label_new: Boolean(product.label_new),
    label_promo: Boolean(product.label_promo),
    label_best_seller: Boolean(product.label_best_seller),
    sales_count: Number(product.sales_count || 0),
    stock: Number(product.stock || 0),
    uses_configurator: Boolean(product.uses_configurator),
    product_type: product.product_type || undefined,
    pricing_mode: product.pricing_mode || undefined,
    color_tags: product.color_tags || [],
    intent_tags: product.intent_tags || [],
    collection_tags: product.collection_tags || [],
    material_tags: product.material_tags || [],
    variants: variantsByProduct.get(product.id) || [],
    urutan: index
  }));
}

function catalogCategories(source: PublicShellSource): ProductCategory[] {
  return source.categories.data.map((category) => ({
    id: category.id || undefined,
    name: category.name,
    slug: category.slug,
    description: "",
    is_active: category.is_active,
    sort_order: category.sort_order,
    collection_section_order: category.collection_section_order ?? category.sort_order,
    public_label: category.public_label
  }));
}

function warningList(source: PublicShellSource): PublicShellWarning[] {
  const warnings: PublicShellWarning[] = [];
  if (source.products.status === "unavailable" || source.variants.status === "unavailable" || source.variantSizes.status === "unavailable") {
    warnings.push({ code: "public_shell.catalog_unavailable", source: "products" });
  }
  if (source.categories.status === "unavailable") {
    warnings.push({ code: "public_shell.categories_unavailable", source: "categories" });
  }
  if (source.contact.status === "unavailable") {
    warnings.push({ code: "public_shell.contact_unavailable", source: "contact" });
  }
  if (source.stores.status === "unavailable") {
    warnings.push({ code: "public_shell.stores_unavailable", source: "stores" });
  }
  return warnings;
}

function headerModel(source: PublicShellSource): PublicShellHeaderViewModel {
  const whatsappHref = whatsappLinkWithMessage(
    contactLinks.whatsapp,
    "Halo DEBRODER, saya ingin bertanya tentang layanan DEBRODER."
  );

  return {
    navigationFacets: buildPublicNavigationFacets(catalogProducts(source), catalogCategories(source)),
    whatsappHref,
    promo: {
      message: "Konsultasi desain gratis untuk kebutuhan apparel custom",
      actionLabel: "Hubungi WhatsApp",
      actionHref: whatsappHref
    }
  };
}

function footerModel(source: PublicShellSource): PublicShellFooterViewModel {
  const contact = source.contact.data || fallbackContact;
  const stores = source.stores.data.length ? source.stores.data : fallbackStores;
  const emailLink = emailHref(contact.email || undefined);
  const whatsappLink = whatsappLinkWithMessage(
    contact.whatsapp_link || contact.whatsapp_utama || contactLinks.whatsapp,
    "Halo DEBRODER, saya ingin bertanya tentang layanan DEBRODER."
  );
  const socialLinks = [
    { label: "Instagram", href: instagramHref(contact.instagram || undefined), icon: "instagram" as const, external: true },
    { label: "WhatsApp", href: whatsappLink, icon: "whatsapp" as const, external: true },
    { label: "Facebook", href: facebookHref(contact.facebook || undefined), icon: "facebook" as const, external: true },
    { label: "Email", href: emailLink, icon: "email" as const }
  ].filter((item) => Boolean(item.href));

  return {
    shopLinks,
    publicShopLinks: [...shopLinks, { label: "Custom", href: "/custom" }],
    helpLinks,
    companyLinks: [
      { label: "Tentang DEBRODER", href: "/#tentang" },
      ...stores
        .filter((store) => store.status_aktif)
        .sort((a, b) => a.urutan - b.urutan)
        .slice(0, 4)
        .map((store) => ({ label: store.nama_store.replace(/^STORE\s+/i, "Store "), href: "/store" })),
      { label: "Hubungi Kami", href: emailLink }
    ],
    socialLinks,
    brandDescription,
    copyrightText: "© 2026 DEBRODER. All rights reserved.",
    termsLink: { label: "Syarat & Ketentuan", href: "/cara-order" },
    privacyLink: { label: "Kebijakan Privasi", href: "/cara-order" }
  };
}

export function buildPublicShellPageModel(source: PublicShellSource): PublicShellPageModel {
  const warnings = warningList(source);
  const hasCatalog = source.products.data.length > 0;
  const state = warnings.length
    ? "degraded"
    : hasCatalog
      ? "ready"
      : "empty";

  return {
    contractVersion: CONTRACT_VERSIONS.pageViewModel,
    pageKey: "public-shell",
    locale: "id-ID",
    metadata: { title: "DEBRODER" },
    breadcrumbs: [],
    data: {
      state,
      header: headerModel(source),
      footer: footerModel(source),
      warnings
    }
  };
}

export function buildLoadingPublicShellPageModel(): PublicShellPageModel {
  const model = buildPublicShellPageModel({
    products: { status: "empty", data: [] },
    variants: { status: "empty", data: [] },
    variantSizes: { status: "empty", data: [] },
    categories: { status: "empty", data: [] },
    contact: { status: "empty", data: null },
    stores: { status: "empty", data: [] }
  });
  return {
    ...model,
    data: {
      ...model.data,
      state: "loading"
    }
  };
}

export function buildUnavailablePublicShellPageModel(): PublicShellPageModel {
  return buildPublicShellPageModel({
    products: { status: "unavailable", data: [] },
    variants: { status: "unavailable", data: [] },
    variantSizes: { status: "unavailable", data: [] },
    categories: { status: "unavailable", data: [] },
    contact: { status: "unavailable", data: null },
    stores: { status: "unavailable", data: [] }
  });
}
