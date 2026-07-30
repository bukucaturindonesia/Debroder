import { readCheckoutJsonBody, CheckoutBodyError } from "@/lib/checkout-abuse-protection";
import { listCustomCategoryCatalogsByIds } from "@/lib/custom-commerce/data";
import { priceCustomProject, toPublicCustomPricing } from "@/lib/custom-commerce/pricing";
import {
  canonicalCustomDesignPairIssues,
  parseCustomProject,
  parseCustomProjectDraft
} from "@/lib/custom-commerce/validation";

function response(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return response({ code: "CUSTOM_INVALID_REQUEST", error: "Konfigurasi custom tidak valid." }, 400);
    }
    const raw = await readCheckoutJsonBody(request);
    const rawProject = isRecord(raw) ? raw.project : null;
    const draftProject = parseCustomProjectDraft(rawProject);
    if (!draftProject) {
      return response({ code: "CUSTOM_INVALID_REQUEST", error: "Konfigurasi custom tidak valid." }, 400);
    }
    const pairIssue = canonicalCustomDesignPairIssues(draftProject)[0];
    if (pairIssue) {
      return response({ code: "CUSTOM_DESIGN_PAIR_INVALID", error: pairIssue }, 409);
    }
    const project = parseCustomProject(rawProject);
    if (!project) return response({ code: "CUSTOM_INVALID_REQUEST", error: "Konfigurasi custom tidak valid." }, 400);

    const categoryIds = Array.from(new Set(project.items.map((item) => item.categoryId)));
    const catalogs = await listCustomCategoryCatalogsByIds(categoryIds);
    if (catalogs.length !== categoryIds.length) {
      return response({ code: "CUSTOM_CATALOG_STALE", error: "Sebagian katalog custom sudah berubah. Muat ulang halaman." }, 409);
    }

    const pricing = priceCustomProject(project, catalogs);
    const publicPricing = toPublicCustomPricing(pricing);
    return response({ pricing: publicPricing, ...(pricing.issues.length ? { error: pricing.issues[0] } : {}) }, pricing.issues.length ? 409 : 200);
  } catch (error) {
    if (error instanceof CheckoutBodyError) {
      return response({ code: error.code, error: error.status === 413 ? "Ukuran konfigurasi terlalu besar." : "Konfigurasi custom tidak valid." }, error.status);
    }
    console.error("Custom repricing failed", { error: error instanceof Error ? error.name : "unknown" });
    return response({ code: "CUSTOM_REPRICING_UNAVAILABLE", error: "Harga custom belum dapat divalidasi." }, 503);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
