import { calculateTieredUnitPrice, createServiceAllocation } from "@/lib/bulk-ordering";
import type { CustomService, PimProduct, PimProductVariant, PimProductVariantSize } from "@/lib/types";
import type {
  CustomCategoryCatalog,
  CustomDesignPackage,
  CustomPriceStatus,
  CustomPricingLine,
  CustomProject,
  CustomProjectPricing,
  CustomServiceCompatibility
} from "@/lib/custom-commerce/types";

export function priceCustomProject(
  project: CustomProject,
  catalogs: CustomCategoryCatalog[],
  pricedAt = new Date().toISOString()
): CustomProjectPricing {
  const issues: string[] = [];
  const lines: CustomPricingLine[] = [];
  let finalTotal = 0;
  let estimatedMinTotal = 0;
  let estimatedMaxTotal = 0;
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
    if (displayMode === "quotation") status = "quotation_required";
    else if (displayMode === "estimated") status = combineStatus(status, "estimated");
    const product = catalog.products.find((candidate) => candidate.id === item.productId);
    if (!product || product.slug !== item.productSlug || product.status !== "active") {
      issues.push(`Produk ${item.productName} tidak lagi aktif.`);
      continue;
    }
    if (!Number.isFinite(product.basePrice) || product.basePrice <= 0) {
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
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        issues.push(`Harga PIM untuk ${product.name} · ${resolved.variant.name} · ${resolved.variantSize.size.name} tidak valid.`);
        continue;
      }
      const productSubtotal = unitPrice * allocation.quantity;
      finalTotal += productSubtotal;
      estimatedMinTotal += productSubtotal;
      estimatedMaxTotal += productSubtotal;
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
        continue;
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
      const result = priceDesignPackage(designPackage, assignedQuantity, item.productId, catalog, item.uploads.map((upload) => upload.id));
      issues.push(...result.issues);
      lines.push(...result.lines.map((line) => ({ ...line, designPackageId: designPackage.id })));
      finalTotal += result.finalTotal;
      estimatedMinTotal += result.estimatedMinTotal;
      estimatedMaxTotal += result.estimatedMaxTotal;
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
        if (item.personalization.mode === "per_item" && (item.personalization.entries.length !== personalizationQuantity || item.personalization.entries.some((entry) => !entry))) {
          issues.push(`Personalisasi per item ${item.productName} harus berjumlah ${personalizationQuantity}.`);
        }
        const result = pricePersonalization(rule, personalizationQuantity, item.id);
        issues.push(...result.issues);
        lines.push(result.line);
        finalTotal += result.finalTotal;
        estimatedMinTotal += result.estimatedMinTotal;
        estimatedMaxTotal += result.estimatedMaxTotal;
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
    estimatedMinTotal: status === "estimated" ? estimatedMinTotal : null,
    estimatedMaxTotal: status === "estimated" ? estimatedMaxTotal : null,
    lines,
    issues,
    pricedAt
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
  let estimatedMinTotal = 0;
  let estimatedMaxTotal = 0;
  let status: CustomPriceStatus = "final";
  const selectedServices: CustomService[] = [];
  const semanticComponents = new Set<string>();

  for (const selection of designPackage.services) {
    const service = catalog.services.find((candidate) => candidate.id === selection.serviceId && candidate.status === "active");
    if (!service || !isCompatible(catalog.compatibility, service.id, catalog.category.id, productId, selection.placementId, selection.printSizeId)) {
      issues.push(`Layanan pada ${designPackage.name} tidak kompatibel.`);
      continue;
    }
    selectedServices.push(service);
    if (service.requiresNotes && !selection.note) issues.push(`Catatan untuk ${service.name} wajib diisi.`);
    if (service.requiresUpload && !selection.uploadIds.some((id) => itemUploadIds.includes(id))) issues.push(`File untuk ${service.name} wajib diunggah.`);
    if (quantity < service.minimumQuantity || (service.maximumQuantity !== null && quantity > service.maximumQuantity)) issues.push(`Jumlah ${service.name} tidak memenuhi batas layanan.`);

    const placement = selection.placementId ? catalog.placements.find((candidate) => candidate.id === selection.placementId) : null;
    const printSize = selection.printSizeId ? catalog.printSizes.find((candidate) => candidate.id === selection.printSizeId) : null;
    if (selection.placementId && !placement) issues.push(`Placement ${service.name} tidak valid.`);
    if (selection.printSizeId && !printSize) issues.push(`Ukuran cetak ${service.name} tidak valid.`);
    const printSizeDeterminesPrice = Boolean(printSize && printSize.priceAdjustment > 0);
    const semanticKey = `${service.id}:${printSizeDeterminesPrice ? `print-size:${printSize?.id}` : "method"}:${placement?.id ?? "no-placement"}`;
    if (semanticComponents.has(semanticKey)) {
      issues.push(`Komponen harga ${service.name}${printSize ? ` ${printSize.name}` : ""}${placement ? ` ${placement.name}` : ""} terpilih lebih dari sekali.`);
      continue;
    }
    semanticComponents.add(semanticKey);

    const tieredRule = service.pricingType === "tiered" ? activeServiceTier(service, quantity) : null;
    if (service.pricingType === "tiered" && !tieredRule) {
      issues.push(`Pricing rule ${service.name} tidak tersedia untuk ${quantity} pcs.`);
      lines.push({
        key: `service:${designPackage.id}:${selection.id}`,
        label: `${designPackage.name} · ${service.name}`,
        displayLabel: `${designPackage.name} · ${service.name}`,
        quantity,
        unitPrice: null,
        subtotal: null,
        kind: "service",
        componentType: "method_fee",
        sourceRuleId: `service:${service.id}`,
        calculationBasis: "quotation",
        serviceId: service.id,
        serviceSlug: service.slug,
        serviceName: service.name
      });
      continue;
    }
    if (service.pricingType === "estimated" && !validEstimateRange(service.estimatedMinPrice, service.estimatedMaxPrice)) {
      issues.push(`Rentang estimasi ${service.name} belum dikonfigurasi dengan valid.`);
      continue;
    }
    if (!printSizeDeterminesPrice && (service.pricingType === "fixed_per_item" || service.pricingType === "fixed_per_order") && (!Number.isFinite(service.basePrice) || service.basePrice <= 0) && !service.requiresReview) {
      issues.push(`Harga layanan ${service.name} belum dikonfigurasi dengan valid.`);
      continue;
    }

    const price = createServiceAllocation(service, quantity, selection.note);
    if (service.pricingType === "tiered" && tieredRule && !tieredRule.quoteRequired && tieredRule.unitPrice === null && tieredRule.flatPrice === null) {
      issues.push(`Pricing rule ${service.name} tidak memiliki harga atau status quotation.`);
      continue;
    }
    const serviceFinal = (price.unit_price ?? 0) * price.quantity + (price.flat_price ?? 0);
    const estimateMin = (price.estimated_min_price ?? 0) * price.quantity;
    const estimateMax = (price.estimated_max_price ?? price.estimated_min_price ?? 0) * price.quantity;
    if (price.quote_required && service.pricingType !== "estimated") status = "quotation_required";
    else if (!printSizeDeterminesPrice && service.pricingType === "estimated") status = combineStatus(status, "estimated");
    if (!printSizeDeterminesPrice) {
      finalTotal += serviceFinal;
      estimatedMinTotal += service.pricingType === "estimated" ? estimateMin : serviceFinal;
      estimatedMaxTotal += service.pricingType === "estimated" ? estimateMax : serviceFinal;
    }
    if (!printSizeDeterminesPrice || price.quote_required) {
      lines.push({
        key: `service:${designPackage.id}:${selection.id}`,
        label: `${designPackage.name} · ${service.name}`,
        displayLabel: `${designPackage.name} · ${service.name}`,
        quantity,
        unitPrice: price.unit_price,
        subtotal: service.pricingType === "estimated" ? estimateMin : price.quote_required ? null : serviceFinal,
        kind: "service",
        componentType: "method_fee",
        sourceRuleId: tieredRule?.id ?? `service:${service.id}`,
        calculationBasis: price.quote_required ? "quotation" : service.pricingType === "fixed_per_order" ? "per_order" : service.pricingType === "estimated" ? "estimated" : "per_item",
        serviceId: service.id,
        serviceSlug: service.slug,
        serviceName: service.name,
        pricingRuleId: tieredRule?.id,
        placementId: placement?.id,
        placementName: placement?.name,
        printSizeId: printSize?.id,
        printSizeName: printSize?.name
      });
    }

    if (placement?.priceAdjustment) {
      const subtotal = placement.priceAdjustment * quantity;
      finalTotal += subtotal;
      estimatedMinTotal += subtotal;
      estimatedMaxTotal += subtotal;
      lines.push({ key: `placement:${selection.id}`, label: placement.name, displayLabel: placement.name, quantity, unitPrice: placement.priceAdjustment, subtotal, kind: "placement", componentType: "placement", sourceRuleId: `placement:${placement.id}`, calculationBasis: "per_item", serviceId: service.id, placementId: placement.id, placementName: placement.name });
    }
    if (printSize?.priceAdjustment) {
      const subtotal = printSize.priceAdjustment * quantity;
      finalTotal += subtotal;
      estimatedMinTotal += subtotal;
      estimatedMaxTotal += subtotal;
      const displayLabel = `${service.name} ${printSize.name}${placement ? ` — ${placement.name}` : ""}`;
      lines.push({ key: `print-size:${selection.id}`, label: displayLabel, displayLabel, quantity, unitPrice: printSize.priceAdjustment, subtotal, kind: "print_size", componentType: "print_size", sourceRuleId: `print-size:${printSize.id}`, calculationBasis: "per_item", serviceId: service.id, serviceSlug: service.slug, serviceName: service.name, placementId: placement?.id, placementName: placement?.name, printSizeId: printSize.id, printSizeName: printSize.name });
    }
  }

  const exclusiveGroups = selectedServices.map((service) => service.exclusiveGroup).filter(Boolean);
  if (new Set(exclusiveGroups).size !== exclusiveGroups.length) issues.push(`Ada layanan eksklusif yang bertabrakan di ${designPackage.name}.`);
  if (selectedServices.length > 1 && selectedServices.some((service) => !service.isStackable)) issues.push(`Ada layanan yang tidak dapat digabung di ${designPackage.name}.`);
  return { issues, lines, finalTotal, estimatedMinTotal, estimatedMaxTotal, status };
}

