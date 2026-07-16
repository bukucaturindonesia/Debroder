import { defaultCustomServices } from "@/lib/bulk-ordering";
import type {
  CustomService,
  ServicePricingRule,
  ServicePricingType
} from "@/lib/types";
import {
  getAdminSupabaseClient,
  getPublicSupabaseClient
} from "@/lib/supabase/client";

const SERVICE_SELECT = `
  id,
  slug,
  name,
  description,
  status,
  pricing_type,
  base_price,
  estimated_min_price,
  estimated_max_price,
  minimum_quantity,
  maximum_quantity,
  requires_upload,
  requires_notes,
  requires_review,
  allowed_file_types,
  is_stackable,
  exclusive_group,
  sort_order,
  service_pricing_rules (
    id,
    service_id,
    min_quantity,
    max_quantity,
    unit_price,
    flat_price,
    quote_required,
    status,
    sort_order
  )
`;

export async function listCustomServices(
  options: { includeInactive?: boolean; allowFallback?: boolean } = {}
): Promise<CustomService[]> {
  const client = options.includeInactive
    ? getAdminSupabaseClient() ?? getPublicSupabaseClient()
    : getPublicSupabaseClient();

  if (!client) {
    return options.allowFallback === false ? [] : defaultCustomServices;
  }

  let query = client.from("custom_services").select(SERVICE_SELECT).order("sort_order");

  if (!options.includeInactive) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load custom services: ${error.message}`);
  }

  return asRecordArray(data).map(mapCustomServiceRow);
}

function mapCustomServiceRow(row: Record<string, unknown>): CustomService {
  return {
    id: asString(row.id),
    slug: asString(row.slug),
    name: asString(row.name),
    description: asNullableString(row.description),
    status: asServiceStatus(row.status),
    pricingType: asPricingType(row.pricing_type),
    basePrice: asNumber(row.base_price),
    estimatedMinPrice: asNullableNumber(row.estimated_min_price),
    estimatedMaxPrice: asNullableNumber(row.estimated_max_price),
    minimumQuantity: asNumber(row.minimum_quantity),
    maximumQuantity: asNullableNumber(row.maximum_quantity),
    requiresUpload: asBoolean(row.requires_upload),
    requiresNotes: asBoolean(row.requires_notes),
    requiresReview: asBoolean(row.requires_review),
    allowedFileTypes: asStringArray(row.allowed_file_types),
    isStackable: asBoolean(row.is_stackable),
    exclusiveGroup: asNullableString(row.exclusive_group),
    sortOrder: asNumber(row.sort_order),
    pricingRules: asRecordArray(row.service_pricing_rules)
      .map(mapPricingRuleRow)
      .sort((a, b) => a.minQuantity - b.minQuantity || a.sortOrder - b.sortOrder)
  };
}

function mapPricingRuleRow(row: Record<string, unknown>): ServicePricingRule {
  return {
    id: asString(row.id),
    serviceId: asString(row.service_id),
    minQuantity: asNumber(row.min_quantity),
    maxQuantity: asNullableNumber(row.max_quantity),
    unitPrice: asNullableNumber(row.unit_price),
    flatPrice: asNullableNumber(row.flat_price),
    quoteRequired: asBoolean(row.quote_required),
    status: asLifecycleStatus(row.status),
    sortOrder: asNumber(row.sort_order)
  };
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asServiceStatus(value: unknown): CustomService["status"] {
  if (value === "inactive" || value === "archived") {
    return value;
  }

  return "active";
}

function asLifecycleStatus(value: unknown): "active" | "inactive" | "archived" {
  if (value === "inactive" || value === "archived") {
    return value;
  }

  return "active";
}

function asPricingType(value: unknown): ServicePricingType {
  if (
    value === "fixed_per_order" ||
    value === "tiered" ||
    value === "estimated" ||
    value === "manual_quote"
  ) {
    return value;
  }

  return "fixed_per_item";
}
