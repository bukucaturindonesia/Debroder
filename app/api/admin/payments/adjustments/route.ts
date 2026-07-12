import { paymentErrorResponse, requirePaymentActor } from "@/lib/payment-auth";
import { isPaymentVerifier } from "@/lib/payments";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const actor = await requirePaymentActor(request);
    if (!isPaymentVerifier(actor.role)) return Response.json({ error: "Role tidak dapat membuat koreksi." }, { status: 403 });
    const body = (await request.json()) as { paymentId?: unknown; type?: unknown; amount?: unknown; reason?: unknown };
    const client = getAdminSupabaseClient(); if (!client) throw new Error("Supabase admin belum dikonfigurasi.");
    const { data, error } = await client.rpc("create_payment_adjustment", {
      p_payment_id: body.paymentId, p_adjustment_type: body.type,
      p_amount: Math.round(Number(body.amount)), p_reason: body.reason, p_actor: actor.user.id
    });
    if (error) throw new Error(error.message);
    return Response.json({ adjustment: data }, { status: 201 });
  } catch (error) { return paymentErrorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePaymentActor(request);
    if (!isPaymentVerifier(actor.role)) return Response.json({ error: "Role tidak dapat memutus koreksi." }, { status: 403 });
    const body = (await request.json()) as { adjustmentId?: unknown; approve?: unknown; reason?: unknown };
    const client = getAdminSupabaseClient(); if (!client) throw new Error("Supabase admin belum dikonfigurasi.");
    const { data, error } = await client.rpc("decide_payment_adjustment", {
      p_adjustment_id: body.adjustmentId, p_approve: body.approve === true,
      p_reason: typeof body.reason === "string" ? body.reason : "", p_actor: actor.user.id
    });
    if (error) throw new Error(error.message);
    return Response.json({ adjustment: data });
  } catch (error) { return paymentErrorResponse(error); }
}
