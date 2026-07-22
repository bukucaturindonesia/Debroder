import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const legacyPage = readFileSync("app/admin/products/legacy/page.tsx", "utf8");
const library = readFileSync("components/admin/products/ProductLibrary.tsx", "utf8");
const workspaceShell = readFileSync(
  "components/admin/products/workspace/ProductWorkspaceShell.tsx",
  "utf8"
);
const draftPanel = readFileSync(
  "components/admin/products/ProductDraftCreatePanel.tsx",
  "utf8"
);
const guestDashboard = readFileSync("components/admin/AdminGuestDashboard.tsx", "utf8");
const duplicateRoute = readFileSync(
  "app/api/admin/products/[id]/duplicate/route.ts",
  "utf8"
);
const compatibilityApi = readFileSync(
  "lib/admin-product-compatibility-api.ts",
  "utf8"
);

describe("WP-08 Legacy Parity and Cleanup", () => {
  it("deprecates the monolith while preserving stable legacy redirects", () => {
    expect(legacyPage).toContain("redirect(productWorkspacePath(params.productId))");
    expect(legacyPage).toContain("ProductDraftCreatePanel");
    expect(legacyPage).toContain('redirect("/admin/products")');
    expect(legacyPage).not.toContain("ProductAdminPanel");
    expect(library).not.toContain("Editor Lama");
    expect(workspaceShell).not.toContain("Editor Lama");
  });

  it("preserves create Draft and Duplicate as Draft without rendering all SKU rows", () => {
    expect(draftPanel).toContain('action: "save_draft"');
    expect(draftPanel).toContain("expectedUpdatedAt: null");
    expect(draftPanel).toContain("canCreateDraft");
    expect(library).toContain("duplicateProductAsDraft");
    expect(library).toContain("Duplikat sebagai Draft");
    expect(library).not.toContain("Daftar SKU Siap Jual");
    expect(library).not.toContain("VariantMatrixEditor");
  });

  it("uses a capability-protected duplicate endpoint with optimistic concurrency", () => {
    expect(duplicateRoute).toContain("export async function POST");
    expect(duplicateRoute).not.toContain("export async function DELETE");
    expect(duplicateRoute).toContain("canCreateDraft");
    expect(duplicateRoute).toContain("expectedUpdatedAt");
    expect(duplicateRoute).toContain('eq("updated_at", expectedUpdatedAt)');
    expect(duplicateRoute).toContain('is("updated_at", null)');
    expect(duplicateRoute).toContain("throw conflict()");
    expect(duplicateRoute).toContain("PRODUCT_DUPLICATED");
    expect(duplicateRoute).toContain("recordPimAuditEvent");
    expect(compatibilityApi).toContain("expectedUpdatedAt");
    expect(compatibilityApi).toContain('"x-request-id"');
    expect(compatibilityApi).toContain('"x-operation-id"');
  });

  it("loads Admin Guest summaries page-by-page without the full Product Manager tree", () => {
    expect(guestDashboard).toContain("loadProductLibrary");
    expect(guestDashboard).toContain("pageSize: 100");
    expect(guestDashboard).toContain("first.pagination.totalPages");
    expect(guestDashboard).not.toContain("loadProductManager");
    expect(guestDashboard).not.toContain("payload.products");
    expect(guestDashboard).not.toContain("mediaAssets");
  });

  it("keeps role authority in existing capability responses", () => {
    expect(draftPanel).toContain("payload.capabilities.canCreateDraft");
    expect(draftPanel).toContain("Role ini tidak memiliki capability membuat Draft produk");
    expect(library).toContain("canCreateDraft");
    expect(library).toContain("data-admin-mutation");
  });

  it("does not introduce schema, RLS, inventory, hard delete, or WP-09", () => {
    const source = `${legacyPage}\n${library}\n${workspaceShell}\n${draftPanel}\n${guestDashboard}`.toLowerCase();
    expect(source).not.toContain("create table");
    expect(source).not.toContain("alter table");
    expect(source).not.toContain("create policy");
    expect(source).not.toContain("inventory_locations");
    expect(source).not.toContain("legacy stock");
    expect(source).not.toContain(".delete(");
    expect(source).not.toContain("wp-09");
  });
});