function pricePersonalization(rule: CustomCategoryCatalog["personalizationRules"][number], quantity: number, itemId: string) {
  const issues: string[] = [];
  if (rule.pricingType === "estimated" && !validEstimateRange(rule.estimatedMinPrice, rule.estimatedMaxPrice)) {
    issues.push(`Rentang estimasi ${rule.name} belum dikonfigurasi dengan valid.`);
  }
  const unitPrice = rule.pricingType === "fixed_per_item" ? rule.unitPrice : null;
  const final = rule.pricingType === "fixed_per_item"
    ? (rule.unitPrice ?? 0) * quantity
    : rule.pricingType === "fixed_per_order"
      ? rule.flatPrice ?? 0
      : 0;
  const estimatedMin = rule.pricingType === "estimated" ? (rule.estimatedMinPrice ?? 0) * quantity : final;
  const estimatedMax = rule.pricingType === "estimated" ? (rule.estimatedMaxPrice ?? 0) * quantity : final;
  const status: CustomPriceStatus = rule.quoteRequired || rule.pricingType === "manual_quote"
    ? "quotation_required"
    : rule.pricingType === "estimated"
      ? "estimated"
      : "final";
  return {
    issues,
    status,
    finalTotal: final,
    estimatedMinTotal: estimatedMin,
    estimatedMaxTotal: estimatedMax,
    line: {
      key: `personalization:${itemId}:${rule.id}`,
      label: rule.name,
      displayLabel: rule.name,
      quantity,
      unitPrice,
      subtotal: status === "final" ? final : status === "estimated" ? estimatedMin : null,
      kind: "personalization" as const,
      componentType: "personalization" as const,
      sourceRuleId: `personalization:${rule.id}`,
      calculationBasis: status === "quotation_required" ? "quotation" as const : status === "estimated" ? "estimated" as const : rule.pricingType === "fixed_per_order" ? "per_order" as const : "per_item" as const
    }
  };
}

