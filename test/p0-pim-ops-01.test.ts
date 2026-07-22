import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const libraryRoute = readFileSync(
  "app/api/admin/products/library/route.ts",
  "utf8"
);
const reviewPanel = readFileSync(
  "components/admin/products/workspace/ProductReviewPanel.tsx",
  "utf8"
);
const lifecycleRoute = readFileSync(
  "app/api/admin/products/[id]/lifecycle/route.ts",
  "utf8"
);
const lifecycleApi = readFileSync(
  "lib/admin-product-lifecycle-api.ts",
  "utf8"
);
const productReview = readFileSync("lib/product-review.ts", "utf8");

const changedSource = [
  libraryRoute,
  reviewPanel,
  lifecycleRoute,
  lifecycleApi
].join("\n");

describe("P0-PIM-OPS-01", () => {
  it("projects the structured variant Front image to Product Library cards", () => {
    expect(libraryRoute).toContain('"product_variant_images"');
    expect(libraryRoute).toContain('"id,variant_id,image_url,image_role,is_cover,sort_order"');
    expect(libraryRoute).toContain("coverByProduct");
    expect(libraryRoute).toContain("isFrontImage");
    expect(libraryRoute).toContain("dependencySummary.coverByProduct.get(id)");
    expect(libraryRoute).toContain("textOrNull(row.image_url)");
    expect(libraryRoute).toContain("textOrNull(row.gambar_url)");
  });

  it("keeps the frozen Front-image Publish blocker", () => {
    expect(productReview).toContain("media.front_missing");
    expect(productReview).toContain("Varian aktif wajib memiliki Front image.");
    expect(productReview).toContain("blockers === 0");
  });

  it("adds Draft archive and Archived restore without delete", () => {
    expect(lifecycleRoute).toContain('type ProductLifecycleMaintenanceAction = "archive_draft" | "restore"');
    expect(lifecycleRoute).toContain('expectedStatus: "draft"');
    expect(lifecycleRoute).toContain('nextStatus: "archived"');
    expect(lifecycleRoute).toContain('expectedStatus: "archived"');
    expect(lifecycleRoute).toContain('nextStatus: "draft"');
    expect(lifecycleRoute).toContain("PRODUCT_ARCHIVED");
    expect(lifecycleRoute).toContain("PRODUCT_RESTORED");
    expect(reviewPanel).toContain("Arsipkan Draft");
    expect(reviewPanel).toContain("Pulihkan ke Draft");
  });

  it("preserves Owner and Super Admin lifecycle authority", () => {
    expect(lifecycleRoute).toContain("PRODUCT_MANAGER_ROLES");
    expect(lifecycleRoute).toContain("getProductManagerCapabilities(actor.role).canArchive");
    expect(lifecycleRoute).toContain("Archive dan Restore hanya tersedia untuk Owner atau Super Admin");
    expect(reviewPanel).toContain("payload.capabilities.canArchive");
  });

  it("uses optimistic concurrency and returns HTTP 409 on stale state", () => {
    expect(lifecycleRoute).toContain("expectedUpdatedAt");
    expect(lifecycleRoute).toContain('.eq("status", transition.expectedStatus)');
    expect(lifecycleRoute).toContain('.eq("updated_at", expectedUpdatedAt)');
    expect(lifecycleRoute).toContain('.is("updated_at", null)');
    expect(lifecycleRoute).toContain("throw conflict()");
    expect(lifecycleRoute).toContain("409");
    expect(lifecycleApi).toContain("expectedUpdatedAt");
    expect(lifecycleApi).toContain('"x-request-id"');
    expect(lifecycleApi).toContain('"x-operation-id"');
  });

  it("removes the redundant full Workspace reload after lifecycle mutation", () => {
    expect(reviewPanel).toContain("setPayload(result.payload)");
    expect(reviewPanel).toContain("updateWorkspaceProduct");
    expect(reviewPanel).not.toContain("reloadWorkspace");
  });

  it("does not add schema, RLS, checkout, order, or deletion work", () => {
    const source = changedSource.toLowerCase();
    expect(source).not.toContain("create table");
    expect(source).not.toContain("alter table");
    expect(source).not.toContain("create policy");
    expect(source).not.toContain("drop table");
    expect(source).not.toContain("export async function delete");
    expect(source).not.toContain(".delete(");
    expect(source).not.toContain("checkout");
    expect(source).not.toContain("order_items");
    expect(source).not.toContain("stock_reservations");
  });
});
