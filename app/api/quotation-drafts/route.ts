import { NextResponse } from "next/server";
import type { CartItem, ProductConfigurationSnapshot } from "@/lib/types";
import { validateMinimumOrder } from "@/lib/bulk-ordering";
import { listCustomServices } from "@/lib/supabase/custom-services";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { listProducts, revalidateCartItems } from "@/lib/supabase/products";

export async function POST(request: Request) {
  const client = getAdminSupabaseClient();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase service role belum dikonfigurasi untuk draft penawaran." },
      { status: 503 }
    );
  }

  const body: unknown = await request.json();
  const payload = parseQuotationPayload(body);

  if (!payload) {
    return NextResponse.json(
      { error: "Payload draft penawaran tidak valid." },
      { status: 400 }
    );
  }

  const revalidationResults = await revalidateCartItems(
    payload.snapshot.items.map((item) => ({
      product_id: item.product_id,
      product_variant_size_id: item.product_variant_size_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      price_tier_id: item.price_tier?.tier_id ?? null
    }))
  );
  const revalidationMessages = revalidationResults
    .filter((result) => result.status !== "ok")
    .map((result) => result.message ?? "Data produk berubah.");

  if (revalidationMessages.length > 0) {
    return NextResponse.json(
      { error: revalidationMessages.join(" ") },
      { status: 409 }
    );
  }

  const products = await listProducts();
  const product = products.find(
    (candidate) => candidate.id === payload.snapshot.product_id
  );
  const minimumIssues = product
    ? validateMinimumOrder(product, payload.snapshot.total_quantity)
    : [];

  if (minimumIssues.some((issue) => issue.severity === "error")) {
    return NextResponse.json(
      { error: minimumIssues.map((issue) => issue.message).join(" ") },
      { status: 422 }
    );
  }

  const services = await listCustomServices({ includeInactive: true });
  const activeServiceIds = new Set(
    services.filter((service) => service.status === "active").map((service) => service.id)
  );
  const inactiveServices = payload.snapshot.items.flatMap((item) =>
    (item.services ?? []).filter(
      (service) => !activeServiceIds.has(service.service_id)
    )
  );

  if (inactiveServices.length > 0) {
    return NextResponse.json(
      { error: "Salah satu layanan custom sudah tidak aktif." },
      { status: 409 }
    );
  }

  const { data: quotation, error: quotationError } = await client
    .from("quotation_drafts")
    .insert({
      product_id: payload.snapshot.product_id,
      session_token: payload.session_token,
      contact_name: payload.contact_name,
      contact_whatsapp: payload.contact_whatsapp,
      contact_email: payload.contact_email,
      general_note: payload.snapshot.note,
      status: "submitted",
      total_quantity: payload.snapshot.total_quantity,
      final_total: payload.snapshot.requires_review
        ? 0
        : payload.snapshot.estimated_grand_total,
      estimated_total: payload.snapshot.estimated_grand_total,
      requires_review: payload.snapshot.requires_review,
      configuration_snapshot: payload.snapshot
    })
    .select("id, quotation_number")
    .single();

  if (quotationError || !quotation) {
    return NextResponse.json(
      { error: quotationError?.message ?? "Draft penawaran gagal dibuat." },
      { status: 500 }
    );
  }

  const quotationId = String(quotation.id);
  const itemRows = payload.snapshot.items.map((item) => ({
    quotation_draft_id: quotationId,
    product_id: item.product_id,
    product_variant_id: item.product_variant_id,
    product_variant_size_id: item.product_variant_size_id,
    snapshot: item,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tier_snapshot: item.price_tier ?? null,
    service_snapshot: item.services ?? [],
    file_snapshot: item.upload_refs ?? [],
    item_note: item.line_note ?? null,
    final_total: item.requires_review ? 0 : getItemEstimatedTotal(item),
    estimated_total: getItemEstimatedTotal(item),
    requires_review: Boolean(item.requires_review)
  }));

  if (itemRows.length > 0) {
    const { error: itemsError } = await client
      .from("quotation_draft_items")
      .insert(itemRows);

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    quotation_id: quotationId,
    quotation_number: String(quotation.quotation_number)
  });
}

interface QuotationPayload {
  session_token: string;
  contact_name: string | null;
  contact_whatsapp: string;
  contact_email: string | null;
  snapshot: ProductConfigurationSnapshot;
}

function parseQuotationPayload(value: unknown): QuotationPayload | null {
  if (!isRecord(value) || !isConfigurationSnapshot(value.snapshot)) {
    return null;
  }

  const sessionToken = asCleanToken(value.session_token);
  const contactWhatsapp = asNonEmptyString(value.contact_whatsapp);

  if (!sessionToken || !contactWhatsapp || value.snapshot.items.length === 0) {
    return null;
  }

  return {
    session_token: sessionToken,
    contact_name: asNullableString(value.contact_name),
    contact_whatsapp: contactWhatsapp,
    contact_email: asNullableString(value.contact_email),
    snapshot: value.snapshot
  };
}

function isConfigurationSnapshot(
  value: unknown
): value is ProductConfigurationSnapshot {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return false;
  }

  return (
    typeof value.product_id === "string" &&
    typeof value.product_slug === "string" &&
    typeof value.product_name === "string" &&
    typeof value.note === "string" &&
    typeof value.total_quantity === "number" &&
    typeof value.estimated_grand_total === "number" &&
    typeof value.requires_review === "boolean" &&
    value.items.every(isCartItemSnapshot)
  );
}

function isCartItemSnapshot(value: unknown): value is CartItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.product_id === "string" &&
    typeof value.product_variant_id === "string" &&
    typeof value.product_variant_size_id === "string" &&
    typeof value.nama_produk === "string" &&
    typeof value.quantity === "number" &&
    typeof value.unit_price === "number"
  );
}

function getItemEstimatedTotal(item: CartItem): number {
  const serviceTotal = (item.services ?? []).reduce(
    (sum, service) =>
      sum +
      (service.unit_price === null ? 0 : service.unit_price * service.quantity) +
      (service.flat_price ?? 0),
    0
  );

  return item.quantity * item.unit_price + serviceTotal;
}

function asCleanToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.replace(/[^a-zA-Z0-9_-]/g, "");
  return token.length >= 8 ? token : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
