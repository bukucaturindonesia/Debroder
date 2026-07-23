import type { PageViewModel } from "@/lib/contracts/page-view-model";
import type { Product } from "@/lib/types";

export type ProductDetailPageState = "loading" | "ready" | "not_found" | "unavailable";

export type ProductDetailFocalViewModel = {
  focal_x: number;
  focal_y: number;
  zoom: number;
  target_ratio: string;
};

export type ProductDetailPageData = {
  state: ProductDetailPageState;
  product: Product | null;
  relatedProducts: Product[];
  images: string[];
  focal: ProductDetailFocalViewModel;
  whatsappUrl: string;
  priceLabel: string;
  detailHref: string;
  isJersey: boolean;
  hasReadyStock: boolean;
  hasCustomAvailability: boolean;
  showPurchasePanel: boolean;
  customDestination: string | null;
  colors: string[];
  sizes: string[];
  sizeGuide: string[];
  journey: Readonly<{ mode: "ready_stock" | "custom" | "hybrid" | "unknown"; readyStock: boolean; custom: boolean }>;
  warningCode: string | null;
};

export type ProductDetailPageModel = PageViewModel<"product-detail", ProductDetailPageData>;
