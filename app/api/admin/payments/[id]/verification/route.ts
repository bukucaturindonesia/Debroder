import { paymentErrorResponse, requirePaymentActor } from "@/lib/payment-auth";
import { isPaymentVerifier, parsePaymentReviewInput } from "@/lib/payments";

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
    const body = parsePaymentReviewInput(await request.json());
    if (!body) {
      return Response.json({ error: "Data pemeriksaan pembayaran tidak valid." }, { status: 400 });
    }
    if (body.action === "verify") {
      const allChecks = Object.values(body.checks).every(Boolean);
      if (!allChecks || !body.verifiedAmount || !body.verifiedTransactionAt
        || !body.verifiedDestinationAccount || !body.verifiedReference) {
        return Response.json({ error: "Lengkapi lima checklist dan data mutasi sebelum verifikasi." }, { status: 400 });
      }
    } else if (!body.reason) {
      return Response.json({ error: "Alasan tindak lanjut wajib diisi." }, { status: 400 });
    }

    const { data, error } = await actor.client.rpc("review_order_payment", {
      p_payment_id: id,
      p_action: body.action,
      p_destination_method_id: body.destinationMethodId || null,
      p_check_funds_received: body.checks.fundsReceived,
      p_check_destination_account: body.checks.destinationAccount,
      p_check_amount: body.checks.amount,
      p_check_transaction_time: body.checks.transactionTime,
      p_check_reference_unique: body.checks.referenceUnique,
      p_verified_amount: body.verifiedAmount,
      p_verified_destination_account: body.verifiedDestinationAccount || null,
      p_verified_transaction_at: body.verifiedTransactionAt,
      p_verified_reference: body.verifiedReference || null,
      p_admin_notes: body.adminNotes || null,
      p_reason: body.reason || null,
      p_expected_updated_at: body.expectedUpdatedAt
    });
    const message = error?.message ?? "";
    if (message.includes("Pending payment not found") || message.includes("STALE_PAYMENT_REVIEW")) {
      return Response.json({ error: "Pembayaran telah berubah atau ditangani Admin lain. Muat ulang sebelum melanjutkan." }, { status: 409 });
    }
    if (message.includes("DUPLICATE_BANK_REFERENCE")) {
      return Response.json({ error: "Referensi mutasi sudah digunakan pada pembayaran terverifikasi lain." }, { status: 409 });
    }
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ payment: data });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}
