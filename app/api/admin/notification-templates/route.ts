import { notificationErrorResponse, requireNotificationActor } from "@/lib/notification-auth";
import {
  type NotificationChannel,
  validateNotificationTemplateInput
} from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const actor = await requireNotificationActor(request, "manage");
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") === "archive" ? "archive" : "active";

    let query = actor.client
      .from("notification_templates")
      .select(
        "id,event_code,channel,title_template,body_template,active,provider_configured,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason"
      )
      .order("event_code", { ascending: true })
      .order("channel", { ascending: true });

    query = scope === "archive" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return Response.json({ templates: data ?? [], role: actor.role });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireNotificationActor(request, "manage");
    const body = (await request.json()) as {
      eventCode?: unknown;
      channel?: unknown;
      titleTemplate?: unknown;
      bodyTemplate?: unknown;
    };

    const channel = readChannel(body.channel);
    if (!channel) {
      return Response.json({ error: "Channel notifikasi tidak valid." }, { status: 422 });
    }

    const input = {
      eventCode: typeof body.eventCode === "string" ? body.eventCode : "",
      channel,
      titleTemplate: typeof body.titleTemplate === "string" ? body.titleTemplate : "",
      bodyTemplate: typeof body.bodyTemplate === "string" ? body.bodyTemplate : ""
    };
    const errors = validateNotificationTemplateInput(input);
    if (errors.length > 0) {
      return Response.json({ error: errors[0], errors }, { status: 422 });
    }

    const { data, error } = await actor.client.rpc("create_notification_template", {
      p_event_code: input.eventCode,
      p_channel: input.channel,
      p_title_template: input.titleTemplate,
      p_body_template: input.bodyTemplate,
      p_provider_configured: input.channel === "in_app"
    });
    if (error) throw new Error(error.message);

    return Response.json({ template: data }, { status: 201 });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

function readChannel(value: unknown): NotificationChannel | null {
  if (
    value === "in_app" ||
    value === "email" ||
    value === "whatsapp" ||
    value === "sms" ||
    value === "push"
  ) {
    return value;
  }
  return null;
}
