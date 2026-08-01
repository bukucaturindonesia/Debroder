import { uniqueCatalogProducts } from "@/lib/product-catalog";
import {
  getCanonicalProductGalleryImages,
  getVariantGalleryImages
} from "@/lib/product-gallery";
import {
  matchesProductType,
  type ProductTypeOption
} from "@/lib/product-taxonomy";
import type {
  Product,
  ProductVariant,
  ProductVariantImage
} from "@/lib/types";

export type KaosEditorialProductLink = {
  product: Product;
  imageUrl: string;
  imageAlt: string;
};

export type KaosColorDiscoveryItem = {
  name: string;
  slug: string;
  hex: string | null;
  imageUrl: string;
  imageAlt: string;
  productSlug: string;
  stock: number;
};

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isActiveProduct(product: Product) {
  return product.status_aktif !== false
    && product.status !== "draft"
    && product.status !== "archived";
}

function isActiveVariant(variant: ProductVariant) {
  return variant.is_active !== false
    && variant.status !== "inactive"
    && variant.status !== "out_of_stock";
}

function variantImageByRole(
  variant: ProductVariant,
  roles: Array<ProductVariantImage["image_role"]>
) {
  return [...(variant.variant_images || [])]
    .filter((image) => Boolean(image.image_url) && roles.includes(image.image_role))
    .sort((left, right) => {
      if (left.is_cover !== right.is_cover) return left.is_cover ? -1 : 1;
      return Number(left.sort_order || 0) - Number(right.sort_order || 0);
    })[0]?.image_url || "";
}

export function canonicalProductPrimaryImage(product: Product) {
  const rootImage = getCanonicalProductGalleryImages(product)[0];
  if (rootImage) return rootImage;

  return [...(product.variants || [])]
    .filter(isActiveVariant)
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
    .map((variant) =>
      variantImageByRole(variant, ["front"])
      || getVariantGalleryImages(variant)[0]
      || ""
    )
    .find(Boolean) || "";
}

export function canonicalProductEditorialImage(product: Product) {
  const variantEditorial = [...(product.variants || [])]
    .filter(isActiveVariant)
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
    .map((variant) =>
      variantImageByRole(variant, ["lifestyle", "detail", "back"])
      || getVariantGalleryImages(variant)[1]
      || ""
    )
    .find(Boolean);
  if (variantEditorial) return variantEditorial;

  return getCanonicalProductGalleryImages(product)[1] || "";
}

export function kaosEditorialProducts(products: Product[]) {
  return uniqueCatalogProducts(products)
    .filter(isActiveProduct)
    .filter((product) => Boolean(canonicalProductPrimaryImage(product)))
    .sort((left, right) =>
      Number(left.urutan || 0) - Number(right.urutan || 0)
      || String(left.id || left.slug || left.nama).localeCompare(
        String(right.id || right.slug || right.nama),
        "id"
      )
    );
}

export function kaosFeaturedProducts(
  products: Product[],
  limit = 2
): KaosEditorialProductLink[] {
  return kaosEditorialProducts(products)
    .sort((left, right) =>
      Number(Boolean(right.featured)) - Number(Boolean(left.featured))
      || Number(left.urutan || 0) - Number(right.urutan || 0)
    )
    .slice(0, limit)
    .map((product) => ({
      product,
      imageUrl: canonicalProductPrimaryImage(product),
      imageAlt: product.image_alt || product.nama
    }));
}

export function kaosNeedDiscovery(
  products: Product[],
  options: ProductTypeOption[],
  limit = 3
) {
  const selected: Array<{
    option: ProductTypeOption;
    product: Product;
    imageUrl: string;
  }> = [];
  const claimedProducts = new Set<string>();

  for (const option of options) {
    const product = kaosEditorialProducts(products).find((candidate) => {
      const key = candidate.id || candidate.slug || candidate.nama;
      return !claimedProducts.has(key)
        && matchesProductType(candidate, option.value, options);
    });
    if (!product) continue;

    claimedProducts.add(product.id || product.slug || product.nama);
    selected.push({
      option,
      product,
      imageUrl: canonicalProductPrimaryImage(product)
    });
    if (selected.length === limit) break;
  }

  return selected;
}

function variantStock(variant: ProductVariant) {
  return (variant.sizes || [])
    .filter((size) => size.is_active !== false && size.status !== "inactive")
    .reduce(
      (total, size) => total + Math.max(0, Number(size.stock_quantity ?? size.stock ?? 0)),
      0
    );
}

export function kaosColorDiscovery(
  products: Product[],
  limit = 8
): KaosColorDiscoveryItem[] {
  const colors = new Map<string, {
    item: KaosColorDiscoveryItem;
    representativeStock: number;
    productIds: Set<string>;
    merchandisingPriority: number;
  }>();

  kaosEditorialProducts(products).forEach((product) => {
    [...(product.variants || [])]
      .filter(isActiveVariant)
      .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
      .forEach((variant) => {
        const name = (
          variant.color_name
          || variant.variant_name
          || variant.name
          || ""
        ).trim();
        const slug = normalizeKey(name);
        const imageUrl = variantImageByRole(variant, ["front"])
          || getVariantGalleryImages(variant)[0]
          || "";
        const stock = variantStock(variant);
        if (!name || !slug || !imageUrl || stock <= 0) return;

        const candidate: KaosColorDiscoveryItem = {
          name,
          slug,
          hex: variant.hex_code || variant.color_hex || null,
          imageUrl,
          imageAlt: `${product.nama} warna ${name}`,
          productSlug: product.slug || "",
          stock
        };
        const current = colors.get(slug);
        const productId = product.id || product.slug || product.nama;
        const merchandisingPriority = Number(product.urutan || 0);
        if (!current) {
          colors.set(slug, {
            item: candidate,
            representativeStock: stock,
            productIds: new Set([productId]),
            merchandisingPriority
          });
          return;
        }

        const aggregateStock = current.item.stock + stock;
        const previousPriority = current.merchandisingPriority;
        current.item.stock = aggregateStock;
        current.productIds.add(productId);
        current.merchandisingPriority = Math.min(
          current.merchandisingPriority,
          merchandisingPriority
        );
        if (
          stock > current.representativeStock
          || (
            stock === current.representativeStock
            && merchandisingPriority < previousPriority
          )
        ) {
          current.item = {
            ...candidate,
            stock: aggregateStock
          };
          current.representativeStock = stock;
        }
      });
  });

  return Array.from(colors.values())
    .sort((left, right) =>
      right.item.stock - left.item.stock
      || right.productIds.size - left.productIds.size
      || left.merchandisingPriority - right.merchandisingPriority
      || left.item.name.localeCompare(right.item.name, "id")
    )
    .slice(0, limit)
    .map(({ item }) => item);
}
