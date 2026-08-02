import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAccountEnabled } from "@/lib/access-control";

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return Response.json({ error: "Sesi reset diperlukan." }, { status: 401 });
  const adminClient = getAdminSupabaseClient();
  if (!adminClient) return Response.json({ error: "Layanan akun belum tersedia." }, { status: 503 });

  const auth = await adminClient.auth.getUser(token);
  if (auth.error || !auth.data.user) return Response.json({ error: "Sesi reset tidak valid." }, { status: 401 });
  const profile = await adminClient.from("profiles").select("role,account_status,session_version").eq("id", auth.data.user.id).maybeSingle();
  if (profile.error || !profile.data || !isAccountEnabled(profile.data.account_status)) {
    return Response.json({ error: "Akun tidak aktif atau profil belum lengkap." }, { status: 403 });
  }

  const changedAt = new Date().toISOString();
  const updated = await adminClient.from("profiles").update({
    password_changed_at: changedAt,
    active_session_id: null,
    session_version: Number(profile.data.session_version || 0) + 1,
    updated_at: changedAt
  }).eq("id", auth.data.user.id);
  if (updated.error) return Response.json({ error: "Status reset belum dapat disimpan." }, { status: 500 });

  const audit = await adminClient.from("system_audit_log").insert({
    entity_type: "admin_profile",
    entity_id: auth.data.user.id,
    action: "ADMIN_PASSWORD_CHANGED",
    new_value: { password_changed_at: changedAt },
    actor_id: auth.data.user.id,
    actor_role: profile.data.role,
    source: "admin-auth",
    reason: "Pengguna menyelesaikan reset kata sandi",
    metadata: { password_value_logged: false, sessions_revoked: true }
  });
  if (audit.error) return Response.json({ error: "Audit reset belum dapat dicatat." }, { status: 500 });

  await adminClient.auth.admin.signOut(token, "global");
  return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}
