import { adminGuestErrorResponse } from "@/lib/admin-role-security";
import type { AdminRole } from "@/lib/access-control";
import {
  getProductManagerCapabilities,
  PRODUCT_MANAGER_ROLES,
  type ProductLifecycle
} from "@/lib/product-manager";
import { isValidProductWorkspaceId } from "@/lib/product-workspace";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const PRODUCT_WORKSPACE_FIELDS = [
  "id",
  "name",
  "nama",
  "slug",
  "status",
  "product_category_id",
  "kategori",
  "base_price",
  "sku",
  "image_url",
  "gambar_url",
  "updated_at"
].join(",");

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireProductWorkspaceActor(request);
    const { id } = await context.params;
    if (!isValidProductWorkspaceId(id)) {
      throw new ProductWorkspaceApiError(400, "ID produk tidak valid.");
    }

    const { data, error } = await actor.adminClient
      .from("products")
      .select(PRODUCT_WORKSPACE_FIELDS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Product Workspace identity load failed", { code: error.code });
      throw new ProductWorkspaceApiError(503, "Identitas produk belum dapat dimuat.");
    }
    if (!data || typeof data !== "object") {
      throw new ProductWorkspaceApiError(404, "Produk tidak ditemukan.");
    }

    const row = data as Record<string, unknown>;
    const categoryId = textOrNull(row.product_category_id);
    let categoryName = textOrNull(row.kategori) || "";

    if (categoryId) {
      const { data: category, error: categoryError } = await actor.adminClient
        .from("product_categories")
        .select("name")
        .eq("id", categoryId)
        .maybeSingle();
      if (categoryError) {
        console.error("Product Workspace category load failed", { code: categoryError.code });
        throw new ProductWorkspaceApiError(503, "Kategori produk belum dapat dimuat.");
      }
      if (category && typeof category === "object") {
        categoryName = textOrNull((category as Record<string, unknown>).name) || categoryName;
      }
    }

    return noStoreJson({
      role: actor.role,
      capabilities: getProductManagerCapabilities(actor.role),
      product: {
        id: String(row.id),
        name: String(row.name || row.nama || ""),
        slug: String(row.slug || ""),
        status: lifecycle(row.status),
        categoryId,
        categoryName,
        basePrice: finiteNumber(row.base_price) || 0,
        sku: textOrNull(row.sku),
        imageUrl: textOrNull(row.image_url) || textOrNull(row.gambar_url),
        updatedAt: textOrNull(row.updated_at)
      }
    });
  } catch (error) {
    return productWorkspaceErrorResponse(error);
  }
}

async function requireProductWorkspaceActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
    throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Workspace.");
  }
  return actor;
}

function lifecycle(value: unknown): ProductLifecycle {
  return value === "active" || value === "archived" ? value : "draft";
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}

class ProductWorkspaceApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function productWorkspaceErrorResponse(error: unknown) {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  if (error instanceof ProductWorkspaceApiError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message }, error.status);
  }
  console.error("Product Workspace API failed", {
    error: error instanceof Error ? error.name : "unknown"
  });
  return noStoreJson({ error: "Product Workspace gagal diproses." }, 500);
}
