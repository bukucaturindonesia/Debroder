import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/env";
import {
  adminGuestErrorResponse,
  assertAdminRequestMethodAllowed
} from "@/lib/admin-role-security";
import {
  canManageNotificationTemplates,
  isNotificationRole,
  isNotificationSuperAdmin
} from "@/lib/notifications";

export type NotificationActor = {
  user: User;
  role: string;
  client: SupabaseClient;
};

export async function requireNotificationActor(
  request: Request,
  requirement: "read" | "manage" | "superadmin" = "read"
): Promise<NotificationActor> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    throw new NotificationAuthError(401, "Sesi admin diperlukan.");
  }

  const adminClient = getAdminSupabaseClient();
  const publicEnv = getPublicSupabaseEnv();

  if (!adminClient || !publicEnv) {
    throw new NotificationAuthError(503, "Supabase admin belum dikonfigurasi.");
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    throw new NotificationAuthError(401, "Sesi admin tidak valid.");
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = typeof profile?.role === "string" ? profile.role.toLowerCase() : "";
  assertAdminRequestMethodAllowed(role, request.method);
  if (profileError || !isNotificationRole(role)) {
    throw new NotificationAuthError(403, "Akses notifikasi ditolak.");
  }

  if (requirement === "manage" && !canManageNotificationTemplates(role)) {
    throw new NotificationAuthError(403, "Role tidak dapat mengelola template notifikasi.");
  }

  if (requirement === "superadmin" && !isNotificationSuperAdmin(role)) {
    throw new NotificationAuthError(403, "Hanya Super Admin yang dapat melakukan aksi ini.");
  }

  const client = createClient(publicEnv.url, publicEnv.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  return { user: data.user, role, client };
}

export class NotificationAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function notificationErrorResponse(error: unknown): Response {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  if (error instanceof NotificationAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Operasi notifikasi gagal karena kesalahan yang tidak diketahui."
    },
    { status: 500 }
  );
}
