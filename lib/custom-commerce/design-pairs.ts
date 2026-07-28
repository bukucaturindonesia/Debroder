import type {
  CustomCategoryCatalog,
  CustomDesignService,
  CustomPricingLine,
  CustomProjectItem,
  CustomProjectSnapshot,
  CustomServiceCompatibility
} from "@/lib/custom-commerce/types";

export type CompleteCustomDesignPair = CustomDesignService & {
  placementId: string;
  printSizeId: string;
};

export function isCompleteCustomDesignPair(
  selection: Pick<CustomDesignService, "placementId" | "printSizeId">
): selection is CompleteCustomDesignPair {
  return Boolean(selection.placementId && selection.printSizeId);
}

export function isEmptyCustomDesignPair(
  selection: Pick<CustomDesignService, "placementId" | "printSizeId">
) {
  return selection.placementId === null && selection.printSizeId === null;
}

export function scopedCustomCompatibilityRules(
  catalog: CustomCategoryCatalog,
  serviceId: string,
  productId: string,
  categoryId: string
): CustomServiceCompatibility[] {
  const matching = catalog.compatibility.filter((rule) =>
    rule.serviceId === serviceId
    && (rule.productId === null || rule.productId === productId)
    && (rule.categoryId === null || rule.categoryId === categoryId)
  );
  const maximumScope = matching.reduce((maximum, rule) => Math.max(
    maximum,
    (rule.productId === productId ? 2 : 0) + (rule.categoryId === categoryId ? 1 : 0)
  ), -1);
  const scoped = matching.filter((rule) => (
    (rule.productId === productId ? 2 : 0) + (rule.categoryId === categoryId ? 1 : 0)
  ) === maximumScope);
  const exactPairs = scoped.filter((rule) => rule.placementId !== null && rule.printSizeId !== null);
  if (exactPairs.length) return exactPairs;
  const constrainedRules = scoped.filter((rule) => rule.placementId !== null || rule.printSizeId !== null);
  return constrainedRules.length ? constrainedRules : scoped;
}

export function isCustomDesignPairCompatible(
  catalog: CustomCategoryCatalog,
  serviceId: string,
  productId: string,
  categoryId: string,
  placementId: string | null,
  printSizeId: string | null
) {
  if (!placementId || !printSizeId) return false;
  const rules = scopedCustomCompatibilityRules(
    catalog,
    serviceId,
    productId,
    categoryId
  );
  const exactPairs = rules.filter((rule) =>
    rule.placementId !== null && rule.printSizeId !== null
  );
  if (exactPairs.length) {
    return exactPairs.some((rule) =>
      rule.placementId === placementId && rule.printSizeId === printSizeId
    );
  }

  const placementRules = rules.filter((rule) => rule.placementId !== null);
  const printSizeRules = rules.filter((rule) => rule.printSizeId !== null);
  const placementAllowed = placementRules.length === 0
    || placementRules.some((rule) => rule.placementId === placementId);
  const printSizeAllowed = printSizeRules.length === 0
    || printSizeRules.some((rule) => rule.printSizeId === printSizeId);
  return placementAllowed && printSizeAllowed;
}

export function compatibleCustomPlacements(
  catalog: CustomCategoryCatalog,
  serviceId: string,
  productId: string,
  categoryId: string
) {
  return catalog.placements.filter((placement) =>
    catalog.printSizes.some((printSize) => isCustomDesignPairCompatible(
      catalog,
      serviceId,
      productId,
      categoryId,
      placement.id,
      printSize.id
    ))
  );
}

export function compatibleCustomPrintSizes(
  catalog: CustomCategoryCatalog,
  serviceId: string,
  productId: string,
  categoryId: string,
  placementId: string | null
) {
  if (!placementId) return [];
  return catalog.printSizes.filter((printSize) => isCustomDesignPairCompatible(
    catalog,
    serviceId,
    productId,
    categoryId,
    placementId,
    printSize.id
  ));
}

export function changeCustomDesignPairPlacement(
  selection: CustomDesignService,
  nextPlacementId: string | null,
  catalog: CustomCategoryCatalog,
  productId: string,
  categoryId: string
): CustomDesignService {
  if (!nextPlacementId) {
    return { ...selection, placementId: null, printSizeId: null };
  }
  const preserveCurrentSize = selection.printSizeId !== null
    && isCustomDesignPairCompatible(
      catalog,
      selection.serviceId,
      productId,
      categoryId,
      nextPlacementId,
      selection.printSizeId
    );
  return {
    ...selection,
    placementId: nextPlacementId,
    printSizeId: preserveCurrentSize ? selection.printSizeId : null
  };
}

