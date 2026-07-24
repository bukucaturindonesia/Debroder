import type { PageLinkViewModel, PageViewModel } from "@/lib/contracts/page-view-model";

export type PublicNavigationColorViewModel = {
  label: string;
  value: string;
};

export type PublicNavigationFacetsViewModel = {
  colors: readonly PublicNavigationColorViewModel[];
  categoryColors: Readonly<{
    "kaos-polos": readonly PublicNavigationColorViewModel[];
    "jaket-hoodie": readonly PublicNavigationColorViewModel[];
  }>;
  categories: readonly PageLinkViewModel[];
  availability: Readonly<{
    readyStock: boolean;
    custom: boolean;
    hybrid: boolean;
  }>;
  collections: Readonly<{
    new: boolean;
    best: boolean;
    popular: boolean;
    promo: boolean;
  }>;
};

export type PublicShellPromoViewModel = {
  message: string;
  actionLabel: string;
  actionHref: string;
};

export type PublicShellHeaderViewModel = {
  navigationFacets: PublicNavigationFacetsViewModel;
  whatsappHref: string;
  promo: PublicShellPromoViewModel;
};

export type PublicShellSocialLinkViewModel = PageLinkViewModel & {
  icon: "instagram" | "whatsapp" | "facebook" | "email";
};

export type PublicShellFooterViewModel = {
  shopLinks: readonly PageLinkViewModel[];
  publicShopLinks: readonly PageLinkViewModel[];
  helpLinks: readonly PageLinkViewModel[];
  companyLinks: readonly PageLinkViewModel[];
  socialLinks: readonly PublicShellSocialLinkViewModel[];
  brandDescription: string;
  copyrightText: string;
  termsLink: PageLinkViewModel;
  privacyLink: PageLinkViewModel;
};

export type PublicShellLoadState = "loading" | "ready" | "empty" | "degraded";

export type PublicShellWarning = {
  code: string;
  source: "products" | "categories" | "contact" | "stores";
};

export type PublicShellPageData = {
  state: PublicShellLoadState;
  header: PublicShellHeaderViewModel;
  footer: PublicShellFooterViewModel;
  warnings: readonly PublicShellWarning[];
};

export type PublicShellPageModel = PageViewModel<"public-shell", PublicShellPageData>;
