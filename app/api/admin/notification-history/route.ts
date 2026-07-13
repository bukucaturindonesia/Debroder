import { notificationErrorResponse, requireNotificationActor } from "@/lib/notification-auth";
import { isNotificationSuperAdmin } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const actor = await requireNotificationActor(request);
    const url = new URL(request.url);
    const limit = clampInteger(url.searchParams.get("limit"), 1, 150, 80);

    const eventsResult = await actor.client
      .from("notification_events")
      .select("id,event_code,entity_type,entity_id,payload,idempotency_key,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (eventsResult.error) throw new Error(eventsResult.error.message);

    const eventIds = (eventsResult.data ?? []).map((row: { id: string }) => row.id);
    let notifications: Array<{
      id: string;
      event_id: string;
      recipient_id: string;
      channel: string;
      title: string;
      status: string;
      sent_at: string | null;
      read_at: string | null;
      archived_at: string | null;
      error_message: string | null;
      created_at: string;
    }> = [];

    if (eventIds.length > 0) {
      const notificationsResult = await actor.client
        .from("notifications")
        .select(
          "id,event_id,recipient_id,channel,title,status,sent_at,read_at,archived_at,error_message,created_at"
        )
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });
      if (notificationsResult.error) throw new Error(notificationsResult.error.message);
      notifications = notificationsResult.data ?? [];
    }

    const notificationIds = notifications.map((row) => row.id);
    let deliveries: Array<{
      id: string;
      notification_id: string;
      attempt_number: number;
      provider: string | null;
      provider_message_id: string | null;
      status: string;
      error_message: string | null;
      attempted_at: string;
    }> = [];

    if (notificationIds.length > 0) {
      const deliveriesResult = await actor.client
        .from("notification_deliveries")
        .select(
          "id,notification_id,attempt_number,provider,provider_message_id,status,error_message,attempted_at"
        )
        .in("notification_id", notificationIds)
        .order("attempted_at", { ascending: false });
      if (deliveriesResult.error) throw new Error(deliveriesResult.error.message);
      deliveries = deliveriesResult.data ?? [];
    }

    let notificationDeletions: unknown[] = [];
    let templateDeletions: unknown[] = [];
    if (isNotificationSuperAdmin(actor.role)) {
      const [notificationDeleteResult, templateDeleteResult] = await Promise.all([
        actor.client
          .from("notification_deletion_audit")
          .select(
            "id,notification_id,event_id,recipient_id,channel,snapshot,deleted_by,deleted_at,reason"
          )
          .order("deleted_at", { ascending: false })
          .limit(limit),
        actor.client
          .from("notification_template_deletion_audit")
          .select(
            "id,template_id,event_code,channel,snapshot,deleted_by,deleted_at,reason"
          )
          .order("deleted_at", { ascending: false })
          .limit(limit)
      ]);
      const firstError = notificationDeleteResult.error || templateDeleteResult.error;
      if (firstError) throw new Error(firstError.message);
      notificationDeletions = notificationDeleteResult.data ?? [];
      templateDeletions = templateDeleteResult.data ?? [];
    }

    return Response.json({
      events: eventsResult.data ?? [],
      notifications,
      deliveries,
      notificationDeletions,
      templateDeletions,
      role: actor.role
    });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

function clampInteger(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