export function removeCustomDesignPairFromItem(
  item: CustomProjectItem,
  designPackageId: string,
  selectionId: string
): CustomProjectItem {
  const removedSelection = item.designPackages
    .find((designPackage) => designPackage.id === designPackageId)
    ?.services.find((selection) => selection.id === selectionId);
  if (!removedSelection) return item;

  const designPackages = item.designPackages.map((designPackage) =>
    designPackage.id === designPackageId
      ? {
          ...designPackage,
          services: designPackage.services.filter((selection) => selection.id !== selectionId)
        }
      : designPackage
  );
  const retainedUploadIds = new Set(
    designPackages.flatMap((designPackage) =>
      designPackage.services.flatMap((selection) => selection.uploadIds)
    )
  );
  const removedUploadIds = new Set(removedSelection.uploadIds);
  return {
    ...item,
    designPackages,
    uploads: item.uploads.filter((upload) =>
      !removedUploadIds.has(upload.id) || retainedUploadIds.has(upload.id)
    )
  };
}

export function removeCustomDesignPackageFromItem(
  item: CustomProjectItem,
  designPackageId: string
): CustomProjectItem {
  const designPackage = item.designPackages.find((candidate) => candidate.id === designPackageId);
  if (!designPackage) return item;
  const withoutPairAssociations = designPackage.services.reduce(
    (current, selection) => removeCustomDesignPairFromItem(current, designPackageId, selection.id),
    item
  );
  return {
    ...withoutPairAssociations,
    designPackages: withoutPairAssociations.designPackages.filter((candidate) => candidate.id !== designPackageId),
    allocations: withoutPairAssociations.allocations.map((allocation) =>
      allocation.designPackageId === designPackageId
        ? { ...allocation, designPackageId: null }
        : allocation
    )
  };
}


export function customDesignPairPricingIntegrityIssue(
  project: Pick<CustomProjectSnapshot, "items" | "pricing">
): string | null {
  const selections = project.items.flatMap((item) =>
    item.designPackages.flatMap((designPackage) => designPackage.services)
  );
  if (project.pricing.lines.some((line) =>
    line.kind === "placement" || line.componentType === "placement"
  )) {
    return "Snapshot harga masih memuat surcharge Posisi Desain.";
  }

  const designLines = project.pricing.lines.filter((line) =>
    line.kind === "print_size" || line.componentType === "print_size"
  );
  if (designLines.length !== selections.length) {
    return "Jumlah line Size Desain tidak sesuai dengan pasangan konfigurasi.";
  }

  for (const selection of selections) {
    if (!isCompleteCustomDesignPair(selection)) {
      return "Posisi Desain dan Size Desain harus lengkap sebelum harga digunakan.";
    }
    const line = designLines.find((candidate) =>
      candidate.selectionId === selection.id
      || candidate.key === `print-size:${selection.id}`
    );
    if (!line) {
      return `Line harga untuk pasangan ${selection.id} tidak tersedia.`;
    }
    if (
      line.serviceId !== selection.serviceId
      || line.placementId !== selection.placementId
      || line.printSizeId !== selection.printSizeId
    ) {
      return `Line harga untuk pasangan ${selection.id} tidak sesuai konfigurasi.`;
    }
  }
  return null;
}

export function findCustomDesignPairPricingLine(
  lines: readonly CustomPricingLine[],
  selection: Pick<CustomDesignService, "id" | "serviceId" | "placementId" | "printSizeId">
) {
  const exactIdentity = lines.find((line) =>
    line.selectionId === selection.id
    || line.key === `print-size:${selection.id}`
  );
  if (exactIdentity) return exactIdentity;

  const legacyExactPair = lines.find((line) =>
    line.kind === "print_size"
    && line.serviceId === selection.serviceId
    && line.placementId === selection.placementId
    && line.printSizeId === selection.printSizeId
  );
  if (legacyExactPair) return legacyExactPair;

  return lines.find((line) =>
    line.kind === "service"
    && line.serviceId === selection.serviceId
    && line.placementId === selection.placementId
    && line.printSizeId === selection.printSizeId
  );
}
