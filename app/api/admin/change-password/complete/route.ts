import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function POST(request: Request) {
  try {
    const actor = await requirePhase13Actor(request);
    const { data, error } = await actor.client.rpc("complete_admin_password_change_v1");
    if (error) throw new Error(error.message);

    return Response.json(
      { ok: data === true },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}
