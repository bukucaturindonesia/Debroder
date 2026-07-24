import "server-only";

import { createHash } from "node:crypto";
import {
  CONTRACT_VERSIONS,
  type ConfiguredProductDraft,
  type ConfiguredProductPricingInput,
  type ConfiguredProductSnapshot,
  type ConfiguredUploadReference,
  type ConfiguredProductValidation,
  type PricingResult,
  type PricingSnapshot,
  type PublicContractError
} from "@/lib/contracts";
import {
  readConfiguredProductDefinition,
  type ConfiguredProductDefinitionReadResult
} from "./data-access";
import {
  canonicalConfiguredProductInput,
  validateConfiguredProductDraft
} from "./domain";

export type ConfiguredProductPricingAuthority = (
  input: ConfiguredProductPricingInput
) => Promise<PricingResult>;

export type ConfiguredProductUploadAuthority = (
  uploads: readonly ConfiguredUploadReference[]
) => Promise<boolean>;

export type ResolveConfiguredProductInput = {
  productId: string;
  draft: ConfiguredProductDraft;
  requestId: string;
  snapshotId: string;
  requestedAt: string;
};

export type ResolveConfiguredProductResult =
  | {
      ok: true;
      pricingInput: ConfiguredProductPricingInput;
      snapshot: ConfiguredProductSnapshot;
    }
  | {
      ok: false;
      error: PublicContractError;
      validation?: ConfiguredProductValidation;
    };

export type ConfiguredProductRuntimeDependencies = {
  readDefinition?: (productId: string) => Promise<ConfiguredProductDefinitionReadResult>;
  pricingAuthority?: ConfiguredProductPricingAuthority;
  uploadAuthority?: ConfiguredProductUploadAuthority;
};

export async function resolveConfiguredProductOnServer(
  input: ResolveConfiguredProductInput,
  dependencies: ConfiguredProductRuntimeDependencies = {}
): Promise<ResolveConfiguredProductResult> {
  if (
    !isNonEmptyString(input.productId)
    || !isNonEmptyString(input.requestId)
    || !isNonEmptyString(input.snapshotId)
    || !isIsoDate(input.requestedAt)
  ) {
    return failure(
      input.requestId || "configured-product",
      "configured_product.request.invalid",
      "Permintaan configured product tidak valid.",
      false
    );
  }

  const definitionResult = await (dependencies.readDefinition ?? readConfiguredProductDefinition)(input.productId);
  if (definitionResult.status !== "ready") {
    return failure(
      input.requestId,
      normalizeErrorCode(definitionResult.code),
      definitionResult.message,
      definitionResult.retryable,
      definitionResult.issues
    );
  }

  const validation = validateConfiguredProductDraft(
    definitionResult.definition,
    input.draft,
    input.requestedAt
  );
  if (!validation.valid) {
    return failure(
      input.requestId,
      "configured_product.validation.failed",
      "Konfigurasi belum valid.",
      false,
      validation.issues,
      validation
    );
  }

  if (input.draft.uploads.length > 0) {
    if (!dependencies.uploadAuthority) {
      return failure(
        input.requestId,
        "configured_product.upload.authority_unavailable",
        "Upload configured product belum dapat diverifikasi.",
        true,
        undefined,
        validation
      );
    }
    try {
      if (!await dependencies.uploadAuthority(input.draft.uploads)) {
        return failure(
          input.requestId,
          "configured_product.upload.verification_failed",
          "Upload configured product tidak sesuai data server.",
          false,
          undefined,
          validation
        );
      }
    } catch {
      return failure(
        input.requestId,
        "configured_product.upload.authority_failed",
        "Upload configured product gagal diverifikasi.",
        true,
        undefined,
        validation
      );
    }
  }

  const inputFingerprint = createHash("sha256")
    .update(canonicalConfiguredProductInput(definitionResult.definition, input.draft))
    .digest("hex");
  const pricingInput: ConfiguredProductPricingInput = {
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    requestId: input.requestId,
    inputFingerprint,
    definitionId: definitionResult.definition.id,
    definitionVersion: definitionResult.definition.version,
    configurationId: input.draft.id,
    quantity: input.draft.quantity,
    selections: input.draft.selections,
    allocations: input.draft.allocations,
    services: input.draft.services,
    uploads: input.draft.uploads.map((upload) => ({
      requirementId: upload.requirementId,
      uploadId: upload.uploadId
    })),
    sourceReferences: [
      {
        type: "configured_product_definition",
        id: definitionResult.definition.id,
        version: definitionResult.definition.version
      },
      ...definitionResult.definition.policyReferences
    ],
    requestedAt: input.requestedAt
  };

  if (definitionResult.definition.pricingMode === "quotation_required") {
    return {
      ok: true,
      pricingInput,
      snapshot: createSnapshot({
        snapshotId: input.snapshotId,
        inputFingerprint,
        definition: definitionResult.definition,
        draft: input.draft,
        validation,
        pricing: null,
        capturedAt: input.requestedAt
      })
    };
  }

  if (!dependencies.pricingAuthority) {
    return failure(
      input.requestId,
      "configured_product.pricing.authority_unavailable",
      "Pricing authority configured product tidak tersedia.",
      true,
      undefined,
      validation
    );
  }

  let pricingResult: PricingResult;
  try {
    pricingResult = await dependencies.pricingAuthority(pricingInput);
  } catch {
    return failure(
      input.requestId,
      "configured_product.pricing.authority_failed",
      "Configured-product pricing gagal divalidasi.",
      true,
      undefined,
      validation
    );
  }

  if (!isValidPricingResult(pricingResult, pricingInput)) {
    return failure(
      input.requestId,
      "configured_product.pricing.result_invalid",
      "Hasil pricing configured product tidak valid.",
      false,
      undefined,
      validation
    );
  }

  const pricedValidation: ConfiguredProductValidation = {
    ...validation,
    pricingStatus: "priced"
  };
  const pricingSnapshot: PricingSnapshot = {
    contractVersion: pricingResult.contractVersion,
    snapshotId: `${input.snapshotId}:pricing`,
    immutable: true,
    inputFingerprint,
    status: pricingResult.status,
    quantity: pricingResult.quantity,
    lines: pricingResult.lines,
    totals: pricingResult.totals,
    sourceReferences: pricingResult.sourceReferences,
    policyReferences: pricingResult.policyReferences,
    warnings: pricingResult.warnings,
    pricedAt: pricingResult.pricedAt
  };

  return {
    ok: true,
    pricingInput,
    snapshot: createSnapshot({
      snapshotId: input.snapshotId,
      inputFingerprint,
      definition: definitionResult.definition,
      draft: input.draft,
      validation: pricedValidation,
      pricing: pricingSnapshot,
      capturedAt: input.requestedAt
    })
  };
}

