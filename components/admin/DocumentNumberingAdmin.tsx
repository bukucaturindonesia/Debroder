"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import {
  buildDocumentNumberPreview,
  getDocumentTypeLabel,
  getResetRuleLabel,
  isSuperAdminRole,
  normalizeDocumentType,
  type DocumentNumberRule
} from "@/lib/document-numbering";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import {
  AdminAlert,
  AdminEmptyState,
  AdminLoadingState
} from "@/components/admin/ui/AdminFeedback";

type Tab = "active" | "archive" | "issues" | "history";

type DocumentNumberIssue = {
  id: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  issued_number: string;
  period_key: string;
  sequence_value: number;
  issued_by: string | null;
  issued_at: string;
  metadata: Record<string, unknown>;
};

type RuleHistory = {
  id: string;
  document_type: string;
  action: "created" | "updated" | "archived" | "restored" | "deleted";
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
};

type RuleForm = {
  document_type: string;
  prefix: string;
  use_year: boolean;
  use_month: boolean;
  padding: number;
  separator: string;
  reset_rule: "never" | "yearly" | "monthly";
  active: boolean;
};

type PendingAction =
  | { type: "archive"; rule: DocumentNumberRule }
  | { type: "delete"; rule: DocumentNumberRule }
  | null;

const EMPTY_FORM: RuleForm = {
  document_type: "",
  prefix: "",
  use_year: true,
  use_month: false,
  padding: 4,
  separator: "-",
  reset_rule: "yearly",
  active: true
};

const ACTION_LABELS: Record<RuleHistory["action"], string> = {
  created: "Dibuat",
  updated: "Diubah",
  archived: "Diarsipkan",
  restored: "Dipulihkan",
  deleted: "Dihapus Permanen"
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}

function actorLabel(actorId: string | null, actors: Record<string, string>) {
  if (!actorId) return "Sistem";
  return actors[actorId] || "Akun tidak tersedia";
}


