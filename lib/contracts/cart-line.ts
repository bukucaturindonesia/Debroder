import type { ConfiguredProductSnapshot } from "./configured-product";
import type { ContractWarning, EntityId, IsoDateTime } from "./core";
import type { PricingSnapshot } from "./pricing";
import { CONTRACT_VERSIONS } from "./version";

export const CART_LINE_TYPES = [
  "ready_stock",
  "configured_product",
  "custom_project",
  "legacy_unsupported"
] as const;

export type CartLineType = (typeof CART_LINE_TYPES)[number];

export type CartLineDisplaySnapshot = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  href?: string;
};

export type CartLineValidationState =
  | { status: "unvalidated" }
  | { status: "valid"; validatedAt: IsoDateTime }
  | {
      status: "stale";
      lastValidatedAt?: IsoDateTime;
      retryable: true;
      warning: ContractWarning;
    }
  | {
      status: "invalid";
      retryable: boolean;
      code: string;
      message: string;
    };

export type CartLineBase<TType extends CartLineType> = {
  contractVersion: typeof CONTRACT_VERSIONS.cartLine;
  lineId: EntityId;
  lineType: TType;
  quantity: number;
  display: CartLineDisplaySnapshot;
  displayPricing: PricingSnapshot | null;
  validation: CartLineValidationState;
  notes?: string;
};

export type ReadyStockCartLine = CartLineBase<"ready_stock"> & {
  productId: EntityId;
  variantId: EntityId;
  variantSizeId: EntityId;
  sku: string;
};

export type ConfiguredProductCartLine = CartLineBase<"configured_product"> & {
  definitionId: EntityId;
  definitionVersion: string;
  configurationId: EntityId;
  configurationSnapshot: ConfiguredProductSnapshot;
};

export type CustomProjectCartLine = CartLineBase<"custom_project"> & {
  projectId: EntityId;
  projectVersion: string;
  projectSnapshotReference: EntityId;
};

export type LegacyUnsupportedCartLine = CartLineBase<"legacy_unsupported"> & {
  checkoutEligible: false;
  legacyStorageVersion: string;
  reasonCode: string;
  rawLine: Readonly<Record<string, unknown>>;
};

export type CartLine =
  | ReadyStockCartLine
  | ConfiguredProductCartLine
  | CustomProjectCartLine
  | LegacyUnsupportedCartLine;
