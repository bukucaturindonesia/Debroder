import "server-only";

import { createHash } from "node:crypto";
import {
  CONTRACT_VERSIONS,
  type ConfiguredProductDefinition,
  type ConfiguredProductDraft,
  type ContractFieldIssue
} from "@/lib/contracts";
import { MAX_CART_LINE_QUANTITY } from "@/lib/cart-v5";
import { buildConfiguredProductDefinition } from "@/lib/configured-product/domain";

const JERSEY_ENTRY_TYPE = "jersey_configurator";
const JERSEY_DEFINITION_CODE = "jersey-configured-product";

type JerseyProductSource = {
  id: string;
  name: string | null;
  nama: string | null;
  slug: string;
  status: string | null;
  status_aktif: boolean | null;
  product_type: string | null;
  pricing_mode: string | null;
  uses_configurator: boolean | null;
  minimum_order_qty: number | null;
  config_schema: unknown;
  image_url: string | null;
  gambar_url: string | null;
  image_alt: string | null;
  updated_at: string | null;
};

type JerseyOptionSource = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  updated_at: string | null;
};

type JerseyCollarSource = JerseyOptionSource & {
  group_id: string | null;
};

type JerseyServiceSource = {
  id: string;
  service_id: string | null;
  service_name: string;
  service_slug: string;
  is_active: boolean | null;
  sort_order: number | null;
  updated_at: string | null;
};

type JerseySizeSource = JerseyOptionSource & {
  size_group: string | null;
};

export type JerseyConfiguredProductSource = {
  product: unknown;
  packages: unknown;
  materials: unknown;
  collarGroups: unknown;
  collars: unknown;
  addons: unknown;
  requiredServices: unknown;
  sizes: unknown;
};

export type JerseyConfiguredProductConsumer = {
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    imageAlt?: string;
  };
  definition: ConfiguredProductDefinition;
};

export type JerseyConfiguredProductProjection =
  | { status: "ready"; consumer: JerseyConfiguredProductConsumer }
  | {
      status: "not_found" | "invalid";
      code: `jersey_configured_product.${string}`;
      message: string;
      issues?: readonly ContractFieldIssue[];
    };

