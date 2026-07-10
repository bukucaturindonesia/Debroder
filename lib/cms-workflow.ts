import type { SupabaseClient } from "@supabase/supabase-js";
import type { CmsRevisionAction, CmsStatus } from "@/lib/types";

export type { CmsRevisionAction, CmsStatus } from "@/lib/types";

export type CmsRevision = {
  id?: string;
  content_type: string;
  content_id: string;
  action: CmsRevisionAction;
  status: CmsStatus;
  data: Record<string, unknown>;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  publish_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CmsWorkflowMeta = {
  status?: CmsStatus;
  publish_at?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type CmsWorkflowError = {
  message: string;
  cause?: unknown;
};

export type CmsWorkflowResult<T = Record<string, unknown> | null> =
  | { success: true; data: T; revision?: CmsRevision | null }
  | { success: false; error: CmsWorkflowError };

type CmsWorkflowRpcResponse = {
  row?: Record<string, unknown> | null;
  revision?: CmsRevision | null;
};

export const CMS_STATUS_LABELS: Record<CmsStatus, string> = {
  draft: "Draft",
  scheduled: "Terjadwal",
  published: "Dipublikasikan",
  archived: "Diarsipkan"
};

export const CMS_REVISION_ACTION_LABELS: Record<
  CmsRevisionAction,
  string
> = {
  draft_saved: "Draft disimpan",
  published: "Dipublikasikan",
  scheduled: "Dijadwalkan",
  schedule_cancelled: "Jadwal dibatalkan",
  archived: "Diarsipkan",
  restored: "Dikembalikan ke draft"
};

export const CMS_STATUS_BADGE_CLASS: Record<CmsStatus, string> = {
  draft: "border-brand-softGray bg-white text-brand-charcoal/65",
  scheduled: "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  archived: "border-zinc-200 bg-zinc-100 text-zinc-600"
};

export const CMS_WORKFLOW_TABLES = new Set([
  "hero_banners",
  "instagram_banners",
  "page_heroes",
  "stores",
  "testimonials",
  "contact_settings",
  "order_steps",
  "trust_about_content",
  "product_filters",
  "homepage_sections",
  "homepage_section_items",
  "landing_sections",
  "cms_banners"
]);

const workflowFieldNames = new Set([
  "id",
  "created_at",
  "updated_at",
  "updated_by",
  "status",
  "publish_at",
  "published_at",
  "archived_at"
]);

function workflowError(message: string, cause?: unknown): CmsWorkflowError {
  return { message, cause };
}

function asErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function parseTime(value?: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isCmsWorkflowRpcResponse(
  value: unknown
): value is CmsWorkflowRpcResponse {
  return isRecord(value);
}

function assertWorkflowTarget(contentType: string, contentId: string) {
  if (!isCmsWorkflowTable(contentType)) {
    return workflowError(`Tabel CMS tidak didukung: ${contentType}`);
  }
  if (!contentId) {
    return workflowError("ID konten CMS wajib diisi.");
  }
  return null;
}

export function isCmsWorkflowTable(table?: string | null) {
  return Boolean(table && CMS_WORKFLOW_TABLES.has(table));
}

export function publicCmsStatusFilter(now = new Date().toISOString()) {
  return `status.eq.published,and(status.eq.scheduled,publish_at.not.is.null,publish_at.lte.${now})`;
}

export function isPublicCmsContent(
  item: CmsWorkflowMeta,
  now = new Date().toISOString()
) {
  const nowTime = parseTime(now) ?? Date.now();
  const publishTime = parseTime(item.publish_at);

  return (
    item.status === "published" ||
    (item.status === "scheduled" &&
      publishTime !== null &&
      publishTime <= nowTime)
  );
}

export function effectiveCmsStatus(
  item: CmsWorkflowMeta,
  now = new Date().toISOString()
): CmsStatus {
  const status = item.status || "draft";
  return status === "scheduled" && isPublicCmsContent(item, now)
    ? "published"
    : status;
}

export function cmsStatusLabel(item: CmsWorkflowMeta) {
  if (item.status === "scheduled" && isPublicCmsContent(item)) {
    return "Sudah tayang";
  }
  return CMS_STATUS_LABELS[item.status || "draft"];
}

export function cmsBadgeClass(item: CmsWorkflowMeta) {
  return CMS_STATUS_BADGE_CLASS[effectiveCmsStatus(item)];
}

export function stripWorkflowFields<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !workflowFieldNames.has(key))
  );
}

export function normalizeCmsPayload<T extends Record<string, unknown>>(row: T) {
  return stripWorkflowFields(row);
}

