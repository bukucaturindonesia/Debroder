import type { CurrencyCode, LocaleCode } from "./core";
import { CONTRACT_VERSIONS } from "./version";

export type PageLinkViewModel = {
  label: string;
  href: string;
  external?: boolean;
};

export type PageImageViewModel = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  objectPosition?: string;
};

export type PageMoneyViewModel = {
  currency: CurrencyCode;
  amount: number;
  formatted: string;
  prefix?: string;
};

export type PageMetadataViewModel = {
  title: string;
  description?: string;
  canonicalPath?: string;
  robots?: "index_follow" | "noindex_follow" | "noindex_nofollow";
  socialImage?: PageImageViewModel;
};

export type PageBreadcrumbViewModel = {
  label: string;
  href?: string;
};

export type PagePaginationViewModel = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type PageViewModel<TPageKey extends string, TData> = {
  contractVersion: typeof CONTRACT_VERSIONS.pageViewModel;
  pageKey: TPageKey;
  locale: LocaleCode;
  metadata: PageMetadataViewModel;
  breadcrumbs: readonly PageBreadcrumbViewModel[];
  data: TData;
};
