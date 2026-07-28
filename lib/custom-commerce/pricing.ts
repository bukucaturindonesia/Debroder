import { calculateTieredUnitPrice } from "@/lib/bulk-ordering";
import type { CustomService, PimProduct, PimProductVariant, PimProductVariantSize } from "@/lib/types";
import type {
  CustomCategoryCatalog,
  CustomDesignPackage,
  CustomPriceStatus,
  CustomPricingLine,
  CustomProject,
  CustomProjectPricing
} from "@/lib/custom-commerce/types";
import {
  isCompleteCustomDesignPair,
  isCustomDesignPairCompatible
} from "@/lib/custom-commerce/design-pairs";
import { canonicalCustomDesignPairIssues } from "@/lib/custom-commerce/validation";

export function priceCustomProject(
  project: CustomProject,
  catalogs: CustomCategoryCatalog[],
  pricedAt = new Date().toISOString()
): CustomProjectPricing {
  const issues: string[] = canonicalCustomDesignPairIssues(project);
  const lines: CustomPricingLine[] = [];
  let finalTotal = 0;
  let status: CustomPriceStatus = "final";
  let totalQuantity = 0;

  const productTotals = new Map<string, number>();
  for (const item of project.items) {
    const itemQuantity = item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
    totalQuantity += itemQuantity;
    productTotals.set(item.productId, (productTotals.get(item.productId) ?? 0) + itemQuantity);
  }

  for (const item of project.items) {
    const catalog = catalogs.find((candidate) => candidate.category.id === item.categoryId);
    if (!catalog || catalog.category.slug !== item.categorySlug || !catalog.category.leadTimeDisplay) {
      issues.push(`Kategori untuk ${item.productName} tidak lagi tersedia.`);
      continue;
    }

    const displayMode = project.presetId
      ? catalog.presets.find((preset) => preset.id === project.presetId)?.priceDisplayMode ?? catalog.category.priceDisplayMode
      : catalog.category.priceDisplayMode;
    if (displayMode !== "final") status = "quotation_required";

    const product = catalog.products.find((candidate) => candidate.id === item.productId);
    if (!product || product.slug !== item.productSlug || product.status !== "active") {
      issues.push(`Produk ${item.productName} tidak lagi aktif.`);
      continue;
    }
    if (!Number.isSafeInteger(product.basePrice) || product.basePrice <= 0) {
      issues.push(`Harga dasar PIM untuk ${product.name} belum valid. Produk tidak dapat diproses.`);
      continue;
    }

    const productQuantity = productTotals.get(product.id) ?? 0;
    if (product.minimumRule?.status === "active" && productQuantity < product.minimumRule.minimumQuantity) {
      issues.push(`Minimum ${product.name} adalah ${product.minimumRule.minimumQuantity} pcs.`);
    }
    if (product.minimumRule?.quotationQuantity && productQuantity >= product.minimumRule.quotationQuantity) {
      status = "quotation_required";
    }

    const packageById = new Map(item.designPackages.map((designPackage) => [designPackage.id, designPackage]));
    for (const allocation of item.allocations) {
      const resolved = resolveVariant(product, allocation.variantId, allocation.variantSizeId);
      if (!resolved || resolved.variant.status !== "active" || resolved.variantSize.status !== "active" || resolved.variantSize.size.status !== "active") {
        issues.push(`Kombinasi ${allocation.variantName} ${allocation.sizeName} tidak lagi aktif.`);
        continue;
      }
      if (resolved.variantSize.sku !== allocation.sku) {
        issues.push(`SKU ${allocation.sku} sudah berubah. Muat ulang konfigurasi.`);
        continue;
      }

      const unitPrice = calculateTieredUnitPrice(product, resolved.variant, resolved.variantSize, productQuantity);
      const activeTier = activeProductTier(product, productQuantity);
      if (activeTier?.quoteRequired || activeTier?.unitPrice === null) status = "quotation_required";
      if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0) {
        issues.push(`Harga PIM untuk ${product.name} · ${resolved.variant.name} · ${resolved.variantSize.size.name} tidak valid.`);
        continue;
      }

      const productSubtotal = unitPrice * allocation.quantity;
      finalTotal += productSubtotal;
      lines.push({
        key: `product:${item.id}:${allocation.id}`,
        label: `${product.name} · ${resolved.variant.name} · ${resolved.variantSize.size.name}`,
        displayLabel: `${product.name} · ${resolved.variant.name} · ${resolved.variantSize.size.name}`,
        quantity: allocation.quantity,
        unitPrice,
        subtotal: productSubtotal,
        kind: "product",
        componentType: "product_base",
        sourceRuleId: activeTier?.id ?? `pim-variant-size:${resolved.variantSize.id}`,
        calculationBasis: "pim_tier",
        allocationId: allocation.id,
        productId: product.id,
        variantId: resolved.variant.id,
        variantSizeId: resolved.variantSize.id,
        sku: resolved.variantSize.sku
      });

      const designPackage = allocation.designPackageId ? packageById.get(allocation.designPackageId) : undefined;
      if (allocation.designPackageId && !designPackage) {
        issues.push(`Paket desain pada ${allocation.sku} tidak valid.`);
      }
    }

    for (const designPackage of item.designPackages) {
      const assignedAllocations = item.allocations.filter((allocation) => allocation.designPackageId === designPackage.id);
      const assignedQuantity = assignedAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      if (!assignedQuantity) {
        if (designPackage.services.length) {
          issues.push(`${designPackage.name} memiliki layanan terpilih tetapi belum dialokasikan ke varian mana pun.`);
        }
        continue;
      }

      const result = priceDesignPackage(
        designPackage,
        assignedQuantity,
        item.productId,
        catalog,
        item.uploads.map((upload) => upload.id)
      );
      issues.push(...result.issues);
      lines.push(...result.lines.map((line) => ({ ...line, designPackageId: designPackage.id })));
      finalTotal += result.finalTotal;
      status = combineStatus(status, result.status);
    }

    const personalizationQuantity = item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
    if (item.personalization.ruleId) {
      const rule = catalog.personalizationRules.find((candidate) => candidate.id === item.personalization.ruleId);
      if (!rule) {
        issues.push(`Aturan personalisasi ${item.productName} tidak lagi aktif.`);
      } else {
        if (item.personalization.mode === "same_for_all" && !item.personalization.sharedValue) {
          issues.push(`Isi personalisasi ${item.productName} wajib dilengkapi.`);
        }
        if (item.personalization.mode === "per_item" && (
          item.personalization.entries.length !== personalizationQuantity
          || item.personalization.entries.some((entry) => !entry)
        )) {
          issues.push(`Personalisasi per item ${item.productName} harus berjumlah ${personalizationQuantity}.`);
        }
        const result = pricePersonalization(rule, personalizationQuantity, item.id);
        issues.push(...result.issues);
        lines.push(result.line);
        finalTotal += result.finalTotal;
        status = combineStatus(status, result.status);
      }
    }
  }

  if (issues.length) status = "quotation_required";
  return {
    projectId: project.id,
    status,
    totalQuantity,
    finalTotal: status === "final" ? finalTotal : null,
    estimatedMinTotal: null,
    estimatedMaxTotal: null,
    lines,
    issues,
    pricedAt
  };
}

