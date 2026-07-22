import type { SupabaseClient } from "@supabase/supabase-js";
import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import {
  getProductManagerCapabilities,
  PRODUCT_MANAGER_ROLES
} from "@/lib/product-manager";
import {
  PIM_AUDIT_EVENT_REGISTRY
} from "@/lib/pim-audit";
import {
  actorAuditLabel,
  createPimAuditIdentity,
  recordPimAuditEvent
} from "@/lib/pim-audit-server";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireDuplicateActor(request);
    const { id } = await context.params;
    assertProductId(id);
    const body = await readBody(request);
    if (!Object.prototype.hasOwnProperty.call(body, "expectedUpdatedAt")) {
      throw new ProductDuplicateApiError(400, "Versi produk sumber wajib dikirim.");
    }
    const expectedUpdatedAt = expectedVersion(body.expectedUpdatedAt);
    const duplicate = await duplicateProductRoot(
      actor.adminClient,
      id,
      expectedUpdatedAt
    );

    const identity = createPimAuditIdentity(request, "workspace-duplicate");
    await recordPimAuditEvent(actor.adminClient, {
      eventCode: "PRODUCT_DUPLICATED",
      status: "COMPLETED",
      actorId: actor.user.id,
      actorRole: actor.role,
      actorLabel: actorAuditLabel(actor.user),
      requestId: identity.requestId,
      operationId: identity.operationId,
      idempotencyKey: identity.idempotencyKey,
      entityType: "products",
      entityId: duplicate.id,
      entityLabel: duplicate.name,
      productId: duplicate.id,
      summary: PIM_AUDIT_EVENT_REGISTRY.PRODUCT_DUPLICATED.label,
      changes: [],
      metadata: {
        checkpoint: "WP-08",
        sourceProductId: id,
        sourceUpdatedAt: expectedUpdatedAt,
        changedFields: ["source_product_id"]
      },
      entities: [{
        entityType: "products",
        entityId: duplicate.id,
        entityLabel: duplicate.name,
        productId: duplicate.id,
        resultStatus: "COMPLETED"
      }]
    });

    return noStoreJson({
      ok: true,
      productId: duplicate.id,
      message: "Produk berhasil diduplikasi sebagai Draft."
    });
  } catch (error) {
    return duplicateErrorResponse(error);
  }
}

async function requireDuplicateActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Manager.");
  }
  if (!getProductManagerCapabilities(actor.role).canCreateDraft) {
    throw new ProductDuplicateApiError(403, "Role ini tidak dapat menduplikasi produk.");
  }
  return actor;
}

async function duplicateProductRoot(
  client: SupabaseClient,
  productId: string,
  expectedUpdatedAt: string | null
) {
  const baseQuery = client
    .from("products")
    .select("*")
    .eq("id", productId);
  const guardedQuery = expectedUpdatedAt === null
    ? baseQuery.is("updated_at", null)
    : baseQuery.eq("updated_at", expectedUpdatedAt);
  const { data: sourceData, error: sourceError } = await guardedQuery.maybeSingle();

  if (sourceError) {
    console.error("WP-08 product duplicate source load failed", {
      code: sourceError.code
    });
    throw new ProductDuplicateApiError(503, "Produk sumber belum dapat dimuat.");
  }
  if (!sourceData || typeof sourceData !== "object") throw conflict();

  const source = sourceData as Record<string, unknown>;
  const next = { ...source };
  delete next.id;
  delete next.created_at;
  delete next.updated_at;

  const suffix = crypto.randomUUID().slice(0, 8);
  const name = `${String(source.name || source.nama || "Produk")} (Salinan)`;
  next.name = name;
  next.nama = name;
  next.slug = `${String(source.slug || "produk")}-salinan-${suffix}`;
  next.status = "draft";
  next.status_aktif = false;
  next.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("products")
    .insert(next)
    .select("id")
    .single();
  if (error || !data?.id) {
    console.error("WP-08 product duplicate insert failed", { code: error?.code });
    throw new ProductDuplicateApiError(409, "Produk gagal diduplikasi sebagai Draft.");
  }

  return { id: String(data.id), name };
}

function assertProductId(value: string) {
  if (!isValidProductWorkspaceId(value)) {
    throw new ProductDuplicateApiError(400, "ID produk tidak valid.");
  }
}

function expectedVersion(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) {
    throw new ProductDuplicateApiError(400, "Versi produk sumber tidak valid.");
  }
  return value;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (typeof value !== "object" || value === null) throw new Error("invalid");
    return value as Record<string, unknown>;
  } catch {
    throw new ProductDuplicateApiError(400, "JSON request tidak valid.");
  }
}

function conflict() {
  return new ProductDuplicateApiError(
    409,
    "Produk sumber telah berubah. Muat ulang Product Library sebelum menduplikasi."
  );
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

class ProductDuplicateApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function duplicateErrorResponse(error: unknown) {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  if (error instanceof ProductDuplicateApiError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("WP-08 Product Duplicate API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson({ error: "Produk gagal diduplikasi sebagai Draft." }, 500);
}
