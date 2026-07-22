import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import { PRODUCT_MANAGER_ROLES } from "@/lib/product-manager";
import {
  parseProductMediaQuery,
  type ProductMediaSaveChange
} from "@/lib/product-media";
import {
  loadProductMediaPayload,
  ProductMediaApiError,
  saveProductMediaSlots
} from "@/lib/product-media-server";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: Context
) {
  try {
    const actor = await requireProductMediaActor(request);
    const { id } = await context.params;
    assertProductId(id);
    const query = parseProductMediaQuery(
      new URL(request.url).searchParams
    );
    const payload = await loadProductMediaPayload(
      actor.adminClient,
      actor.role,
      id,
      query
    );
    return noStoreJson(payload);
  } catch (error) {
    return productMediaErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: Context
) {
  try {
    const actor = await requireProductMediaActor(request);
    const { id } = await context.params;
    assertProductId(id);
    const body = await readBody(request);
    if (body.action !== "save_slots") {
      throw new ProductMediaApiError(
        400,
        "Aksi Media WP-06 tidak valid."
      );
    }
    const result = await saveProductMediaSlots({
      actor,
      request,
      productId: id,
      variantId: typeof body.variantId === "string"
        ? body.variantId
        : "",
      expectedVariantUpdatedAt:
        typeof body.expectedVariantUpdatedAt === "string"
          ? body.expectedVariantUpdatedAt
          : "",
      changes: Array.isArray(body.changes)
        ? body.changes as ProductMediaSaveChange[]
        : []
    });
    return noStoreJson(result);
  } catch (error) {
    return productMediaErrorResponse(error);
  }
}

async function requireProductMediaActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(
      403,
      "Role ini tidak memiliki akses Media Produk."
    );
  }
  return actor;
}

function assertProductId(value: string) {
  if (!isValidProductWorkspaceId(value)) {
    throw new ProductMediaApiError(
      400,
      "ID produk tidak valid."
    );
  }
}

async function readBody(
  request: Request
): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      throw new Error("invalid");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new ProductMediaApiError(
      400,
      "JSON request tidak valid."
    );
  }
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store"
    }
  });
}

function productMediaErrorResponse(error: unknown) {
  const guest = adminGuestErrorResponse(error);
  if (guest) return guest;
  if (
    error instanceof ProductMediaApiError ||
    error instanceof Phase13AuthError
  ) {
    return noStoreJson(
      { error: error.message },
      error.status
    );
  }
  console.error("Product Media API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson(
    { error: "Media produk gagal diproses." },
    500
  );
}
