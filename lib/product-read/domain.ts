import type { Product, ProductSizeGuide, ProductVariant, ProductVariantImage, ProductVariantSize } from "@/lib/types";
import type { ProductReadSource, ProductRow } from "./source";

function numberValue(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function projectProductSource(source: ProductReadSource): Product[] {
  const sizesByVariant = new Map<string, ProductVariantSize[]>();
  source.variantSizes.data.forEach((size) => {
    const list = sizesByVariant.get(size.variant_id) || [];
    list.push({
      id: size.id,
      variant_id: size.variant_id,
      size_name: size.size_name,
      sku: size.sku,
      stock: numberValue(size.stock ?? size.stock_quantity),
      stock_quantity: size.stock_quantity,
      size_id: size.size_id,
      status: size.status || (size.is_active ? "active" : "inactive"),
      price_adjustment: size.price_adjustment ?? 0,
      is_active: size.is_active,
      sort_order: numberValue(size.sort_order)
    });
    sizesByVariant.set(size.variant_id, list);
  });

  const imagesByVariant = new Map<string, ProductVariantImage[]>();
  source.variantImages.data.forEach((image) => {
    const list = imagesByVariant.get(image.variant_id) || [];
    list.push({
      id: image.id,
      variant_id: image.variant_id,
      image_url: image.image_url,
      image_role: image.image_role || undefined,
      alt_text: image.alt_text || undefined,
      object_fit: image.object_fit || undefined,
      object_position: image.object_position || undefined,
      focal_x: image.focal_x ?? undefined,
      focal_y: image.focal_y ?? undefined,
      focal_zoom: image.focal_zoom ?? undefined,
      target_ratio: image.target_ratio || undefined,
      is_cover: Boolean(image.is_cover),
      sort_order: numberValue(image.sort_order)
    });
    imagesByVariant.set(image.variant_id, list);
  });

  const variantsByProduct = new Map<string, ProductVariant[]>();
  source.variants.data.forEach((variant) => {
    const list = variantsByProduct.get(variant.product_id) || [];
    list.push({
      id: variant.id,
      product_id: variant.product_id,
      name: variant.name || undefined,
      slug: variant.slug || undefined,
      hex_code: variant.hex_code || undefined,
      status: variant.status || (variant.is_active ? "active" : "inactive"),
      variant_name: variant.variant_name || undefined,
      color_name: variant.color_name || undefined,
      color_hex: variant.color_hex || undefined,
      sku: variant.sku,
      price_adjustment: variant.price_adjustment ?? 0,
      image_url: variant.image_url,
      images: variant.images || [],
      object_fit: variant.object_fit || undefined,
      object_position: variant.object_position || undefined,
      is_active: variant.is_active,
      sort_order: numberValue(variant.sort_order),
      sizes: sizesByVariant.get(variant.id) || [],
      variant_images: imagesByVariant.get(variant.id) || []
    });
    variantsByProduct.set(variant.product_id, list);
  });

  const guideByProduct = new Map<string, ProductSizeGuide>();
  source.sizeGuides.data.forEach((guide) => {
    if (!guide.product_id || guideByProduct.has(guide.product_id)) return;
    guideByProduct.set(guide.product_id, {
      id: guide.id,
      product_id: guide.product_id,
      product_category_id: guide.product_category_id,
      product_subcategory_id: guide.product_subcategory_id,
      title: guide.title,
      description: guide.description || undefined,
      rows: guide.rows || [],
      notes: guide.notes || [],
      is_active: guide.is_active,
      sort_order: numberValue(guide.sort_order)
    });
  });

  return source.products.data.map((row) => projectProductRow(row, variantsByProduct.get(row.id) || [], guideByProduct.get(row.id) || null));
}

function projectProductRow(row: ProductRow, variants: ProductVariant[], sizeGuide: ProductSizeGuide | null): Product {
  const primaryImage = row.image_url || row.gambar_url || "";
  return {
    id: row.id,
    name: row.name || undefined,
    nama: row.nama || row.name || "Produk",
    kategori: row.kategori || "",
    deskripsi: row.deskripsi || row.description || "",
    short_detail: row.short_detail || undefined,
    description: row.description || undefined,
    subcategory: row.subcategory || undefined,
    compare_price: row.compare_price,
    specifications: row.specifications || [],
    gallery_urls: row.gallery_urls || [],
    label_new: Boolean(row.label_new),
    label_promo: Boolean(row.label_promo),
    label_best_seller: Boolean(row.label_best_seller),
    seo_title: row.seo_title || undefined,
    seo_description: row.seo_description || undefined,
    og_image_url: row.og_image_url || undefined,
    canonical_url: row.canonical_url || undefined,
    focal_x: row.focal_x,
    focal_y: row.focal_y,
    focal_zoom: row.focal_zoom,
    target_ratio: row.target_ratio || undefined,
    focal_points: row.focal_points || undefined,
    sales_count: numberValue(row.sales_count),
    badge: row.badge || "",
    gambar_url: primaryImage,
    image_url: primaryImage,
    image_alt: row.image_alt || row.nama || row.name || "Produk DEBRODER",
    collection_tags: row.collection_tags || [],
    intent_tags: row.intent_tags || [],
    color_tags: row.color_tags || [],
    size_tags: row.size_tags || [],
    size_chart: row.size_chart || [],
    bulk_order_note: row.bulk_order_note,
    material_tags: row.material_tags || [],
    brand: row.brand || undefined,
    object_fit: row.object_fit || undefined,
    object_position: row.object_position || undefined,
    whatsapp_link: row.whatsapp_link || "",
    link_url: row.link_url || undefined,
    price: row.price,
    harga: row.harga,
    base_price: row.base_price,
    price_label: row.price_label,
    slug: row.slug || undefined,
    stock: numberValue(row.stock),
    product_category_id: row.product_category_id,
    product_subcategory_id: row.product_subcategory_id,
    size_guide_id: row.size_guide_id,
    product_type: row.product_type || undefined,
    pricing_mode: row.pricing_mode || undefined,
    sku: row.sku,
    has_variants: Boolean(row.has_variants || variants.length),
    uses_configurator: Boolean(row.uses_configurator),
    minimum_order_qty: row.minimum_order_qty ?? undefined,
    variants,
    size_guide: sizeGuide,
    urutan: numberValue(row.urutan),
    status: row.status || "active",
    status_aktif: row.status_aktif,
    created_at: row.created_at || undefined,
    updated_at: row.updated_at || undefined
  };
}
