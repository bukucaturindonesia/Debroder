import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  canManageNotificationTemplates,
  isNotificationRole,
  isNotificationSuperAdmin
} from "@/lib/notifications";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";
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
    const permission = requirement === "manage"
      ? "notification.manage"
      : "notification.read";
    const actor = await requirePhase13Actor(request, permission);

    if (!isNotificationRole(actor.role)) {
      throw new NotificationAuthError(403, "Akses notifikasi ditolak.");
    }
    if (requirement === "manage" && !canManageNotificationTemplates(actor.role)) {
      throw new NotificationAuthError(403, "Role tidak dapat mengelola template notifikasi.");
    }
    if (requirement === "superadmin" && !isNotificationSuperAdmin(actor.role)) {
      throw new NotificationAuthError(403, "Hanya Super Admin yang dapat melakukan aksi ini.");
    }

    return { user: actor.user, role: actor.role, client: actor.client };
  } catch (error) {
    if (error instanceof NotificationAuthError) throw error;
    if (error instanceof Phase13AuthError) {
      throw new NotificationAuthError(error.status, error.message);
    }
    throw error;
  }
}

export class NotificationAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function notificationErrorResponse(error: unknown, request?: Request): Response {
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