export function toPublicCustomPricing(pricing: CustomProjectPricing): CustomProjectPricing {
  if (pricing.status === "final") return pricing;
  return {
    ...pricing,
    finalTotal: null,
    estimatedMinTotal: null,
    estimatedMaxTotal: null,
    lines: pricing.lines.map((line) => ({
      ...line,
      unitPrice: null,
      subtotal: null,
      calculationBasis: "quotation"
    }))
  };
}

function priceDesignPackage(
  designPackage: CustomDesignPackage,
  quantity: number,
  productId: string,
  catalog: CustomCategoryCatalog,
  itemUploadIds: string[]
) {
  const issues: string[] = [];
  const lines: CustomPricingLine[] = [];
  let finalTotal = 0;
  let status: CustomPriceStatus = "final";
  const selectedServices: CustomService[] = [];

  for (const selection of designPackage.services) {
    const service = catalog.services.find((candidate) =>
      candidate.id === selection.serviceId && candidate.status === "active"
    );
    if (!service) {
      issues.push(`Layanan pada ${designPackage.name} tidak lagi tersedia.`);
      continue;
    }

    const placement = selection.placementId
      ? catalog.placements.find((candidate) => candidate.id === selection.placementId)
      : null;
    const printSize = selection.printSizeId
      ? catalog.printSizes.find((candidate) => candidate.id === selection.printSizeId)
      : null;

    if (!isCompleteCustomDesignPair(selection)) {
      if (placement && !selection.printSizeId) {
        issues.push(`Pilih Size Desain untuk posisi ${placement.name}.`);
      } else if (!selection.placementId && printSize) {
        issues.push(`Pilih Posisi Desain untuk Size Desain ${printSize.name}.`);
      } else {
        issues.push("Pilih minimal satu Posisi Desain dan Size Desain.");
      }
      continue;
    }
    if (!placement) {
      issues.push(`Posisi Desain untuk ${service.name} tidak valid.`);
      continue;
    }
    if (!printSize) {
      issues.push(`Size Desain untuk posisi ${placement.name} tidak valid.`);
      continue;
    }
    if (!isCustomDesignPairCompatible(
      catalog,
      service.id,
      productId,
      catalog.category.id,
      placement.id,
      printSize.id
    )) {
      issues.push(`Size Desain ${printSize.name} tidak kompatibel dengan posisi ${placement.name}.`);
      continue;
    }

    selectedServices.push(service);
    if (service.requiresNotes && !selection.note) {
      issues.push(`Catatan untuk ${service.name} wajib diisi.`);
    }
    if (service.requiresUpload && !selection.uploadIds.some((id) => itemUploadIds.includes(id))) {
      issues.push(`File untuk ${service.name} wajib diunggah.`);
    }
    if (quantity < service.minimumQuantity || (service.maximumQuantity !== null && quantity > service.maximumQuantity)) {
      issues.push(`Jumlah ${service.name} tidak memenuhi batas layanan.`);
    }

    const tieredRule = service.pricingType === "tiered"
      ? activeServiceTier(service, quantity)
      : null;
    if (service.pricingType === "tiered" && !tieredRule) {
      issues.push(`Pricing rule ${service.name} tidak tersedia untuk ${quantity} pcs.`);
      continue;
    }

    const requiresQuotation = service.requiresReview
      || service.pricingType === "estimated"
      || service.pricingType === "manual_quote"
      || Boolean(tieredRule?.quoteRequired);
    const displayLabel = `${service.name} · ${placement.name} — Size Desain ${printSize.name}`;
    if (requiresQuotation) {
      status = "quotation_required";
      lines.push({
        key: `print-size:${selection.id}`,
        label: displayLabel,
        displayLabel,
        quantity,
        unitPrice: null,
        subtotal: null,
        kind: "print_size",
        componentType: "print_size",
        sourceRuleId: `print-size:${printSize.id}`,
        calculationBasis: "quotation",
        serviceId: service.id,
        serviceSlug: service.slug,
        serviceName: service.name,
        pricingRuleId: tieredRule?.id,
        selectionId: selection.id,
        placementId: placement.id,
        placementName: placement.name,
        printSizeId: printSize.id,
        printSizeName: printSize.name
      });
      continue;
    }

    if (!Number.isSafeInteger(printSize.priceAdjustment) || printSize.priceAdjustment < 0) {
      issues.push(`Adjustment Size Desain ${printSize.name} belum dikonfigurasi dengan valid.`);
      continue;
    }
    const subtotal = printSize.priceAdjustment * quantity;
    finalTotal += subtotal;
    lines.push({
      key: `print-size:${selection.id}`,
      label: displayLabel,
      displayLabel,
      quantity,
      unitPrice: printSize.priceAdjustment,
      subtotal,
      kind: "print_size",
      componentType: "print_size",
      sourceRuleId: `print-size:${printSize.id}`,
      calculationBasis: "per_item",
      serviceId: service.id,
      serviceSlug: service.slug,
      serviceName: service.name,
      pricingRuleId: tieredRule?.id,
      selectionId: selection.id,
      placementId: placement.id,
      placementName: placement.name,
      printSizeId: printSize.id,
      printSizeName: printSize.name
    });
  }

  const uniqueServices = Array.from(
    new Map(selectedServices.map((service) => [service.id, service])).values()
  );
  const exclusiveGroups = uniqueServices
    .map((service) => service.exclusiveGroup)
    .filter(Boolean);
  if (new Set(exclusiveGroups).size !== exclusiveGroups.length) {
    issues.push(`Ada layanan eksklusif yang bertabrakan di ${designPackage.name}.`);
  }
  if (uniqueServices.length > 1 && uniqueServices.some((service) => !service.isStackable)) {
    issues.push(`Ada layanan yang tidak dapat digabung di ${designPackage.name}.`);
  }
  return { issues, lines, finalTotal, status };
}