export function projectJerseyConfiguredProduct(
  source: JerseyConfiguredProductSource
): JerseyConfiguredProductProjection {
  const product = readProduct(source.product);
  if (!product) {
    return invalid("source_invalid", "Sumber produk Jersey tidak valid.");
  }
  if (
    product.status !== "active"
    || product.status_aktif !== true
    || product.product_type !== "configurable_product"
    || product.uses_configurator !== true
    || product.pricing_mode !== "custom_quote"
    || !hasJerseyEntryType(product.config_schema)
  ) {
    return {
      status: "not_found",
      code: "jersey_configured_product.not_available",
      message: "Jersey configured product belum tersedia."
    };
  }
  if (
    product.minimum_order_qty === null
    || !Number.isSafeInteger(product.minimum_order_qty)
    || product.minimum_order_qty < 1
    || product.minimum_order_qty > MAX_CART_LINE_QUANTITY
  ) {
    return invalid("minimum_invalid", "Minimum order Jersey tidak valid.");
  }

  const packages = readOptionArray(source.packages);
  const materials = readOptionArray(source.materials);
  const collarGroups = readOptionArray(source.collarGroups);
  const collars = readCollarArray(source.collars);
  const addons = readOptionArray(source.addons);
  const requiredServices = readServiceArray(source.requiredServices);
  const sizes = readSizeArray(source.sizes);
  if (
    !packages
    || !materials
    || !collarGroups
    || !collars
    || !addons
    || !requiredServices
    || !sizes
  ) {
    return invalid("master_invalid", "Master data Jersey tidak valid.");
  }

  const activePackages = activeSorted(packages);
  const activeMaterials = activeSorted(materials);
  const activeGroups = activeSorted(collarGroups);
  const groupById = new Map(activeGroups.map((group) => [group.id, group]));
  const activeCollars = activeSorted(collars).filter(
    (collar) => collar.group_id !== null && groupById.has(collar.group_id)
  );
  const activeAddons = activeSorted(addons);
  const activeServices = activeSorted(requiredServices);
  const activeSizes = activeSorted(sizes).filter(
    (size) => size.size_group === "apparel"
  );
  if (
    activePackages.length === 0
    || activeMaterials.length === 0
    || activeCollars.length === 0
    || activeServices.length === 0
    || activeSizes.length === 0
  ) {
    return invalid(
      "master_incomplete",
      "Master paket, bahan, kerah, layanan, atau ukuran Jersey belum lengkap."
    );
  }

  const version = definitionVersion({
    product,
    packages: activePackages,
    materials: activeMaterials,
    collarGroups: activeGroups,
    collars: activeCollars,
    addons: activeAddons,
    requiredServices: activeServices,
    sizes: activeSizes
  });
  const definitionResult = buildConfiguredProductDefinition({
    productId: product.id,
    productName: product.name?.trim() || product.nama?.trim() || "",
    minimumQuantity: product.minimum_order_qty,
    productUpdatedAt: product.updated_at ?? "",
    configSchema: {
      contractVersion: CONTRACT_VERSIONS.configuredProduct,
      version,
      code: JERSEY_DEFINITION_CODE,
      pricingMode: "quotation_required",
      maximumQuantity: MAX_CART_LINE_QUANTITY,
      optionGroups: [
        selectGroup("jersey-package", "package", "Paket jersey", activePackages, 10),
        selectGroup("jersey-material", "material", "Bahan", activeMaterials, 20),
        {
          id: "jersey-collar",
          code: "collar",
          label: "Kerah",
          inputType: "single_select",
          required: true,
          minimumSelections: 1,
          maximumSelections: 1,
          options: activeCollars.map((collar) => {
            const group = collar.group_id ? groupById.get(collar.group_id) : undefined;
            return {
              id: collar.id,
              code: collar.slug,
              label: collar.name,
              ...(collar.description ? { description: collar.description } : {}),
              metadata: {
                groupId: group?.id ?? "",
                groupLabel: group?.name ?? ""
              },
              sortOrder: collar.sort_order ?? 0
            };
          }),
          sortOrder: 30
        },
        ...(activeAddons.length > 0 ? [{
          id: "jersey-addons",
          code: "addons",
          label: "Addon opsional",
          inputType: "multi_select" as const,
          required: false,
          minimumSelections: 0,
          maximumSelections: activeAddons.length,
          options: activeAddons.map(option),
          sortOrder: 40
        }] : []),
        textGroup("jersey-team-name", "team_name", "Nama tim / komunitas", 50),
        textGroup("jersey-sleeve", "sleeve_requirement", "Kebutuhan lengan", 60),
        textGroup("jersey-player-roster", "player_roster", "Data pemain", 70),
        textGroup("jersey-design-reference", "design_reference", "Referensi desain", 80),
        textGroup("jersey-logo", "logo_requirement", "Kebutuhan logo", 90),
        textGroup("jersey-sponsor", "sponsor_requirement", "Kebutuhan sponsor", 100),
        textGroup("jersey-name-number", "name_number_requirement", "Kebutuhan nama dan nomor", 110)
      ],
      compatibilityRules: [],
      allocationDimensions: [{
        id: "jersey-size-allocation",
        code: "size",
        label: "Ukuran",
        required: true,
        allowedValues: activeSizes.map((size) => size.name)
      }],
      serviceRequirements: activeServices.map((service) => ({
        id: service.id,
        serviceCode: service.service_slug,
        label: service.service_name,
        required: true,
        minimumQuantity: 1,
        maximumQuantity: MAX_CART_LINE_QUANTITY
      })),
      uploadRequirements: [],
      policyReferences: [
        reference("jersey_packages", activePackages),
        reference("jersey_materials", activeMaterials),
        reference("jersey_collar_groups", activeGroups),
        reference("jersey_collars", activeCollars),
        reference("jersey_addons", activeAddons),
        reference("jersey_required_services", activeServices),
        reference("product_size_master", activeSizes)
      ]
    }
  });
  if (!definitionResult.ok) {
    return {
      status: "invalid",
      code: "jersey_configured_product.definition_invalid",
      message: "Definition Jersey tidak valid.",
      issues: definitionResult.issues
    };
  }

  return {
    status: "ready",
    consumer: {
      product: {
        id: product.id,
        name: product.name?.trim() || product.nama?.trim() || "",
        slug: product.slug,
        ...(product.image_url || product.gambar_url
          ? { imageUrl: product.image_url || product.gambar_url || undefined }
          : {}),
        ...(product.image_alt ? { imageAlt: product.image_alt } : {})
      },
      definition: definitionResult.definition
    }
  };
}

