import { getSiteUrl } from "@/lib/env";
import { paymentErrorResponse, requirePaymentActor } from "@/lib/payment-auth";
import { createPaymentToken } from "@/lib/payments";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requirePaymentActor(request);
    const { id } = await context.params;
    const client = getAdminSupabaseClient();
    if (!client) throw new Error("Supabase admin belum dikonfigurasi.");
    const { data, error } = await client.from("payment_submission_links")
      .select("id,order_id,expires_at,max_uses,used_count,last_submission_at,revoked_at,revoked_by,revoke_reason,created_by,archived_at,archived_by,archive_reason,created_at")
      .eq("order_id", id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Response.json({ links: data ?? [] });
  } catch (error) { return paymentErrorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePaymentActor(request);
    const { id } = await context.params;
    const body = (await request.json()) as { expiresInHours?: unknown; maxUses?: unknown };
    const expiresInHours = Math.min(720, Math.max(1, Number(body.expiresInHours ?? 72)));
    const maxUses = Math.min(20, Math.max(1, Math.round(Number(body.maxUses ?? 1))));
    const client = getAdminSupabaseClient();
    if (!client) throw new Error("Supabase admin belum dikonfigurasi.");
    const { data: order } = await client.from("orders").select("id").eq("id", id).is("archived_at", null).maybeSingle();
    if (!order) return Response.json({ error: "Pesanan aktif tidak ditemukan." }, { status: 404 });
    const value = createPaymentToken();
    const { data, error } = await client.from("payment_submission_links").insert({
      order_id: id, token_hash: value.hash,
      expires_at: new Date(Date.now() + expiresInHours * 3600000).toISOString(),
      max_uses: maxUses, created_by: actor.user.id
    }).select("id,expires_at,max_uses").single();
    if (error) throw new Error(error.message);
    return Response.json({ link: data, publicUrl: `${getSiteUrl()}/payment/${value.token}` }, { status: 201 });
  } catch (error) { return paymentErrorResponse(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePaymentActor(request);
    const { id } = await context.params;
    const body = (await request.json()) as { linkId?: unknown; action?: unknown; reason?: unknown };
    const linkId = typeof body.linkId === "string" ? body.linkId : "";
    const action = typeof body.action === "string" ? body.action : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;
    const client = getAdminSupabaseClient();
    if (!client) throw new Error("Supabase admin belum dikonfigurasi.");
    let patch: Record<string, string | null>;
    if (action === "revoke") patch = { revoked_at: new Date().toISOString(), revoked_by: actor.user.id, revoke_reason: reason };
    else if (action === "archive") patch = { archived_at: new Date().toISOString(), archived_by: actor.user.id, archive_reason: reason };
    else if (action === "restore") patch = { archived_at: null, archived_by: null, archive_reason: null };
    else return Response.json({ error: "Aksi tautan tidak valid." }, { status: 400 });
    const { error } = await client.from("payment_submission_links").update(patch).eq("id", linkId).eq("order_id", id);
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (error) { return paymentErrorResponse(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requirePaymentActor(request);
    if (!["superadmin", "super_admin"].includes(actor.role)) return Response.json({ error: "Hanya Super Admin." }, { status: 403 });
    const { id } = await context.params;
    const url = new URL(request.url); const linkId = url.searchParams.get("linkId") ?? "";
    const client = getAdminSupabaseClient(); if (!client) throw new Error("Supabase admin belum dikonfigurasi.");
    const { data: link } = await client.from("payment_submission_links").select("id").eq("id",linkId).eq("order_id",id).maybeSingle();
    if (!link) return Response.json({ error: "Tautan tidak ditemukan." }, { status: 404 });
    const { error } = await client.rpc("permanently_delete_payment_submission_link", { p_link_id: linkId, p_actor: actor.user.id });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (error) { return paymentErrorResponse(error); }
}
