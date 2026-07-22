import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import { PRODUCT_MANAGER_ROLES } from "@/lib/product-manager";
import {
  parseProductInventoryQuery,
  type ProductInventorySaveChange
} from "@/lib/product-inventory";
import {
  commitProductInventoryMutation,
  loadProductInventoryPayload,
  previewProductInventoryMutation,
  ProductInventoryApiError
} from "@/lib/product-inventory-server";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";
import {
  Phase13AuthError,
  requirePhase13Actor
} from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireProductInventoryActor(request);
    const { id } = await context.params;
    assertProductId(id);
    const query = parseProductInventoryQuery(
      new URL(request.url).searchParams
    );
    const payload = await loadProductInventoryPayload(
      actor.adminClient,
      actor.role,
      id,
      query
    );
    return noStoreJson(payload);
  } catch (error) {
    return productInventoryErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireProductInventoryActor(request);
    const { id } = await context.params;
    assertProductId(id);
    const body = await readBody(request);
    const action = body.action === "commit"
      ? "commit"
      : body.action === "preview"
        ? "preview"
        : "";
    if (!action) {
      throw new ProductInventoryApiError(400, "Aksi WP-05 tidak valid.");
    }
    const input = {
      locationId: typeof body.locationId === "string"
        ? body.locationId
        : "",
      changes: Array.isArray(body.changes)
        ? body.changes as ProductInventorySaveChange[]
        : [],
      reason: typeof body.reason === "string" ? body.reason : ""
    };
    const result = action === "preview"
      ? await previewProductInventoryMutation(actor, id, input)
      : await commitProductInventoryMutation(actor, request, id, input);
    return noStoreJson(result);
  } catch (error) {
    return productInventoryErrorResponse(error);
  }
}

async function requireProductInventoryActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(
      403,
      "Role ini tidak memiliki akses Harga dan Stok Produk."
    );
  }
  return actor;
}

function assertProductId(value: string) {
  if (!isValidProductWorkspaceId(value)) {
    throw new ProductInventoryApiError(400, "ID produk tidak valid.");
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("invalid");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new ProductInventoryApiError(400, "JSON request tidak valid.");
  }
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

function productInventoryErrorResponse(error: unknown) {
  const guest = adminGuestErrorResponse(error);
  if (guest) return guest;
  if (
    error instanceof ProductInventoryApiError ||
    error instanceof Phase13AuthError
  ) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("Product Inventory API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson({ error: "Harga dan stok gagal diproses." }, 500);
}