export function validateJerseyConsumerDraft(
  definition: ConfiguredProductDefinition,
  draft: ConfiguredProductDraft
): readonly ContractFieldIssue[] {
  const issues: ContractFieldIssue[] = [];
  if (definition.code !== JERSEY_DEFINITION_CODE) {
    issues.push({
      field: "definition.code",
      code: "jersey_configured_product.definition_mismatch",
      message: "Definition bukan milik Jersey configurator."
    });
  }
  if (draft.uploads.length > 0) {
    issues.push({
      field: "uploads",
      code: "jersey_configured_product.upload_unverified",
      message: "Upload Jersey belum memiliki authority server yang terverifikasi."
    });
  }
  for (const requirement of definition.serviceRequirements.filter((item) => item.required)) {
    const selection = draft.services.find(
      (item) => item.requirementId === requirement.id
    );
    if (selection && selection.quantity !== draft.quantity) {
      issues.push({
        field: `services.${requirement.id}.quantity`,
        code: "jersey_configured_product.service_quantity_mismatch",
        message: "Layanan wajib Jersey harus mengikuti seluruh quantity konfigurasi."
      });
    }
  }
  return issues;
}

function selectGroup(
  id: string,
  code: string,
  label: string,
  options: readonly JerseyOptionSource[],
  sortOrder: number
) {
  return {
    id,
    code,
    label,
    inputType: "single_select" as const,
    required: true,
    minimumSelections: 1,
    maximumSelections: 1,
    options: options.map(option),
    sortOrder
  };
}

function textGroup(id: string, code: string, label: string, sortOrder: number) {
  return {
    id,
    code,
    label,
    inputType: "text" as const,
    required: true,
    options: [],
    sortOrder
  };
}

function option(item: JerseyOptionSource) {
  return {
    id: item.id,
    code: item.slug,
    label: item.name,
    ...(item.description ? { description: item.description } : {}),
    sortOrder: item.sort_order ?? 0
  };
}

function reference(
  table: string,
  rows: readonly { id: string; updated_at: string | null }[]
) {
  return {
    type: "jersey_master_table",
    id: table,
    version: latestTimestamp(rows)
  };
}

