import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "operations.health.read");
    const [runs, findings] = await Promise.all([
      actor.client.from("operations_health_runs").select("id,started_at,completed_at,status,summary,error_message").order("started_at", { ascending: false }).limit(30),
      actor.client.from("operations_health_findings").select("id,finding_key,run_id,order_id,category,severity,code,message,details,status,first_seen_at,last_seen_at,resolved_at,orders(order_number,customer_name,status)").order("last_seen_at", { ascending: false }).limit(300)
    ]);
    const firstError = runs.error || findings.error;
    if (firstError) throw firstError;
    return Response.json({ runs: runs.data ?? [], findings: findings.data ?? [], role: actor.role }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "operations.health.manage");
    const { data, error } = await actor.client.rpc("run_order_operations_health_v1");
    if (error) throw error;
    return Response.json({ ok: true, result: data });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}
