import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string; fileId: string }> }
) {
  const { token, fileId } = await context.params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Konfigurasi file privat belum lengkap." },
      { status: 503 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: link } = await admin
    .from("mockup_review_links")
    .select("mockup_set_id,expires_at,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (
    !link ||
    link.revoked_at ||
    new Date(link.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: "Tautan tidak tersedia atau sudah berakhir." },
      { status: 404 }
    );
  }

  const { data: file } = await admin
    .from("mockup_files")
    .select(
      "id,bucket_id,storage_path,mime_type,mockup_parts!inner(mockup_set_id,archived_at)"
    )
    .eq("id", fileId)
    .eq("mockup_parts.mockup_set_id", link.mockup_set_id)
    .is("mockup_parts.archived_at", null)
    .maybeSingle();

  if (!file) {
    return NextResponse.json(
      { error: "File mockup tidak ditemukan." },
      { status: 404 }
    );
  }

  const { data: signed, error } = await admin.storage
    .from(file.bucket_id)
    .createSignedUrl(file.storage_path, 60 * 5);

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "File mockup belum dapat dibuka." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
