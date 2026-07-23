import type { ContractFieldIssue, IsoDateTime } from "./core";
import { CONTRACT_VERSIONS } from "./version";

export const CONTRACT_ERROR_DOMAINS = [
  "contract",
  "catalog",
  "pricing",
  "cart",
  "checkout",
  "configured_product",
  "order",
  "payment",
  "inventory",
  "authorization",
  "infrastructure"
] as const;

export type ContractErrorDomain = (typeof CONTRACT_ERROR_DOMAINS)[number];
export type ContractErrorCode = `${ContractErrorDomain}.${string}`;

export type PublicContractError = {
  contractVersion: typeof CONTRACT_VERSIONS.error;
  code: ContractErrorCode;
  message: string;
  referenceId: string;
  retryable: boolean;
  fieldIssues?: readonly ContractFieldIssue[];
};

/**
 * Internal context is intentionally separate from the public error shape so a
 * mapper must opt in before diagnostics can cross a server boundary.
 */
export type InternalContractError = PublicContractError & {
  occurredAt: IsoDateTime;
  operation?: string;
  context?: Readonly<Record<string, unknown>>;
  cause?: unknown;
};
