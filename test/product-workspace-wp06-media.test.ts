import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canManageProductMedia,
  changedProductMediaSlots,
  completeProductMediaSlots,
  parseProductMediaQuery,
  productMediaCompleteness,
  productMediaRoleLabel,
  type ProductMediaSlot
} from "@/lib/product-media";
import { getProductManagerCapabilities } from "@/lib/product-manager";

const mediaPage = readFileSync(
  "app/admin/products/[id]/media/page.tsx",
  "utf8"
);
const mediaRoute = readFileSync(
  "app/api/admin/products/[id]/media/route.ts",
  "utf8"
);
const mediaServer = readFileSync(
  "lib/product-media-server.ts",
  "utf8"
);
const mediaPanel = readFileSync(
  "components/admin/products/workspace/ProductMediaPanel.tsx",
  "utf8"
);
const uploadService = readFileSync(
  "lib/product-media-upload.ts",
  "utf8"
);

const frontSlot: ProductMediaSlot = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "front",
  imageUrl: "https://example.com/front.webp",
  altText: "Black Front",
  objectFit: "cover",
  objectPosition: "50% 50%",
  focalX: 50,
  focalY: 50,
  focalZoom: 1,
  targetRatio: "4:5",
  isCover: true,
  sortOrder: 0,
  updatedAt: "2026-07-22T00:00:00.000Z"
};

describe("WP-06 one-color Product Media", () => {
  it("replaces the WP-02 media shell", () => {
    expect(mediaPage).toContain("ProductMediaPanel");
    expect(mediaPage).not.toContain("ProductWorkspaceReadOnlyModule");
    expect(mediaPanel).toContain("WP-06 ONE-COLOR MEDIA");
  });

  it("uses exactly four frozen image roles", () => {
    const slots = completeProductMediaSlots([frontSlot]);
    expect(slots.map((slot) => slot.role)).toEqual([
      "front",
      "back",
      "detail",
      "lifestyle"
    ]);
    expect(productMediaRoleLabel("front")).toBe("Front");
    expect(productMediaRoleLabel("lifestyle")).toBe("Lifestyle");
    expect(productMediaCompleteness(slots)).toEqual({
      complete: 1,
      frontReady: true
    });
  });

  it("loads one selected color details and summary-only rows for all colors", () => {
    expect(mediaServer).toContain("IMAGE_SUMMARY_FIELDS");
    expect(mediaServer).toContain("loadSelectedVariantImages");
    expect(mediaServer).toContain('.eq("variant_id", variantId)');
    expect(mediaServer).toContain("selectedVariantId");
    expect(mediaPanel).toContain("Hanya empat slot warna terpilih yang dimuat");
    expect(mediaServer).not.toContain("loadManagerPayload");
  });

  it("loads Media Library only when picker is opened and paginates assets", () => {
    const query = parseProductMediaQuery(new URLSearchParams());
    expect(query).toMatchObject({
      includeLibrary: false,
      q: "",
      page: 1,
      pageSize: 24
    });
    expect(parseProductMediaQuery(
      new URLSearchParams("includeLibrary=1&pageSize=48&page=2")
    )).toMatchObject({
      includeLibrary: true,
      page: 2,
      pageSize: 48
    });
    expect(mediaServer).toContain("query.includeLibrary");
    expect(mediaServer).toContain("loadMediaLibrary");
    expect(mediaServer).toContain("request.range");
  });

  it("preserves role capability freeze", () => {
    expect(canManageProductMedia(
      getProductManagerCapabilities("owner")
    )).toBe(true);
    expect(canManageProductMedia(
      getProductManagerCapabilities("superadmin")
    )).toBe(true);
    expect(canManageProductMedia(
      getProductManagerCapabilities("admin")
    )).toBe(false);
    expect(canManageProductMedia(
      getProductManagerCapabilities("admin_guest")
    )).toBe(false);
    expect(mediaPanel).toContain("MODE LIHAT SAJA");
  });

  it("tracks changed slots only", () => {
    const baseline = completeProductMediaSlots([frontSlot]);
    expect(changedProductMediaSlots(baseline, baseline)).toEqual([]);
    const drafts = baseline.map((slot) =>
      slot.role === "back"
        ? {
          ...slot,
          mediaAssetId: "22222222-2222-4222-8222-222222222222",
          imageUrl: "https://example.com/back.webp"
        }
        : slot
    );
    expect(changedProductMediaSlots(drafts, baseline)).toMatchObject([{
      role: "back",
      mediaAssetId: "22222222-2222-4222-8222-222222222222",
      imageUrl: "https://example.com/back.webp",
      expectedImageUpdatedAt: null
    }]);
  });

  it("implements dirty state and the frozen leave decisions", () => {
    for (const state of [
      "clean",
      "dirty",
      "saving",
      "saved",
      "conflict",
      "error"
    ]) {
      expect(mediaPanel).toContain(state);
    }
    for (const label of [
      "Simpan perubahan sebelum keluar?",
      "Keluar tanpa menyimpan",
      "Tetap di sini",
      "Simpan Media"
    ]) {
      expect(mediaPanel).toContain(label);
    }
    expect(mediaPanel).toContain("beforeunload");
  });

  it("uses optimistic concurrency and compensation rollback", () => {
    expect(mediaServer).toContain("expectedVariantUpdatedAt");
    expect(mediaServer).toContain("expectedImageUpdatedAt");
    expect(mediaServer).toContain('.eq("updated_at"');
    expect(mediaServer).toContain("rollbackVariant");
    expect(mediaServer).toContain("rollbackSlotChanges");
    expect(mediaServer).toContain("409");
    expect(mediaPanel).toContain("Konflik versi");
  });

  it("keeps front required and other slots recommended", () => {
    expect(mediaPanel).toContain("Front wajib untuk Publish");
    expect(mediaPanel).toContain("FRONT WAJIB");
    expect(mediaPanel).toContain("minimum Publish terpenuhi");
    expect(mediaPanel).toContain("Back, Detail, dan Lifestyle disarankan");
  });

  it("reuses Media Library upload and never deletes original assets", () => {
    expect(uploadService).toContain('from("media_assets")');
    expect(uploadService).toContain("WEBSITE_IMAGES_BUCKET");
    expect(uploadService).toContain('folder: "products"');
    expect(uploadService).toContain('"image/webp", 0.85');
    expect(mediaServer).not.toContain('.from("media_assets").delete');
    expect(mediaServer).not.toContain("storage.from");
    expect(mediaPanel).toContain("Kosongkan slot");
  });

  it("preserves focal point and 4:5 contract", () => {
    expect(mediaServer).toContain('target_ratio: "4:5"');
    expect(mediaServer).toContain("focal_x");
    expect(mediaServer).toContain("focal_y");
    expect(mediaServer).toContain("focal_zoom");
    expect(mediaPanel).toContain("Fokus X");
    expect(mediaPanel).toContain("Fokus Y");
    expect(mediaPanel).toContain("Object fit");
  });

  it("does not open WP-07 or change schema", () => {
    expect(mediaRoute).toContain("export async function GET");
    expect(mediaRoute).toContain("export async function PATCH");
    expect(mediaRoute).not.toContain("export async function POST");
    expect(mediaRoute).not.toContain("export async function DELETE");
    expect(mediaServer.toLowerCase()).not.toContain("create table");
    expect(mediaServer.toLowerCase()).not.toContain("alter table");
    expect(mediaPanel).not.toContain("Archive");
    expect(mediaPanel).not.toContain("Publish product");
  });
});
