import "server-only";

import { cache } from "react";
import { readProductDetailPageSource } from "./data-access";
import { loadProductDetailPageModel } from "./use-case";

export const getProductDetailPageModel = cache((slug: string) =>
  loadProductDetailPageModel(slug, readProductDetailPageSource)
);
