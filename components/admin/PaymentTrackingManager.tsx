"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { formatAdminOrderDateTime, formatAdminOrderDateTimeInput } from "@/lib/admin-order-detail";
import { getPaymentStatusLabel } from "@/lib/ui-language";
import { paymentSettlementLabel, type PaymentReviewAction } from "@/lib/payments";
import { PaymentCompletionPanel } from "@/components/admin/PaymentCompletionPanel";

type PaymentRow = {
  id: string;
  payment_number: string;
  order_id: string;
  amount: number;
  reported_amount: number | null;
  paid_at: string;
  method: string;
  channel_name: string | null;
  reference_number: string | null;
  status: string;
  customer_notes: string | null;
  sender_name: string | null;
  destination_payment_method_id: string | null;
  review_outcome: string;
  check_funds_received: boolean | null;
  check_destination_account: boolean | null;
  check_amount: boolean | null;
  check_transaction_time: boolean | null;
  check_reference_unique: boolean | null;
  verified_amount: number | null;
  verified_destination_account: string | null;
  verified_transaction_at: string | null;
  verified_reference: string | null;
  settlement_classification: string | null;
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
  updated_at: string;
};

type PaymentMethodSetting = {
  id: string;
  method_code: string;
  method_type: string;
  display_name: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  is_active: boolean;
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
const VERIFY_ROLES = ["owner", "superadmin", "super_admin", "admin", "finance"];

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateTime(value: string | null | undefined) {
  return formatAdminOrderDateTime(value, { fallback: "-" });
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
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

  const [reviewTarget, setReviewTarget] = useState<PaymentRow | null>(null);
  const [reviewMethodId, setReviewMethodId] = useState("");
  const [reviewChecks, setReviewChecks] = useState({
    fundsReceived: false,
    destinationAccount: false,
    amount: false,
    transactionTime: false,
    referenceUnique: false
  });
  const [verifiedAmount, setVerifiedAmount] = useState("");
  const [verifiedDestinationAccount, setVerifiedDestinationAccount] = useState("");
  const [verifiedTransactionAt, setVerifiedTransactionAt] = useState("");
  const [verifiedReference, setVerifiedReference] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewReason, setReviewReason] = useState("");
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
    const accessToken = sessionData.session?.access_token ?? "";

    const [orderResult, paymentResult, profileResult, settingsResponse] = await Promise.all([
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
          "id,payment_number,order_id,amount,reported_amount,paid_at,method,channel_name,reference_number,status,customer_notes,sender_name,destination_payment_method_id,review_outcome,check_funds_received,check_destination_account,check_amount,check_transaction_time,check_reference_unique,verified_amount,verified_destination_account,verified_transaction_at,verified_reference,settlement_classification,admin_notes,proof_bucket,proof_path,proof_file_name,proof_mime_type,proof_size_bytes,submitted_at,verified_at,rejection_reason,archived_at,archived_by,archive_reason,created_at,updated_at"
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      user
        ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      accessToken
        ? fetch("/api/admin/payment-settings", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store"
        })
        : Promise.resolve(null)
    ]);

    setLoading(false);

    if (orderResult.error || paymentResult.error || !orderResult.data) {
      setMessage("Data pembayaran belum berhasil dimuat.");
      return;
    }

    setSummary(orderResult.data as OrderSummary);
    setRows((paymentResult.data || []) as PaymentRow[]);
    setRole(String(profileResult.data?.role || ""));
    if (settingsResponse?.ok) {
      const payload = await settingsResponse.json() as { settings?: PaymentMethodSetting[] };
      setPaymentMethods(payload.settings ?? []);
    }
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

  useEffect(() => {
    const syncPaymentHash = () => {
      if (window.location.hash === "#payment") setOpen(true);
    };
    syncPaymentHash();
    window.addEventListener("hashchange", syncPaymentHash);
    return () => window.removeEventListener("hashchange", syncPaymentHash);
  }, []);

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
    if (!response.ok) throw new Error(payload.error || "Perubahan pembayaran belum berhasil disimpan. Coba lagi.");
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
    setPaidAt(formatAdminOrderDateTimeInput(row.paid_at));
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

    if (!editing && !proofFile) {
      setMessage("Bukti pembayaran wajib diunggah sebelum pemeriksaan mutasi.");
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

  function openReview(row: PaymentRow) {
    const method = paymentMethods.find((item) => item.id === row.destination_payment_method_id)
      ?? paymentMethods.find((item) => item.is_active)
      ?? paymentMethods[0];
    setReviewTarget(row);
    setReviewMethodId(method?.id ?? "");
    setReviewChecks({
      fundsReceived: false,
      destinationAccount: false,
      amount: false,
      transactionTime: false,
      referenceUnique: false
    });
    setVerifiedAmount(String(row.reported_amount ?? row.amount));
    setVerifiedDestinationAccount(method?.account_number ?? method?.display_name ?? "");
    setVerifiedTransactionAt(formatAdminOrderDateTimeInput(row.paid_at));
    setVerifiedReference(row.reference_number ?? "");
    setReviewNotes(row.admin_notes ?? "");
    setReviewReason("");
    setMessage("");
  }

  function changeReviewMethod(methodId: string) {
    const method = paymentMethods.find((item) => item.id === methodId);
    setReviewMethodId(methodId);
    setVerifiedDestinationAccount(method?.account_number ?? method?.display_name ?? "");
    setReviewChecks((current) => ({ ...current, destinationAccount: false }));
  }

  async function submitReview(action: PaymentReviewAction) {
    if (!reviewTarget || !canVerify || workingId || (action === "verify" && !reviewMethodId)) return;
    if (action !== "verify" && !reviewReason.trim()) {
      setMessage("Alasan tindak lanjut wajib diisi.");
      return;
    }
    setWorkingId(reviewTarget.id);
    setMessage("");
    try {
      await paymentAction(reviewTarget.id, {
        action,
        destinationMethodId: reviewMethodId,
        checks: reviewChecks,
        verifiedAmount: Number(verifiedAmount),
        verifiedDestinationAccount,
        verifiedTransactionAt: verifiedTransactionAt
          ? new Date(verifiedTransactionAt).toISOString()
          : null,
        verifiedReference,
        adminNotes: reviewNotes,
        reason: reviewReason,
        expectedUpdatedAt: reviewTarget.updated_at
      });
      const label = action === "verify"
        ? "diverifikasi berdasarkan mutasi"
        : action === "funds_not_found"
          ? "ditandai dana belum ditemukan"
          : action === "request_correction"
            ? "dikembalikan untuk koreksi"
            : "ditolak";
      setMessage(`${reviewTarget.payment_number} ${label}.`);
      setReviewTarget(null);
      await loadData();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Pemeriksaan pembayaran belum berhasil.");
    } finally {
      setWorkingId(null);
    }
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
    <div id="payment" className="contents scroll-mt-24">
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
                      onReview={() => openReview(row)}
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
                  required
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

      {reviewTarget ? (
        <Modal title={`Pemeriksaan Mutasi · ${reviewTarget.payment_number}`} size="large">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="border border-brand-softGray p-4 text-sm">
              <h3 className="font-semibold">Laporan Pelanggan</h3>
              <dl className="mt-3 grid gap-2">
                <ReviewLine label="Nama pengirim" value={reviewTarget.sender_name || "Tidak tersedia"} />
                <ReviewLine label="Bank / dompet pengirim" value={reviewTarget.channel_name || "Tidak tersedia"} />
                <ReviewLine label="Nominal dilaporkan" value={money(reviewTarget.reported_amount ?? reviewTarget.amount)} />
                <ReviewLine label="Waktu dilaporkan" value={dateTime(reviewTarget.paid_at)} />
                <ReviewLine label="Referensi pengirim" value={reviewTarget.reference_number || "Tidak diisi"} />
              </dl>
              {reviewTarget.customer_notes ? <p className="mt-3 whitespace-pre-line border-l-2 border-brand-softGray pl-3 text-brand-charcoal/65">{reviewTarget.customer_notes}</p> : null}
              <button type="button" onClick={() => void openProof(reviewTarget)} className="mt-4 min-h-10 rounded-full border border-brand-charcoal px-4 font-semibold">Buka Bukti Privat</button>
            </section>

            <section className="border border-brand-softGray p-4">
              <h3 className="font-semibold">Data Mutasi Aktual</h3>
              <label className="mt-4 grid gap-2 text-sm font-semibold">Rekening tujuan<select value={reviewMethodId} onChange={(event) => changeReviewMethod(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray px-3"><option value="">Pilih rekening tujuan</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.display_name}{method.account_number ? ` · ${method.account_number}` : ""}</option>)}</select></label>
              <label className="mt-3 grid gap-2 text-sm font-semibold">Nominal masuk<input type="number" min="1" value={verifiedAmount} onChange={(event) => setVerifiedAmount(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray px-3" /></label>
              <label className="mt-3 grid gap-2 text-sm font-semibold">Rekening / tujuan terkonfirmasi<input value={verifiedDestinationAccount} onChange={(event) => setVerifiedDestinationAccount(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray px-3" /></label>
              <label className="mt-3 grid gap-2 text-sm font-semibold">Waktu transaksi<input type="datetime-local" value={verifiedTransactionAt} onChange={(event) => setVerifiedTransactionAt(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray px-3" /></label>
              <label className="mt-3 grid gap-2 text-sm font-semibold">Referensi mutasi<input value={verifiedReference} onChange={(event) => setVerifiedReference(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray px-3" /></label>
            </section>
          </div>

          <fieldset className="mt-5 border border-brand-softGray p-4">
            <legend className="px-2 text-sm font-semibold">Checklist wajib mutasi bank</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Check label="Dana benar-benar sudah masuk" checked={reviewChecks.fundsReceived} onChange={(value) => setReviewChecks({ ...reviewChecks, fundsReceived: value })} />
              <Check label="Rekening tujuan sesuai" checked={reviewChecks.destinationAccount} onChange={(value) => setReviewChecks({ ...reviewChecks, destinationAccount: value })} />
              <Check label="Nominal cocok dengan mutasi" checked={reviewChecks.amount} onChange={(value) => setReviewChecks({ ...reviewChecks, amount: value })} />
              <Check label="Tanggal dan waktu cocok" checked={reviewChecks.transactionTime} onChange={(value) => setReviewChecks({ ...reviewChecks, transactionTime: value })} />
              <Check label="Referensi bukan transaksi duplikat" checked={reviewChecks.referenceUnique} onChange={(value) => setReviewChecks({ ...reviewChecks, referenceUnique: value })} />
            </div>
          </fieldset>

          <label className="mt-4 grid gap-2 text-sm font-semibold">Catatan internal<textarea rows={3} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} className="rounded-lg border border-brand-softGray p-3 font-normal" /></label>
          <label className="mt-4 grid gap-2 text-sm font-semibold">Alasan tindak lanjut (wajib selain Verifikasi)<textarea rows={3} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="rounded-lg border border-brand-softGray p-3 font-normal" /></label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void submitReview("verify")} disabled={Boolean(workingId) || !Object.values(reviewChecks).every(Boolean) || !reviewMethodId || !verifiedAmount || !verifiedTransactionAt || !verifiedReference} className="rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white disabled:opacity-45">Verifikasi Dana Masuk</button>
            <button type="button" onClick={() => void submitReview("funds_not_found")} disabled={Boolean(workingId) || !reviewReason.trim()} className="rounded-full border border-amber-500 px-5 py-3 text-sm font-semibold text-amber-900 disabled:opacity-45">Dana Belum Ditemukan</button>
            <button type="button" onClick={() => void submitReview("request_correction")} disabled={Boolean(workingId) || !reviewReason.trim()} className="rounded-full border border-brand-charcoal px-5 py-3 text-sm font-semibold disabled:opacity-45">Minta Koreksi</button>
            <button type="button" onClick={() => void submitReview("reject")} disabled={Boolean(workingId) || !reviewReason.trim()} className="rounded-full border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-45">Tolak</button>
            <button type="button" onClick={() => setReviewTarget(null)} disabled={Boolean(workingId)} className="rounded-full border border-brand-softGray px-5 py-3 text-sm font-semibold">Batal</button>
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
    </div>
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
  onReview,
  onArchive,
  onProof
}: {
  row: PaymentRow;
  canVerify: boolean;
  working: boolean;
  onEdit: () => void;
  onReview: () => void;
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
              {PAYMENT_STATUS[row.status] || getPaymentStatusLabel(row.status)}
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold">{money(row.verified_amount ?? row.reported_amount ?? row.amount)}</p>
          {row.verified_amount && row.reported_amount && row.verified_amount !== row.reported_amount ? <p className="mt-1 text-xs text-amber-800">Dilaporkan pelanggan: {money(row.reported_amount)}</p> : null}
          <p className="mt-2 text-sm text-brand-charcoal/60">
            {PAYMENT_METHOD[row.method] || row.method}
            {row.channel_name ? ` · ${row.channel_name}` : ""}
            {row.reference_number ? ` · Ref. ${row.reference_number}` : ""}
          </p>
          <p className="mt-2 text-xs text-brand-charcoal/55">
            Dibayar: {dateTime(row.paid_at)}
          </p>
          {row.sender_name ? <p className="mt-1 text-xs text-brand-charcoal/55">Pengirim: {row.sender_name}</p> : null}
          {row.status === "verified" ? <p className="mt-2 text-sm font-semibold text-emerald-800">{paymentSettlementLabel(row.settlement_classification)} · Ref. {row.verified_reference || "-"}</p> : null}
          {row.review_outcome === "funds_not_found" ? <p className="mt-2 text-sm font-semibold text-amber-800">Dana belum ditemukan pada mutasi.</p> : null}
          {row.review_outcome === "correction_requested" ? <p className="mt-2 text-sm font-semibold text-amber-800">Koreksi laporan diminta.</p> : null}
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
                onClick={onReview}
                disabled={working}
                className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Memproses..." : "Periksa Mutasi"}
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
  children,
  size = "default"
}: {
  title: string;
  children: React.ReactNode;
  size?: "default" | "large";
}) {
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/60 p-4 sm:p-8">
      <section className={`mx-auto bg-white p-6 shadow-2xl sm:p-8 ${size === "large" ? "max-w-5xl" : "max-w-xl"}`}>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-brand-charcoal/55">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}
