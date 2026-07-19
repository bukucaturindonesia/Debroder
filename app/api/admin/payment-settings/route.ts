import { paymentErrorResponse, requirePaymentActor } from "@/lib/payment-auth";
import { isPaymentVerifier } from "@/lib/payments";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

type SettingInput = {
  id?: unknown;
  methodCode?: unknown;
  methodType?: unknown;
  displayName?: unknown;
  bankName?: unknown;
  accountNumber?: unknown;
  accountHolder?: unknown;
  qrisImageUrl?: unknown;
  instructions?: unknown;
  expiresInHours?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
};

export async function GET(request: Request) {
  try {
    const actor = await requirePaymentActor(request);
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ error: "Layanan pembayaran belum dikonfigurasi." }, { status: 503 });
    const { data, error } = await client.from("payment_method_settings")
      .select("id,method_code,method_type,display_name,bank_name,account_number,account_holder,qris_image_url,instructions,expires_in_hours,sort_order,is_active,updated_at")
      .is("archived_at", null)
      .order("sort_order")
      .order("display_name");
    if (error) throw new Error(error.message);
    return Response.json({ settings: data ?? [], canManage: isPaymentVerifier(actor.role) });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePaymentActor(request);
    if (!isPaymentVerifier(actor.role)) {
      return Response.json({ error: "Role tidak dapat mengubah pengaturan pembayaran." }, { status: 403 });
    }
    const body = await request.json() as SettingInput;
    const methodCode = text(body.methodCode).toLowerCase();
    const methodType = text(body.methodType).toLowerCase();
    const displayName = text(body.displayName);
    const expiresInHours = Number(body.expiresInHours);
    const sortOrder = Number(body.sortOrder);
    if (!/^[a-z0-9][a-z0-9_-]{1,49}$/.test(methodCode)
      || !["bank_transfer", "qris", "ewallet"].includes(methodType)
      || !displayName
      || !Number.isInteger(expiresInHours)
      || expiresInHours < 1 || expiresInHours > 720
      || !Number.isInteger(sortOrder)) {
      return Response.json({ error: "Pengaturan metode pembayaran tidak valid." }, { status: 400 });
    }
    const id = text(body.id) || null;
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ error: "ID pengaturan tidak valid." }, { status: 400 });
    }
    const { data, error } = await actor.client.rpc("upsert_payment_method_setting", {
      p_setting_id: id,
      p_method_code: methodCode,
      p_method_type: methodType,
      p_display_name: displayName,
      p_bank_name: text(body.bankName) || null,
      p_account_number: text(body.accountNumber) || null,
      p_account_holder: text(body.accountHolder) || null,
      p_qris_image_url: text(body.qrisImageUrl) || null,
      p_instructions: text(body.instructions),
      p_expires_in_hours: expiresInHours,
      p_sort_order: sortOrder,
      p_is_active: body.isActive === true
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ setting: data });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
