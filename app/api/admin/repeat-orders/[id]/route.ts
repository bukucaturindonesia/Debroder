import { NextRequest } from "next/server";
import { getRepeatOrderPreview } from "@/lib/repeat-orders";
import {
  repeatOrderErrorResponse,
  requireRepeatOrderActor
} from "@/lib/repeat-order-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRepeatOrderActor(request, { create: true });
    const { id } = await context.params;
    const preview = await getRepeatOrderPreview(actor.client, id);
    return Response.json({ preview, role: actor.role });
  } catch (error) {
    return repeatOrderErrorResponse(error);
  }
}
