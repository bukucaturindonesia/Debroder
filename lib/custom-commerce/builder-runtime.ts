import type {
  CustomCategoryCatalog,
  CustomProject,
  CustomProjectPricing
} from "@/lib/custom-commerce/types";

export function customBuilderHydrationKey(input: {
  catalogs: CustomCategoryCatalog[];
  initialCategoryId: string;
  preselectedProductId?: string | null;
  requestedDraftId?: string | null;
}) {
  const catalogIdentity = input.catalogs
    .flatMap((catalog) => [
      `category:${catalog.category.id}`,
      ...catalog.products.map((product) => `product:${catalog.category.id}:${product.id}`)
    ])
    .sort();

  return JSON.stringify([
    input.requestedDraftId ?? "",
    input.preselectedProductId ?? "",
    input.initialCategoryId,
    catalogIdentity
  ]);
}

export function shouldRunCustomBuilderHydration(previousKey: string | null, nextKey: string) {
  return previousKey !== nextKey;
}

export function customProjectSemanticSignature(project: CustomProject) {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...semanticProject } = project;
  return JSON.stringify(semanticProject);
}

export function shouldReplaceCustomProject(current: CustomProject, next: CustomProject) {
  return customProjectSemanticSignature(current) !== customProjectSemanticSignature(next);
}

export function customPricingSemanticSignature(pricing: CustomProjectPricing | null) {
  if (!pricing) return "";
  const { pricedAt: _pricedAt, ...semanticPricing } = pricing;
  return JSON.stringify(semanticPricing);
}

export function shouldReplaceCustomPricing(
  current: CustomProjectPricing | null,
  next: CustomProjectPricing | null
) {
  return customPricingSemanticSignature(current) !== customPricingSemanticSignature(next);
}
