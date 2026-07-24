import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ConfiguredProductDefinition,
  ConfiguredProductDraft,
  ConfiguredProductPricingInput,
  PricingResult
} from "@/lib/contracts";
import { CONTRACT_VERSIONS } from "@/lib/contracts";
import { projectConfiguredProductDefinitionRow } from "@/lib/configured-product/data-access";
import {
  buildConfiguredProductDefinition,
  canonicalConfiguredProductInput,
  validateConfiguredProductDraft
} from "@/lib/configured-product/domain";
import { resolveConfiguredProductOnServer } from "@/lib/configured-product/runtime";

const NOW = "2026-07-24T04:00:00.000Z";
const PRODUCT_ID = "10000000-0000-4000-8000-000000000901";

function schema(pricingMode: "server_priced" | "quotation_required" = "server_priced") {
  return {
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    version: "definition-1",
    code: "configured-foundation",
    pricingMode,
    maximumQuantity: 20,
    optionGroups: [
      {
        id: "group-material",
        code: "material",
        label: "Material",
        inputType: "single_select",
        required: true,
        options: [
          { id: "material-a", code: "material-a", label: "Material A", sortOrder: 10 },
          { id: "material-b", code: "material-b", label: "Material B", sortOrder: 20 }
        ],
        sortOrder: 10
      },
      {
        id: "group-addon",
        code: "addon",
        label: "Addon",
        inputType: "multi_select",
        required: false,
        maximumSelections: 2,
        options: [
          { id: "addon-a", code: "addon-a", label: "Addon A", sortOrder: 10 },
          { id: "addon-b", code: "addon-b", label: "Addon B", sortOrder: 20 }
        ],
        sortOrder: 20
      },
      {
        id: "group-label",
        code: "label",
        label: "Label",
        inputType: "text",
        required: false,
        options: [],
        sortOrder: 30
      },
      {
        id: "group-count",
        code: "count",
        label: "Count",
        inputType: "number",
        required: true,
        options: [],
        sortOrder: 40
      },
      {
        id: "group-confirm",
        code: "confirm",
        label: "Confirm",
        inputType: "boolean",
        required: true,
        options: [],
        sortOrder: 50
      }
    ],
    compatibilityRules: [
      {
        id: "rule-deny",
        effect: "deny",
        when: [{ groupId: "group-material", optionIds: ["material-a"] }],
        targets: [{ groupId: "group-addon", optionIds: ["addon-b"] }],
        message: "Combination denied."
      },
      {
        id: "rule-require",
        effect: "require",
        when: [{ groupId: "group-material", optionIds: ["material-b"] }],
        targets: [{ groupId: "group-addon", optionIds: ["addon-a"] }],
        message: "Addon A required."
      }
    ],
    allocationDimensions: [
      {
        id: "dimension-size",
        code: "size",
        label: "Size",
        required: true,
        allowedValues: ["M", "L"]
      }
    ],
    serviceRequirements: [
      {
        id: "service-print",
        serviceCode: "print",
        label: "Print",
        required: true,
        minimumQuantity: 1,
        maximumQuantity: 20
      }
    ],
    uploadRequirements: [
      {
        id: "upload-artwork",
        code: "artwork",
        label: "Artwork",
        required: true,
        maximumFiles: 1,
        acceptedMimeTypes: ["image/png"],
        maximumBytesPerFile: 1_000_000
      }
    ],
    policyReferences: [{ type: "configured_policy", id: "policy-1", version: "1" }]
  };
}

function definition(
  pricingMode: "server_priced" | "quotation_required" = "server_priced"
): ConfiguredProductDefinition {
  const result = buildConfiguredProductDefinition({
    productId: PRODUCT_ID,
    productName: "Configured Foundation",
    minimumQuantity: 2,
    productUpdatedAt: NOW,
    configSchema: schema(pricingMode)
  });
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.definition;
}

