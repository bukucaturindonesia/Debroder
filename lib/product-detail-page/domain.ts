import { CONTRACT_VERSIONS } from "@/lib/contracts/version";
import { getProductImage } from "@/lib/fallback-data";
import { jerseyHasCustomAvailability, jerseyHasReadyStock } from "@/lib/jersey-commerce";
import { getProductGalleryImages } from "@/lib/product-gallery";
import { productMatchesRoute } from "@/lib/product-route-matching";
import { projectProductSource } from "@/lib/product-read/domain";
import type { Product, ProductSizeGuide } from "@/lib/types";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";
import type { ProductDetailPageModel } from "./model";
import type { ProductDetailPageSource } from "./source";

function sizeGuideRowsFromAdmin(guide?: ProductSizeGuide | null) {
  if (!guide?.rows?.length) return [];
  return guide.rows.map((row) => {
    const entries = Object.entries(row).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
    const labelEntry = entries.find(([key]) => /ukuran|size|nama|label/i.test(key)) || entries[0];
    const label = labelEntry ? String(labelEntry[1]) : "Ukuran";
    const value = entries.filter(([key]) => key !== labelEntry?.[0]).map(([key, entry]) => `${key}: ${entry}`).join(", ");
    return value ? `${label}: ${value}` : label;
  });
}

function sizeGuideForProduct(product: Product) {
  const adminRows = sizeGuideRowsFromAdmin(product.size_guide);
  if (adminRows.length) return adminRows;
  if (product.size_chart?.length) return product.size_chart;
  const specRows = (product.specifications || []).filter((item) => /ukuran|size|panjang|lebar|dada|lingkar/i.test(item));
  if (specRows.length) return specRows;
  return (product.size_tags || []).map((size) => `${size}: Sesuaikan dengan panduan ukuran produk ini.`);
}

function variantColors(product: Product) {
  const colors = (product.variants || []).map((variant) => variant.color_name || variant.variant_name).filter(Boolean) as string[];
  return colors.length ? Array.from(new Set(colors)) : product.color_tags || [];
}

function variantSizes(product: Product) {
  const sizes = (product.variants || []).flatMap((variant) => (variant.sizes || []).map((size) => size.size_name)).filter(Boolean);
  return sizes.length ? Array.from(new Set(sizes)) : product.size_tags || [];
}

export function buildProductDetailPageModel(slug: string, source: ProductDetailPageSource): ProductDetailPageModel {
  const product = projectProductSource(source.productSource)[0] || null;
  if (!product) {
    return {
      contractVersion: CONTRACT_VERSIONS.pageViewModel,
      pageKey: "product-detail",
      locale: "id-ID",
      metadata: {
        title: source.status === "not_found" ? "Produk tidak ditemukan | DEBRODER" : "Produk belum tersedia | DEBRODER",
        robots: "noindex_follow"
      },
      breadcrumbs: [],
      data: {
        state: source.status === "not_found" ? "not_found" : "unavailable",
        product: null,
        relatedProducts: [],
        images: [],
        focal: { focal_x: 50, focal_y: 50, zoom: 1, target_ratio: "4:5" },
        whatsappUrl: "",
        priceLabel: "",
        detailHref: `/produk/${slug}`,
        isJersey: false,
        hasReadyStock: false,
        hasCustomAvailability: false,
        showPurchasePanel: false,
        customDestination: null,
        colors: [],
        sizes: [],
        sizeGuide: [],
        journey: { mode: "unknown", readyStock: false, custom: false },
        warningCode: source.status === "unavailable" ? "product_detail.read_unavailable" : null
      }
    };
  }

  const isJersey = productMatchesRoute(product, "jersey");
  const hasReadyStock = jerseyHasReadyStock(product);
  const hasCustomAvailability = jerseyHasCustomAvailability(product);
  const allRelated = projectProductSource(source.relatedSource);
  const relatedProducts = isJersey
    ? []
    : allRelated
        .filter((item) => item.status_aktif !== false)
        .filter((item) => (item.id || item.slug || item.nama) !== (product.id || product.slug || product.nama))
        .filter((item) => !productMatchesRoute(item, "jersey"))
        .filter((item) => item.kategori === product.kategori)
        .slice(0, 4);
  const image = product.og_image_url || getProductImage(product);
  const description = product.seo_description || product.short_detail || product.description || product.deskripsi;
  const contactWhatsapp = source.contact?.whatsapp_link || source.contact?.whatsapp_utama || "";

  return {
    contractVersion: CONTRACT_VERSIONS.pageViewModel,
    pageKey: "product-detail",
    locale: "id-ID",
    metadata: {
      title: product.seo_title || `${product.nama} | DEBRODER`,
      description,
      canonicalPath: product.canonical_url || `/produk/${slug}`,
      socialImage: image ? { src: image, alt: product.image_alt || product.nama } : undefined
    },
    breadcrumbs: [
      { label: "Beranda", href: "/" },
      { label: isJersey ? "Jersey" : "Koleksi", href: isJersey ? "/jersey/shop" : "/koleksi" },
      { label: product.nama }
    ],
    data: {
      state: source.status === "unavailable" ? "unavailable" : "ready",
      product,
      relatedProducts,
      images: getProductGalleryImages(product),
      focal: product.focal_points?.detail || product.focal_points?.catalog || {
        focal_x: Number(product.focal_x ?? 50),
        focal_y: Number(product.focal_y ?? 50),
        zoom: Number(product.focal_zoom ?? 1),
        target_ratio: "4:5"
      },
      whatsappUrl: whatsappLinkWithMessage(
        product.whatsapp_link || contactWhatsapp,
        `Halo DEBRODER, saya ingin bertanya tentang ${product.nama}.`
      ),
      priceLabel: formatRupiah(product.price ?? product.harga ?? product.base_price) || "Hubungi kami",
      detailHref: `/produk/${product.slug || slug}`,
      isJersey,
      hasReadyStock,
      hasCustomAvailability,
      showPurchasePanel: !isJersey || hasReadyStock || !hasCustomAvailability,
      customDestination: isJersey ? null : source.customDestination,
      colors: variantColors(product),
      sizes: variantSizes(product),
      sizeGuide: sizeGuideForProduct(product),
      journey: {
        mode: hasReadyStock && hasCustomAvailability
          ? "hybrid"
          : hasReadyStock
            ? "ready_stock"
            : hasCustomAvailability
              ? "custom"
              : "unknown",
        readyStock: hasReadyStock,
        custom: hasCustomAvailability
      },
      warningCode: source.status === "unavailable" ? "product_detail.related_or_contact_unavailable" : null
    }
  };
}

export function buildUnavailableProductDetailPageModel(slug: string): ProductDetailPageModel {
  return buildProductDetailPageModel(slug, {
    status: "unavailable",
    productSource: {
      products: { status: "unavailable", data: [] },
      variants: { status: "unavailable", data: [] },
      variantSizes: { status: "unavailable", data: [] },
      variantImages: { status: "unavailable", data: [] },
      sizeGuides: { status: "unavailable", data: [] }
    },
    relatedSource: {
      products: { status: "unavailable", data: [] },
      variants: { status: "unavailable", data: [] },
      variantSizes: { status: "unavailable", data: [] },
      variantImages: { status: "unavailable", data: [] },
      sizeGuides: { status: "unavailable", data: [] }
    },
    contact: null,
    customDestination: null
  });
}
