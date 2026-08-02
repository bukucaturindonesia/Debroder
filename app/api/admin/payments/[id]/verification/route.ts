import { paymentErrorResponse, requirePaymentActor } from "@/lib/payment-auth";
import {
  classifyPaymentReviewResult,
  isPaymentVerifier,
  parsePaymentReviewInput,
  type PaymentReviewAction
} from "@/lib/payments";

type Context = { params: Promise<{ id: string }> };

const CANONICAL_PAYMENT_FIELDS = "id,order_id,payment_number,status,review_outcome,verified_amount,verified_destination_account,verified_transaction_at,verified_reference,verified_at,rejection_reason,admin_notes,updated_at" as const;

type PaymentClient = Awaited<ReturnType<typeof requirePaymentActor>>["client"];

async function getCanonicalPayment(client: PaymentClient, paymentId: string) {
  return client
    .from("order_payments")
    .select(CANONICAL_PAYMENT_FIELDS)
    .eq("id", paymentId)
    .maybeSingle();
}

function reviewResponse(input: {
  action: PaymentReviewAction;
  currentStatus?: string | null;
  errorMessage?: string | null;
  payment: unknown;
}) {
  const result = classifyPaymentReviewResult(input);
  return Response.json(
    {
      error: result.status >= 400 ? result.message : undefined,
      message: result.message,
      code: result.code,
      idempotent: result.idempotent,
      canonicalPayment: input.payment
    },
    { status: result.status }
  );
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePaymentActor(request, "payment.verify");
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

    const currentResult = await getCanonicalPayment(actor.client, id);
    if (currentResult.error) {
      return Response.json(
        {
          error: "State pembayaran belum dapat dibaca. Coba lagi.",
          code: "PAYMENT_STATE_UNAVAILABLE"
        },
        { status: 503 }
      );
    }
    if (!currentResult.data) {
      return reviewResponse({
        action: body.action,
        errorMessage: "Pending payment not found",
        payment: null
      });
    }
    if (currentResult.data.status !== "pending") {
      return reviewResponse({
        action: body.action,
        currentStatus: currentResult.data.status,
        payment: currentResult.data
      });
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
    const canonicalResult = await getCanonicalPayment(actor.client, id);
    const canonicalPayment = canonicalResult.data ?? currentResult.data;
    if (error) {
      return reviewResponse({
        action: body.action,
        currentStatus: canonicalPayment?.status,
        errorMessage: error.message,
        payment: canonicalPayment
      });
    }
    return Response.json({
      payment: canonicalPayment ?? data,
      canonicalPayment: canonicalPayment ?? data,
      code: "PAYMENT_REVIEW_APPLIED",
      idempotent: false,
      message: "Pemeriksaan pembayaran berhasil disimpan."
    });
  } catch (error) {
    return paymentErrorResponse(error, request);
  }
}
