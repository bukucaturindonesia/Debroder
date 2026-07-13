import { NextRequest } from "next/server";
import {
  applyActiveProductPricingToRepeatQuotation,
  getRepeatOrderPreview,
  listEligibleRepeatOrderSources,
  listRepeatOrderHistory,
  validateCreateRepeatOrderInput
} from "@/lib/repeat-orders";
import {
  repeatOrderErrorResponse,
  requireRepeatOrderActor
} from "@/lib/repeat-order-auth";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRepeatOrderActor(request, { create: true });
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const [sources, history] = await Promise.all([
      listEligibleRepeatOrderSources(actor.client, query),
      listRepeatOrderHistory(actor.client)
    ]);
    return Response.json({ sources, history, role: actor.role });
  } catch (error) {
    return repeatOrderErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRepeatOrderActor(request, { create: true });
    const body = await request.json().catch(() => null);
    const parsed = validateCreateRepeatOrderInput(body);
    if (!parsed.input) {
      return Response.json({ error: parsed.errors.join(" ") }, { status: 400 });
    }

    const preview = await getRepeatOrderPreview(actor.client, parsed.input.sourceOrderId);
    if (!preview.eligible) {
      return Response.json(
        { error: "Order lama belum memenuhi syarat Repeat Order." },
        { status: 409 }
      );
    }

    const { data, error } = await actor.client.rpc("create_repeat_order_quotation", {
      p_source_order_id: parsed.input.sourceOrderId,
      p_repeat_reason: parsed.input.reason,
      p_idempotency_key: parsed.input.idempotencyKey
    });
    if (error) throw new Error(error.message);

    const row = asRecord(data);
    const quotationId = text(row?.id);
    if (!quotationId) throw new Error("Quotation Repeat Order tidak berhasil dibuat.");

    let pricingWarning: string | null = null;
    try {
      await applyActiveProductPricingToRepeatQuotation(actor.client, quotationId, preview);
    } catch (pricingError) {
      pricingWarning =
        pricingError instanceof Error
          ? pricingError.message
          : "Harga aktif belum seluruhnya diterapkan.";
    }

    const { data: quotation, error: quotationError } = await actor.client
      .from("quotations")
      .select(
        "id,quotation_number,status,repeated_from_order_id,repeat_reason,has_pending_pricing,confirmed_total,estimated_total,created_at"
      )
      .eq("id", quotationId)
      .maybeSingle();
    if (quotationError || !quotation) {
      throw new Error(quotationError?.message || "Quotation Repeat Order tidak ditemukan.");
    }

    return Response.json(
      {
        quotation,
        pricingWarning,
        warnings: preview.warnings,
        idempotent: preview.history.some(
          (entry) => entry.idempotency_key === parsed.input?.idempotencyKey
        )
      },
      { status: 201 }
    );
  } catch (error) {
    return repeatOrderErrorResponse(error);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
