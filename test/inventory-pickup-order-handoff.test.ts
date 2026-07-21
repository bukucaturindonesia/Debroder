import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildInitializePickupRequest,
  hasActivePickupPreparation,
  inventoryActionSuccessMessage,
  normalizeInventoryOrderId
} from "@/components/admin/InventoryOperationsAdmin";

const inventorySource = readFileSync("components/admin/InventoryOperationsAdmin.tsx", "utf8");
const pageSource = readFileSync("app/admin/inventory-operations/page.tsx", "utf8");
const fulfillmentSource = readFileSync("components/admin/FulfillmentDetailAdmin.tsx", "utf8");
const validOrderId = "6963c1d6-2619-4d98-8f1e-69b485e739cc";

describe("inventory pickup order handoff", () => {
  it("prefills a valid order UUID from the server-forwarded query parameter without auto-running a mutation", () => {
    expect(normalizeInventoryOrderId(validOrderId)).toBe(validOrderId);
    expect(pageSource).toContain("const { order } = await searchParams");
    expect(pageSource).toContain("<InventoryOperationsAdmin initialOrderId={initialOrderId} />");
    expect(inventorySource).toContain("useState(() => normalizeInventoryOrderId(initialOrderId))");
    expect(inventorySource).toContain("useEffect(() => { void load(); }, [load])");
    expect(inventorySource).not.toContain('useEffect(() => { void run("initialize_pickup"');
  });

  it("ignores invalid query values and rejects a human order number", () => {
    expect(normalizeInventoryOrderId("not-a-uuid")).toBe("");
    expect(normalizeInventoryOrderId("ORD-DEB-2026-0039")).toBe("");
    expect(buildInitializePickupRequest("ORD-DEB-2026-0039")).toBeNull();
  });

  it("builds the exact initialize pickup request payload for a valid UUID", () => {
    expect(buildInitializePickupRequest(validOrderId)).toEqual({
      action: "initialize_pickup",
      orderId: validOrderId
    });
    expect(inventorySource).toContain('void run(request.action,{orderId:request.orderId},"initialize")');
  });

  it("shows initialize success only after refreshed data contains an active preparation for the submitted order", () => {
    expect(hasActivePickupPreparation([{ order_id: validOrderId, status: "checking" }], validOrderId)).toBe(true);
    expect(hasActivePickupPreparation([{ order_id: validOrderId, status: "handed_over" }], validOrderId)).toBe(false);
    expect(hasActivePickupPreparation([{ order_id: "11111111-1111-4111-8111-111111111111", status: "checking" }], validOrderId)).toBe(false);
    expect(inventoryActionSuccessMessage("initialize_pickup", { orderId: validOrderId })).toBe("Persiapan pickup berhasil dimulai.");

    const runSource = inventorySource.slice(
      inventorySource.indexOf("async function run("),
      inventorySource.indexOf("const initializeRequest")
    );
    expect(runSource).toContain("const refreshed = await load()");
    expect(runSource).toContain("hasActivePickupPreparation(refreshed.preparations, submittedOrderId)");
    expect(runSource).toContain("Persiapan pickup belum ditemukan setelah proses");
    expect(runSource.indexOf("hasActivePickupPreparation")).toBeLessThan(runSource.indexOf("inventoryActionSuccessMessage"));
  });

  it("uses action-specific success messages instead of a generic false-positive message", () => {
    expect(inventoryActionSuccessMessage("process_deadlines", {})).toBe("Deadline pickup berhasil diproses.");
    expect(inventoryActionSuccessMessage("create_pickup_transfer", {})).toBe("Transfer stok pickup berhasil dibuat.");
    expect(inventoryActionSuccessMessage("mark_pickup_ready", {})).toBe("Pickup berhasil ditandai siap diambil.");
    expect(inventoryActionSuccessMessage("complete_handover", {})).toBe("Serah terima pickup berhasil diselesaikan.");
    expect(inventorySource).not.toContain("Operasi stok dan pickup berhasil diproses.");
  });

  it("preserves the existing fulfillment UUID routing and database security boundary", () => {
    expect(fulfillmentSource).toContain(
      "router.push(`/admin/inventory-operations?order=${encodeURIComponent(record.order_id)}`)"
    );
    expect(inventorySource).not.toContain('.rpc("initialize_pickup_preparation_v1"');
    expect(inventorySource).not.toContain('.from("pickup_preparations")');
    expect(inventorySource).toContain('operationsApiFetch("/api/admin/inventory-operations"');
  });
});
