import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

export type NotificationActor = {
  user: User;
  role: string;
  client: SupabaseClient;
};

export async function requireNotificationActor(
  request: Request,
  requirement: "read" | "manage" | "superadmin" = "read"
): Promise<NotificationActor> {
  try {
    const permission = requirement === "read" ? "notification.read" : "notification.manage";
    const actor = await requirePhase13Actor(request, permission);
    if (requirement === "superadmin" && !["owner", "superadmin", "super_admin"].includes(actor.role)) {
      throw new NotificationAuthError(403, "Hanya Owner atau Super Admin yang dapat melakukan aksi ini.");
    }
    return actor;
  } catch (error) {
    if (error instanceof NotificationAuthError) throw error;
    if (error instanceof Phase13AuthError) {
      throw new NotificationAuthError(error.status, error.message);
    }
    throw error;
  }
}

export class NotificationAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function notificationErrorResponse(error: unknown, request?: Request): Response {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  const context = createServerRequestContext(request, "admin notification");
  if (error instanceof NotificationAuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.status === 401
          ? "NOTIFICATION_AUTHENTICATION_REQUIRED"
          : error.status === 403
            ? "NOTIFICATION_ACCESS_DENIED"
            : "NOTIFICATION_SERVICE_UNAVAILABLE",
        message: error.status >= 500
          ? "Layanan notifikasi belum tersedia."
          : error.message,
        status: error.status
      },
      log: error.status >= 500
    });
  }
  return canonicalErrorResponse({
    error,
    context,
    definition: {
      code: "NOTIFICATION_OPERATION_FAILED",
      message: "Operasi notifikasi gagal. Coba lagi.",
      status: 500
    },
  });
}
