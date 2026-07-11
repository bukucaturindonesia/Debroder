import { NextResponse } from "next/server";
import type { CustomerUploadRef } from "@/lib/types";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

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

  const { data, error } = await client
    .from("customer_uploads")
    .insert({
      session_token: sessionToken,
      bucket_id: BUCKET_ID,
      storage_path: storagePath,
      original_filename: file.name,
      sanitized_filename: sanitizedFilename,
      mime_type: file.type,
      extension,
      size_bytes: file.size,
      status: "uploaded"
    })
    .select("id, storage_path, original_filename, mime_type, size_bytes, status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Metadata upload gagal disimpan." },
      { status: 500 }
    );
  }

  const { data: signedData } = await client.storage
    .from(BUCKET_ID)
    .createSignedUrl(storagePath, 15 * 60);

  const upload: CustomerUploadRef = {
    id: String(data.id),
    file_name: String(data.original_filename),
    storage_path: String(data.storage_path),
    mime_type: String(data.mime_type),
    file_size: Number(data.size_bytes),
    signed_url: signedData?.signedUrl,
    status: data.status === "linked" || data.status === "deleted" ? data.status : "uploaded"
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
    .select("id, storage_path")
    .eq("session_token", sessionToken)
    .eq("storage_path", storagePath)
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
