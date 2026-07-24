import "server-only";

import type { ConfiguredProductDefinition, ContractFieldIssue } from "@/lib/contracts";
import { createSupabaseServerClient } from "@/lib/supabase";
import { buildConfiguredProductDefinition } from "./domain";

const CONFIGURED_PRODUCT_SELECT = "id,name,nama,status,status_aktif,product_type,pricing_mode,uses_configurator,minimum_order_qty,config_schema,updated_at";

export type ConfiguredProductDefinitionReadResult =
  | {
      status: "ready";
      definition: ConfiguredProductDefinition;
    }
  | {
      status: "not_found" | "unavailable" | "invalid";
      code: string;
      message: string;
      retryable: boolean;
      issues?: readonly ContractFieldIssue[];
    };

export type ConfiguredProductDefinitionRow = {
  id: string;
  name: string | null;
  nama: string | null;
  status: string | null;
  status_aktif: boolean | null;
  product_type: string | null;
  pricing_mode: string | null;
  uses_configurator: boolean | null;
  minimum_order_qty: number | null;
  config_schema: unknown;
  updated_at: string | null;
};

export async function readConfiguredProductDefinition(
  productId: string
): Promise<ConfiguredProductDefinitionReadResult> {
  if (!isNonEmptyString(productId)) {
    return {
      status: "invalid",
      code: "configured_product.definition.product_id_invalid",
      message: "Product ID tidak valid.",
      retryable: false
    };
  }

  const client = createSupabaseServerClient();
  if (!client) {
    return {
      status: "unavailable",
      code: "configured_product.definition.catalog_unavailable",
      message: "Configured-product catalog tidak tersedia.",
      retryable: true
    };
  }

  const { data, error } = await client
    .from("products")
    .select(CONFIGURED_PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    return {
      status: "unavailable",
      code: "configured_product.definition.catalog_read_failed",
      message: "Configured-product catalog gagal dibaca.",
      retryable: true
    };
  }
  if (!data || !isRecord(data)) {
    return {
      status: "not_found",
      code: "configured_product.definition.not_found",
      message: "Configured product tidak ditemukan.",
      retryable: false
    };
  }

  return projectConfiguredProductDefinitionRow(data);
}

export function projectConfiguredProductDefinitionRow(
  value: unknown
): ConfiguredProductDefinitionReadResult {
  const row = readRow(value);
  if (!row) {
    return {
      status: "invalid",
      code: "configured_product.definition.row_invalid",
      message: "Configured-product source tidak valid.",
      retryable: false
    };
  }

  if (
    row.status !== "active"
    || row.status_aktif !== true
    || row.product_type !== "configurable_product"
    || row.uses_configurator !== true
    || (row.pricing_mode !== "configurator_based" && row.pricing_mode !== "custom_quote")
  ) {
    return {
      status: "not_found",
      code: "configured_product.definition.not_available",
      message: "Configured product tidak tersedia.",
      retryable: false
    };
  }

  const definitionResult = buildConfiguredProductDefinition({
    productId: row.id,
    productName: row.name?.trim() || row.nama?.trim() || "",
    minimumQuantity: row.minimum_order_qty ?? 0,
    productUpdatedAt: row.updated_at ?? "",
    configSchema: row.config_schema
  });
  if (!definitionResult.ok) {
    return {
      status: "invalid",
      code: "configured_product.definition.schema_invalid",
      message: "Configured-product definition tidak valid.",
      retryable: false,
      issues: definitionResult.issues
    };
  }

  if (
    row.pricing_mode === "custom_quote"
    && definitionResult.definition.pricingMode !== "quotation_required"
  ) {
    return {
      status: "invalid",
      code: "configured_product.definition.pricing_authority_mismatch",
      message: "Configured-product pricing mode tidak sesuai authority produk.",
      retryable: false
    };
  }

  return { status: "ready", definition: definitionResult.definition };
}

function readRow(value: unknown): ConfiguredProductDefinitionRow | null {
  if (!isRecord(value)) return null;
  if (
    !isNonEmptyString(value.id)
    || (value.name !== null && typeof value.name !== "string")
    || (value.nama !== null && typeof value.nama !== "string")
    || (value.status !== null && typeof value.status !== "string")
    || (value.status_aktif !== null && typeof value.status_aktif !== "boolean")
    || (value.product_type !== null && typeof value.product_type !== "string")
    || (value.pricing_mode !== null && typeof value.pricing_mode !== "string")
    || (value.uses_configurator !== null && typeof value.uses_configurator !== "boolean")
    || (
      value.minimum_order_qty !== null
      && (
        typeof value.minimum_order_qty !== "number"
        || !Number.isSafeInteger(value.minimum_order_qty)
      )
    )
    || (value.updated_at !== null && typeof value.updated_at !== "string")
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    nama: value.nama,
    status: value.status,
    status_aktif: value.status_aktif,
    product_type: value.product_type,
    pricing_mode: value.pricing_mode,
    uses_configurator: value.uses_configurator,
    minimum_order_qty: value.minimum_order_qty,
    config_schema: value.config_schema,
    updated_at: value.updated_at
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
