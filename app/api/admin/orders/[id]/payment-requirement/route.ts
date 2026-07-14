import { paymentErrorResponse, requirePaymentActor } from "@/lib/payment-auth";
import { isPaymentVerifier } from "@/lib/payments";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePaymentActor(request);
    if (!isPaymentVerifier(actor.role)) return Response.json({ error: "Role tidak dapat mengubah kebijakan pembayaran." }, { status: 403 });
    const { id } = await params;
    const body = (await request.json()) as { type?: unknown; percentage?: unknown; amount?: unknown; reason?: unknown };
    const { data, error } = await actor.client.rpc("set_order_payment_requirement", {
      p_order_id: id, p_requirement_type: body.type,
      p_percentage: body.percentage == null ? null : Number(body.percentage),
      p_amount: body.amount == null ? null : Math.round(Number(body.amount)),
      p_reason: typeof body.reason === "string" ? body.reason : "", p_actor: actor.user.id
    });
    if (error) throw new Error(error.message);
    return Response.json({ order: data });
  } catch (error) { return paymentErrorResponse(error); }
}
