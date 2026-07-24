import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSIONS,
  type ConfiguredProductDraft
} from "@/lib/contracts";
import { resolveConfiguredProductOnServer } from "@/lib/configured-product/runtime";
import {
  projectJerseyConfiguredProduct,
  validateJerseyConsumerDraft
} from "@/lib/jersey-configured-product/domain";
import { parseJerseyResolveRequest } from "@/lib/jersey-configured-product/request";

const NOW = "2026-07-24T08:00:00.000Z";
const PRODUCT_ID = "10000000-0000-4000-8000-000000001010";

function option(id: string, name: string, slug: string, sortOrder = 10) {
  return {
    id,
    name,
    slug,
    description: "",
    is_active: true,
    sort_order: sortOrder,
    updated_at: NOW,
    price_adjustment: 99_999,
    base_price: 888_888
  };
}

function source(overrides: Record<string, unknown> = {}) {
  return {
    product: {
      id: PRODUCT_ID,
      name: "Configured Jersey Fixture",
      nama: "Configured Jersey Fixture",
      slug: "configured-jersey-fixture",
      status: "active",
      status_aktif: true,
      product_type: "configurable_product",
      pricing_mode: "custom_quote",
      uses_configurator: true,
      minimum_order_qty: 6,
      config_schema: {
        entry_type: "jersey_configurator"
      },
      image_url: null,
      gambar_url: "/fixture.jpg",
      image_alt: "Fixture",
      updated_at: NOW
    },
    packages: [option("package-1", "Package One", "package-one")],
    materials: [option("material-1", "Material One", "material-one")],
    collarGroups: [option("collar-group-1", "Regular", "regular")],
    collars: [{
      ...option("collar-1", "Collar One", "collar-one"),
      group_id: "collar-group-1"
    }],
    addons: [option("addon-1", "Addon One", "addon-one")],
    requiredServices: [{
      id: "service-requirement-1",
      service_id: "service-1",
      service_name: "Print Service",
      service_slug: "print-service",
      is_active: true,
      sort_order: 10,
      updated_at: NOW
    }],
    sizes: [
      { ...option("size-s", "S", "s"), size_group: "apparel" },
      { ...option("size-m", "M", "m", 20), size_group: "apparel" }
    ],
    ...overrides
  };
}

function readyConsumer() {
  const result = projectJerseyConfiguredProduct(source());
  if (result.status !== "ready") throw new Error(result.message);
  return result.consumer;
}