export function mergeCmsRevision<T extends Record<string, unknown>>(
  row: T,
  revision?: Pick<
    CmsRevision,
    | "data"
    | "status"
    | "publish_at"
    | "published_at"
    | "archived_at"
    | "updated_at"
  > | null
) {
  if (!revision?.data) return row;
  return {
    ...row,
    ...revision.data,
    status: revision.status,
    publish_at: revision.publish_at ?? null,
    published_at: revision.published_at ?? row.published_at,
    archived_at: revision.archived_at ?? null,
    updated_at: revision.updated_at ?? row.updated_at
  } as T;
}

async function runCmsWorkflowAction(
  supabase: SupabaseClient,
  contentType: string,
  contentId: string,
  action: CmsRevisionAction,
  data: Record<string, unknown> = {},
  publishAt?: string | null
): Promise<CmsWorkflowResult> {
  const targetError = assertWorkflowTarget(contentType, contentId);
  if (targetError) return { success: false, error: targetError };

  let normalizedPublishAt: string | null = null;
  if (action === "scheduled") {
    const publishTime = parseTime(publishAt);
    if (publishTime === null || publishTime <= Date.now()) {
      return {
        success: false,
        error: workflowError("Jadwal publish harus berada di masa depan.")
      };
    }
    normalizedPublishAt = new Date(publishTime).toISOString();
  }

  const { data: rpcData, error } = await supabase.rpc(
    "apply_cms_workflow_action",
    {
      p_content_type: contentType,
      p_content_id: contentId,
      p_action: action,
      p_data: normalizeCmsPayload(data),
      p_publish_at: normalizedPublishAt
    }
  );

  if (error) {
    return {
      success: false,
      error: workflowError(
        asErrorMessage(error, "Workflow CMS gagal dijalankan."),
        error
      )
    };
  }

  if (!isCmsWorkflowRpcResponse(rpcData)) {
    return {
      success: false,
      error: workflowError("Respons workflow CMS tidak valid.", rpcData)
    };
  }

  return {
    success: true,
    data: isRecord(rpcData.row) ? rpcData.row : null,
    revision: rpcData.revision || null
  };
}

export async function loadLatestCmsRevisions(
  supabase: SupabaseClient,
  contentType: string,
  statuses: CmsStatus[] = ["draft", "scheduled"]
) {
  if (!isCmsWorkflowTable(contentType)) {
    return new Map<string, CmsRevision>();
  }

  const { data, error } = await supabase
    .from("cms_content_revisions")
    .select(
      "id,content_type,content_id,action,status,data,before_data,after_data,publish_at,published_at,archived_at,updated_by,created_at,updated_at"
    )
    .eq("content_type", contentType)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error || !data) return new Map<string, CmsRevision>();

  const latest = new Map<string, CmsRevision>();
  (data as CmsRevision[]).forEach((revision) => {
    if (!latest.has(revision.content_id)) {
      latest.set(revision.content_id, revision);
    }
  });
  return latest;
}

export async function saveCmsDraft(
  supabase: SupabaseClient,
  contentType: string,
  contentId: string,
  data: Record<string, unknown>
) {
  return runCmsWorkflowAction(
    supabase,
    contentType,
    contentId,
    "draft_saved",
    data
  );
}

export async function publishCmsNow(
  supabase: SupabaseClient,
  contentType: string,
  contentId: string,
  data: Record<string, unknown>
) {
  return runCmsWorkflowAction(
    supabase,
    contentType,
    contentId,
    "published",
    data
  );
}

export async function scheduleCmsPublish(
  supabase: SupabaseClient,
  contentType: string,
  contentId: string,
  data: Record<string, unknown>,
  publishAt: string
) {
  return runCmsWorkflowAction(
    supabase,
    contentType,
    contentId,
    "scheduled",
    data,
    publishAt
  );
}

export async function cancelCmsSchedule(
  supabase: SupabaseClient,
  contentType: string,
  contentId: string
) {
  return runCmsWorkflowAction(
    supabase,
    contentType,
    contentId,
    "schedule_cancelled"
  );
}

export async function archiveCmsContent(
  supabase: SupabaseClient,
  contentType: string,
  contentId: string
) {
  return runCmsWorkflowAction(
    supabase,
    contentType,
    contentId,
    "archived"
  );
}

export async function restoreCmsDraft(
  supabase: SupabaseClient,
  contentType: string,
  contentId: string
) {
  return runCmsWorkflowAction(
    supabase,
    contentType,
    contentId,
    "restored"
  );
}
