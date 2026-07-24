import { buildProductDetailPageModel, buildUnavailableProductDetailPageModel } from "./domain";
import type { ProductDetailPageModel } from "./model";
import type { ProductDetailPageSource } from "./source";

export type ReadProductDetailPageSource = (slug: string) => Promise<ProductDetailPageSource>;

export async function loadProductDetailPageModel(
  slug: string,
  readSource: ReadProductDetailPageSource
): Promise<ProductDetailPageModel> {
  try {
    return buildProductDetailPageModel(slug, await readSource(slug));
  } catch {
    return buildUnavailableProductDetailPageModel(slug);
  }
}
