import { buildCatalogPageModel, buildUnavailableCatalogPageModel, type CatalogPageInput } from "./domain";
import type { CatalogPageModel } from "./model";
import type { CatalogPageSource } from "./source";

export type ReadCatalogPageSource = (routeKey: string) => Promise<CatalogPageSource>;

export async function loadCatalogPageModel(
  input: CatalogPageInput,
  readSource: ReadCatalogPageSource
): Promise<CatalogPageModel> {
  try {
    return buildCatalogPageModel(await readSource(input.routeKey), input);
  } catch {
    return buildUnavailableCatalogPageModel(input);
  }
}