function draft(overrides: Partial<ConfiguredProductDraft> = {}): ConfiguredProductDraft {
  return {
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    id: "configuration-1",
    definitionId: PRODUCT_ID,
    definitionVersion: "definition-1",
    quantity: 3,
    selections: [
      { groupId: "group-material", optionIds: ["material-b"] },
      { groupId: "group-addon", optionIds: ["addon-a"] },
      { groupId: "group-label", optionIds: [], textValue: "Team" },
      { groupId: "group-count", optionIds: [], numberValue: 3 },
      { groupId: "group-confirm", optionIds: [], booleanValue: true }
    ],
    allocations: [
      { id: "allocation-m", dimensions: { size: "M" }, quantity: 2 },
      { id: "allocation-l", dimensions: { size: "L" }, quantity: 1 }
    ],
    services: [{
      requirementId: "service-print",
      serviceCode: "print",
      quantity: 3
    }],
    uploads: [{
      requirementId: "upload-artwork",
      uploadId: "upload-1",
      fileName: "artwork.png",
      mimeType: "image/png",
      sizeBytes: 500_000
    }],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

function readyDefinition(
  pricingMode: "server_priced" | "quotation_required"
) {
  return async () => ({
    status: "ready" as const,
    definition: definition(pricingMode)
  });
}

function priced(input: ConfiguredProductPricingInput): PricingResult {
  return {
    contractVersion: CONTRACT_VERSIONS.pricing,
    requestId: input.requestId,
    status: "priced",
    quantity: input.quantity,
    lines: [{
      key: "configuration",
      label: "Configuration",
      kind: "configuration",
      quantity: input.quantity,
      unitAmount: { currency: "IDR", amount: 50_000 },
      totalAmount: { currency: "IDR", amount: 150_000 },
      sourceReferences: input.sourceReferences
    }],
    totals: {
      subtotal: { currency: "IDR", amount: 150_000 },
      discount: null,
      shipping: null,
      tax: null,
      grandTotal: { currency: "IDR", amount: 150_000 }
    },
    sourceReferences: input.sourceReferences,
    policyReferences: [],
    warnings: [],
    pricedAt: NOW
  };
}

describe("P9 generic configured-product foundation", () => {
  it("projects only an active configurable product and keeps product columns authoritative", () => {
    const result = projectConfiguredProductDefinitionRow({
      id: PRODUCT_ID,
      name: "Configured Foundation",
      nama: "Ignored fallback",
      status: "active",
      status_aktif: true,
      product_type: "configurable_product",
      pricing_mode: "configurator_based",
      uses_configurator: true,
      minimum_order_qty: 2,
      config_schema: schema(),
      updated_at: NOW
    });

    expect(result).toMatchObject({
      status: "ready",
      definition: {
        id: PRODUCT_ID,
        productId: PRODUCT_ID,
        name: "Configured Foundation",
        quantityRules: { minimum: 2, maximum: 20 }
      }
    });
  });

  it("fails closed for inactive products, noncanonical schemas, and pricing authority mismatch", () => {
    expect(projectConfiguredProductDefinitionRow({
      id: PRODUCT_ID,
      name: "Configured Foundation",
      nama: null,
      status: "draft",
      status_aktif: true,
      product_type: "configurable_product",
      pricing_mode: "configurator_based",
      uses_configurator: true,
      minimum_order_qty: 2,
      config_schema: schema(),
      updated_at: NOW
    })).toMatchObject({ status: "not_found" });

    expect(buildConfiguredProductDefinition({
      productId: PRODUCT_ID,
      productName: "Configured Foundation",
      minimumQuantity: 2,
      productUpdatedAt: NOW,
      configSchema: {
        version: 1,
        entry_type: "specialized_configurator",
        source_tables: ["specialized_options"]
      }
    })).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "configured_product.definition.contract_version_mismatch" })
      ])
    });

    expect(projectConfiguredProductDefinitionRow({
      id: PRODUCT_ID,
      name: "Configured Foundation",
      nama: null,
      status: "active",
      status_aktif: true,
      product_type: "configurable_product",
      pricing_mode: "custom_quote",
      uses_configurator: true,
      minimum_order_qty: 2,
      config_schema: schema("server_priced"),
      updated_at: NOW
    })).toMatchObject({
      status: "invalid",
      code: "configured_product.definition.pricing_authority_mismatch"
    });
  });

  it("validates every option input type, allocation, service, upload, and compatibility rule", () => {
    const valid = validateConfiguredProductDraft(definition(), draft(), NOW);
    expect(valid).toEqual({
      valid: true,
      pricingStatus: "unavailable",
      issues: [],
      warnings: [],
      validatedAt: NOW
    });

    const invalid = validateConfiguredProductDraft(definition(), draft({
      quantity: 1,
      selections: [
        { groupId: "group-material", optionIds: ["material-a"] },
        { groupId: "group-addon", optionIds: ["addon-b", "unknown"] },
        { groupId: "group-count", optionIds: [], numberValue: Number.NaN },
        { groupId: "group-confirm", optionIds: [] }
      ],
      allocations: [{ id: "allocation-m", dimensions: { size: "XL" }, quantity: 2 }],
      services: [],
      uploads: []
    }), NOW);

    expect(invalid.valid).toBe(false);
    expect(invalid.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      "configured_product.draft.quantity_below_minimum",
      "configured_product.selection.option_unknown",
      "configured_product.selection.number_invalid",
      "configured_product.selection.boolean_invalid",
      "configured_product.compatibility.denied",
      "configured_product.allocation.dimension_invalid",
      "configured_product.allocation.quantity_mismatch",
      "configured_product.service.required",
      "configured_product.upload.required"
    ]));
  });

  it("canonicalizes equivalent selection order deterministically", () => {
    const canonical = canonicalConfiguredProductInput(definition(), draft());
    const reordered = canonicalConfiguredProductInput(definition(), draft({
      selections: [...draft().selections].reverse(),
      allocations: [...draft().allocations].reverse()
    }));
    expect(reordered).toBe(canonical);
  });

  it("creates a server-priced immutable snapshot only from a matching pricing result", async () => {
    const result = await resolveConfiguredProductOnServer({
      productId: PRODUCT_ID,
      draft: draft(),
      requestId: "request-1",
      snapshotId: "snapshot-1",
      requestedAt: NOW
    }, {
      readDefinition: readyDefinition("server_priced"),
      uploadAuthority: async () => true,
      pricingAuthority: async (input) => priced(input)
    });

    expect(result).toMatchObject({
      ok: true,
      pricingInput: {
        requestId: "request-1",
        definitionId: PRODUCT_ID,
        configurationId: "configuration-1",
        quantity: 3
      },
      snapshot: {
        snapshotId: "snapshot-1",
        immutable: true,
        validation: { valid: true, pricingStatus: "priced" },
        pricing: {
          immutable: true,
          status: "priced",
          quantity: 3
        }
      }
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.pricingInput.inputFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.snapshot.inputFingerprint).toBe(result.pricingInput.inputFingerprint);
    expect(result.snapshot.pricing?.inputFingerprint).toBe(result.pricingInput.inputFingerprint);
    expect(Object.isFrozen(result.snapshot)).toBe(true);
    expect(Object.isFrozen(result.snapshot.definition)).toBe(true);
  });

  it("keeps quotation input amount-free and snapshots it without inventing a price", async () => {
    const result = await resolveConfiguredProductOnServer({
      productId: PRODUCT_ID,
      draft: draft(),
      requestId: "request-quote",
      snapshotId: "snapshot-quote",
      requestedAt: NOW
    }, {
      readDefinition: readyDefinition("quotation_required"),
      uploadAuthority: async () => true
    });

    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        validation: { valid: true, pricingStatus: "quotation_required" },
        pricing: null
      }
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(JSON.stringify(result.pricingInput)).not.toContain("amount");
    expect(JSON.stringify(result.pricingInput)).not.toContain("price");
  });

  it("fails closed when pricing authority is missing or returns mismatched transaction data", async () => {
    const input = {
      productId: PRODUCT_ID,
      draft: draft(),
      requestId: "request-fail",
      snapshotId: "snapshot-fail",
      requestedAt: NOW
    };
    expect(await resolveConfiguredProductOnServer(input, {
      readDefinition: readyDefinition("server_priced"),
      uploadAuthority: async () => true
    })).toMatchObject({
      ok: false,
      error: { code: "configured_product.pricing.authority_unavailable", retryable: true }
    });

    expect(await resolveConfiguredProductOnServer(input, {
      readDefinition: readyDefinition("server_priced"),
      uploadAuthority: async () => true,
      pricingAuthority: async (pricingInput) => ({
        ...priced(pricingInput),
        quantity: pricingInput.quantity + 1
      })
    })).toMatchObject({
      ok: false,
      error: { code: "configured_product.pricing.result_invalid", retryable: false }
    });
  });

  it("fails closed when upload evidence cannot be verified by a server authority", async () => {
    const input = {
      productId: PRODUCT_ID,
      draft: draft(),
      requestId: "request-upload",
      snapshotId: "snapshot-upload",
      requestedAt: NOW
    };
    expect(await resolveConfiguredProductOnServer(input, {
      readDefinition: readyDefinition("quotation_required")
    })).toMatchObject({
      ok: false,
      error: { code: "configured_product.upload.authority_unavailable", retryable: true }
    });
    expect(await resolveConfiguredProductOnServer(input, {
      readDefinition: readyDefinition("quotation_required"),
      uploadAuthority: async () => false
    })).toMatchObject({
      ok: false,
      error: { code: "configured_product.upload.verification_failed", retryable: false }
    });
  });

  it("keeps the generic core free of specialized product fields and branching", () => {
    const directory = "lib/configured-product";
    const source = readdirSync(directory)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => readFileSync(join(directory, file), "utf8"))
      .join("\n")
      .toLowerCase();
    expect(source).not.toContain("jersey");
    expect(source).not.toContain("package_name");
    expect(source).not.toContain("collar");
  });
});
