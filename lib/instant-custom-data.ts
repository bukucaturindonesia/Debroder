import "server-only";

import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  createInstantCustomSnapshot,
  instantServiceDefinitionSchema,
  instantServiceSelectionSchema,
  priceInstantServices,
  type InstantCustomSnapshot,
  type InstantServiceDefinition
} from "@/lib/instant-custom";
import { z } from "zod";

type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pricing_type: string;
  base_price: number;
  minimum_quantity: number;
  maximum_quantity: number | null;
  requires_upload: boolean;
  requires_notes: boolean;
  requires_review: boolean;
  input_schema: unknown;
  sort_order: number;
  updated_at: string;
  service_pricing_rules: unknown;
};

export async function listInstantServicesForProduct(
  productId: string,
  productCategoryId: string
): Promise<InstantServiceDefinition[]> {
  const client = getAdminSupabaseClient() ?? getPublicSupabaseClient();
  if (!client) return [];

  const { data: category } = await client
    .from("custom_categories")
    .select("id,supports_quick_custom,status,is_active")
    .eq("source_product_category_id", productCategoryId)
    .eq("status", "published")
    .eq("is_active", true)
    .eq("supports_quick_custom", true)
    .maybeSingle();
  if (!category) return [];

  const { data: assignments, error: assignmentError } = await client
    .from("custom_service_compatibilities")
    .select("service_id")
    .eq("is_active", true)
    .or(`product_id.eq.${productId},custom_category_id.eq.${category.id}`);
  if (assignmentError) throw assignmentError;
  const serviceIds = Array.from(new Set((assignments ?? []).map((row) => String(row.service_id))));
  if (!serviceIds.length) return [];

  const { data, error } = await client
    .from("custom_services")
    .select("id,slug,name,description,pricing_type,base_price,minimum_quantity,maximum_quantity,requires_upload,requires_notes,requires_review,input_schema,sort_order,updated_at,service_pricing_rules(id,min_quantity,max_quantity,unit_price,flat_price,quote_required,status)")
    .in("id", serviceIds)
    .eq("status", "active")
    .eq("requires_review", false)
    .in("pricing_type", ["fixed_per_item", "fixed_per_order", "tiered"])
    .order("sort_order");
  if (error) throw error;

  return (data as ServiceRow[] ?? []).flatMap((row) => {
    const parsed = instantServiceDefinitionSchema.safeParse({
      id: row.id,
      code: row.slug,
      name: row.name,
      description: row.description,
      pricingType: row.pricing_type,
      basePrice: Number(row.base_price),
      minimumQuantity: Number(row.minimum_quantity),
      maximumQuantity: row.maximum_quantity === null ? null : Number(row.maximum_quantity),
      requiresUpload: row.requires_upload,
      requiresNotes: row.requires_notes,
      inputSchema: Array.isArray(row.input_schema) ? row.input_schema : [],
      sortOrder: Number(row.sort_order),
      updatedAt: row.updated_at,
      pricingRules: Array.isArray(row.service_pricing_rules)
        ? row.service_pricing_rules
            .filter((rule): rule is Record<string, unknown> => Boolean(rule) && typeof rule === "object")
            .filter((rule) => rule.status === "active")
            .map((rule) => ({
              id: rule.id,
              minQuantity: rule.min_quantity,
              maxQuantity: rule.max_quantity,
              unitPrice: rule.unit_price,
              flatPrice: rule.flat_price,
              quoteRequired: rule.quote_required
            }))
        : []
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function repriceInstantServicesForProduct(input: {
  productId: string;
  productCategoryId: string;
  quantity: number;
  selections: unknown;
}): Promise<
  | { ok: true; snapshot?: InstantCustomSnapshot }
  | { ok: false; code: string; message: string }
> {
  const parsedSelections = z.array(instantServiceSelectionSchema).max(10).safeParse(input.selections);
  if (!parsedSelections.success) {
    return { ok: false, code: "INSTANT_SERVICE_SELECTION_INVALID", message: "Pilihan layanan tidak valid." };
  }
  if (parsedSelections.data.length === 0) return { ok: true };
  const definitions = await listInstantServicesForProduct(input.productId, input.productCategoryId);
  const pricing = priceInstantServices(definitions, parsedSelections.data, input.quantity);
  if (!pricing.ok) return pricing;
  const uploads = parsedSelections.data.flatMap((selection) =>
    selection.uploadIds.map((id) => ({ id, sessionToken: selection.uploadSessionToken ?? "" }))
  );
  if (uploads.length) {
    const ids = uploads.map((upload) => upload.id);
    if (new Set(ids).size !== ids.length) {
      return { ok: false, code: "INSTANT_SERVICE_UPLOAD_INVALID", message: "Referensi file layanan duplikat." };
    }
    const client = getAdminSupabaseClient();
    if (!client) {
      return { ok: false, code: "INSTANT_SERVICE_UPLOAD_UNAVAILABLE", message: "File layanan belum dapat diverifikasi." };
    }
    const { data, error } = await client
      .from("customer_uploads")
      .select("id,session_token,status")
      .in("id", ids)
      .in("status", ["uploaded", "linked"]);
    if (error) throw error;
    const byId = new Map((data ?? []).map((row) => [String(row.id), row]));
    if (uploads.some((upload) => String(byId.get(upload.id)?.session_token ?? "") !== upload.sessionToken)) {
      return { ok: false, code: "INSTANT_SERVICE_UPLOAD_INVALID", message: "Referensi file layanan tidak valid." };
    }
  }
  return {
    ok: true,
    snapshot: createInstantCustomSnapshot(parsedSelections.data, pricing)
  };
}
