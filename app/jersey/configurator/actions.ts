"use server";

import {
  CONTRACT_VERSIONS,
  type ConfiguredProductValidation
} from "@/lib/contracts";
import {
  resolveConfiguredProductOnServer,
  type ResolveConfiguredProductResult
} from "@/lib/configured-product/runtime";
import { readJerseyConfiguredProductDefinition } from "@/lib/jersey-configured-product/data-access";
import { validateJerseyConsumerDraft } from "@/lib/jersey-configured-product/domain";
import { parseJerseyResolveRequest } from "@/lib/jersey-configured-product/request";

export async function resolveJerseyConfiguredProduct(
  payload: unknown
): Promise<ResolveConfiguredProductResult> {
  const input = parseJerseyResolveRequest(payload);
  if (!input) {
    return failure(
      "jersey-configurator",
      "configured_product.request.invalid",
      "Permintaan Jersey configurator tidak valid."
    );
  }

  const definitionResult = await readJerseyConfiguredProductDefinition(
    input.productId
  );
  if (definitionResult.status !== "ready") {
    return failure(
      input.requestId,
      normalizeCode(definitionResult.code),
      definitionResult.message,
      definitionResult.retryable
    );
  }
  const jerseyIssues = validateJerseyConsumerDraft(
    definitionResult.definition,
    input.draft
  );
  if (jerseyIssues.length > 0) {
    const validation: ConfiguredProductValidation = {
      valid: false,
      pricingStatus: "unavailable",
      issues: jerseyIssues,
      warnings: [],
      validatedAt: input.requestedAt
    };
    return {
      ok: false,
      error: {
        contractVersion: CONTRACT_VERSIONS.error,
        code: "configured_product.validation.failed",
        message: "Konfigurasi Jersey belum valid.",
        referenceId: input.requestId,
        retryable: false,
        fieldIssues: jerseyIssues
      },
      validation
    };
  }

  return resolveConfiguredProductOnServer(input, {
    readDefinition: async () => definitionResult
  });
}

function failure(
  referenceId: string,
  code: `configured_product.${string}`,
  message: string,
  retryable = false
): ResolveConfiguredProductResult {
  return {
    ok: false,
    error: {
      contractVersion: CONTRACT_VERSIONS.error,
      code,
      message,
      referenceId,
      retryable
    }
  };
}

function normalizeCode(code: string): `configured_product.${string}` {
  return isConfiguredProductCode(code)
    ? code
    : "configured_product.definition.unavailable";
}

function isConfiguredProductCode(
  code: string
): code is `configured_product.${string}` {
  return code.startsWith("configured_product.");
}
