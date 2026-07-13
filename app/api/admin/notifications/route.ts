import { notificationErrorResponse, requireNotificationActor } from "@/lib/notification-auth";
import type { NotificationChannel, NotificationStatus } from "@/lib/notifications";

const CHANNELS = new Set<NotificationChannel>([
  "in_app",
  "email",
  "whatsapp",
  "sms",
  "push"
]);
const STATUSES = new Set<NotificationStatus>([
  "queued",
  "sent",
  "failed",
  "read",
  "archived",
  "not_configured"
]);

export async function GET(request: Request) {
  try {
    const actor = await requireNotificationActor(request);
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") === "archive" ? "archive" : "active";
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const channelValue = url.searchParams.get("channel") as NotificationChannel | null;
    const statusValue = url.searchParams.get("status") as NotificationStatus | null;
    const search = sanitizeSearch(url.searchParams.get("search") ?? "");
    const limit = clampInteger(url.searchParams.get("limit"), 1, 100, 40);

    let query = actor.client
      .from("notifications")
      .select(
        "id,event_id,recipient_id,channel,title,body,related_path,status,sent_at,read_at,archived_at,archived_by,archive_reason,status_before_archive,error_message,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    query = scope === "archive" ? query.not("archived_at", "is", null) : query.is("archived_at", null);

    if (unreadOnly && scope === "active") query = query.is("read_at", null);
    if (channelValue && CHANNELS.has(channelValue)) query = query.eq("channel", channelValue);
    if (statusValue && STATUSES.has(statusValue)) query = query.eq("status", statusValue);
    if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

    const [rowsResult, activeCountResult, unreadCountResult, archiveCountResult] = await Promise.all([
      query,
      actor.client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null),
      actor.client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
        .is("read_at", null),
      actor.client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .not("archived_at", "is", null)
    ]);

    const firstError =
      rowsResult.error ||
      activeCountResult.error ||
      unreadCountResult.error ||
      archiveCountResult.error;
    if (firstError) throw new Error(firstError.message);

    return Response.json({
      notifications: rowsResult.data ?? [],
      counts: {
        active: activeCountResult.count ?? 0,
        unread: unreadCountResult.count ?? 0,
        archive: archiveCountResult.count ?? 0
      },
      role: actor.role
    });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireNotificationActor(request);
    const body = (await request.json()) as { action?: unknown };
    if (body.action !== "mark_all_read") {
      return Response.json({ error: "Aksi notifikasi tidak valid." }, { status: 400 });
    }

    const { data, error } = await actor.client.rpc("mark_all_notifications_read");
    if (error) throw new Error(error.message);

    return Response.json({ ok: true, affected: typeof data === "number" ? data : 0 });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

function clampInteger(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sanitizeSearch(value: string) {
  return value.trim().replace(/[,%()]/g, " ").slice(0, 100);
}
