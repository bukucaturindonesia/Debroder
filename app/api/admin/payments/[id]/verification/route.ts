import { paymentErrorResponse, requirePaymentActor } from "@/lib/payment-auth";
import { isPaymentVerifier } from "@/lib/payments";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePaymentActor(request);
    if (!isPaymentVerifier(actor.role)) {
      return Response.json(
        { error: "Role tidak dapat memverifikasi pembayaran." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: unknown;
      adminNotes?: unknown;
      reason?: unknown;
    };
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "verify") {
      const { data, error } = await actor.client.rpc("verify_order_payment", {
        p_payment_id: id,
        p_admin_notes:
          typeof body.adminNotes === "string" ? body.adminNotes : null
      });
      if (error) throw new Error(error.message);
      return Response.json({ payment: data });
    }

    if (action === "reject") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) {
        return Response.json(
          { error: "Alasan penolakan wajib diisi." },
          { status: 400 }
        );
      }
      const { data, error } = await actor.client.rpc("reject_order_payment", {
        p_payment_id: id,
        p_reason: reason
      });
      if (error) throw new Error(error.message);
      return Response.json({ payment: data });
    }

    return Response.json({ error: "Aksi pembayaran tidak valid." }, { status: 400 });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}