function definitionVersion(value: object) {
  return `jersey-v1-${createHash("sha256")
    .update(stableSerialize(value))
    .digest("hex")}`;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function latestTimestamp(rows: readonly { updated_at: string | null }[]) {
  return rows
    .map((row) => row.updated_at)
    .filter((value): value is string => typeof value === "string")
    .sort()
    .at(-1) ?? "unversioned";
}

function activeSorted<T extends { is_active: boolean | null; sort_order: number | null; name?: string; service_name?: string }>(
  rows: readonly T[]
) {
  return rows
    .filter((row) => row.is_active === true)
    .sort((left, right) => (
      (left.sort_order ?? 0) - (right.sort_order ?? 0)
      || (left.name ?? left.service_name ?? "").localeCompare(right.name ?? right.service_name ?? "")
    ));
}

function readProduct(value: unknown): JerseyProductSource | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.id)
    || !isString(value.slug)
    || !nullableString(value.name)
    || !nullableString(value.nama)
    || !nullableString(value.status)
    || !nullableBoolean(value.status_aktif)
    || !nullableString(value.product_type)
    || !nullableString(value.pricing_mode)
    || !nullableBoolean(value.uses_configurator)
    || !nullableInteger(value.minimum_order_qty)
    || !nullableString(value.image_url)
    || !nullableString(value.gambar_url)
    || !nullableString(value.image_alt)
    || !nullableString(value.updated_at)
  ) return null;
  return {
    id: value.id,
    name: value.name,
    nama: value.nama,
    slug: value.slug,
    status: value.status,
    status_aktif: value.status_aktif,
    product_type: value.product_type,
    pricing_mode: value.pricing_mode,
    uses_configurator: value.uses_configurator,
    minimum_order_qty: value.minimum_order_qty,
    config_schema: value.config_schema,
    image_url: value.image_url,
    gambar_url: value.gambar_url,
    image_alt: value.image_alt,
    updated_at: value.updated_at
  };
}

function readOptionArray(value: unknown): JerseyOptionSource[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.map(readOption);
  return rows.every((row): row is JerseyOptionSource => row !== null) ? rows : null;
}

function readOption(value: unknown): JerseyOptionSource | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.id)
    || !isString(value.name)
    || !isString(value.slug)
    || !optionalNullableString(value.description)
    || !nullableBoolean(value.is_active)
    || !nullableInteger(value.sort_order)
    || !nullableString(value.updated_at)
  ) return null;
  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
    ...(typeof value.description === "string" || value.description === null
      ? { description: value.description }
      : {}),
    is_active: value.is_active,
    sort_order: value.sort_order,
    updated_at: value.updated_at
  };
}

function readCollarArray(value: unknown): JerseyCollarSource[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.map((entry) => {
    const base = readOption(entry);
    if (!base || !isRecord(entry) || !nullableString(entry.group_id)) return null;
    return { ...base, group_id: entry.group_id };
  });
  return rows.every((row): row is JerseyCollarSource => row !== null) ? rows : null;
}

function readServiceArray(value: unknown): JerseyServiceSource[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.map((entry): JerseyServiceSource | null => {
    if (
      !isRecord(entry)
      || !isString(entry.id)
      || !nullableString(entry.service_id)
      || !isString(entry.service_name)
      || !isString(entry.service_slug)
      || !nullableBoolean(entry.is_active)
      || !nullableInteger(entry.sort_order)
      || !nullableString(entry.updated_at)
    ) return null;
    return {
      id: entry.id,
      service_id: entry.service_id,
      service_name: entry.service_name,
      service_slug: entry.service_slug,
      is_active: entry.is_active,
      sort_order: entry.sort_order,
      updated_at: entry.updated_at
    };
  });
  return rows.every((row): row is JerseyServiceSource => row !== null) ? rows : null;
}

function readSizeArray(value: unknown): JerseySizeSource[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.map((entry): JerseySizeSource | null => {
    const base = readOption(entry);
    if (!base || !isRecord(entry) || !nullableString(entry.size_group)) return null;
    return { ...base, size_group: entry.size_group };
  });
  return rows.every((row): row is JerseySizeSource => row !== null) ? rows : null;
}

function hasJerseyEntryType(value: unknown) {
  return isRecord(value) && value.entry_type === JERSEY_ENTRY_TYPE;
}

function invalid(
  code: string,
  message: string
): JerseyConfiguredProductProjection {
  return {
    status: "invalid",
    code: `jersey_configured_product.${code}`,
    message
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function optionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || nullableString(value);
}

function nullableBoolean(value: unknown): value is boolean | null {
  return value === null || typeof value === "boolean";
}

function nullableInteger(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value));
}
