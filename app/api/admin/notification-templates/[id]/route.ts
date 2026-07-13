import { notificationErrorResponse, requireNotificationActor } from "@/lib/notification-auth";
import type { NotificationChannel } from "@/lib/notifications";
import { validateNotificationTemplateInput } from "@/lib/notifications";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireNotificationActor(request, "manage");
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: unknown;
      titleTemplate?: unknown;
      bodyTemplate?: unknown;
      active?: unknown;
      reason?: unknown;
    };
    const action = typeof body.action === "string" ? body.action : "update";

    if (action === "archive") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) {
        return Response.json({ error: "Alasan arsip wajib diisi." }, { status: 422 });
      }
      const result = await actor.client.rpc("archive_notification_template", {
        p_template_id: id,
        p_reason: reason
      });
      if (result.error) throw new Error(result.error.message);
      return Response.json({ template: result.data });
    }

    if (action === "restore") {
      const result = await actor.client.rpc("restore_notification_template", {
        p_template_id: id
      });
      if (result.error) throw new Error(result.error.message);
      return Response.json({ template: result.data });
    }

    const currentResult = await actor.client
      .from("notification_templates")
      .select("event_code,channel")
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle();
    if (currentResult.error) throw new Error(currentResult.error.message);
    if (!currentResult.data) {
      return Response.json({ error: "Template aktif tidak ditemukan." }, { status: 404 });
    }

    const titleTemplate = typeof body.titleTemplate === "string" ? body.titleTemplate : "";
    const bodyTemplate = typeof body.bodyTemplate === "string" ? body.bodyTemplate : "";
    const channel = currentResult.data.channel as NotificationChannel;
    const errors = validateNotificationTemplateInput({
      eventCode: currentResult.data.event_code,
      channel,
      titleTemplate,
      bodyTemplate
    });
    if (errors.length > 0) {
      return Response.json({ error: errors[0], errors }, { status: 422 });
    }

    const result = await actor.client.rpc("update_notification_template", {
      p_template_id: id,
      p_title_template: titleTemplate,
      p_body_template: bodyTemplate,
      p_active: body.active !== false,
      p_provider_configured: channel === "in_app"
    });
    if (result.error) throw new Error(result.error.message);
    return Response.json({ template: result.data });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireNotificationActor(request, "superadmin");
    const { id } = await context.params;
    const { error } = await actor.client.rpc("permanently_delete_notification_template", {
      p_template_id: id
    });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
