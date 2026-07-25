import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AccountStatus, AdminRole } from "@/lib/access-control";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

export type OperationsActor = {
  user: User;
  role: AdminRole;
  accountStatus: AccountStatus;
  primaryStoreId: string | null;
  allStoreAccess: boolean;
  client: SupabaseClient;
};

export async function requireOperationsActor(
  request: Request,
  permission: string = "operations.read"
): Promise<OperationsActor> {
  try {
    const actor = await requirePhase13Actor(request, permission);
    return {
      user: actor.user,
      role: actor.role,
      accountStatus: actor.accountStatus,
      primaryStoreId: actor.primaryStoreId,
      allStoreAccess: actor.allStoreAccess,
      client: actor.client
    };
  } catch (error) {
    if (error instanceof Phase13AuthError) {
      throw new OperationsAuthError(error.status, error.message);
    }
    throw error;
  }
}

export class OperationsAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function operationsErrorResponse(error: unknown, request?: Request) {
  const context = createServerRequestContext(request, "admin operations");
  if (error instanceof OperationsAuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.status === 401
          ? "OPERATIONS_AUTHENTICATION_REQUIRED"
          : error.status === 403
            ? "OPERATIONS_ACCESS_DENIED"
            : "OPERATIONS_UNAVAILABLE",
        message: error.status >= 500
          ? "Layanan operasi belum tersedia."
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
      code: "OPERATIONS_FAILED",
      message: "Operasi belum dapat diproses. Coba lagi.",
      status: 500
    }
  });
}
