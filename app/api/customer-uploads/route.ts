import { NextResponse } from "next/server";
import type { CustomerUploadRef } from "@/lib/types";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

const BUCKET_ID = "customer-designs";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "ai",
  "cdr",
  "eps",
  "jpeg",
  "jpg",
  "pdf",
  "png",
  "psd",
  "svg",
  "zip"
]);
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_TYPES = new Set([
  "application/octet-stream",
  "application/pdf",
  "application/postscript",
  "application/illustrator",
  "application/zip",
  "image/vnd.adobe.photoshop",
  "image/svg+xml"
]);

export async function POST(request: Request) {
  const client = getAdminSupabaseClient();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase service role belum dikonfigurasi untuk upload private." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const sessionToken = asCleanToken(formData.get("session_token"));
  const designStage = formData.get("design_stage") === "revised_upload" ? "revised_upload" : "customer_upload";
  const replacesUploadId = asUuid(formData.get("replaces_upload_id"));
  const versionNote = typeof formData.get("version_note") === "string" ? String(formData.get("version_note")).trim().slice(0, 500) : "";

  if (!(file instanceof File) || !sessionToken) {
    return NextResponse.json(
      { error: "Payload upload tidak valid." },
      { status: 400 }
    );
  }

  const extension = getExtension(file.name);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: "Format file desain tidak didukung." },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Ukuran file desain maksimal 20 MB." },
      { status: 400 }
    );
  }

  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json(
      { error: "Tipe file desain tidak didukung." },
      { status: 400 }
    );
  }

  const sanitizedFilename = sanitizeFilename(file.name);
  const storagePath = `${sessionToken}/${crypto.randomUUID()}-${sanitizedFilename}`;
  const { error: uploadError } = await client.storage
    .from(BUCKET_ID)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload desain gagal: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data, error } = await client.rpc("register_customer_design_upload_v1", {
    p_session_token: sessionToken,
    p_bucket_id: BUCKET_ID,
    p_storage_path: storagePath,
    p_original_filename: file.name,
    p_sanitized_filename: sanitizedFilename,
    p_mime_type: file.type,
    p_extension: extension,
    p_size_bytes: file.size,
    p_design_stage: designStage,
    p_replaces_upload_id: replacesUploadId,
    p_version_note: versionNote || null
  });

  if (error || !data) {
    await client.storage.from(BUCKET_ID).remove([storagePath]);
    return NextResponse.json(
      { error: error?.message ?? "Metadata upload gagal disimpan." },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    await client.storage.from(BUCKET_ID).remove([storagePath]);
    return NextResponse.json({ error: "Metadata upload gagal disimpan." }, { status: 500 });
  }
  const { data: signedData } = await client.storage
    .from(BUCKET_ID)
    .createSignedUrl(storagePath, 15 * 60);

  const upload: CustomerUploadRef = {
    id: String(row.id),
    file_name: String(row.original_filename),
    storage_path: String(row.storage_path),
    mime_type: String(row.mime_type),
    file_size: Number(row.size_bytes),
    signed_url: signedData?.signedUrl,
    status: row.status === "linked" || row.status === "deleted" ? row.status : "uploaded",
    design_version: Number(row.design_version || 1),
    design_stage: row.design_stage === "revised_upload" ? "revised_upload" : "customer_upload",
    replaces_upload_id: row.replaces_upload_id ? String(row.replaces_upload_id) : null,
    version_note: row.version_note ? String(row.version_note) : null
  };

  return NextResponse.json({ upload });
}

export async function DELETE(request: Request) {
  const client = getAdminSupabaseClient();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase service role belum dikonfigurasi untuk upload private." },
      { status: 503 }
    );
  }

  const body: unknown = await request.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Payload delete tidak valid." }, { status: 400 });
  }

  const sessionToken = asCleanToken(body.session_token);
  const storagePath = typeof body.storage_path === "string" ? body.storage_path : null;

  if (!sessionToken || !storagePath) {
    return NextResponse.json({ error: "Payload delete tidak valid." }, { status: 400 });
  }

  const { data: upload, error: lookupError } = await client
    .from("customer_uploads")
    .select("id, storage_path, status")
    .eq("session_token", sessionToken)
    .eq("storage_path", storagePath)
    .eq("status", "uploaded")
    .maybeSingle();

  if (lookupError || !upload) {
    return NextResponse.json(
      { error: lookupError?.message ?? "File upload tidak ditemukan." },
      { status: 404 }
    );
  }

  const { error: removeError } = await client.storage
    .from(BUCKET_ID)
    .remove([String(upload.storage_path)]);

  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error: updateError } = await client
    .from("customer_uploads")
    .update({ status: "deleted" })
    .eq("id", String(upload.id));

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function asCleanToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.replace(/[^a-zA-Z0-9_-]/g, "");
  return token.length >= 8 ? token : null;
}

function asUuid(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function sanitizeFilename(name: string): string {
  const extension = getExtension(name);
  const baseName = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "design"}.${extension ?? "file"}`;
}

function getExtension(name: string): string | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match?.[1]?.toLowerCase() ?? null;
}

function isAllowedMimeType(mimeType: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mimeType)) {
    return true;
  }

  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
