import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CART_LINE_TYPES,
  CHECKOUT_MODES,
  CONFIGURED_OPTION_INPUT_TYPES,
  CONTRACT_ERROR_DOMAINS,
  CONTRACT_VERSIONS,
  PRICING_STATUSES,
  PRICING_SUBJECT_TYPES,
  type CartLine,
  type CheckoutCommand,
  type ConfiguredProductDefinition,
  type PageViewModel,
  type PricingRequest
} from "@/lib/contracts";

const contractDirectory = "lib/contracts";
const contractFiles = readdirSync(contractDirectory)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => join(contractDirectory, file));

const source = contractFiles.map((file) => readFileSync(file, "utf8")).join("\n").toLowerCase();

const definition = {
  contractVersion: CONTRACT_VERSIONS.configuredProduct,
  id: "definition-1",
  version: "1",
  code: "generic-configured-product",
  name: "Generic Configured Product",
  pricingMode: "quotation_required",
  optionGroups: [],
  compatibilityRules: [],
  allocationDimensions: [],
  serviceRequirements: [],
  uploadRequirements: [],
  policyReferences: []
} satisfies ConfiguredProductDefinition;

const pricingRequest = {
  contractVersion: CONTRACT_VERSIONS.pricing,
  requestId: "pricing-request-1",
  subject: {
    type: "configured_product",
    definitionId: definition.id,
    definitionVersion: definition.version,
    configurationId: "configuration-1"
  },
  quantity: 12,
  requestedAt: "2026-07-23T00:00:00.000Z"
} satisfies PricingRequest;

const cartLine = {
  contractVersion: CONTRACT_VERSIONS.cartLine,
  lineId: "line-1",
  lineType: "legacy_unsupported",
  quantity: 1,
  display: { title: "Legacy item" },
  displayPricing: null,
  validation: { status: "unvalidated" },
  checkoutEligible: false,
  legacyStorageVersion: "v4",
  reasonCode: "adapter_required",
  rawLine: {}
} satisfies CartLine;

const checkoutCommand = {
  contractVersion: CONTRACT_VERSIONS.checkoutCommand,
  commandId: "command-1",
  idempotencyKey: "idempotency-key-1",
  mode: "configured_product",
  customer: { name: "Customer", phone: "628000000000" },
  fulfillment: { method: "pickup", pickupLocationId: "location-1" },
  payment: { methodCode: "bank_transfer" },
  submittedAt: "2026-07-23T00:00:00.000Z",
  items: []
} satisfies CheckoutCommand;

const pageModel = {
  contractVersion: CONTRACT_VERSIONS.pageViewModel,
  pageKey: "contract-test",
  locale: "id-ID",
  metadata: { title: "Contract Test" },
  breadcrumbs: [],
  data: { ready: true }
} satisfies PageViewModel<"contract-test", { ready: boolean }>;

describe("Page-Owned pure contract foundation", () => {
  it("freezes the additive contract version identifiers", () => {
    expect(CONTRACT_VERSIONS).toEqual({
      error: "error.v1",
      pricing: "pricing.v1",
      cartLine: "cart-line.v5",
      configuredProduct: "configured-product.v1",
      checkoutCommand: "checkout-command.v1",
      pageViewModel: "page-view-model.v1"
    });
  });

  it("keeps domain discriminants explicit and generic", () => {
    expect(CART_LINE_TYPES).toEqual([
      "ready_stock",
      "configured_product",
      "custom_project",
      "legacy_unsupported"
    ]);
    expect(CHECKOUT_MODES).toEqual(["ready_stock", "configured_product", "custom_project"]);
    expect(PRICING_SUBJECT_TYPES).toEqual(["ready_stock", "configured_product", "custom_project"]);
    expect(PRICING_STATUSES).toEqual(["priced", "quotation_required", "unavailable"]);
    expect(CONFIGURED_OPTION_INPUT_TYPES).toContain("multi_select");
    expect(CONTRACT_ERROR_DOMAINS).toContain("infrastructure");
    expect(pricingRequest.subject.type).toBe("configured_product");
    expect(cartLine.checkoutEligible).toBe(false);
    expect(checkoutCommand.mode).toBe("configured_product");
    expect(pageModel.data.ready).toBe(true);
  });

  it("does not depend on framework, database client, browser, or environment modules", () => {
    expect(source).not.toContain('from "react"');
    expect(source).not.toContain('from "next');
    expect(source).not.toContain("supabase");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("window.");
    expect(source).not.toContain("document.");
  });

  it("does not embed a product-specific configured-product core", () => {
    expect(source).not.toContain("jersey");
  });
});
