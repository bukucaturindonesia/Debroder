import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProductCardImages } from "@/lib/product-gallery";
import type { Product } from "@/lib/types";
import {
  hasActivePickupPreparation,
  isTerminalInventoryOrder
} from "@/components/admin/InventoryOperationsAdmin";
import { safeInventoryOperationMessage } from "@/app/api/admin/inventory-operations/route";

const migration = readFileSync(
  "supabase/migrations/20260722194500_p0_hotfix_02_public_media_pickup_idempotency.sql",
  "utf8"
);
const card = readFileSync("components/PublicProductCard.tsx", "utf8");
const operationsUi = readFileSync("components/admin/InventoryOperationsAdmin.tsx", "utf8");

function product(input: Partial<Product> = {}): Product {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    nama: "Cotton Combed 24s",
    kategori: "Kaos Polos",
    deskripsi: "Kaos polos",
    badge: "",
    gambar_url: "/images/debroder/fallback/fallback-product.jpg",
    image_url: "/images/debroder/fallback/fallback-product.jpg",
    whatsapp_link: "",
    urutan: 10,
    status_aktif: true,
    ...input
  };
}

describe("P0-HOTFIX-02 public media and pickup idempotency", () => {
  it("uses canonical Front and Back images from the default active variant", () => {
    const result = getProductCardImages(product({
      variants: [{
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        product_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        is_active: true,
        status: "active",
        sort_order: 0,
        variant_images: [
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            variant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            image_url: "https://example.com/front.webp",
            image_role: "front",
            sort_order: 0
          },
          {
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            variant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            image_url: "https://example.com/back.webp",
            image_role: "back",
            sort_order: 1
          }
        ]
      }]
    }));

    expect(result.primary).toBe("https://example.com/front.webp");
    expect(result.hover).toBe("https://example.com/back.webp");
  });

  it("keeps root image as a safe fallback when variants have no media", () => {
    const result = getProductCardImages(product({
      image_url: "https://example.com/root.webp",
      gambar_url: "https://example.com/root.webp",
      variants: []
    }));
    expect(result.primary).toBe("https://example.com/root.webp");
    expect(result.hover).toBeNull();
  });

  it("uses the same canonical card image for quick cart payloads", () => {
    expect(card).toContain("imageUrl: cardImages.primary");
    expect(card).not.toContain("imageUrl: getProductImage(product)");
  });

  it("filters terminal orders from active pickup operations", () => {
    expect(isTerminalInventoryOrder("completed")).toBe(true);
    expect(isTerminalInventoryOrder("selesai")).toBe(true);
    expect(isTerminalInventoryOrder("processing")).toBe(false);
    expect(hasActivePickupPreparation([
      { order_id: "order-1", status: "ready_for_pickup", orderStatus: "completed" }
    ], "order-1")).toBe(false);
    expect(operationsUi).toContain("Pesanan ini sudah selesai");
  });

  it("returns only allowlisted operational database messages", () => {
    expect(safeInventoryOperationMessage({ message: "Pesanan sudah selesai dan pickup tidak dapat dibuka kembali" }))
      .toContain("Pesanan sudah selesai");
    expect(safeInventoryOperationMessage({ message: "relation secret_table does not exist" }))
      .toBeNull();
  });

  it("projects Front media to homepage root cards and backfills existing products", () => {
    expect(migration).toContain("sync_product_root_card_image_v1");
    expect(migration).toContain("sync_product_root_card_image_from_image_v1");
    expect(migration).toContain("set image_url = selected_url");
    expect(migration).toContain("perform public.sync_product_root_card_image_v1(product_row.product_id)");
  });

  it("prevents terminal pickup reopening and makes handover idempotent", () => {
    expect(migration).toContain("Pesanan sudah selesai dan pickup tidak dapat dibuka kembali");
    expect(migration).toContain("Idempotent terminal reconciliation: never consume stock again");
    expect(migration).toContain("movement.idempotency_key = format(");
    expect(migration).toContain("if prep.status = 'handed_over'");
    expect(migration).toContain("order_value.status in ('completed', 'selesai')");
  });

  it("repairs only the reported completed pickup without changing stock", () => {
    expect(migration).toContain("ORD-DEB-2026-0040");
    expect(migration).toContain("'stock_changed', false");
    expect(migration).toContain("'movement_created', false");
    expect(migration.toLowerCase()).not.toContain("delete from");
  });
});
