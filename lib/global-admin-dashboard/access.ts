import { Phase13AuthError } from "@/lib/phase13-auth";

const GLOBAL_ROLES = new Set(["owner", "superadmin", "super_admin", "admin", "head_store"]);
const STORE_SCOPED_ROLE = "store_admin";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GlobalDashboardAccessInput = {
  role: string;
  primaryStoreId: string | null;
  allStoreAccess: boolean;
};

export type GlobalDashboardAccess = {
  storeId: string | null;
  storeScopeLocked: boolean;
};

export function resolveGlobalDashboardAccess(
  actor: GlobalDashboardAccessInput,
  requestedStoreId: string | null
): GlobalDashboardAccess {
  if (GLOBAL_ROLES.has(actor.role)) {
    if (!actor.allStoreAccess) {
      throw new Phase13AuthError(403, "Scope seluruh toko belum diberikan kepada akun ini.");
    }
    return {
      storeId: isUuid(requestedStoreId) ? requestedStoreId : null,
      storeScopeLocked: false
    };
  }

  if (actor.role === STORE_SCOPED_ROLE) {
    if (actor.allStoreAccess || !isUuid(actor.primaryStoreId)) {
      throw new Phase13AuthError(403, "Penetapan toko untuk Store Admin tidak valid.");
    }
    if (requestedStoreId && requestedStoreId !== actor.primaryStoreId) {
      throw new Phase13AuthError(403, "Store Admin hanya dapat membaca toko yang ditetapkan.");
    }
    return { storeId: actor.primaryStoreId, storeScopeLocked: true };
  }

  throw new Phase13AuthError(403, "Role ini tidak memiliki akses Dashboard Global.");
}

function isUuid(value: string | null): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