function draft(
  overrides: Partial<ConfiguredProductDraft> = {}
): ConfiguredProductDraft {
  const definition = readyConsumer().definition;
  const optionId = (code: string) => (
    definition.optionGroups.find((group) => group.code === code)?.options[0]?.id ?? ""
  );
  const text = (code: string, value: string) => ({
    groupId: definition.optionGroups.find((group) => group.code === code)?.id ?? "",
    optionIds: [],
    textValue: value
  });
  return {
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    id: "jersey-configuration-1",
    definitionId: definition.id,
    definitionVersion: definition.version,
    quantity: 6,
    selections: [
      {
        groupId: definition.optionGroups.find((group) => group.code === "package")?.id ?? "",
        optionIds: [optionId("package")]
      },
      {
        groupId: definition.optionGroups.find((group) => group.code === "material")?.id ?? "",
        optionIds: [optionId("material")]
      },
      {
        groupId: definition.optionGroups.find((group) => group.code === "collar")?.id ?? "",
        optionIds: [optionId("collar")]
      },
      {
        groupId: definition.optionGroups.find((group) => group.code === "addons")?.id ?? "",
        optionIds: []
      },
      text("team_name", "Team"),
      text("sleeve_requirement", "Short"),
      text("player_roster", "Six players"),
      text("design_reference", "Private reference"),
      text("logo_requirement", "One logo"),
      text("sponsor_requirement", "No sponsor"),
      text("name_number_requirement", "Names and numbers")
    ],
    allocations: [{
      id: "allocation-s",
      dimensions: { size: "S" },
      quantity: 6
    }],
    services: definition.serviceRequirements.map((requirement) => ({
      requirementId: requirement.id,
      serviceCode: requirement.serviceCode,
      quantity: 6
    })),
    uploads: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

describe("P10 Jersey configured-product consumer", () => {
  it("maps canonical Jersey masters into the generic P9 contract without monetary input", () => {
    const consumer = readyConsumer();
    const definition = consumer.definition;

    expect(definition.pricingMode).toBe("quotation_required");
    expect(definition.quantityRules).toEqual({ minimum: 6, maximum: 100 });
    expect(definition.optionGroups.map((group) => group.code)).toEqual([
      "package",
      "material",
      "collar",
      "addons",
      "team_name",
      "sleeve_requirement",
      "player_roster",
      "design_reference",
      "logo_requirement",
      "sponsor_requirement",
      "name_number_requirement"
    ]);
    expect(definition.allocationDimensions[0]?.allowedValues).toEqual(["S", "M"]);
    expect(definition.serviceRequirements).toEqual([
      expect.objectContaining({
        id: "service-requirement-1",
        serviceCode: "print-service",
        required: true
      })
    ]);
    expect(JSON.stringify(definition)).not.toMatch(
      /base_price|price_adjustment|unitPrice|totalAmount/
    );
  });

  it("requires active custom-quote authority and never publishes the draft pilot implicitly", () => {
    const inactive = projectJerseyConfiguredProduct(source({
      product: {
        ...source().product,
        status: "draft",
        status_aktif: false
      }
    }));
    const priced = projectJerseyConfiguredProduct(source({
      product: {
        ...source().product,
        pricing_mode: "configurator_based"
      }
    }));

    expect(inactive).toMatchObject({
      status: "not_found",
      code: "jersey_configured_product.not_available"
    });
    expect(priced).toMatchObject({
      status: "not_found",
      code: "jersey_configured_product.not_available"
    });
  });

  it("creates a deterministic immutable quotation-required snapshot through P9 runtime", async () => {
    const consumer = readyConsumer();
    const first = projectJerseyConfiguredProduct(source());
    const second = projectJerseyConfiguredProduct(source());
    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    if (first.status !== "ready" || second.status !== "ready") return;
    expect(first.consumer.definition.version).toBe(second.consumer.definition.version);

    const resolved = await resolveConfiguredProductOnServer({
      productId: PRODUCT_ID,
      draft: draft(),
      requestId: "request-p10",
      snapshotId: "snapshot-p10",
      requestedAt: NOW
    }, {
      readDefinition: async () => ({
        status: "ready",
        definition: consumer.definition
      })
    });

    expect(resolved).toMatchObject({
      ok: true,
      snapshot: {
        immutable: true,
        pricing: null,
        validation: {
          valid: true,
          pricingStatus: "quotation_required"
        }
      }
    });
    if (resolved.ok) {
      expect(resolved.snapshot.inputFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(Object.isFrozen(resolved.snapshot)).toBe(true);
    }
  });

  it("rejects unverified upload, partial required-service quantity, and monetary request injection", () => {
    const definition = readyConsumer().definition;
    const wrongServiceQuantity = draft({
      services: definition.serviceRequirements.map((requirement) => ({
        requirementId: requirement.id,
        serviceCode: requirement.serviceCode,
        quantity: 1
      }))
    });
    expect(validateJerseyConsumerDraft(definition, wrongServiceQuantity)).toEqual([
      expect.objectContaining({
        code: "jersey_configured_product.service_quantity_mismatch"
      })
    ]);

    const validRequest = {
      productId: PRODUCT_ID,
      draft: draft(),
      requestId: "request-p10",
      snapshotId: "snapshot-p10",
      requestedAt: NOW
    };
    expect(parseJerseyResolveRequest(validRequest)).not.toBeNull();
    expect(parseJerseyResolveRequest({
      ...validRequest,
      price: 100
    })).toBeNull();
    expect(parseJerseyResolveRequest({
      ...validRequest,
      draft: {
        ...validRequest.draft,
        uploads: [{
          requirementId: "fake",
          uploadId: "fake",
          fileName: "fake.png",
          mimeType: "image/png",
          sizeBytes: 10
        }]
      }
    })).toBeNull();
  });

  it("keeps Jersey specialization outside generic core and removes legacy client pricing/cart identity", () => {
    const genericCore = [
      "lib/configured-product/domain.ts",
      "lib/configured-product/data-access.ts",
      "lib/configured-product/runtime.ts"
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");
    const client = readFileSync(
      join(process.cwd(), "components/JerseyConfigurator.tsx"),
      "utf8"
    );
    const page = readFileSync(
      join(process.cwd(), "app/jersey/configurator/page.tsx"),
      "utf8"
    );
    const access = readFileSync(
      join(process.cwd(), "lib/jersey-configured-product/data-access.ts"),
      "utf8"
    );

    expect(genericCore.toLowerCase()).not.toContain("jersey");
    expect(client).toContain("resolveJerseyConfiguredProduct");
    expect(client).toContain("cart.addConfiguredProduct");
    expect(client).not.toContain("cart.addItem");
    expect(client).not.toContain("sizeAdjustments");
    expect(client).not.toContain("JERSEY-CONFIG");
    expect(client).not.toContain("formatRupiah");
    expect(page).not.toContain("getPublicContent");
    expect(page).not.toContain("fallback");
    expect(access).toContain('.eq("pricing_mode", "custom_quote")');
    expect(access).toContain('.eq("status", "active")');
  });
});
