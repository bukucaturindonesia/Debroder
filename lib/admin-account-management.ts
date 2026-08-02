import { z } from "zod";
import {
  ACCOUNT_STATUSES,
  MANAGEABLE_ADMIN_ROLES,
  type AccountStatus,
  type ManageableAdminRole
} from "@/lib/access-control";

const UUID = z.string().uuid();
const reason = z.string().trim().min(8, "Alasan minimal 8 karakter.").max(500);

export const adminAccountAccessSchema = z.object({
  role: z.enum(MANAGEABLE_ADMIN_ROLES),
  accountStatus: z.enum(ACCOUNT_STATUSES),
  primaryStoreId: UUID.nullable(),
  allStoreAccess: z.boolean(),
  reason
}).superRefine((value, context) => {
  if (value.role === "store_admin" && (!value.primaryStoreId || value.allStoreAccess)) {
    context.addIssue({
      code: "custom",
      path: ["primaryStoreId"],
      message: "Store Admin wajib memiliki tepat satu toko."
    });
  }
  if (value.role === "head_store" && !value.allStoreAccess) {
    context.addIssue({
      code: "custom",
      path: ["allStoreAccess"],
      message: "Head Store wajib memiliki scope seluruh toko."
    });
  }
  if (["product_content_manager", "order_cs_admin", "finance_admin"].includes(value.role) && !value.allStoreAccess) {
    context.addIssue({
      code: "custom",
      path: ["allStoreAccess"],
      message: "Role pusat wajib memiliki scope global."
    });
  }
});

export const adminAccountInviteSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(MANAGEABLE_ADMIN_ROLES),
  primaryStoreId: UUID.nullable(),
  allStoreAccess: z.boolean(),
  reason
}).superRefine((value, context) => {
  const access = adminAccountAccessSchema.safeParse({
    role: value.role,
    accountStatus: "TESTING",
    primaryStoreId: value.primaryStoreId,
    allStoreAccess: value.allStoreAccess,
    reason: value.reason
  });
  if (!access.success) {
    for (const issue of access.error.issues) context.addIssue(issue);
  }
});

export const adminAccountActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resend_invitation"), reason }),
  z.object({ action: z.literal("reset_password"), reason }),
  z.object({ action: z.literal("revoke_sessions"), reason }),
  z.object({ action: z.literal("disable"), reason }),
  z.object({ action: z.literal("enable"), reason })
]);

export type AdminAccountAccessInput = z.infer<typeof adminAccountAccessSchema>;
export type AdminAccountInviteInput = z.infer<typeof adminAccountInviteSchema>;
export type AdminAccountActionInput = z.infer<typeof adminAccountActionSchema>;

export function accountScopeIsComplete(input: {
  role: string;
  primaryStoreId: string | null;
  allStoreAccess: boolean;
}) {
  if (input.role === "store_admin") return Boolean(input.primaryStoreId) && !input.allStoreAccess;
  if (input.role === "head_store") return input.allStoreAccess;
  if (["owner", "product_content_manager", "order_cs_admin", "finance_admin"].includes(input.role)) {
    return input.allStoreAccess;
  }
  return true;
}

export function invitationStatus(input: {
  authExists: boolean;
  profileExists: boolean;
  invitedAt: string | null;
  confirmedAt: string | null;
  accountStatus: AccountStatus | string | null;
}) {
  if (!input.authExists) return "Profil tanpa Auth" as const;
  if (!input.profileExists) return "Auth tanpa Profil" as const;
  if (input.confirmedAt) return "Aktif" as const;
  if (input.invitedAt) return "Diundang" as const;
  return input.accountStatus === "ACTIVE" ? "Aktif" as const : "Diundang" as const;
}

export function normalizeAccountListQuery(searchParams: URLSearchParams) {
  const pageValue = Number(searchParams.get("page") || "1");
  const pageSizeValue = Number(searchParams.get("pageSize") || "20");
  const roleValue = searchParams.get("role") || "";
  const statusValue = searchParams.get("status") || "";
  return {
    search: (searchParams.get("q") || "").trim().toLowerCase().slice(0, 120),
    role: MANAGEABLE_ADMIN_ROLES.includes(roleValue as ManageableAdminRole) ? roleValue : "",
    status: ACCOUNT_STATUSES.includes(statusValue as AccountStatus) ? statusValue : "",
    storeId: UUID.safeParse(searchParams.get("store") || "").success ? searchParams.get("store") || "" : "",
    page: Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1,
    pageSize: Number.isFinite(pageSizeValue) ? Math.min(100, Math.max(10, Math.floor(pageSizeValue))) : 20
  };
}

export function assertSafeAccountTarget(input: {
  actorId: string;
  targetId: string;
  currentRole: string;
  nextRole?: string;
  nextStatus?: string;
  activeOwnerCount: number;
}) {
  if (input.actorId === input.targetId) {
    if (input.nextStatus && !["ACTIVE", "TESTING"].includes(input.nextStatus)) {
      throw new AdminAccountConflict("Akun sendiri tidak dapat dinonaktifkan.");
    }
    if (input.nextRole && input.nextRole !== input.currentRole) {
      throw new AdminAccountConflict("Role akun sendiri tidak dapat diubah.");
    }
  }
  if (input.currentRole === "owner" && input.activeOwnerCount <= 1) {
    if ((input.nextRole && input.nextRole !== "owner") || (input.nextStatus && !["ACTIVE", "TESTING"].includes(input.nextStatus))) {
      throw new AdminAccountConflict("Owner aktif terakhir tidak dapat diturunkan atau dinonaktifkan.");
    }
  }
}

export class AdminAccountConflict extends Error {
  readonly status = 409;
}
