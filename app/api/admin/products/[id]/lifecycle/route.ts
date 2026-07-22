import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import {
  getProductManagerCapabilities,
  PRODUCT_MANAGER_ROLES
} from "@/lib/product-manager";
import {
  PIM_AUDIT_EVENT_REGISTRY,
  diffPimAuditFields,
  type PimAuditEventCode
} from "@/lib/pim-audit";
import {
  actorAuditLabel,
  createPimAuditIdentity,
  recordPimAuditEvent
} from "@/lib/pim-audit-server";
import {
  loadProductReviewPayload,
  ProductReviewApiError
} from "@/lib/product-review-server";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";
import {
  Phase13AuthError,
  requirePhase13Actor,
  type Phase13Actor
} from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

type ProductLifecycleActor = Pick<
  Phase13Actor,
  "user" | "role" | "adminClient"
>;

type ProductLifecycleMaintenanceAction = "archive_draft" | "restore";
type ProductLifecycleStatus = "draft" | "active" | "archived";

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireLifecycleActor(request);
    const { id } = await context.params;
    assertProductId(id);
    const body = await readBody(request);
    const action = parseAction(body.action);
    if (!Object.prototype.hasOwnProperty.call(body, "expectedUpdatedAt")) {
      throw new ProductReviewApiError(400, "Versi produk wajib dikirim.");
    }
    const expectedUpdatedAt = nullableVersion(body.expectedUpdatedAt);
    const transition = lifecycleTransition(action);
    const nextUpdatedAt = nextTimestamp(expectedUpdatedAt);

    let update = actor.adminClient
      .from("products")
      .update({
        status: transition.nextStatus,
        status_aktif: false,
        updated_at: nextUpdatedAt
      })
      .eq("id", id)
      .eq("status", transition.expectedStatus);
    update = expectedUpdatedAt === null
      ? update.is("updated_at", null)
      : update.eq("updated_at", expectedUpdatedAt);

    const { data, error } = await update
      .select("id,name,nama,status,updated_at")
      .maybeSingle();
    if (error) {
      console.error("P0 PIM lifecycle update failed", { code: error.code });
      throw new ProductReviewApiError(503, "Perubahan lifecycle belum dapat disimpan.");
    }
    if (!data) throw conflict();

    const productName = String(data.name || data.nama || "Produk");
    await auditLifecycleSuccess({
      actor,
      request,
      productId: id,
      productName,
      action,
      beforeStatus: transition.expectedStatus,
      afterStatus: transition.nextStatus
    });

    return noStoreJson({
      ok: true,
      message: transition.message,
      payload: await loadProductReviewPayload(actor.adminClient, actor.role, id)
    });
  } catch (error) {
    return lifecycleErrorResponse(error);
  }
}

async function requireLifecycleActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Workspace.");
  }
  if (!getProductManagerCapabilities(actor.role).canArchive) {
    throw new ProductReviewApiError(
      403,
      "Archive dan Restore hanya tersedia untuk Owner atau Super Admin."
    );
  }
  return actor;
}

function lifecycleTransition(action: ProductLifecycleMaintenanceAction): {
  expectedStatus: ProductLifecycleStatus;
  nextStatus: ProductLifecycleStatus;
  eventCode: PimAuditEventCode;
  message: string;
} {
  if (action === "archive_draft") {
    return {
      expectedStatus: "draft",
      nextStatus: "archived",
      eventCode: "PRODUCT_ARCHIVED",
      message: "Draft dipindahkan ke arsip tanpa menghapus data."
    };
  }
  return {
    expectedStatus: "archived",
    nextStatus: "draft",
    eventCode: "PRODUCT_RESTORED",
    message: "Produk dipulihkan ke Draft dan dapat diperiksa sebelum Publish."
  };
}

async function auditLifecycleSuccess(input: {
  actor: ProductLifecycleActor;
  request: Request;
  productId: string;
  productName: string;
  action: ProductLifecycleMaintenanceAction;
  beforeStatus: ProductLifecycleStatus;
  afterStatus: ProductLifecycleStatus;
}) {
  const transition = lifecycleTransition(input.action);
  const identity = createPimAuditIdentity(
    input.request,
    `p0-pim-ops-${input.action}`
  );
  await recordPimAuditEvent(input.actor.adminClient, {
    eventCode: transition.eventCode,
    status: "COMPLETED",
    actorId: input.actor.user.id,
    actorRole: input.actor.role,
    actorLabel: actorAuditLabel(input.actor.user),
    requestId: identity.requestId,
    operationId: identity.operationId,
    idempotencyKey: identity.idempotencyKey,
    entityType: "products",
    entityId: input.productId,
    entityLabel: input.productName,
    productId: input.productId,
    summary: PIM_AUDIT_EVENT_REGISTRY[transition.eventCode].label,
    changes: diffPimAuditFields(
      { status: input.beforeStatus },
      { status: input.afterStatus },
      ["status"]
    ),
    metadata: {
      checkpoint: "P0-PIM-OPS-01",
      module: "review",
      changedFields: ["status"]
    },
    entities: [{
      entityType: "products",
      entityId: input.productId,
      entityLabel: input.productName,
      productId: input.productId,
      resultStatus: "COMPLETED"
    }]
  });
}

function parseAction(value: unknown): ProductLifecycleMaintenanceAction {
  if (value === "archive_draft" || value === "restore") return value;
  throw new ProductReviewApiError(400, "Aksi lifecycle tidak didukung.");
}

function assertProductId(value: string) {
  if (!isValidProductWorkspaceId(value)) {
    throw new ProductReviewApiError(400, "ID produk tidak valid.");
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("invalid");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new ProductReviewApiError(400, "JSON request tidak valid.");
  }
}

function nullableVersion(value: unknown) {
  if (value === null) return null;
  if (
    typeof value === "string" &&
    value.trim() &&
    !Number.isNaN(Date.parse(value))
  ) {
    return value.trim();
  }
  throw new ProductReviewApiError(400, "Versi produk tidak valid.");
}

function nextTimestamp(expected: string | null) {
  const expectedTime = expected ? Date.parse(expected) : 0;
  return new Date(Math.max(Date.now(), expectedTime + 1)).toISOString();
}

function conflict() {
  return new ProductReviewApiError(
    409,
    "Data produk atau status lifecycle telah berubah. Muat ulang data terbaru sebelum melanjutkan."
  );
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

function lifecycleErrorResponse(error: unknown) {
  const guest = adminGuestErrorResponse(error);
  if (guest) return guest;
  if (
    error instanceof ProductReviewApiError ||
    error instanceof Phase13AuthError
  ) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("P0 PIM lifecycle API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson({ error: "Perubahan lifecycle gagal diproses." }, 500);
}
