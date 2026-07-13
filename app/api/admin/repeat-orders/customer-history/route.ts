import { NextRequest } from "next/server";
import {
  canCreateRepeatOrder,
  getRepeatOrderSource,
  listCustomerOrderHistory,
  listRepeatOrderHistory
} from "@/lib/repeat-orders";
import {
  repeatOrderErrorResponse,
  requireRepeatOrderActor
} from "@/lib/repeat-order-auth";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRepeatOrderActor(request);
    const orderId = request.nextUrl.searchParams.get("orderId") ?? "";
    const source = await getRepeatOrderSource(actor.client, orderId);
    const [orders, repeatHistory] = await Promise.all([
      listCustomerOrderHistory(actor.client, source),
      canCreateRepeatOrder(actor.role)
        ? listRepeatOrderHistory(actor.client, source.id)
        : Promise.resolve([])
    ]);
    return Response.json({ orders, repeatHistory });
  } catch (error) {
    return repeatOrderErrorResponse(error);
  }
}
