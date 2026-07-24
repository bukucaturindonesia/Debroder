import type { ContractFieldIssue, ContractReference, ContractWarning, EntityId, IsoDateTime } from "./core";
import type { PricingSnapshot, PricingStatus } from "./pricing";
import { CONTRACT_VERSIONS } from "./version";

export const CONFIGURED_OPTION_INPUT_TYPES = [
  "single_select",
  "multi_select",
  "text",
  "number",
  "boolean"
] as const;

export type ConfiguredOptionInputType = (typeof CONFIGURED_OPTION_INPUT_TYPES)[number];

export type ConfiguredOption = {
  id: EntityId;
  code: string;
  label: string;
  description?: string;
  sortOrder: number;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
};

export type ConfiguredOptionGroup = {
  id: EntityId;
  code: string;
  label: string;
  inputType: ConfiguredOptionInputType;
  required: boolean;
  minimumSelections?: number;
  maximumSelections?: number;
  options: readonly ConfiguredOption[];
  sortOrder: number;
};

export type ConfiguredCondition = {
  groupId: EntityId;
  optionIds: readonly EntityId[];
};

export type ConfiguredCompatibilityRule = {
  id: EntityId;
  effect: "allow" | "deny" | "require";
  when: readonly ConfiguredCondition[];
  targets: readonly ConfiguredCondition[];
  message?: string;
};

export type ConfiguredAllocationDimension = {
  id: EntityId;
  code: string;
  label: string;
  required: boolean;
  allowedValues: readonly string[];
};

export type ConfiguredServiceRequirement = {
  id: EntityId;
  serviceCode: string;
  label: string;
  required: boolean;
  minimumQuantity?: number;
  maximumQuantity?: number;
};

export type ConfiguredUploadRequirement = {
  id: EntityId;
  code: string;
  label: string;
  required: boolean;
  maximumFiles: number;
  acceptedMimeTypes: readonly string[];
  maximumBytesPerFile: number;
};

export type ConfiguredProductDefinition = {
  contractVersion: typeof CONTRACT_VERSIONS.configuredProduct;
  id: EntityId;
  version: string;
  productId?: EntityId;
  code: string;
  name: string;
  pricingMode: "server_priced" | "quotation_required";
  quantityRules: {
    minimum: number;
    maximum?: number;
  };
  optionGroups: readonly ConfiguredOptionGroup[];
  compatibilityRules: readonly ConfiguredCompatibilityRule[];
  allocationDimensions: readonly ConfiguredAllocationDimension[];
  serviceRequirements: readonly ConfiguredServiceRequirement[];
  uploadRequirements: readonly ConfiguredUploadRequirement[];
  policyReferences: readonly ContractReference[];
};

export type ConfiguredSelection = {
  groupId: EntityId;
  optionIds: readonly EntityId[];
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
};

export type ConfiguredAllocation = {
  id: EntityId;
  dimensions: Readonly<Record<string, string>>;
  quantity: number;
};

export type ConfiguredServiceSelection = {
  requirementId: EntityId;
  serviceCode: string;
  quantity: number;
  note?: string;
};

export type ConfiguredUploadReference = {
  requirementId: EntityId;
  uploadId: EntityId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ConfiguredProductDraft = {
  contractVersion: typeof CONTRACT_VERSIONS.configuredProduct;
  id: EntityId;
  definitionId: EntityId;
  definitionVersion: string;
  quantity: number;
  selections: readonly ConfiguredSelection[];
  allocations: readonly ConfiguredAllocation[];
  services: readonly ConfiguredServiceSelection[];
  uploads: readonly ConfiguredUploadReference[];
  note?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type ConfiguredProductValidation = {
  valid: boolean;
  pricingStatus: PricingStatus;
  issues: readonly ContractFieldIssue[];
  warnings: readonly ContractWarning[];
  validatedAt: IsoDateTime;
};

/**
 * Canonical pricing input contains identifiers and selections only. Monetary
 * amounts are deliberately absent because a server pricing authority owns
 * every configured-product calculation.
 */
export type ConfiguredProductPricingInput = {
  contractVersion: typeof CONTRACT_VERSIONS.configuredProduct;
  requestId: string;
  inputFingerprint: string;
  definitionId: EntityId;
  definitionVersion: string;
  configurationId: EntityId;
  quantity: number;
  selections: readonly ConfiguredSelection[];
  allocations: readonly ConfiguredAllocation[];
  services: readonly ConfiguredServiceSelection[];
  uploads: readonly Pick<ConfiguredUploadReference, "requirementId" | "uploadId">[];
  sourceReferences: readonly ContractReference[];
  requestedAt: IsoDateTime;
};

export type ConfiguredProductSnapshot = {
  contractVersion: typeof CONTRACT_VERSIONS.configuredProduct;
  snapshotId: EntityId;
  inputFingerprint?: string;
  definition: ConfiguredProductDefinition;
  draft: ConfiguredProductDraft;
  validation: ConfiguredProductValidation;
  pricing: PricingSnapshot | null;
  immutable: true;
  capturedAt: IsoDateTime;
};
