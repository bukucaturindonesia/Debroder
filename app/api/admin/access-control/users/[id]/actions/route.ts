import { adminAccountActionSchema } from "@/lib/admin-account-management";
import { getSiteUrl } from "@/lib/env";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.manage");
    const { id } = await context.params;
    const parsed = adminAccountActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Aksi akun tidak valid." }, { status: 400 });
    }
    const input = parsed.data;
    const [profile, authUser] = await Promise.all([
      actor.adminClient.from("profiles").select("id,email,role,account_status,primary_store_id,all_store_access").eq("id", id).maybeSingle(),
      actor.adminClient.auth.admin.getUserById(id)
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (!profile.data) return Response.json({ error: "Profil Admin tidak ditemukan." }, { status: 404 });

    if (["disable", "revoke_sessions"].includes(input.action) && id === actor.user.id) {
      return Response.json({ error: "Akun atau sesi sendiri tidak dapat dinonaktifkan melalui halaman ini." }, { status: 409 });
    }
    if (profile.data.role === "owner" && ["disable", "revoke_sessions"].includes(input.action)) {
      return Response.json({ error: "Akun Owner dilindungi dari aksi ini." }, { status: 409 });
    }

    if (input.action === "resend_invitation") {
      const user = authUser.data?.user;
      if (authUser.error || !user?.email) return Response.json({ error: "Auth user tidak ditemukan." }, { status: 404 });
      if (user.email_confirmed_at) return Response.json({ error: "Akun sudah aktif; undangan tidak perlu dikirim ulang." }, { status: 409 });
      const invited = await actor.adminClient.auth.admin.inviteUserByEmail(user.email, {
        redirectTo: `${getSiteUrl()}/admin/login?invited=1`
      });
      if (invited.error) throw new Error(invited.error.message);
      await writeLifecycleAudit(actor, request, id, "ADMIN_INVITATION_RESENT", input.reason);
      return ok("Undangan berhasil dikirim ulang.");
    }

    if (input.action === "reset_password") {
      const email = authUser.data?.user?.email || profile.data.email;
      if (!email) return Response.json({ error: "Email akun tidak tersedia." }, { status: 409 });
      const reset = await actor.adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/admin/change-password`
      });
      if (reset.error) throw new Error(reset.error.message);
      await writeLifecycleAudit(actor, request, id, "ADMIN_PASSWORD_RESET_INITIATED", input.reason);
      return ok("Instruksi reset password berhasil dikirim.");
    }

    if (input.action === "revoke_sessions") {
      const revoked = await actor.client.rpc("revoke_admin_sessions_v1", {
        p_profile_id: id,
        p_reason: input.reason
      });
      if (revoked.error) throw new Error(revoked.error.message);
      return ok("Seluruh sesi akun berhasil dicabut.");
    }

    const nextStatus = input.action === "enable" ? "ACTIVE" : "INACTIVE";
    const updated = await actor.client.rpc("update_admin_account_access_v1", {
      p_profile_id: id,
      p_role: profile.data.role,
      p_account_status: nextStatus,
      p_primary_store_id: profile.data.primary_store_id,
      p_all_store_access: profile.data.all_store_access,
      p_reason: input.reason
    });
    if (updated.error) throw new Error(updated.error.message);
    return ok(input.action === "enable" ? "Akun berhasil diaktifkan kembali." : "Akun berhasil dinonaktifkan.");
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}

function ok(message: string) {
  return Response.json({ ok: true, message }, { headers: { "cache-control": "private, no-store" } });
}

async function writeLifecycleAudit(
  actor: Awaited<ReturnType<typeof requirePhase13Actor>>,
  request: Request,
  targetId: string,
  action: string,
  reason: string
) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const { error } = await actor.adminClient.from("system_audit_log").insert({
    entity_type: "admin_profile",
    entity_id: targetId,
    action,
    actor_id: actor.user.id,
    actor_role: actor.role,
    source: "admin-account-api",
    reason,
    request_id: requestId,
    metadata: { request_id: requestId, secret_values_logged: false }
  });
  if (error) throw new Error("Audit lifecycle akun tidak dapat dicatat.");
}
