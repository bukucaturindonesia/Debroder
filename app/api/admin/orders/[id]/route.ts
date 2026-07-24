import type { AdminOrderCommand } from "@/lib/admin-orders/contracts";
import { loadAdminOrderDetailPage } from "@/lib/admin-orders/page-use-case";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePhase13Actor(request, "order.read");
    const { id } = await context.params;
    const readModel = await loadAdminOrderDetailPage(actor.client, id);
    if (!readModel) {
      return Response.json(
        { error: "Pesanan tidak ditemukan." },
        { status: 404, headers: { "cache-control": "private, no-store" } }
      );
    }
    return Response.json(readModel, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePhase13Actor(request, "order.edit");
    const { id } = await context.params;
    const command = await readCommand(request);

    if (command.action === "update_delivery") {
      const { error } = await actor.client.rpc("update_order_delivery_details", {
        p_order_id: id,
        p_delivery_method: command.deliveryMethod,
        p_shipping_address: command.shippingAddress.trim(),
        p_customer_notes: command.customerNotes.trim(),
        p_admin_notes: command.adminNotes.trim()
      });
      if (error) throw new Error(error.message);
    } else if (command.action === "cancel") {
      const reason = command.reason.trim();
      if (!reason) return Response.json({ error: "Alasan pembatalan wajib diisi." }, { status: 400 });
      const { error } = await actor.client.rpc("cancel_order_transactional", {
        p_order_id: id,
        p_reason: reason
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await actor.client.rpc("archive_order", {
        p_order_id: id,
        p_reason: command.reason?.trim() || null
      });
      if (error) throw new Error(error.message);
    }

    return Response.json({ ok: true }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}

async function readCommand(request: Request): Promise<AdminOrderCommand> {
  const value: unknown = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Command pesanan tidak valid.");
  }
  const row = Object.fromEntries(Object.entries(value));
  if (row.action === "update_delivery") {
    return {
      action: "update_delivery",
      deliveryMethod: string(row.deliveryMethod),
      shippingAddress: string(row.shippingAddress),
      customerNotes: string(row.customerNotes),
      adminNotes: string(row.adminNotes)
    };
  }
  if (row.action === "cancel") {
    return { action: "cancel", reason: string(row.reason) };
  }
  if (row.action === "archive") {
    return {
      action: "archive",
      reason: row.reason === null ? null : string(row.reason)
    };
  }
  throw new Error("Command pesanan tidak dikenali.");
}

function string(value: unknown) {
  return typeof value === "string" ? value : "";
}