function activeServiceTier(service: CustomService, quantity: number) {
  return service.pricingRules
    ?.filter((rule) => rule.status === "active" && quantity >= rule.minQuantity && (rule.maxQuantity === null || quantity <= rule.maxQuantity))
    .sort((left, right) => right.minQuantity - left.minQuantity || left.sortOrder - right.sortOrder)[0] ?? null;
}

function validEstimateRange(minimum: number | null, maximum: number | null) {
  return minimum !== null
    && maximum !== null
    && Number.isFinite(minimum)
    && Number.isFinite(maximum)
    && minimum >= 0
    && maximum > 0
    && maximum >= minimum;
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

function isCompatible(
  rules: CustomServiceCompatibility[],
  serviceId: string,
  categoryId: string,
  productId: string,
  placementId: string | null,
  printSizeId: string | null
) {
  return rules.some((rule) =>
    rule.serviceId === serviceId
    && (rule.categoryId === null || rule.categoryId === categoryId)
    && (rule.productId === null || rule.productId === productId)
    && (rule.placementId === null || rule.placementId === placementId)
    && (rule.printSizeId === null || rule.printSizeId === printSizeId)
  );
}

function combineStatus(current: CustomPriceStatus, next: CustomPriceStatus): CustomPriceStatus {
  if (current === "quotation_required" || next === "quotation_required") return "quotation_required";
  if (current === "estimated" || next === "estimated") return "estimated";
  return "final";
}
