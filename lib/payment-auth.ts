import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

export type PaymentActor = { user: User; role: string; client: SupabaseClient };

export async function requirePaymentActor(
  request: Request,
  permission = request.method === "GET" ? "payment.read" : "payment.create"
): Promise<PaymentActor> {
  try {
    return await requirePhase13Actor(request, permission);
  } catch (error) {
    if (error instanceof Phase13AuthError) {
      throw new PaymentAuthError(error.status, error.message);
    }
    throw error;
  }
}

export class PaymentAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function paymentErrorResponse(error: unknown, request?: Request): Response {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  const context = createServerRequestContext(request, "admin payment");
  if (error instanceof PaymentAuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.status === 401
          ? "PAYMENT_AUTHENTICATION_REQUIRED"
          : error.status === 403
            ? "PAYMENT_ACCESS_DENIED"
            : "PAYMENT_SERVICE_UNAVAILABLE",
        message: error.status >= 500
          ? "Layanan pembayaran belum tersedia."
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
      code: "PAYMENT_OPERATION_FAILED",
      message: "Operasi pembayaran gagal. Coba lagi.",
      status: 500
    }
  });
}
