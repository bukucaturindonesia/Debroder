"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";
import { AdminAlert, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { phase13ApiFetch } from "@/lib/admin-phase13-api";
import {
  ACCOUNT_STATUSES,
  MANAGEABLE_ADMIN_ROLES,
  ROLE_LABELS,
  formatAuditDate,
  getAccountStatusLabel,
  getRoleLabel,
  hasPermission,
  type AccountStatus,
  type ManageableAdminRole,
  type SystemAuditRow
} from "@/lib/access-control";

type DetailAccount = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  account_status: string;
  primary_store_id: string | null;
  all_store_access: boolean;
  invitation_status: string;
  auth_state: string;
  created_at: string | null;
  updated_at: string | null;
  last_login_at: string | null;
  last_auth_activity_at: string | null;
};

type DetailResponse = {
  account: DetailAccount;
  permissions: string[];
  activity: SystemAuditRow[];
  stores: { id: string; nama_store: string; status_aktif: boolean }[];
  activeSessionPresent: boolean;
};

export function AdminAccountDetail({ accountId }: { accountId: string }) {
  const actor = useAdminAccess();
  const canManage = hasPermission(actor.permissions, "access_control.manage");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({ role: "order_cs_admin" as ManageableAdminRole, accountStatus: "TESTING" as AccountStatus, primaryStoreId: "", allStoreAccess: true, reason: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await phase13ApiFetch<DetailResponse>(`/api/admin/access-control/users/${accountId}`);
      setData(response);
      if (MANAGEABLE_ADMIN_ROLES.includes(response.account.role as ManageableAdminRole) && ACCOUNT_STATUSES.includes(response.account.account_status as AccountStatus)) {
        setDraft({
          role: response.account.role as ManageableAdminRole,
          accountStatus: response.account.account_status as AccountStatus,
          primaryStoreId: response.account.primary_store_id || "",
          allStoreAccess: response.account.all_store_access,
          reason: ""
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Detail akun gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { void load(); }, [load]);

  async function saveAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await phase13ApiFetch(`/api/admin/access-control/users/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...draft, primaryStoreId: draft.primaryStoreId || null })
      });
      setNotice("Role, status, dan scope berhasil diperbarui. Sesi lama telah dicabut.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Akses akun belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <AdminLoadingState label="Memuat detail akun Admin..." />;
  if (!data) return <AdminAlert type="error">{error || "Detail akun tidak tersedia."}</AdminAlert>;
  const account = data.account;
  const protectedRole = ["owner", "superadmin", "super_admin"].includes(account.role);

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="DETAIL AKUN ADMIN" title={account.display_name || account.email || "Akun Admin"} description={`${getRoleLabel(account.role)} · ${account.all_store_access ? "SEMUA TOKO" : data.stores.find((store) => store.id === account.primary_store_id)?.nama_store || "Scope belum lengkap"}`} actions={<Link href="/admin/access-control" className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Kembali ke Daftar</Link>} />
      {error ? <AdminAlert type="error">{error}</AdminAlert> : null}
      {notice ? <AdminAlert type="success">{notice}</AdminAlert> : null}

      <nav className="flex flex-wrap gap-2" aria-label="Bagian detail akun"><a href="#profil" className="rounded-full border border-brand-softGray bg-white px-4 py-2 text-sm font-semibold">Profil</a><a href="#akses" className="rounded-full border border-brand-softGray bg-white px-4 py-2 text-sm font-semibold">Akses</a><a href="#sesi" className="rounded-full border border-brand-softGray bg-white px-4 py-2 text-sm font-semibold">Sesi</a><a href="#aktivitas" className="rounded-full border border-brand-softGray bg-white px-4 py-2 text-sm font-semibold">Aktivitas</a></nav>

      <section id="profil" className="border border-brand-softGray bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">Profil</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Item label="Nama" value={account.display_name || "—"} /><Item label="Email" value={account.email || "—"} /><Item label="Status" value={getAccountStatusLabel(account.account_status)} /><Item label="Undangan" value={account.invitation_status} /><Item label="Auth" value={account.auth_state} /><Item label="Login terakhir" value={date(account.last_login_at)} /><Item label="Dibuat" value={date(account.created_at)} /><Item label="Diperbarui" value={date(account.updated_at)} /></dl></section>

      <section id="akses" className="border border-brand-softGray bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">Akses Efektif</h2><p className="mt-2 text-sm text-brand-charcoal/60">{data.permissions.length} capability diberikan melalui role_permissions.</p><div className="mt-4 flex flex-wrap gap-2">{data.permissions.map((permission) => <span key={permission} className="rounded-full bg-brand-offWhite px-3 py-1.5 font-mono text-xs">{permission}</span>)}</div>{canManage && !protectedRole ? <form onSubmit={saveAccess} data-admin-mutation="true" className="mt-6 grid gap-4 border-t border-brand-softGray pt-6 sm:grid-cols-2"><label htmlFor="detail-role" className="text-sm font-semibold">Role<select id="detail-role" name="role" value={draft.role} onChange={(event) => { const role = event.target.value as ManageableAdminRole; setDraft((current) => ({ ...current, role, primaryStoreId: role === "store_admin" ? current.primaryStoreId : "", allStoreAccess: role !== "store_admin" })); }} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-3">{MANAGEABLE_ADMIN_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label><label htmlFor="detail-status" className="text-sm font-semibold">Status<select id="detail-status" name="account_status" value={draft.accountStatus} onChange={(event) => setDraft((current) => ({ ...current, accountStatus: event.target.value as AccountStatus }))} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-3">{ACCOUNT_STATUSES.map((status) => <option key={status} value={status}>{getAccountStatusLabel(status)}</option>)}</select></label><label htmlFor="detail-store" className="text-sm font-semibold">Scope Toko<select id="detail-store" name="primary_store_id" value={draft.primaryStoreId} disabled={draft.role !== "store_admin"} required={draft.role === "store_admin"} onChange={(event) => setDraft((current) => ({ ...current, primaryStoreId: event.target.value }))} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-3 disabled:opacity-60"><option value="">{draft.role === "store_admin" ? "Pilih toko" : "SEMUA TOKO"}</option>{data.stores.filter((store) => store.status_aktif).map((store) => <option key={store.id} value={store.id}>{store.nama_store}</option>)}</select></label><label htmlFor="detail-reason" className="text-sm font-semibold">Alasan<textarea id="detail-reason" name="reason" value={draft.reason} minLength={8} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} className="mt-2 min-h-20 w-full border border-brand-softGray px-3 py-2" required /></label><button type="submit" disabled={busy || account.id === actor.userId} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy ? "Menyimpan..." : "Simpan Role & Scope"}</button></form> : <AdminAlert type="info">{protectedRole ? "Akun Owner/Super Admin dilindungi dari perubahan melalui alur operasional ini." : "Anda tidak memiliki capability untuk mengubah akses."}</AdminAlert>}</section>

      <section id="sesi" className="border border-brand-softGray bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">Sesi</h2><p className="mt-3 text-sm text-brand-charcoal/65">{data.activeSessionPresent ? "Satu sesi canonical tercatat aktif." : "Tidak ada sesi canonical aktif."}</p><p className="mt-2 text-xs text-brand-charcoal/50">Token, refresh token, dan detail rahasia sesi tidak ditampilkan.</p></section>

      <section id="aktivitas" className="border border-brand-softGray bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">Aktivitas Append-only</h2>{data.activity.length ? <ol className="mt-4 grid gap-3">{data.activity.map((event) => <li key={event.id} className="border-l-2 border-brand-charcoal/20 pl-4"><p className="font-semibold">{event.action}</p><p className="mt-1 text-xs text-brand-charcoal/55">{date(event.created_at)} · {event.actor_role || "system"}</p>{event.reason ? <p className="mt-1 text-sm text-brand-charcoal/65">{event.reason}</p> : null}</li>)}</ol> : <p className="mt-4 text-sm text-brand-charcoal/60">Belum ada audit akun.</p>}</section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) { return <div className="bg-brand-offWhite p-4"><dt className="text-xs uppercase text-brand-charcoal/50">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
function date(value: string | null) { if (!value) return "—"; try { return formatAuditDate(value); } catch { return "—"; } }
