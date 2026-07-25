import type { SupabaseClient, User } from "@supabase/supabase-js";
import { canCreateRepeatOrder } from "@/lib/repeat-orders";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

export type RepeatOrderActor = {
  user: User;
  role: string;
  client: SupabaseClient;
  adminClient: SupabaseClient;
};

export class RepeatOrderAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function requireRepeatOrderActor(
  request: Request,
  options: { create?: boolean } = {}
): Promise<RepeatOrderActor> {
  try {
    const actor = await requirePhase13Actor(request, "order.read");
    if (options.create) {
      const { data: allowed, error } = await actor.client.rpc("has_permission", {
        p_permission_key: "quotation.write"
      });
      if (error || allowed !== true || !canCreateRepeatOrder(actor.role)) {
        throw new RepeatOrderAuthError(403, "Role ini tidak diizinkan membuat Repeat Order.");
      }
    }
    return {
      user: actor.user,
      role: actor.role,
      client: actor.client,
      adminClient: actor.adminClient
    };
  } catch (error) {
    if (error instanceof RepeatOrderAuthError) throw error;
    if (error instanceof Phase13AuthError) {
      throw new RepeatOrderAuthError(error.status, error.message);
    }
    throw error;
  }
}

export function repeatOrderErrorResponse(error: unknown, request?: Request): Response {
  const context = createServerRequestContext(request, "admin repeat order");
  if (error instanceof RepeatOrderAuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.status === 401
          ? "REPEAT_ORDER_AUTHENTICATION_REQUIRED"
          : error.status === 403
            ? "REPEAT_ORDER_ACCESS_DENIED"
            : "REPEAT_ORDER_SERVICE_UNAVAILABLE",
        message: error.status >= 500
          ? "Layanan Repeat Order belum tersedia."
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
      code: "REPEAT_ORDER_OPERATION_FAILED",
      message: "Operasi Repeat Order gagal. Coba lagi.",
      status: 500
    }
  });
}
