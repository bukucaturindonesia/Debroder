"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { PaymentCompletionPanel } from "@/components/admin/PaymentCompletionPanel";

type PaymentRow = {
  id: string;
  payment_number: string;
  order_id: string;
  amount: number;
  paid_at: string;
  method: string;
  channel_name: string | null;
  reference_number: string | null;
  status: string;
  customer_notes: string | null;
  admin_notes: string | null;
  proof_bucket: string | null;
  proof_path: string | null;
  proof_file_name: string | null;
  proof_mime_type: string | null;
  proof_size_bytes: number | null;
  submitted_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
};

type OrderSummary = {
  total_amount: number;
  payment_total_verified: number;
  payment_balance: number;
  payment_percentage: number;
  payment_requirement_met: boolean;
  payment_requirement_type: string;
  payment_required_percentage: number;
  payment_required_amount: number | null;
  payment_effective_total: number;
  payment_production_eligible: boolean;
};

const PAYMENT_STATUS: Record<string, string> = {
  draft: "Draft Pembayaran",
  pending: "Menunggu Verifikasi",
  verified: "Pembayaran Terverifikasi",
  rejected: "Pembayaran Ditolak",
  refunded: "Pembayaran Dikembalikan"
};

const PAYMENT_METHOD: Record<string, string> = {
  bank_transfer: "Transfer Bank",
  cash: "Tunai",
  qris: "QRIS",
  ewallet: "Dompet Digital",
  other: "Metode Lain"
};

