import { isAdminGuestRole } from "@/lib/access-control";

export const READ_ONLY_HTTP_METHODS = ["GET", "HEAD", "OPTIONS"] as const;

export class AdminGuestReadOnlyError extends Error {
  readonly status = 403;

  constructor(message = "Admin Guest hanya dapat melihat. Semua perubahan dinonaktifkan.") {
    super(message);
  }
}

export function isReadOnlyHttpMethod(method: string) {
  return READ_ONLY_HTTP_METHODS.includes(method.toUpperCase() as (typeof READ_ONLY_HTTP_METHODS)[number]);
}

export function assertAdminRequestMethodAllowed(
  role: string | null | undefined,
  method: string
) {
  if (isAdminGuestRole(role) && !isReadOnlyHttpMethod(method)) {
    throw new AdminGuestReadOnlyError();
  }
}

export function adminGuestErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AdminGuestReadOnlyError)) return null;
  return Response.json(
    { code: "ADMIN_GUEST_READ_ONLY", error: error.message },
    { status: error.status, headers: { "cache-control": "private, no-store" } }
  );
}
