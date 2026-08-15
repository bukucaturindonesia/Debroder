import { phase13ErrorResponse, requirePhase13Actor, Phase13AuthError } from "@/lib/phase13-auth";
import { revalidatePublicThemeCache } from "@/lib/public-cache";
import { getPublicTheme, isPublicThemeId, PUBLIC_THEME_IDS } from "@/lib/public-theme/registry";
import {
  parsePublicThemeState,
  PUBLIC_THEME_SETTING_KEY
} from "@/lib/public-theme/runtime";

const THEME_ADMIN_ROLES = new Set(["owner", "superadmin", "super_admin"]);

function assertThemeAdmin(role: string) {
  if (!THEME_ADMIN_ROLES.has(role)) {
    throw new Phase13AuthError(403, "Hanya Super Admin yang dapat mengelola tema publik.");
  }
}

async function readState(actor: Awaited<ReturnType<typeof requirePhase13Actor>>) {
  const { data, error } = await actor.adminClient
    .from("website_settings")
    .select("value")
    .eq("setting_key", PUBLIC_THEME_SETTING_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parsePublicThemeState(data?.value);
}

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "settings.read");
    assertThemeAdmin(actor.role);
    return Response.json({
      state: await readState(actor),
      themes: PUBLIC_THEME_IDS.map((id) => getPublicTheme(id)),
      actorRole: actor.role
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    // Role restriction is intentional: existing Super Admin roles are the
    // canonical settings managers even when their legacy permission catalog
    // only exposes settings.read.
    const actor = await requirePhase13Actor(request, "settings.read");
    assertThemeAdmin(actor.role);
    const body = await request.json().catch(() => ({})) as { action?: unknown; themeId?: unknown };
    const action = body.action === "rollback" ? "rollback" : body.action === "apply" ? "apply" : null;
    if (!action) throw new Phase13AuthError(400, "Aksi tema tidak valid.");

    const current = await readState(actor);
    const nextId = action === "apply"
      ? (isPublicThemeId(body.themeId) ? body.themeId : null)
      : current.previous;
    if (!nextId) {
      throw new Phase13AuthError(400, action === "rollback" ? "Belum ada tema sebelumnya untuk dikembalikan." : "Tema tidak valid.");
    }
    if (nextId === current.current) {
      return Response.json({ ok: true, state: current, unchanged: true });
    }

    const nextState = {
      current: nextId,
      previous: current.current,
      changed_at: new Date().toISOString(),
      changed_by: actor.user.id
    };
    const { error: settingError } = await actor.adminClient
      .from("website_settings")
      .upsert({
        setting_key: PUBLIC_THEME_SETTING_KEY,
        label: "Tema Public Storefront",
        description: "Tema presentasi aktif untuk seluruh public storefront.",
        group_name: "public_theme",
        value: nextState,
        is_active: true,
        updated_at: nextState.changed_at
      }, { onConflict: "setting_key" });
    if (settingError) throw new Error(settingError.message);

    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const { error: auditError } = await actor.adminClient.from("system_audit_log").insert({
      entity_type: "public_theme",
      entity_id: crypto.randomUUID(),
      action: "THEME_CHANGED",
      old_value: { theme_id: current.current },
      new_value: { theme_id: nextId },
      actor_id: actor.user.id,
      actor_role: actor.role,
      source: "admin.theme",
      reason: action === "rollback" ? "Public theme rollback" : "Public theme applied",
      request_id: requestId,
      metadata: { fromThemeId: current.current, toThemeId: nextId, action, request_id: requestId }
    });
    if (auditError) throw new Error("Tema tersimpan tetapi audit log belum dapat dicatat.");

    revalidatePublicThemeCache();
    return Response.json({ ok: true, state: nextState }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}
