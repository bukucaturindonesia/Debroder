/**
 * Stable identifiers for additive architecture contracts.
 *
 * These values identify the serialized shape, not application releases. A
 * contract version changes only when a consumer cannot safely read the prior
 * shape without an adapter.
 */
export const CONTRACT_VERSIONS = {
  error: "error.v1",
  pricing: "pricing.v1",
  cartLine: "cart-line.v5",
  configuredProduct: "configured-product.v1",
  checkoutCommand: "checkout-command.v1",
  pageViewModel: "page-view-model.v1"
} as const;

export type ContractName = keyof typeof CONTRACT_VERSIONS;
export type ContractVersion = (typeof CONTRACT_VERSIONS)[ContractName];
