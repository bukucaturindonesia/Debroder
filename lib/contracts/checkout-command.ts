import type { ConfiguredProductDraft } from "./configured-product";
import type { EntityId, IsoDateTime } from "./core";
import type { PublicContractError } from "./error";
import { CONTRACT_VERSIONS } from "./version";

export const CHECKOUT_MODES = [
  "ready_stock",
  "configured_product",
  "custom_project"
] as const;

export type CheckoutMode = (typeof CHECKOUT_MODES)[number];

export type CheckoutCustomer = {
  name: string;
  phone: string;
  email?: string;
};

export type CheckoutShippingAddress = {
  recipientName: string;
  phone: string;
  addressLine: string;
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  villageCode: string;
  postalCode: string;
  note?: string;
};

export type CheckoutFulfillment =
  | {
      method: "shipping";
      address: CheckoutShippingAddress;
      shippingQuoteId?: EntityId;
    }
  | {
      method: "pickup";
      pickupLocationId: EntityId;
    };

export type CheckoutPaymentSelection = {
  methodCode: string;
};

export type CheckoutCommandBase<TMode extends CheckoutMode> = {
  contractVersion: typeof CONTRACT_VERSIONS.checkoutCommand;
  commandId: string;
  idempotencyKey: string;
  mode: TMode;
  customer: CheckoutCustomer;
  fulfillment: CheckoutFulfillment;
  payment: CheckoutPaymentSelection;
  submittedAt: IsoDateTime;
};

export type ReadyStockCheckoutItem = {
  lineId: EntityId;
  productId: EntityId;
  variantId: EntityId;
  variantSizeId: EntityId;
  sku: string;
  quantity: number;
};

export type ReadyStockCheckoutCommand = CheckoutCommandBase<"ready_stock"> & {
  items: readonly ReadyStockCheckoutItem[];
};

export type ConfiguredProductCheckoutItem = {
  lineId: EntityId;
  quantity: number;
  configuration: ConfiguredProductDraft;
};

export type ConfiguredProductCheckoutCommand = CheckoutCommandBase<"configured_product"> & {
  items: readonly ConfiguredProductCheckoutItem[];
};

export type CustomProjectCheckoutItem = {
  lineId: EntityId;
  projectId: EntityId;
  projectVersion: string;
  projectSnapshotReference: EntityId;
  quantity: number;
};

export type CustomProjectCheckoutCommand = CheckoutCommandBase<"custom_project"> & {
  items: readonly CustomProjectCheckoutItem[];
};

/**
 * A command has exactly one mode; mixed public checkout is not representable.
 * Monetary input is deliberately absent because checkout reprices on the server.
 */
export type CheckoutCommand =
  | ReadyStockCheckoutCommand
  | ConfiguredProductCheckoutCommand
  | CustomProjectCheckoutCommand;

export type CheckoutCommandAccepted = {
  accepted: true;
  commandId: string;
  orderId: EntityId;
  orderNumber: string;
  acceptedAt: IsoDateTime;
};

export type CheckoutCommandRejected = {
  accepted: false;
  commandId: string;
  error: PublicContractError;
};

export type CheckoutCommandResult = CheckoutCommandAccepted | CheckoutCommandRejected;
