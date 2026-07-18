import { notificationErrorResponse, requireNotificationActor } from "@/lib/notification-auth";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireNotificationActor(request);
    const { id } = await context.params;

    const notificationResult = await actor.client
      .from("notifications")
      .select(
        "id,event_id,recipient_id,channel,title,body,related_path,status,sent_at,read_at,archived_at,archived_by,archive_reason,status_before_archive,error_message,seen_at,acknowledged_at,action_required,resolved_at,priority,action_type,created_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (notificationResult.error) throw new Error(notificationResult.error.message);
    if (!notificationResult.data) {
      return Response.json({ error: "Notifikasi tidak ditemukan." }, { status: 404 });
    }

    const [eventResult, deliveriesResult] = await Promise.all([
      actor.client
        .from("notification_events")
        .select("id,event_code,entity_type,entity_id,payload,idempotency_key,created_by,created_at")
        .eq("id", notificationResult.data.event_id)
        .maybeSingle(),
      actor.client
        .from("notification_deliveries")
        .select(
          "id,notification_id,attempt_number,provider,provider_message_id,status,error_message,attempted_at"
        )
        .eq("notification_id", id)
        .order("attempt_number", { ascending: false })
    ]);

    const firstError = eventResult.error || deliveriesResult.error;
    if (firstError) throw new Error(firstError.message);

    return Response.json({
      notification: notificationResult.data,
      event: eventResult.data,
      deliveries: deliveriesResult.data ?? [],
      role: actor.role
    });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireNotificationActor(request);
    const { id } = await context.params;
    const body = (await request.json()) as { action?: unknown; reason?: unknown };
    const action = typeof body.action === "string" ? body.action : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    let result;
    if (action === "read") {
      result = await actor.client.rpc("mark_notification_read", {
        p_notification_id: id
      });
    } else if (action === "seen") {
      result = await actor.client.rpc("mark_notification_seen", { p_notification_id: id });
    } else if (action === "acknowledge") {
      result = await actor.client.rpc("acknowledge_notification", { p_notification_id: id });
    } else if (action === "archive") {
      result = await actor.client.rpc("archive_notification", {
        p_notification_id: id,
        p_reason: reason || null
      });
    } else if (action === "restore") {
      result = await actor.client.rpc("restore_notification", {
        p_notification_id: id
      });
    } else {
      return Response.json({ error: "Aksi notifikasi tidak valid." }, { status: 400 });
    }

    if (result.error) throw new Error(result.error.message);
    return Response.json({ notification: result.data });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireNotificationActor(request, "superadmin");
    const { id } = await context.params;
    const { error } = await actor.client.rpc("permanently_delete_notification", {
      p_notification_id: id
    });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
