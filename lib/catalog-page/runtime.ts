import "server-only";

import { cache } from "react";
import { readCatalogPageSource } from "./data-access";
import type { CatalogPageInput } from "./domain";
import { loadCatalogPageModel } from "./use-case";

const readCachedCatalogSource = cache(readCatalogPageSource);

export function getCatalogPageModel(input: CatalogPageInput) {
  return loadCatalogPageModel(input, readCachedCatalogSource);
}
