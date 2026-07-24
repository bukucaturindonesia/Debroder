import "server-only";

import { cache } from "react";
import { readPublicShellSource } from "./data-access";
import { loadPublicShellPageModel } from "./use-case";

/** Request-local memoization only; the model contains public navigation/contact data. */
export const getPublicShellPageModel = cache(() =>
  loadPublicShellPageModel(readPublicShellSource)
);
