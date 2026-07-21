import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const detailSource = readFileSync(
  "components/admin/FulfillmentDetailAdmin.tsx",
  "utf8"
);

const pickupGuidedAction = detailSource.slice(
  detailSource.indexOf('if (record.status === "packing" && record.final_verified_at)'),
  detailSource.indexOf('if (record.status === "ready_to_ship"')
);

const transitionHandler = detailSource.slice(
  detailSource.indexOf("async function transitionStatus()"),
  detailSource.indexOf("async function completePickupAtStore()")
);

const transitionModal = detailSource.slice(
  detailSource.indexOf("{transitionTarget ? ("),
  detailSource.indexOf("{archiveOpen ? (")
);

describe("fulfillment pickup transition runtime guard", () => {
  it("routes packing pickup through Inventory Operations instead of the legacy direct transition", () => {
    expect(pickupGuidedAction).toContain('kind: "pickup_preparation"');
    expect(pickupGuidedAction).toContain('label: "Buka Persiapan Pickup"');
    expect(pickupGuidedAction).not.toContain('target: "ready_for_pickup"');
    expect(detailSource).toContain(
      "router.push(`/admin/inventory-operations?order=${encodeURIComponent(record.order_id)}`)"
    );
  });

  it("delegates pickup readiness to the existing workflow without adding database calls", () => {
    expect(detailSource).not.toContain('.rpc("initialize_pickup_preparation_v1"');
    expect(detailSource).not.toContain('.rpc("mark_pickup_ready_v1"');
    expect(detailSource).not.toContain('.from("pickup_preparations")');
  });

  it("renders transition errors inside the open modal", () => {
    expect(detailSource).toContain(
      "const [transitionError, setTransitionError] = useState<string | null>(null)"
    );
    expect(transitionModal).toContain('role="alert"');
    expect(transitionModal).toContain("{transitionError}");
  });

  it("keeps processing and double-submit protection visible", () => {
    expect(transitionHandler).toContain("if (!record || !transitionTarget || !canManage || working) return");
    expect(transitionModal).toContain('{working ? "Memproses..." : "Konfirmasi"}');
    expect(transitionModal).toContain("disabled={working ||");
    expect(transitionHandler).toContain("finally {");
    expect(transitionHandler).toContain("setWorking(false)");
  });

  it("keeps the modal open on error and closes it only after a successful RPC", () => {
    const errorBranch = transitionHandler.slice(
      transitionHandler.indexOf("if (result.error)"),
      transitionHandler.indexOf("setTransitionTarget(null)")
    );
    expect(errorBranch).toContain("setTransitionError(");
    expect(errorBranch).not.toContain("setTransitionTarget(null)");

    const successBranch = transitionHandler.slice(
      transitionHandler.indexOf("setTransitionTarget(null)"),
      transitionHandler.indexOf("} catch")
    );
    expect(successBranch).toContain('setTransitionNote("")');
    expect(successBranch).toContain('setTransitionReason("")');
    expect(successBranch).toContain("setTransitionError(null)");
    expect(successBranch).toContain("await loadData()");
  });
});