function pricePersonalization(
  rule: CustomCategoryCatalog["personalizationRules"][number],
  quantity: number,
  itemId: string
) {
  const requiresQuotation = rule.quoteRequired
    || rule.pricingType === "manual_quote"
    || rule.pricingType === "estimated";
  const unitPrice = rule.pricingType === "fixed_per_item" ? rule.unitPrice : null;
  const finalTotal = requiresQuotation
    ? 0
    : rule.pricingType === "fixed_per_item"
      ? (rule.unitPrice ?? 0) * quantity
      : rule.flatPrice ?? 0;
  const issues: string[] = [];
  if (!requiresQuotation && (!Number.isSafeInteger(finalTotal) || finalTotal < 0)) {
    issues.push(`Harga personalisasi ${rule.name} belum dikonfigurasi dengan valid.`);
  }
  return {
    issues,
    status: requiresQuotation ? "quotation_required" as const : "final" as const,
    finalTotal,
    line: {
      key: `personalization:${itemId}:${rule.id}`,
      label: rule.name,
      displayLabel: rule.name,
      quantity,
      unitPrice: requiresQuotation ? null : unitPrice,
      subtotal: requiresQuotation ? null : finalTotal,
      kind: "personalization" as const,
      componentType: "personalization" as const,
      sourceRuleId: `personalization:${rule.id}`,
      calculationBasis: requiresQuotation
        ? "quotation" as const
        : rule.pricingType === "fixed_per_order"
          ? "per_order" as const
          : "per_item" as const
    }
  };
}

function activeServiceTier(service: CustomService, quantity: number) {
  return service.pricingRules
    ?.filter((rule) => rule.status === "active" && quantity >= rule.minQuantity && (rule.maxQuantity === null || quantity <= rule.maxQuantity))
    .sort((left, right) => right.minQuantity - left.minQuantity || left.sortOrder - right.sortOrder)[0] ?? null;
}

function resolveVariant(product: PimProduct, variantId: string, variantSizeId: string): { variant: PimProductVariant; variantSize: PimProductVariantSize } | null {
  const variant = product.variants.find((candidate) => candidate.id === variantId);
  const variantSize = variant?.sizes.find((candidate) => candidate.id === variantSizeId);
  return variant && variantSize ? { variant, variantSize } : null;
}

function activeProductTier(product: PimProduct, quantity: number) {
  return product.priceTiers
    .filter((tier) => tier.status === "active" && quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity))
    .sort((left, right) => right.minQuantity - left.minQuantity)[0] ?? null;
}

function combineStatus(current: CustomPriceStatus, next: CustomPriceStatus): CustomPriceStatus {
  return current === "quotation_required" || next === "quotation_required"
    ? "quotation_required"
    : "final";
}
