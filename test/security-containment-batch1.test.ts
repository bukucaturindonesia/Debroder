import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAdminRequest } from "@/lib/admin-auth";

const quotationCompatibilityPage = readFileSync(
  "app/admin/quotations/page.tsx",
  "utf8"
);
const customServicesRoute = readFileSync(
  "app/api/admin/pim-v2/custom-services/route.ts",
  "utf8"
);
const legacyOrderForm = readFileSync("components/OrderForm.tsx", "utf8");
const pimV2Client = readFileSync("components/admin/pim-v2-client.tsx", "utf8");
const bulkCustomManager = readFileSync("components/admin/BulkCustomManager.tsx", "utf8");
const quotationReader = readFileSync("lib/supabase/quotations.ts", "utf8");

function readSourceTree(root: string): string {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return [readSourceTree(path)];
      return /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
    })
    .join("\n");
}

const activeSource = ["app", "components", "lib"].map(readSourceTree).join("\n");

describe("Batch 1 source-side security containment", () => {
  it("redirects the legacy quotation route before any private service-role query", () => {
    expect(quotationCompatibilityPage).toContain(
      'redirect("/admin/orders/quotations")'
    );
    expect(quotationCompatibilityPage).not.toContain("listQuotationDrafts");
    expect(quotationCompatibilityPage).not.toContain("getAdminSupabaseClient");
    expect(quotationCompatibilityPage).not.toContain("quotation_drafts");
  });

  it("requires a canonical admin actor before custom-service service-role writes", () => {
    const actorGuard = customServicesRoute.indexOf("requirePhase13Actor(request)");
    const serviceWrite = customServicesRoute.indexOf(
      'actor.adminClient.from("custom_services").upsert'
    );

    expect(actorGuard).toBeGreaterThan(-1);
    expect(serviceWrite).toBeGreaterThan(actorGuard);
    expect(customServicesRoute).toContain("getProductManagerCapabilities(actor.role).canEditDraft");
    expect(customServicesRoute).toContain("phase13ErrorResponse(error)");
    expect(customServicesRoute).not.toContain("isAdminRequest");
    expect(customServicesRoute).not.toContain("PIM_V2_ADMIN_TOKEN");
    expect(customServicesRoute).toContain('.update(row).eq("id", service.id)');
  });

  it("keeps the old shared-token helper fail-closed", () => {
    expect(isAdminRequest(new Request("https://example.test"))).toBe(false);
    expect(
      isAdminRequest(
        new Request("https://example.test", {
          headers: { authorization: "Bearer legacy-shared-token" }
        })
      )
    ).toBe(false);
  });

  it("keeps the legacy quotation reader incapable of creating its own service-role client", () => {
    expect(quotationReader).toContain("client: SupabaseClient");
    expect(quotationReader).not.toContain("getAdminSupabaseClient");
    expect(quotationReader).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("routes the active custom-service editor through the guarded API", () => {
    expect(bulkCustomManager).toContain('fetch("/api/admin/pim-v2/custom-services"');
    expect(bulkCustomManager).toContain("supabase.auth.getSession()");
    expect(bulkCustomManager).toContain("authorization: `Bearer ${token}`");
    expect(bulkCustomManager).not.toMatch(
      /from\(["']custom_services["']\)[\s\S]{0,160}\.update\(/
    );
  });

  it("removes legacy anonymous order, payment, and order-upload calls from OrderForm", () => {
    expect(legacyOrderForm).toContain("Compatibility-only component");
    expect(legacyOrderForm).toContain("/keranjang");
    expect(legacyOrderForm).not.toContain("create_public_order");
    expect(legacyOrderForm).not.toContain("submit_public_payment_proof");
    expect(legacyOrderForm).not.toContain("ORDER_UPLOADS_BUCKET");
    expect(legacyOrderForm).not.toContain("storage.from");
  });

  it("keeps retired public order/payment calls and the shared PIM secret out of active source", () => {
    expect(activeSource).not.toContain("create_public_order");
    expect(activeSource).not.toContain("submit_public_payment_proof");
    expect(activeSource).not.toContain("PIM_V2_ADMIN_TOKEN");
    expect(activeSource).not.toMatch(
      /storage\.from\(ORDER_UPLOADS_BUCKET\)[\s\S]{0,160}\.upload\(/
    );
  });

  it("uses the signed-in Supabase session instead of a manually entered PIM token", () => {
    expect(pimV2Client).toContain("supabase.auth.getSession()");
    expect(pimV2Client).toContain("Authorization: `Bearer ${token}`");
    expect(pimV2Client).not.toContain("Admin token");
    expect(pimV2Client).not.toContain("setToken");
    expect(pimV2Client).not.toContain("PIM_V2_ADMIN_TOKEN");
  });
});
