import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import {
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
  changeProductReviewLifecycle,
  loadProductReviewPayload,
  ProductReviewApiError
} from "@/lib/product-review-server";
import type { ProductReviewAction } from "@/lib/product-review";
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

type ProductReviewActor = Pick<
  Phase13Actor,
  "user" | "role" | "adminClient"
>;

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireProductReviewActor(request);
    const { id } = await context.params;
    assertProductId(id);
    return noStoreJson(
      await loadProductReviewPayload(actor.adminClient, actor.role, id)
    );
  } catch (error) {
    return productReviewErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  let actor: ProductReviewActor | null = null;
  let productId = "";
  let action: ProductReviewAction | null = null;
  try {
    actor = await requireProductReviewActor(request);
    const params = await context.params;
    productId = params.id;
    assertProductId(productId);
    const body = await readBody(request);
    action = parseAction(body.action);
    if (!Object.prototype.hasOwnProperty.call(body, "expectedUpdatedAt")) {
      throw new ProductReviewApiError(400, "Versi produk wajib dikirim.");
    }
    const expectedUpdatedAt = nullableVersion(body.expectedUpdatedAt);
    const expectedReviewVersion = requiredVersion(body.expectedReviewVersion);
    const result = await changeProductReviewLifecycle({
      client: actor.adminClient,
      role: actor.role,
      productId,
      action,
      expectedUpdatedAt,
      expectedReviewVersion
    });
    await auditLifecycleSuccess({ actor, request, action, result });
    return noStoreJson({
      ok: true,
      message: action === "publish"
        ? "Produk berhasil dipublish."
        : "Produk berhasil diarsipkan tanpa menghapus data.",
      payload: result.after
    });
  } catch (error) {
    if (actor && productId && action === "publish") {
      await auditPublishFailure(actor, request, productId, error);
    }
    return productReviewErrorResponse(error);
  }
}

async function requireProductReviewActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(
      403,
      "Role ini tidak memiliki akses Review & Publish."
    );
  }
  return actor;
}

async function auditLifecycleSuccess(input: {
  actor: ProductReviewActor;
  request: Request;
  action: ProductReviewAction;
  result: Awaited<ReturnType<typeof changeProductReviewLifecycle>>;
}) {
  const eventCode: PimAuditEventCode = input.action === "publish"
    ? "PRODUCT_PUBLISHED"
    : "PRODUCT_ARCHIVED";
  const identity = createPimAuditIdentity(input.request, `wp07-${input.action}`);
  const changes = diffPimAuditFields(
    { status: input.result.before.product.status },
    { status: input.result.after.product.status },
    ["status"]
  );
  await recordPimAuditEvent(input.actor.adminClient, {
    eventCode,
    status: "COMPLETED",
    actorId: input.actor.user.id,
    actorRole: input.actor.role,
    actorLabel: actorAuditLabel(input.actor.user),
    requestId: identity.requestId,
    operationId: identity.operationId,
    idempotencyKey: identity.idempotencyKey,
    entityType: "products",
    entityId: input.result.after.product.id,
    entityLabel: input.result.after.product.name,
    productId: input.result.after.product.id,
    summary: PIM_AUDIT_EVENT_REGISTRY[eventCode].label,
    changes,
    metadata: {
      checkpoint: "WP-07",
      module: "review",
      reviewVersionBefore: input.result.before.reviewVersion,
      reviewVersionAfter: input.result.after.reviewVersion,
      changedFields: ["status"]
    },
    entities: [{
      entityType: "products",
      entityId: input.result.after.product.id,
      entityLabel: input.result.after.product.name,
      productId: input.result.after.product.id,
      resultStatus: "COMPLETED"
    }]
  });
}

async function auditPublishFailure(
  actor: ProductReviewActor,
  request: Request,
  productId: string,
  error: unknown
) {
  try {
    const identity = createPimAuditIdentity(request, "wp07-publish");
    const auditStatus = error instanceof ProductReviewApiError && error.status === 403
      ? "DENIED"
      : "FAILED";
    await recordPimAuditEvent(actor.adminClient, {
      eventCode: "PRODUCT_PUBLISH_FAILED",
      status: auditStatus,
      actorId: actor.user.id,
      actorRole: actor.role,
      actorLabel: actorAuditLabel(actor.user),
      requestId: identity.requestId,
      operationId: identity.operationId,
      idempotencyKey: identity.idempotencyKey,
      entityType: "products",
      entityId: productId,
      productId,
      summary: PIM_AUDIT_EVENT_REGISTRY.PRODUCT_PUBLISH_FAILED.label,
      failureCode: error instanceof ProductReviewApiError && error.status === 409
        ? "PUBLISH_CONFLICT"
        : "PUBLISH_VALIDATION_FAILED",
      metadata: {
        checkpoint: "WP-07",
        module: "review",
        httpStatus: error instanceof ProductReviewApiError ? error.status : 500
      },
      entities: [{
        entityType: "products",
        entityId: productId,
        productId,
        resultStatus: auditStatus
      }]
    });
  } catch {
    // Audit failure must not replace the authority response from the mutation.
  }
}

function parseAction(value: unknown): ProductReviewAction {
  if (value === "publish" || value === "archive") return value;
  throw new ProductReviewApiError(
    400,
    "Aksi Review & Publish tidak didukung."
  );
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
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new ProductReviewApiError(400, "Versi produk tidak valid.");
}

function requiredVersion(value: unknown) {
  if (typeof value === "string" && /^wp07-[0-9a-f]{8}$/.test(value)) {
    return value;
  }
  throw new ProductReviewApiError(400, "Review version wajib dikirim.");
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

function productReviewErrorResponse(error: unknown) {
  const guest = adminGuestErrorResponse(error);
  if (guest) return guest;
  if (
    error instanceof ProductReviewApiError ||
    error instanceof Phase13AuthError
  ) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("Product Review API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson(
    { error: "Review & Publish gagal diproses." },
    500
  );
}
