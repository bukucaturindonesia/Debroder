import { safeInventoryOperationMessage } from "@/lib/admin-inventory-operation-message";
import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";

function inventoryOperationErrorResponse(error: unknown) {
  const safeMessage = safeInventoryOperationMessage(error);
  if (safeMessage) {
    return Response.json(
      { error: safeMessage },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  return operationsErrorResponse(error);
}

export async function GET(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "inventory.location.read");
    const [locations, balances, transfers, preparations] = await Promise.all([
      actor.client.from("inventory_locations").select("id,code,name,location_type,store_id,is_pickup_enabled,active,metadata").eq("active", true).order("name"),
      actor.client.from("inventory_balances").select("location_id,variant_size_id,on_hand_quantity,reserved_quantity,available_quantity,inventory_locations(name,code),product_variant_sizes(sku,size_name)").order("updated_at", { ascending: false }).limit(500),
      actor.client.from("stock_transfers").select("id,transfer_number,order_id,from_location_id,to_location_id,status,notes,created_at,shipped_at,received_at,orders(order_number),from_location:inventory_locations!stock_transfers_from_location_id_fkey(name),to_location:inventory_locations!stock_transfers_to_location_id_fkey(name),stock_transfer_items(id,variant_size_id,quantity,received_quantity,product_variant_sizes(sku,size_name))").order("created_at", { ascending: false }).limit(100),
      actor.client.from("pickup_preparations").select("id,order_id,location_id,fulfillment_id,status,ready_at,pickup_deadline,reminder_at,extension_requested_at,requested_deadline,extension_reason,expired_at,no_show_reason,orders(order_number,customer_name,payment_method,payment_status,status),inventory_locations(name,code),pickup_preparation_items(id,variant_size_id,required_quantity,reserved_quantity,product_variant_sizes(sku,size_name))").order("updated_at", { ascending: false }).limit(150)
    ]);
    const firstError = locations.error || balances.error || transfers.error || preparations.error;
    if (firstError) throw firstError;
    return Response.json({
      locations: locations.data ?? [], balances: balances.data ?? [], transfers: transfers.data ?? [], preparations: preparations.data ?? [], role: actor.role
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "inventory.location.manage");
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    let response;
    if (action === "initialize_pickup") {
      response = await actor.client.rpc("initialize_pickup_preparation_v1", { p_order_id: body.orderId });
    } else if (action === "create_pickup_transfer") {
      response = await actor.client.rpc("create_pickup_transfer_v1", { p_preparation_id: body.preparationId, p_idempotency_key: body.idempotencyKey });
    } else if (action === "receive_transfer") {
      response = await actor.client.rpc("receive_stock_transfer_v1", { p_transfer_id: body.transferId, p_note: body.note || null });
    } else if (action === "mark_pickup_ready") {
      response = await actor.client.rpc("mark_pickup_ready_v1", { p_preparation_id: body.preparationId, p_deadline_hours: Number(body.deadlineHours ?? 72) });
    } else if (action === "complete_handover") {
      response = await actor.client.rpc("complete_pickup_handover_v1", { p_preparation_id: body.preparationId, p_note: body.note || null });
    } else if (action === "decide_extension") {
      response = await actor.client.rpc("decide_pickup_extension_v1", {
        p_preparation_id: body.preparationId,
        p_approve: body.approve === true,
        p_deadline: body.deadline,
        p_reason: body.reason || null
      });
    } else if (action === "process_deadlines") {
      response = await actor.client.rpc("process_pickup_deadlines_v1");
    } else {
      return Response.json({ error: "Aksi stok atau pickup tidak valid." }, { status: 400 });
    }
    if (response.error) throw response.error;
    return Response.json({ ok: true, result: response.data });
  } catch (error) {
    return inventoryOperationErrorResponse(error);
  }
}