const SUPER_ROLES = ["superadmin", "super_admin"];
const VERIFY_ROLES = ["owner", "superadmin", "super_admin", "admin"];

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export function PaymentTrackingManager() {
  const params = useParams<{ id?: string | string[] }>();
  const orderId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [role, setRole] = useState("");
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [channelName, setChannelName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [rejectTarget, setRejectTarget] = useState<PaymentRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<PaymentRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PaymentRow | null>(null);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase || !orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    const [orderResult, paymentResult, profileResult] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "total_amount,payment_total_verified,payment_balance,payment_percentage,payment_requirement_met,payment_requirement_type,payment_required_percentage,payment_required_amount,payment_effective_total,payment_production_eligible"
        )
        .eq("id", orderId)
        .maybeSingle(),
      supabase
        .from("order_payments")
        .select(
          "id,payment_number,order_id,amount,paid_at,method,channel_name,reference_number,status,customer_notes,admin_notes,proof_bucket,proof_path,proof_file_name,proof_mime_type,proof_size_bytes,submitted_at,verified_at,rejection_reason,archived_at,archived_by,archive_reason,created_at"
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      user
        ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    setLoading(false);

    if (orderResult.error || paymentResult.error || !orderResult.data) {
      setMessage("Data pembayaran belum berhasil dimuat.");
      return;
    }

    setSummary(orderResult.data as OrderSummary);
    setRows((paymentResult.data || []) as PaymentRow[]);
    setRole(String(profileResult.data?.role || ""));
    const actorIds = Array.from(new Set((paymentResult.data || []).map((row) => row.archived_by).filter((value): value is string => typeof value === "string")));
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id,email").in("id", actorIds);
      setActorNames(Object.fromEntries((profiles || []).map((profile) => [profile.id, profile.email || "Admin DEBRODER"])));
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const activeRows = rows.filter((row) => !row.archived_at);
  const archivedRows = rows.filter((row) => Boolean(row.archived_at));
  const canVerify = VERIFY_ROLES.includes(role);
  const isSuperAdmin = SUPER_ROLES.includes(role);
  const pendingRows = activeRows.filter((row) => row.status === "pending");

  async function paymentAction(
    paymentId: string,
    body: Record<string, unknown>
  ) {
    const supabase = createSupabaseClient();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Sesi Admin tidak aktif. Silakan login ulang.");
    const response = await fetch(`/api/admin/payments/${paymentId}/verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error || "Aksi pembayaran gagal.");
  }

  function openCreate() {
    setEditing(null);
    setAmount("");
    setPaidAt(new Date().toISOString().slice(0, 16));
    setMethod("bank_transfer");
    setChannelName("");
    setReferenceNumber("");
    setCustomerNotes("");
    setAdminNotes("");
    setProofFile(null);
    setFormOpen(true);
  }

  function openEdit(row: PaymentRow) {
    setEditing(row);
    setAmount(String(row.amount));
    setPaidAt(new Date(row.paid_at).toISOString().slice(0, 16));
    setMethod(row.method);
    setChannelName(row.channel_name || "");
    setReferenceNumber(row.reference_number || "");
    setCustomerNotes(row.customer_notes || "");
    setAdminNotes(row.admin_notes || "");
    setProofFile(null);
    setFormOpen(true);
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (workingId) return;

    const numericAmount = Math.round(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("Nominal pembayaran harus lebih besar dari nol.");
      return;
    }

    if (!paidAt) {
      setMessage("Tanggal pembayaran wajib diisi.");
      return;
    }

    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      setMessage("Ukuran bukti pembayaran maksimal 5 MB.");
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "application/pdf"
    ];
    if (proofFile && !allowedTypes.includes(proofFile.type)) {
      setMessage("Bukti pembayaran harus berupa PNG, JPG, atau PDF.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(editing?.id || "new-payment");
    setMessage("");

    if (editing) {
      const { error } = await supabase.rpc("update_order_payment_draft", {
        p_payment_id: editing.id,
        p_amount: numericAmount,
        p_paid_at: new Date(paidAt).toISOString(),
        p_method: method,
        p_channel_name: channelName.trim() || null,
        p_reference_number: referenceNumber.trim() || null,
        p_customer_notes: customerNotes.trim() || null,
        p_admin_notes: adminNotes.trim() || null
      });

      setWorkingId(null);

      if (error) {
        setMessage(
          "Pembayaran hanya dapat diedit saat masih menunggu verifikasi."
        );
        return;
      }

      setFormOpen(false);
      setMessage("Perubahan pembayaran berhasil disimpan.");
      await loadData();
      return;
    }

    let proofBucket: string | null = null;
    let proofPath: string | null = null;

    if (proofFile) {
      const safeName = sanitizeFileName(proofFile.name);
      proofBucket = "payment-proofs";
      proofPath = `orders/${orderId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(proofBucket)
        .upload(proofPath, proofFile, {
          upsert: false,
          cacheControl: "3600",
          contentType: proofFile.type
        });

      if (uploadError) {
        setWorkingId(null);
        setMessage("Bukti pembayaran gagal diunggah.");
        return;
      }
    }

    const { error } = await supabase.rpc("create_order_payment", {
      p_order_id: orderId,
      p_amount: numericAmount,
      p_paid_at: new Date(paidAt).toISOString(),
      p_method: method,
      p_channel_name: channelName.trim() || null,
      p_reference_number: referenceNumber.trim() || null,
      p_customer_notes: customerNotes.trim() || null,
      p_admin_notes: adminNotes.trim() || null,
      p_proof_bucket: proofBucket,
      p_proof_path: proofPath,
      p_proof_file_name: proofFile?.name || null,
      p_proof_mime_type: proofFile?.type || null,
      p_proof_size_bytes: proofFile?.size || null
    });

    setWorkingId(null);

    if (error) {
      if (proofBucket && proofPath) {
        await supabase.storage.from(proofBucket).remove([proofPath]);
      }
      setMessage("Pembayaran gagal disimpan.");
      return;
    }

    setFormOpen(false);
    setMessage("Pembayaran berhasil dicatat dan menunggu verifikasi.");
    await loadData();
  }

  async function verify(row: PaymentRow) {
    if (!canVerify || workingId) return;
    setWorkingId(row.id);
    setMessage("");
    let error: unknown = null;
    try {
      await paymentAction(row.id, {
        action: "verify",
        adminNotes: row.admin_notes || null
      });
    } catch (reason) {
      error = reason;
    }
    setWorkingId(null);

    if (error) {
      setMessage(error instanceof Error ? error.message : "Pembayaran belum berhasil diverifikasi.");
      return;
    }

    setMessage(`${row.payment_number} berhasil diverifikasi.`);
    await loadData();
  }

  async function reject() {
    if (!rejectTarget || !rejectReason.trim() || workingId) return;
    setWorkingId(rejectTarget.id);
    setMessage("");
    let error: unknown = null;
    try {
      await paymentAction(rejectTarget.id, {
        action: "reject",
        reason: rejectReason.trim()
      });
    } catch (reason) {
      error = reason;
    }
    setWorkingId(null);

    if (error) {
      setMessage(error instanceof Error ? error.message : "Pembayaran belum berhasil ditolak.");
      return;
    }

    setMessage(`${rejectTarget.payment_number} ditolak.`);
    setRejectTarget(null);
    setRejectReason("");
    await loadData();
  }

  async function archive() {
    if (!archiveTarget || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(archiveTarget.id);
    const { error } = await supabase.rpc("archive_order_payment", {
      p_payment_id: archiveTarget.id,
      p_reason: archiveReason.trim() || null
    });
    setWorkingId(null);

    if (error) {
      setMessage("Pembayaran gagal dipindahkan ke Gudang Arsip.");
      return;
    }

    setMessage(`${archiveTarget.payment_number} dipindahkan ke Gudang Arsip.`);
    setArchiveTarget(null);
    setArchiveReason("");
    setTab("archive");
    await loadData();
  }

  async function restore(row: PaymentRow) {
    if (workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(row.id);
    const { error } = await supabase.rpc("restore_order_payment", {
      p_payment_id: row.id
    });
    setWorkingId(null);

    if (error) {
      setMessage("Pembayaran gagal dipulihkan.");
      return;
    }

    setMessage(`${row.payment_number} berhasil dipulihkan.`);
    setTab("active");
    await loadData();
  }

  async function permanentlyDelete() {
    if (!deleteTarget || !isSuperAdmin || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(deleteTarget.id);
    const { error } = await supabase.rpc("permanently_delete_order_payment", {
      p_payment_id: deleteTarget.id
    });
    setWorkingId(null);

    if (error) {
      setMessage("Hapus permanen ditolak atau gagal.");
      return;
    }

    if (deleteTarget.proof_bucket && deleteTarget.proof_path) {
      await supabase.storage
        .from(deleteTarget.proof_bucket)
        .remove([deleteTarget.proof_path]);
    }

    setMessage(`${deleteTarget.payment_number} berhasil dihapus permanen.`);
    setDeleteTarget(null);
    await loadData();
  }

  async function openProof(row: PaymentRow) {
    if (!row.proof_bucket || !row.proof_path) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase.storage
      .from(row.proof_bucket)
      .createSignedUrl(row.proof_path, 60 * 10);

    if (error || !data?.signedUrl) {
      setMessage("Bukti pembayaran belum dapat dibuka.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (loading || !summary) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold opacity-50"
      >
        Memuat pembayaran...
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
      >
        Pembayaran
      </button>

      {open ? (
        <div className="fixed inset-0 z-[96] overflow-y-auto bg-black/50 p-4 sm:p-8">
          <section className="mx-auto max-w-7xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <header className="flex flex-col gap-5 border-b border-brand-softGray bg-white p-5 lg:flex-row lg:items-start lg:justify-between lg:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  v1.2 · Phase 5A
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Pelacakan Pembayaran
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
                  Catat pembayaran bertahap, periksa bukti, verifikasi nominal, dan pantau sisa tagihan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Tambah Pembayaran
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="p-5 lg:p-7">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Summary label="Total Tagihan" value={money(summary.total_amount)} />
                <Summary
                  label="Pembayaran Terverifikasi"
                  value={money(summary.payment_total_verified)}
                />
                <Summary label="Sisa Pembayaran" value={money(summary.payment_balance)} />
                <Summary
                  label="Status"
                  value={
                    summary.payment_requirement_met
                      ? "Pembayaran Memenuhi Syarat"
                      : `${Number(summary.payment_percentage || 0).toFixed(0)}% Terbayar`
                  }
                />
              </section>

              {message ? (
                <div className="mt-5 border border-brand-softGray bg-white p-4 text-sm font-semibold">
                  {message}
                </div>
              ) : null}

              {pendingRows.length > 1 ? (
                <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                  <strong>{pendingRows.length} bukti pembayaran menunggu verifikasi.</strong>{" "}
                  Periksa bukti yang benar, verifikasi satu pembayaran yang valid, lalu tolak
                  pengiriman duplikat agar total tidak tercatat berlebih.
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab("active")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    tab === "active"
                      ? "bg-brand-charcoal text-white"
                      : "border border-brand-softGray bg-white"
                  }`}
                >
                  Pembayaran Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setTab("archive")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    tab === "archive"
                      ? "bg-brand-charcoal text-white"
                      : "border border-brand-softGray bg-white"
                  }`}
                >
                  Gudang Arsip
                </button>
              </div>

              {tab === "active" ? (
                <div className="mt-6 grid gap-4">
                  {activeRows.map((row) => (
                    <PaymentCard
                      key={row.id}
                      row={row}
                      canVerify={canVerify}
                      working={workingId === row.id}
                      onEdit={() => openEdit(row)}
                      onVerify={() => void verify(row)}
                      onReject={() => {
                        setRejectTarget(row);
                        setRejectReason("");
                      }}
                      onArchive={() => {
                        setArchiveTarget(row);
                        setArchiveReason("");
                      }}
                      onProof={() => void openProof(row)}
                    />
                  ))}

                  {!activeRows.length ? (
                    <div className="border border-dashed border-brand-softGray bg-white p-8 text-center">
                      <p className="font-semibold">Belum ada pembayaran</p>
                      <p className="mt-2 text-sm text-brand-charcoal/60">
                        Tambahkan pembayaran pertama untuk mulai mencatat transaksi.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {archivedRows.map((row) => (
                    <article
                      key={row.id}
                      className="border border-brand-softGray bg-white p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-semibold">{row.payment_number}</h3>
                          <p className="mt-2 text-sm font-semibold">
                            {money(row.amount)}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">
                            Diarsipkan: {dateTime(row.archived_at)}
                            <br />
                            Oleh: {row.archived_by ? actorNames[row.archived_by] || "Admin DEBRODER" : "-"}
                            <br />
                            Alasan: {row.archive_reason || "-"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void restore(row)}
                            disabled={Boolean(workingId)}
                            className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                          >
                            Pulihkan
                          </button>
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                            >
                              Hapus Permanen
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}

                  {!archivedRows.length ? (
                    <div className="border border-dashed border-brand-softGray bg-white p-8 text-center">
                      <p className="font-semibold">
                        Gudang Arsip pembayaran kosong
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              <PaymentCompletionPanel
                orderId={orderId}
                summary={summary}
                payments={rows.map((row) => ({
                  id: row.id,
                  payment_number: row.payment_number,
                  amount: row.amount,
                  status: row.status
                }))}
                role={role}
                onChanged={loadData}
              />
            </div>
          </section>
        </div>
      ) : null}

      {formOpen ? (
        <Modal title={editing ? "Edit Pembayaran" : "Tambah Pembayaran"}>
          <form onSubmit={savePayment}>
            <label className="text-sm font-semibold">
              Nominal pembayaran
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Tanggal pembayaran
              <input
                type="datetime-local"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Metode pembayaran
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              >
                {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Bank atau kanal pembayaran
              <input
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                placeholder="Contoh: BCA, BRI, QRIS, DANA"
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Nomor referensi
              <input
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>

            {!editing ? (
              <label className="mt-4 block text-sm font-semibold">
                Bukti pembayaran
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                  onChange={(event) =>
                    setProofFile(event.target.files?.[0] || null)
                  }
                  className="mt-2 block w-full rounded-lg border border-brand-softGray bg-white p-3 text-sm"
                />
                <span className="mt-2 block text-xs font-normal text-brand-charcoal/55">
                  PNG, JPG, atau PDF. Maksimal 5 MB.
                </span>
              </label>
            ) : null}

            <label className="mt-4 block text-sm font-semibold">
              Catatan pelanggan
              <textarea
                rows={3}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Catatan admin
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={Boolean(workingId)}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {workingId
                  ? "Menyimpan..."
                  : editing
                    ? "Simpan Perubahan"
                    : "Catat Pembayaran"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={Boolean(workingId)}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {rejectTarget ? (
        <Modal title={`Tolak ${rejectTarget.payment_number}?`}>
          <p className="text-sm leading-6 text-brand-charcoal/65">
            Jelaskan alasan penolakan agar tindak lanjut pembayaran jelas.
          </p>
          <textarea
            rows={5}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Alasan penolakan wajib diisi"
            className="mt-4 w-full rounded-lg border border-brand-softGray px-4 py-3"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void reject()}
              disabled={!rejectReason.trim() || Boolean(workingId)}
              className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
            >
              {workingId ? "Memproses..." : "Tolak Pembayaran"}
            </button>
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              disabled={Boolean(workingId)}
              className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
            >
              Batal
            </button>
          </div>
        </Modal>
      ) : null}

      {archiveTarget ? (
        <Modal title={`Arsipkan ${archiveTarget.payment_number}?`}>
          <p className="text-sm leading-6 text-brand-charcoal/65">
            Pembayaran akan hilang dari daftar aktif, tetapi dapat dipulihkan.
          </p>
          <textarea
            rows={4}
            value={archiveReason}
            onChange={(event) => setArchiveReason(event.target.value)}
            placeholder="Alasan arsip"
            className="mt-4 w-full rounded-lg border border-brand-softGray px-4 py-3"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void archive()}
              disabled={Boolean(workingId)}
              className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
            >
              {workingId ? "Mengarsipkan..." : "Pindahkan ke Gudang Arsip"}
            </button>
            <button
              type="button"
              onClick={() => setArchiveTarget(null)}
              disabled={Boolean(workingId)}
              className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
            >
              Batal
            </button>
          </div>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title={`Hapus permanen ${deleteTarget.payment_number}?`}>
          <p className="text-sm leading-6 text-brand-charcoal/65">
            Pembayaran dan bukti terkait tidak dapat dipulihkan setelah dihapus.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void permanentlyDelete()}
              disabled={Boolean(workingId)}
              className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
            >
              {workingId ? "Menghapus..." : "Hapus Permanen"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(workingId)}
              className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
            >
              Batal
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-softGray bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-brand-charcoal/45">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function PaymentCard({
  row,
  canVerify,
  working,
  onEdit,
  onVerify,
  onReject,
  onArchive,
  onProof
}: {
  row: PaymentRow;
  canVerify: boolean;
  working: boolean;
  onEdit: () => void;
  onVerify: () => void;
  onReject: () => void;
  onArchive: () => void;
  onProof: () => void;
}) {
  const editable = row.status === "draft" || row.status === "pending";

  return (
    <article className="border border-brand-softGray bg-white p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{row.payment_number}</h3>
            <span className="rounded-full border border-brand-softGray px-3 py-1 text-xs font-semibold">
              {PAYMENT_STATUS[row.status] || row.status}
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold">{money(row.amount)}</p>
          <p className="mt-2 text-sm text-brand-charcoal/60">
            {PAYMENT_METHOD[row.method] || row.method}
            {row.channel_name ? ` · ${row.channel_name}` : ""}
            {row.reference_number ? ` · Ref. ${row.reference_number}` : ""}
          </p>
          <p className="mt-2 text-xs text-brand-charcoal/55">
            Dibayar: {dateTime(row.paid_at)}
          </p>
          {row.rejection_reason ? (
            <p className="mt-3 border-l-2 border-red-600 pl-3 text-sm text-red-700">
              Ditolak: {row.rejection_reason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {row.proof_path ? (
            <button
              type="button"
              onClick={onProof}
              className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold"
            >
              Buka Bukti
            </button>
          ) : null}

          {editable ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold"
            >
              Edit
            </button>
          ) : null}

          {row.status === "pending" && canVerify ? (
            <>
              <button
                type="button"
                onClick={onVerify}
                disabled={working}
                className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Memproses..." : "Verifikasi"}
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={working}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-45"
              >
                Tolak
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={onArchive}
            disabled={working}
            className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-45"
          >
            Arsipkan
          </button>
        </div>
      </div>
    </article>
  );
}

function Modal({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/60 p-4 sm:p-8">
      <section className="mx-auto max-w-xl bg-white p-6 shadow-2xl sm:p-8">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