function createSnapshot(
  input: Omit<ConfiguredProductSnapshot, "contractVersion" | "immutable">
): ConfiguredProductSnapshot {
  return deepFreeze({
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    ...structuredClone(input),
    immutable: true
  });
}

function isValidPricingResult(
  result: PricingResult,
  input: ConfiguredProductPricingInput
) {
  return result.contractVersion === CONTRACT_VERSIONS.pricing
    && result.requestId === input.requestId
    && result.status === "priced"
    && result.quantity === input.quantity
    && isIsoDate(result.pricedAt)
    && result.totals.subtotal !== null
    && result.totals.grandTotal !== null
    && isMoney(result.totals.subtotal)
    && isMoney(result.totals.grandTotal)
    && result.lines.every((line) => (
      isNonEmptyString(line.key)
      && isNonEmptyString(line.label)
      && Number.isSafeInteger(line.quantity)
      && line.quantity > 0
      && (line.unitAmount === null || isMoney(line.unitAmount))
      && (line.totalAmount === null || isMoney(line.totalAmount))
    ));
}

function isMoney(value: { currency: string; amount: number }) {
  return value.currency === "IDR"
    && Number.isSafeInteger(value.amount)
    && value.amount >= 0;
}

function failure(
  referenceId: string,
  code: `configured_product.${string}`,
  message: string,
  retryable: boolean,
  fieldIssues?: PublicContractError["fieldIssues"],
  validation?: ConfiguredProductValidation
): ResolveConfiguredProductResult {
  return {
    ok: false,
    error: {
      contractVersion: CONTRACT_VERSIONS.error,
      code,
      message,
      referenceId,
      retryable,
      ...(fieldIssues && fieldIssues.length > 0 ? { fieldIssues } : {})
    },
    ...(validation ? { validation } : {})
  };
}

function normalizeErrorCode(code: string): `configured_product.${string}` {
  return isConfiguredProductErrorCode(code)
    ? code
    : "configured_product.definition.unavailable";
}

function isConfiguredProductErrorCode(
  code: string
): code is `configured_product.${string}` {
  return code.startsWith("configured_product.");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((entry) => deepFreeze(entry));
  }
  return value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && Number.isFinite(Date.parse(value));
}
