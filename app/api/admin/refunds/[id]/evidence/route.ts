import { randomUUID } from "node:crypto";
import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const ALLOWED = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["application/pdf", "pdf"]]);

export async function POST(request: Request, context: Context) {
  let uploadedPath = "";
  try {
    const actor = await requireOperationsActor(request, "refund.manage");
    const admin = getAdminSupabaseClient();
    if (!admin) throw new Error("Layanan storage belum tersedia.");
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Kasus refund tidak valid." }, { status: 400 });

    const form = await request.formData();
    const file = form.get("proof");
    const reference = String(form.get("reference") ?? "").trim();
    const transferredAt = String(form.get("transferredAt") ?? "");
    if (!(file instanceof File) || !ALLOWED.has(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Bukti wajib PNG, JPG, atau PDF maksimal 5 MB." }, { status: 400 });
    }
    if (reference.length < 3 || Number.isNaN(new Date(transferredAt).getTime())) {
      return Response.json({ error: "Referensi dan waktu transfer refund wajib diisi." }, { status: 400 });
    }
    if (!await validSignature(file)) return Response.json({ error: "Isi file tidak cocok dengan format yang dipilih." }, { status: 400 });

    uploadedPath = `${id}/${randomUUID()}.${ALLOWED.get(file.type)}`;
    const upload = await admin.storage.from("refund-evidence").upload(uploadedPath, file, {
      upsert: false, contentType: file.type, cacheControl: "3600"
    });
    if (upload.error) throw upload.error;

    const { data, error } = await actor.client.rpc("record_refund_evidence_v1", {
      p_refund_case_id: id,
      p_bucket: "refund-evidence",
      p_object_path: uploadedPath,
      p_file_name: file.name,
      p_mime_type: file.type,
      p_size_bytes: file.size,
      p_transfer_reference: reference,
      p_transferred_at: new Date(transferredAt).toISOString()
    });
    if (error) throw error;
    uploadedPath = "";
    return Response.json({ ok: true, refund: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      const admin = getAdminSupabaseClient();
      if (admin) await admin.storage.from("refund-evidence").remove([uploadedPath]);
    }
    return operationsErrorResponse(error);
  }
}

async function validSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (file.type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (file.type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (file.type === "application/pdf") return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  return false;
}
