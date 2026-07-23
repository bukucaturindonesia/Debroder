import type { ContractReference, ContractWarning, CurrencyCode, EntityId, IsoDateTime } from "./core";
import { CONTRACT_VERSIONS } from "./version";

export const PRICING_SUBJECT_TYPES = [
  "ready_stock",
  "configured_product",
  "custom_project"
] as const;

export type PricingSubjectType = (typeof PRICING_SUBJECT_TYPES)[number];

export const PRICING_STATUSES = [
  "priced",
  "quotation_required",
  "unavailable"
] as const;

export type PricingStatus = (typeof PRICING_STATUSES)[number];

export const PRICING_COMPONENT_KINDS = [
  "product_base",
  "tier_adjustment",
  "variant_adjustment",
  "size_adjustment",
  "service",
  "configuration",
  "personalization",
  "discount",
  "shipping",
  "tax",
  "manual_adjustment"
] as const;

export type PricingComponentKind = (typeof PRICING_COMPONENT_KINDS)[number];

/** Monetary amounts are integer minor units. For IDR this is whole rupiah. */
export type MoneyAmount = {
  currency: CurrencyCode;
  amount: number;
};

export type ReadyStockPricingSubject = {
  type: "ready_stock";
  productId: EntityId;
  variantId: EntityId;
  variantSizeId: EntityId;
  sku: string;
};

export type ConfiguredProductPricingSubject = {
  type: "configured_product";
  definitionId: EntityId;
  definitionVersion: string;
  configurationId: EntityId;
};

export type CustomProjectPricingSubject = {
  type: "custom_project";
  projectId: EntityId;
  projectVersion: string;
};

export type PricingSubject =
  | ReadyStockPricingSubject
  | ConfiguredProductPricingSubject
  | CustomProjectPricingSubject;

export type PricingRequest = {
  contractVersion: typeof CONTRACT_VERSIONS.pricing;
  requestId: string;
  subject: PricingSubject;
  quantity: number;
  requestedAt: IsoDateTime;
  policyReferences?: readonly ContractReference[];
};

export type PricingLine = {
  key: string;
  label: string;
  kind: PricingComponentKind;
  quantity: number;
  unitAmount: MoneyAmount | null;
  totalAmount: MoneyAmount | null;
  sourceReferences: readonly ContractReference[];
};

export type PricingTotals = {
  subtotal: MoneyAmount | null;
  discount: MoneyAmount | null;
  shipping: MoneyAmount | null;
  tax: MoneyAmount | null;
  grandTotal: MoneyAmount | null;
};

export type PricingResult = {
  contractVersion: typeof CONTRACT_VERSIONS.pricing;
  requestId: string;
  status: PricingStatus;
  quantity: number;
  lines: readonly PricingLine[];
  totals: PricingTotals;
  sourceReferences: readonly ContractReference[];
  policyReferences: readonly ContractReference[];
  warnings: readonly ContractWarning[];
  pricedAt: IsoDateTime;
};

/**
 * Historical pricing snapshots are transaction evidence. Later policy or
 * product changes must not mutate an existing snapshot.
 */
export type PricingSnapshot = Omit<PricingResult, "requestId"> & {
  snapshotId: EntityId;
  immutable: true;
  inputFingerprint: string;
};
