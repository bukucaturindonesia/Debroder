import type { SupabaseClient } from "@supabase/supabase-js";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAdminSessionId(token: string) {
  const payload = decodeJwtPayload(token);
  return typeof payload?.session_id === "string" ? payload.session_id : "";
}

export async function registerSingleAdminSession(
  client: SupabaseClient,
  token: string
) {
  const sessionId = getAdminSessionId(token);
  if (!sessionId) throw new Error("Session ID tidak tersedia untuk registrasi single-session.");

  const { data, error } = await client.rpc("register_admin_session_v1", {
    p_session_id: sessionId
  });
  if (error || data !== true) {
    throw new Error(error?.message || "Single-session tidak dapat didaftarkan.");
  }
}

export async function assertSingleAdminSession(
  client: SupabaseClient,
  token: string
) {
  const sessionId = getAdminSessionId(token);
  if (!sessionId) throw new Error("Session ID tidak tersedia untuk validasi single-session.");

  const { data, error } = await client.rpc("assert_admin_session_v1", {
    p_session_id: sessionId
  });
  if (error || data !== true) {
    throw new Error(error?.message || "Sesi ini bukan sesi aktif terbaru.");
  }
}