export function DocumentNumberingAdmin() {
  const [tab, setTab] = useState<Tab>("active");
  const [rules, setRules] = useState<DocumentNumberRule[]>([]);
  const [issues, setIssues] = useState<DocumentNumberIssue[]>([]);
  const [history, setHistory] = useState<RuleHistory[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>({ ...EMPTY_FORM });
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionReason, setActionReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const canManage = isSuperAdminRole(role);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setNotice({ type: "error", text: "Layanan data belum tersedia. Hubungi pengelola sistem." });
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotice(null);

    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;
    if (!userId) {
      setNotice({ type: "error", text: "Sesi admin tidak ditemukan." });
      setLoading(false);
      return;
    }

    const [profileResult, rulesResult, issuesResult, historyResult, actorsResult] =
      await Promise.all([
        supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
        supabase
          .from("document_number_rules")
          .select(
            "document_type,prefix,use_year,use_month,padding,separator,reset_rule,active,updated_by,updated_at,archived_at,archived_by,archive_reason"
          )
          .order("document_type"),
        supabase
          .from("document_number_issues")
          .select(
            "id,document_type,entity_type,entity_id,issued_number,period_key,sequence_value,issued_by,issued_at,metadata"
          )
          .order("issued_at", { ascending: false })
          .limit(500),
        supabase
          .from("document_number_rule_history")
          .select(
            "id,document_type,action,old_value,new_value,reason,actor_id,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("profiles").select("id,email")
      ]);

    setLoading(false);

    const firstError =
      profileResult.error ||
      rulesResult.error ||
      issuesResult.error ||
      historyResult.error;
    if (firstError) {
      setNotice({
        type: "error",
        text: `Penomoran dokumen belum dapat dimuat: ${firstError.message}`
      });
      return;
    }

    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setRules((rulesResult.data || []) as DocumentNumberRule[]);
    setIssues((issuesResult.data || []) as DocumentNumberIssue[]);
    setHistory((historyResult.data || []) as RuleHistory[]);

    const actorMap: Record<string, string> = {};
    for (const actor of actorsResult.data || []) {
      if (typeof actor.id === "string") {
        actorMap[actor.id] =
          typeof actor.email === "string" && actor.email.trim()
            ? actor.email
            : "Akun tanpa email";
      }
    }
    setActors(actorMap);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const issueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      counts[issue.document_type] = (counts[issue.document_type] || 0) + 1;
    }
    return counts;
  }, [issues]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleRules = useMemo(() => {
    const archived = tab === "archive";
    return rules.filter((rule) => {
      if (Boolean(rule.archived_at) !== archived) return false;
      if (!normalizedSearch) return true;
      return [
        rule.document_type,
        getDocumentTypeLabel(rule.document_type),
        rule.prefix,
        buildDocumentNumberPreview(rule)
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [normalizedSearch, rules, tab]);

  const visibleIssues = useMemo(() => {
    if (!normalizedSearch) return issues;
    return issues.filter((issue) =>
      [
        issue.issued_number,
        issue.document_type,
        getDocumentTypeLabel(issue.document_type),
        issue.entity_type,
        actorLabel(issue.issued_by, actors)
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [actors, issues, normalizedSearch]);

  const visibleHistory = useMemo(() => {
    if (!normalizedSearch) return history;
    return history.filter((row) =>
      [
        row.document_type,
        getDocumentTypeLabel(row.document_type),
        ACTION_LABELS[row.action],
        row.reason || "",
        actorLabel(row.actor_id, actors)
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [actors, history, normalizedSearch]);

  function openCreate() {
    setEditingType(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
    setNotice(null);
  }

  function openEdit(rule: DocumentNumberRule) {
    setEditingType(rule.document_type);
    setForm({
      document_type: rule.document_type,
      prefix: rule.prefix,
      use_year: rule.use_year,
      use_month: rule.use_month,
      padding: rule.padding,
      separator: rule.separator,
      reset_rule: rule.reset_rule,
      active: rule.active
    });
    setFormOpen(true);
    setNotice(null);
  }

  function closeForm() {
    if (working) return;
    setFormOpen(false);
    setEditingType(null);
    setForm({ ...EMPTY_FORM });
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const documentType = editingType || normalizeDocumentType(form.document_type);
    if (!documentType || !form.prefix.trim()) {
      setNotice({ type: "error", text: "Jenis dokumen dan prefix wajib diisi." });
      return;
    }

    setWorking(true);
    setNotice(null);

    const result = editingType
      ? await supabase.rpc("update_document_number_rule", {
          p_document_type: documentType,
          p_prefix: form.prefix.trim(),
          p_use_year: form.use_year,
          p_use_month: form.use_month,
          p_padding: form.padding,
          p_separator: form.separator || "-",
          p_reset_rule: form.reset_rule,
          p_active: true
        })
      : await supabase.rpc("create_document_number_rule", {
          p_document_type: documentType,
          p_prefix: form.prefix.trim(),
          p_use_year: form.use_year,
          p_use_month: form.use_month,
          p_padding: form.padding,
          p_separator: form.separator || "-",
          p_reset_rule: form.reset_rule
        });

    setWorking(false);

    if (result.error) {
      setNotice({ type: "error", text: "Aturan penomoran belum dapat disimpan. Periksa data lalu coba lagi." });
      return;
    }

    const successText = editingType
      ? "Aturan penomoran berhasil diperbarui. Nomor historis tidak berubah."
      : "Aturan penomoran berhasil dibuat.";
    closeForm();
    await loadData();
    setNotice({ type: "success", text: successText });
  }

  async function restoreRule(rule: DocumentNumberRule) {
    if (!canManage || working) return;
    if (!window.confirm(`Pulihkan aturan ${getDocumentTypeLabel(rule.document_type)}?`)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    const { error } = await supabase.rpc("restore_document_number_rule", {
      p_document_type: rule.document_type
    });
    setWorking(false);

    if (error) {
      setNotice({ type: "error", text: "Aturan penomoran belum dapat dipulihkan. Coba lagi." });
      return;
    }

    await loadData();
    setNotice({ type: "success", text: "Aturan penomoran berhasil dipulihkan." });
  }

  async function confirmPendingAction() {
    if (!pendingAction || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    if (pendingAction.type === "archive" && !actionReason.trim()) {
      setNotice({ type: "error", text: "Alasan arsip wajib diisi." });
      return;
    }
    if (
      pendingAction.type === "delete" &&
      deleteConfirmation !== pendingAction.rule.document_type
    ) {
      setNotice({
        type: "error",
        text: "Konfirmasi hapus permanen belum sesuai dengan jenis dokumen."
      });
      return;
    }

    setWorking(true);
    const result =
      pendingAction.type === "archive"
        ? await supabase.rpc("archive_document_number_rule", {
            p_document_type: pendingAction.rule.document_type,
            p_reason: actionReason.trim()
          })
        : await supabase.rpc("permanently_delete_document_number_rule", {
            p_document_type: pendingAction.rule.document_type
          });
    setWorking(false);

    if (result.error) {
      setNotice({ type: "error", text: "Aturan penomoran belum dapat diperbarui. Coba lagi." });
      return;
    }

    const successText =
      pendingAction.type === "archive"
        ? "Aturan dipindahkan ke Gudang Arsip."
        : "Aturan yang belum pernah digunakan berhasil dihapus permanen.";
    setPendingAction(null);
    setActionReason("");
    setDeleteConfirmation("");
    await loadData();
    setNotice({ type: "success", text: successText });
  }

  const preview = buildDocumentNumberPreview({
    prefix: form.prefix || "PREFIX",
    use_year: form.use_year,
    use_month: form.use_month,
    padding: form.padding,
    separator: form.separator || "-"
  });

  if (loading) return <AdminLoadingState label="Memuat sistem penomoran dokumen..." />;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 6"
          title="Penomoran Dokumen"
          description="Atur format nomor resmi dan lihat registri nomor yang sudah diterbitkan. Nomor historis bersifat permanen dan tidak berubah ketika format diperbarui."
          actions={
            canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white"
              >
                Tambah Aturan
              </button>
            ) : undefined
          }
        />

        {!canManage ? (
          <AdminAlert type="info">
            Kamu memiliki akses baca. Perubahan format, arsip, pemulihan, dan hapus permanen hanya dapat dilakukan oleh Super Admin.
          </AdminAlert>
        ) : null}

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}

        <section className="border border-brand-softGray bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabButton active={tab === "active"} onClick={() => setTab("active")}>Aturan Aktif</TabButton>
              <TabButton active={tab === "archive"} onClick={() => setTab("archive")}>Gudang Arsip</TabButton>
              <TabButton active={tab === "issues"} onClick={() => setTab("issues")}>Nomor Terbit</TabButton>
              <TabButton active={tab === "history"} onClick={() => setTab("history")}>Riwayat Perubahan</TabButton>
            </div>
            <label className="block w-full max-w-md text-sm font-semibold">
              <span className="sr-only">Cari data penomoran</span>
              <input
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                placeholder="Cari jenis dokumen, prefix, nomor, atau pelaku..."
                className="min-h-11 w-full rounded-lg border border-brand-softGray px-4 font-normal outline-none focus:border-brand-charcoal"
              />
            </label>
          </div>
        </section>

        {tab === "active" || tab === "archive" ? (
          visibleRules.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {visibleRules.map((rule) => {
                const usedCount = issueCounts[rule.document_type] || 0;
                return (
                  <article key={rule.document_type} className="border border-brand-softGray bg-white p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal/45">{rule.document_type}</p>
                        <h2 className="mt-2 text-xl font-semibold">{getDocumentTypeLabel(rule.document_type)}</h2>
                        <p className="mt-3 break-all rounded-lg bg-brand-offWhite p-3 font-mono text-sm font-semibold">{buildDocumentNumberPreview(rule)}</p>
                      </div>
                      <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${rule.active && !rule.archived_at ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                        {rule.archived_at ? "Diarsipkan" : rule.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>

                    <dl className="mt-5 grid gap-4 border-t border-brand-softGray pt-5 sm:grid-cols-2">
                      <Data label="Prefix" value={rule.prefix} />
                      <Data label="Jumlah digit" value={`${rule.padding} digit`} />
                      <Data label="Periode" value={getResetRuleLabel(rule.reset_rule)} />
                      <Data label="Nomor diterbitkan" value={`${usedCount} nomor`} />
                      <Data label="Diperbarui" value={formatDate(rule.updated_at)} />
                      <Data label="Oleh" value={actorLabel(rule.updated_by, actors)} />
                      {rule.archived_at ? <Data label="Tanggal arsip" value={formatDate(rule.archived_at)} /> : null}
                      {rule.archived_at ? <Data label="Diarsipkan oleh" value={actorLabel(rule.archived_by, actors)} /> : null}
                    </dl>

                    {rule.archive_reason ? (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <strong>Alasan arsip:</strong> {rule.archive_reason}
                      </div>
                    ) : null}

                    {canManage ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {!rule.archived_at ? (
                          <>
                            <button type="button" onClick={() => openEdit(rule)} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Edit</button>
                            <button type="button" onClick={() => { setPendingAction({ type: "archive", rule }); setActionReason(""); setDeleteConfirmation(""); }} className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-800">Arsipkan</button>
                          </>
                        ) : (
                          <>
                            <button type="button" disabled={working} onClick={() => void restoreRule(rule)} className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-45">Pulihkan</button>
                            <button
                              type="button"
                              disabled={usedCount > 0}
                              title={usedCount > 0 ? "Aturan yang sudah menerbitkan nomor tidak boleh dihapus permanen." : "Hapus permanen aturan yang belum pernah digunakan."}
                              onClick={() => { setPendingAction({ type: "delete", rule }); setActionReason(""); setDeleteConfirmation(""); }}
                              className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Hapus Permanen
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          ) : (
            <AdminEmptyState
              title={tab === "archive" ? "Gudang Arsip masih kosong" : "Aturan penomoran tidak ditemukan"}
              description={search ? "Coba gunakan kata pencarian lain." : tab === "archive" ? "Aturan yang diarsipkan akan muncul di sini." : "Belum ada aturan penomoran aktif."}
              action={canManage && tab === "active" && !search ? <button type="button" onClick={openCreate} className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white">Tambah Aturan</button> : undefined}
            />
          )
        ) : null}

        {tab === "issues" ? (
          visibleIssues.length ? (
            <section className="border border-brand-softGray bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-brand-offWhite text-xs uppercase tracking-[0.1em] text-brand-charcoal/55">
                    <tr>
                      <th className="px-5 py-4">Nomor</th>
                      <th className="px-5 py-4">Dokumen</th>
                      <th className="px-5 py-4">Sumber</th>
                      <th className="px-5 py-4">Diterbitkan</th>
                      <th className="px-5 py-4">Pelaku</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-softGray">
                    {visibleIssues.map((issue) => (
                      <tr key={issue.id}>
                        <td className="whitespace-nowrap px-5 py-4 font-mono font-semibold">{issue.issued_number}</td>
                        <td className="px-5 py-4">{getDocumentTypeLabel(issue.document_type)}</td>
                        <td className="px-5 py-4">{getDocumentTypeLabel(issue.entity_type)}</td>
                        <td className="whitespace-nowrap px-5 py-4">{formatDate(issue.issued_at)}</td>
                        <td className="px-5 py-4">{actorLabel(issue.issued_by, actors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <AdminEmptyState title="Belum ada nomor yang diterbitkan" description={search ? "Tidak ada nomor yang cocok dengan pencarian." : "Nomor resmi akan tercatat otomatis ketika dokumen diterbitkan."} />
          )
        ) : null}

        {tab === "history" ? (
          visibleHistory.length ? (
            <section className="grid gap-3">
              {visibleHistory.map((row) => (
                <article key={row.id} className="grid gap-4 border border-brand-softGray bg-white p-5 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{getDocumentTypeLabel(row.document_type)}</p>
                    <h2 className="mt-2 font-semibold">{ACTION_LABELS[row.action]}</h2>
                    <p className="mt-2 text-sm text-brand-charcoal/65">{row.reason || "Tidak ada catatan tambahan."}</p>
                  </div>
                  <div className="text-sm md:text-right">
                    <p className="font-semibold">{actorLabel(row.actor_id, actors)}</p>
                    <p className="mt-1 text-brand-charcoal/55">{formatDate(row.created_at)}</p>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <AdminEmptyState title="Riwayat perubahan masih kosong" description={search ? "Tidak ada riwayat yang cocok dengan pencarian." : "Perubahan aturan akan direkam di sini."} />
          )
        ) : null}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={saveRule} className="mx-auto max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">{editingType ? "Edit Aturan Penomoran" : "Tambah Aturan Penomoran"}</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Perubahan format hanya berlaku untuk nomor berikutnya. Nomor historis tidak diubah.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Jenis dokumen">
                <input required disabled={Boolean(editingType)} value={form.document_type} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, document_type: event.target.value }))} placeholder="contoh: invoice" className="min-h-11 w-full rounded-lg border border-brand-softGray px-4 disabled:bg-brand-offWhite" />
              </Field>
              <Field label="Prefix">
                <input required value={form.prefix} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, prefix: event.target.value.toUpperCase() }))} placeholder="INV-DEB" className="min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
              </Field>
              <Field label="Pemisah">
                <input required maxLength={3} value={form.separator} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, separator: event.target.value }))} className="min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
              </Field>
              <Field label="Jumlah digit urutan">
                <input type="number" min={3} max={8} required value={form.padding} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, padding: Math.min(8, Math.max(3, Number(event.target.value) || 4)) }))} className="min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
              </Field>
              <Field label="Aturan reset">
                <select value={form.reset_rule} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, reset_rule: event.target.value as RuleForm["reset_rule"] }))} className="min-h-11 w-full rounded-lg border border-brand-softGray px-4">
                  <option value="yearly">Reset tiap tahun</option>
                  <option value="monthly">Reset tiap bulan</option>
                  <option value="never">Tidak pernah reset</option>
                </select>
              </Field>
              <div className="grid content-start gap-3 rounded-lg border border-brand-softGray p-4">
                <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.use_year} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, use_year: event.target.checked }))} />Sertakan tahun</label>
                <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.use_month} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, use_month: event.target.checked }))} />Sertakan bulan</label>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-brand-offWhite p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">Pratinjau nomor berikutnya</p>
              <p className="mt-2 break-all font-mono text-lg font-semibold">{preview}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={working} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : "Simpan Aturan"}</button>
              <button type="button" onClick={closeForm} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">{pendingAction.type === "archive" ? "Arsipkan Aturan?" : "Hapus Permanen Aturan?"}</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              {pendingAction.type === "archive"
                ? "Aturan dinonaktifkan dan dapat dipulihkan melalui Gudang Arsip. Nomor historis tetap tersimpan. Dokumen baru dengan tipe ini tidak akan memperoleh nomor sampai aturan dipulihkan."
                : "Tindakan ini hanya dapat dilakukan pada aturan arsip yang belum pernah menerbitkan nomor dan tidak dapat dibatalkan."}
            </p>

            {pendingAction.type === "archive" ? (
              <label className="mt-5 block text-sm font-semibold">Alasan arsip<textarea rows={4} value={actionReason} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setActionReason(event.target.value)} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3 font-normal" /></label>
            ) : (
              <label className="mt-5 block text-sm font-semibold">Ketik <code>{pendingAction.rule.document_type}</code> untuk konfirmasi<input value={deleteConfirmation} onChange={(event: ChangeEvent<HTMLInputElement>) => setDeleteConfirmation(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-red-300 px-4 font-normal" /></label>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void confirmPendingAction()} disabled={working} className={`rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-45 ${pendingAction.type === "archive" ? "bg-amber-700" : "bg-red-700"}`}>{working ? "Memproses..." : pendingAction.type === "archive" ? "Pindahkan ke Gudang Arsip" : "Hapus Permanen"}</button>
              <button type="button" disabled={working} onClick={() => { setPendingAction(null); setActionReason(""); setDeleteConfirmation(""); }} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-4 py-2 text-xs font-semibold ${active ? "border-brand-charcoal bg-brand-charcoal text-white" : "border-brand-softGray bg-white"}`}>{children}</button>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}{children}</label>;
}

function Data({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-charcoal/45">{label}</dt><dd className="mt-1.5 break-words text-sm font-semibold">{value}</dd></div>;
}
