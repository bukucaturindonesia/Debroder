import type { PimProduct as Product, ValidationIssue } from "@/lib/types";
import { getVariantThumbnail } from "@/lib/product-utils";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validatePublishProduct(product: Product): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!product.name.trim()) {
    issues.push(error("name", "Nama produk wajib diisi."));
  }

  if (!SLUG_PATTERN.test(product.slug)) {
    issues.push(error("slug", "Slug wajib unik dan memakai huruf kecil/kebab-case."));
  }

  if (!product.productCategoryId) {
    issues.push(error("product_category_id", "Kategori utama wajib dipilih."));
  }

  if (!Number.isInteger(product.basePrice) || product.basePrice < 0) {
    issues.push(error("base_price", "Harga dasar wajib berupa integer positif."));
  }

  validatePriceTiers(product, issues);
  validateMinimumRule(product, issues);

  const activeVariants = product.variants.filter(
    (variant) => variant.status === "active"
  );

  if (activeVariants.length === 0) {
    issues.push(error("variants", "Minimal satu warna aktif wajib tersedia."));
  }

  const defaultCount = product.variants.filter((variant) => variant.isDefault).length;
  if (defaultCount > 1) {
    issues.push(error("variants.default", "Hanya satu warna boleh menjadi default."));
  }

  const variantSkus = new Set<string>();
  const sellableSkus = new Set<string>();

  for (const variant of product.variants) {
    if (!variant.name.trim()) {
      issues.push(error(`variant.${variant.id}.name`, "Nama warna wajib diisi."));
    }

    if (!SLUG_PATTERN.test(variant.slug)) {
      issues.push(
        error(`variant.${variant.id}.slug`, "Slug warna wajib kebab-case.")
      );
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(variant.hexCode)) {
      issues.push(
        error(`variant.${variant.id}.hex_code`, "HEX warna wajib format #RRGGBB.")
      );
    }

    const variantSku = variant.sku.trim();
    if (variantSku) {
      if (variantSkus.has(variantSku)) {
        issues.push(error(`variant.${variant.id}.sku`, "SKU induk varian duplikat."));
      }
      variantSkus.add(variantSku);
    }

    const hasFrontImage = variant.images.some(
      (image) => image.imageRole === "front" && image.imageUrl.trim().length > 0
    );
    if (variant.status === "active" && (!hasFrontImage || !getVariantThumbnail(variant))) {
      issues.push(
        error(`variant.${variant.id}.images`, "Warna aktif wajib memiliki gambar front.")
      );
    }

    if (variant.status === "active" && variant.sizes.length === 0) {
      issues.push(
        error(`variant.${variant.id}.sizes`, "Warna aktif wajib memiliki ukuran.")
      );
    }

    for (const variantSize of variant.sizes) {
      if (!variantSize.sku.trim()) {
        issues.push(error(`variant_size.${variantSize.id}.sku`, "Sellable SKU wajib diisi."));
      }
      if (!variantSize.sizeId) {
        issues.push(error(`variant_size.${variantSize.id}.size_id`, "Ukuran wajib memakai size master."));
      }
      if (variantSize.sku && sellableSkus.has(variantSize.sku)) {
        issues.push(
          error(`variant_size.${variantSize.id}.sku`, "Sellable SKU duplikat.")
        );
      }
      if (variantSize.sku) sellableSkus.add(variantSize.sku);

      if (!Number.isInteger(variantSize.stockQuantity) || variantSize.stockQuantity < 0) {
        issues.push(
          error(
            `variant_size.${variantSize.id}.stock_quantity`,
            "Stok wajib integer dan tidak boleh negatif."
          )
        );
      }
    }
  }

  return issues;
}

function validatePriceTiers(product: Product, issues: ValidationIssue[]) {
  const activeTiers = (product.priceTiers ?? [])
    .filter((tier) => tier.status === "active")
    .sort((a, b) => a.minQuantity - b.minQuantity);

  for (const tier of product.priceTiers ?? []) {
    if (!Number.isInteger(tier.minQuantity) || tier.minQuantity < 1) {
      issues.push(error(`tier.${tier.id}.min`, "Minimum tier wajib integer positif."));
    }

    if (
      tier.maxQuantity !== null &&
      (!Number.isInteger(tier.maxQuantity) || tier.maxQuantity < tier.minQuantity)
    ) {
      issues.push(error(`tier.${tier.id}.max`, "Maksimum tier wajib >= minimum."));
    }

    if (
      !tier.quoteRequired &&
      (tier.unitPrice === null ||
        !Number.isInteger(tier.unitPrice) ||
        tier.unitPrice < 0)
    ) {
      issues.push(
        error(`tier.${tier.id}.unit_price`, "Harga tier wajib diisi atau jadikan quotation.")
      );
    }
  }

  for (let index = 1; index < activeTiers.length; index += 1) {
    const previous = activeTiers[index - 1];
    const current = activeTiers[index];
    if (!previous || !current) {
      continue;
    }

    const previousMax = previous.maxQuantity ?? Number.MAX_SAFE_INTEGER;
    if (current.minQuantity <= previousMax) {
      issues.push(error(`tier.${current.id}.range`, "Rentang tier tidak boleh overlap."));
    }
  }
}

function validateMinimumRule(product: Product, issues: ValidationIssue[]) {
  const rule = product.minimumRule;
  if (!rule || rule.status !== "active") {
    return;
  }

  if (!Number.isInteger(rule.minimumQuantity) || rule.minimumQuantity < 1) {
    issues.push(error("minimum_rule.minimum_quantity", "Minimum order wajib positif."));
  }

  if (
    rule.minimumForTierQuantity !== null &&
    (!Number.isInteger(rule.minimumForTierQuantity) ||
      rule.minimumForTierQuantity < 1)
  ) {
    issues.push(
      error("minimum_rule.minimum_for_tier", "Minimum tier wajib positif.")
    );
  }

  if (
    rule.quotationQuantity !== null &&
    (!Number.isInteger(rule.quotationQuantity) || rule.quotationQuantity < 1)
  ) {
    issues.push(error("minimum_rule.quotation", "Quantity quotation wajib positif."));
  }
}

function error(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
}
