import type { ProductLifecycle, ProductManagerCapabilities } from "@/lib/product-manager";

export const PRODUCT_LIBRARY_DEFAULT_PAGE_SIZE = 24;
export const PRODUCT_LIBRARY_MAX_PAGE_SIZE = 100;

export const PRODUCT_LIBRARY_SORTS = [
  "updated_desc",
  "updated_asc",
  "name_asc",
  "name_desc",
  "price_asc",
  "price_desc"
] as const;

export type ProductLibrarySort = (typeof PRODUCT_LIBRARY_SORTS)[number];
export type ProductLibraryStatus = "all" | ProductLifecycle;

export type ProductLibraryQuery = {
  q: string;
  status: ProductLibraryStatus;
  categoryId: string;
  sort: ProductLibrarySort;
  page: number;
  pageSize: number;
};

export type ProductLibraryCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ProductLibraryItem = {
  id: string;
  name: string;
  slug: string;
  status: ProductLifecycle;
  categoryId: string | null;
  categoryName: string;
  basePrice: number;
  sku: string | null;
  imageUrl: string | null;
  variantCount: number;
  sellableCount: number;
  imageCount: number;
  updatedAt: string | null;
};

export type ProductLibraryPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  items: ProductLibraryItem[];
  categories: ProductLibraryCategory[];
  query: ProductLibraryQuery;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function parseProductLibraryQuery(searchParams: URLSearchParams): ProductLibraryQuery {
  return {
    q: safeProductLibrarySearchToken(searchParams.get("q") || ""),
    status: productLibraryStatus(searchParams.get("status")),
    categoryId: safeUuid(searchParams.get("categoryId")),
    sort: productLibrarySort(searchParams.get("sort")),
    page: positiveInteger(searchParams.get("page"), 1),
    pageSize: clamp(
      positiveInteger(searchParams.get("pageSize"), PRODUCT_LIBRARY_DEFAULT_PAGE_SIZE),
      1,
      PRODUCT_LIBRARY_MAX_PAGE_SIZE
    )
  };
}

export function productLibrarySortSpec(sort: ProductLibrarySort) {
  switch (sort) {
    case "updated_asc":
      return { column: "updated_at", ascending: true } as const;
    case "name_asc":
      return { column: "name", ascending: true } as const;
    case "name_desc":
      return { column: "name", ascending: false } as const;
    case "price_asc":
      return { column: "base_price", ascending: true } as const;
    case "price_desc":
      return { column: "base_price", ascending: false } as const;
    default:
      return { column: "updated_at", ascending: false } as const;
  }
}

export function safeProductLibrarySearchToken(value: string) {
  return value
    .replace(/[,().:%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function productLibraryStatus(value: string | null): ProductLibraryStatus {
  if (value === "draft" || value === "active" || value === "archived") return value;
  return "all";
}

function productLibrarySort(value: string | null): ProductLibrarySort {
  return PRODUCT_LIBRARY_SORTS.includes(value as ProductLibrarySort)
    ? value as ProductLibrarySort
    : "updated_desc";
}

function safeUuid(value: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : "";
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
