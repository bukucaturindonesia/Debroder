import type {
  ProductConfigurationSnapshot,
  QuotationDraftListItem,
  QuotationStatus
} from "@/lib/types";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

export async function listQuotationDrafts(): Promise<QuotationDraftListItem[]> {
  const client = getAdminSupabaseClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("quotation_drafts")
    .select(
      `
        id,
        quotation_number,
        status,
        contact_name,
        contact_whatsapp,
        total_quantity,
        final_total,
        estimated_total,
        requires_review,
        configuration_snapshot,
        created_at,
        updated_at
      `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to load quotation drafts: ${error.message}`);
  }

  return asRecordArray(data).map(mapQuotationRow);
}

function mapQuotationRow(row: Record<string, unknown>): QuotationDraftListItem {
  return {
    id: asString(row.id),
    quotationNumber: asString(row.quotation_number),
    status: asQuotationStatus(row.status),
    contactName: asNullableString(row.contact_name),
    contactWhatsapp: asNullableString(row.contact_whatsapp),
    totalQuantity: asNumber(row.total_quantity),
    finalTotal: asNumber(row.final_total),
    estimatedTotal: asNumber(row.estimated_total),
    requiresReview: asBoolean(row.requires_review),
    configurationSnapshot: asConfigurationSnapshot(row.configuration_snapshot),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  };
}

function asConfigurationSnapshot(value: unknown): ProductConfigurationSnapshot {
  if (isRecord(value)) {
    return value as ProductConfigurationSnapshot;
  }

  return {
    product_id: "",
    product_slug: "",
    product_name: "",
    items: [],
    note: "",
    upload_refs: [],
    total_quantity: 0,
    estimated_product_total: 0,
    estimated_service_total: 0,
    estimated_grand_total: 0,
    requires_review: false,
    created_at: "",
    updated_at: ""
  };
}

function asQuotationStatus(value: unknown): QuotationStatus {
  if (
    value === "submitted" ||
    value === "reviewing" ||
    value === "quoted" ||
    value === "expired" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "draft";
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

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

