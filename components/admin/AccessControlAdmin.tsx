"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { phase13ApiFetch } from "@/lib/admin-phase13-api";
import {
  ACCOUNT_STATUSES,
  MANAGEABLE_ADMIN_ROLES,
  ROLE_LABELS,
  formatAuditDate,
  getAccountStatusLabel,
  getRoleLabel,
  hasPermission,
  type AdminAccountListItem,
  type ManageableAdminRole,
  type PermissionDefinition,
  type RolePermission
} from "@/lib/access-control";

type StoreOption = { id: string; nama_store: string; status_aktif: boolean };
type AccessResponse = {
  accounts: AdminAccountListItem[];
  definitions: PermissionDefinition[];
  rolePermissions: RolePermission[];
  stores: StoreOption[];
  actorRole: string;
  pagination: { page: number; pageSize: number; total: number; pages: number };
};

const EMPTY_INVITE = {
  displayName: "",
  email: "",
  role: "order_cs_admin" as ManageableAdminRole,
  primaryStoreId: "",
  reason: "Undangan akun operasional baru"
};

export function AccessControlAdmin() {
  const access = useAdminAccess();
  const canManage = hasPermission(access.permissions, "access_control.manage");
  const [data, setData] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState(EMPTY_INVITE);
  const [filters, setFilters] = useState({ q: "", role: "", status: "", store: "", page: 1 });

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    if (filters.q.trim()) query.set("q", filters.q.trim());
    if (filters.role) query.set("role", filters.role);
    if (filters.status) query.set("status", filters.status);
    if (filters.store) query.set("store", filters.store);
    query.set("page", String(filters.page));
    return query.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await phase13ApiFetch<AccessResponse>(`/api/admin/access-control?${queryString}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data akses gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => { void load(); }, [load]);

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("invite");
    setError("");
    setNotice("");
    try {
      const globalRole = invite.role !== "store_admin";
      await phase13ApiFetch("/api/admin/access-control", {
        method: "POST",
        body: JSON.stringify({
          ...invite,
          primaryStoreId: invite.primaryStoreId || null,
          allStoreAccess: globalRole
        })
      });
      setNotice("Undangan Admin berhasil dikirim dan profil TESTING telah disiapkan.");
      setInvite(EMPTY_INVITE);
      setShowInvite(false);
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Undangan belum dapat dikirim.");
    } finally {
      setBusyId("");
    }
  }

  async function accountAction(account: AdminAccountListItem, action: "resend_invitation" | "reset_password" | "revoke_sessions" | "disable" | "enable") {
    const labels = {
      resend_invitation: "kirim ulang undangan",
      reset_password: "inisiasi reset password",
      revoke_sessions: "cabut seluruh sesi",
      disable: "nonaktifkan akun",
      enable: "aktifkan kembali akun"
    } as const;
    const reason = window.prompt(`Alasan ${labels[action]} (minimal 8 karakter):`);
    if (!reason) return;
    setBusyId(account.id);
    setError("");
    setNotice("");
    try {
      const result = await phase13ApiFetch<{ message: string }>(`/api/admin/access-control/users/${account.id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action, reason })
      });
      setNotice(result.message);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Aksi akun belum dapat diproses.");
    } finally {
      setBusyId("");
    }
  }

  if (loading && !data) return <AdminLoadingState label="Memuat peran dan hak akses..." />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="AKUN ADMIN"
        title="Akun, Role, dan Scope"
        description="Satu direktori canonical untuk identitas Auth, profil Admin, role, scope toko, status, dan capability efektif."
        actions={canManage ? <button type="button" data-admin-mutation="true" onClick={() => setShowInvite((value) => !value)} className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Undang Akun</button> : undefined}
      />

      {error ? <AdminAlert type="error">{error}</AdminAlert> : null}
      {notice ? <AdminAlert type="success">{notice}</AdminAlert> : null}
      {!canManage ? <AdminAlert type="info">Mode lihat saja. Hanya Owner atau capability access_control.manage yang dapat mengubah akun.</AdminAlert> : null}

      {showInvite ? (
        <form onSubmit={sendInvite} className="grid gap-4 border border-brand-softGray bg-white p-5 sm:grid-cols-2 sm:p-6" data-admin-mutation="true">
          <div className="sm:col-span-2"><h2 className="text-xl font-semibold">Undang Akun Admin</h2><p className="mt-1 text-sm text-brand-charcoal/60">Undangan hanya dikirim setelah aksi Owner. Password dan token tidak pernah ditampilkan.</p></div>
          <Field label="Nama" id="invite-name"><input id="invite-name" name="display_name" value={invite.displayName} onChange={(event) => setInvite((current) => ({ ...current, displayName: event.target.value }))} className="mt-2 min-h-11 w-full border border-brand-softGray px-3" required /></Field>
          <Field label="Email" id="invite-email"><input id="invite-email" name="email" type="email" value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} className="mt-2 min-h-11 w-full border border-brand-softGray px-3" required /></Field>
          <Field label="Role" id="invite-role"><select id="invite-role" name="role" value={invite.role} onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value as ManageableAdminRole, primaryStoreId: event.target.value === "store_admin" ? current.primaryStoreId : "" }))} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-3">{MANAGEABLE_ADMIN_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></Field>
          <Field label="Scope Toko" id="invite-store"><select id="invite-store" name="primary_store_id" value={invite.primaryStoreId} onChange={(event) => setInvite((current) => ({ ...current, primaryStoreId: event.target.value }))} disabled={invite.role !== "store_admin"} required={invite.role === "store_admin"} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-3 disabled:opacity-60"><option value="">{invite.role === "store_admin" ? "Pilih toko" : "SEMUA TOKO"}</option>{data?.stores.map((store) => <option key={store.id} value={store.id}>{store.nama_store}</option>)}</select></Field>
          <Field label="Alasan" id="invite-reason" className="sm:col-span-2"><textarea id="invite-reason" name="reason" value={invite.reason} onChange={(event) => setInvite((current) => ({ ...current, reason: event.target.value }))} minLength={8} className="mt-2 min-h-24 w-full border border-brand-softGray px-3 py-2" required /></Field>
          <div className="flex gap-3 sm:col-span-2"><button type="submit" disabled={busyId === "invite"} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50">{busyId === "invite" ? "Mengirim..." : "Kirim Undangan"}</button><button type="button" onClick={() => setShowInvite(false)} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Batal</button></div>
        </form>
      ) : null}

      <section className="border border-brand-softGray bg-white p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-5">
          <label className="text-sm font-semibold lg:col-span-2">Cari<input name="account_search" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))} placeholder="Nama atau email" className="mt-2 min-h-11 w-full border border-brand-softGray px-3" /></label>
          <Filter label="Role" value={filters.role} onChange={(role) => setFilters((current) => ({ ...current, role, page: 1 }))}><option value="">Semua role</option>{MANAGEABLE_ADMIN_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</Filter>
          <Filter label="Status" value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status, page: 1 }))}><option value="">Semua status</option>{ACCOUNT_STATUSES.map((status) => <option key={status} value={status}>{getAccountStatusLabel(status)}</option>)}</Filter>
          <Filter label="Scope" value={filters.store} onChange={(store) => setFilters((current) => ({ ...current, store, page: 1 }))}><option value="">Semua scope</option>{data?.stores.map((store) => <option key={store.id} value={store.id}>{store.nama_store}</option>)}</Filter>
        </div>

        {(data?.accounts.length ?? 0) === 0 ? <div className="mt-6"><AdminEmptyState title="Belum ada profil staf" description="Tidak ada akun yang cocok dengan filter saat ini." /></div> : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[1120px] border-collapse text-left text-sm">
              <thead><tr className="border-y border-brand-softGray bg-brand-offWhite text-xs uppercase tracking-[0.1em] text-brand-charcoal/55"><th className="px-3 py-3">Nama / Email</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Scope</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Undangan</th><th className="px-3 py-3">Login Terakhir</th><th className="px-3 py-3">Dibuat</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
              <tbody>{data?.accounts.map((account) => <tr key={account.id} className="border-b border-brand-softGray align-top"><td className="px-3 py-4"><p className="font-semibold">{account.display_name || "Nama belum tersedia"}</p><p className="mt-1 text-xs text-brand-charcoal/55">{account.email || "Email tidak tersedia"}</p>{account.auth_state !== "linked" ? <p className="mt-1 text-xs font-semibold text-red-700">{account.auth_state === "missing_auth" ? "Profil tanpa Auth" : "Auth tanpa Profil"}</p> : null}</td><td className="px-3 py-4">{getRoleLabel(account.role)}</td><td className="px-3 py-4">{account.all_store_access ? "SEMUA TOKO" : account.store_name || "Belum lengkap"}</td><td className="px-3 py-4">{getAccountStatusLabel(account.account_status)}</td><td className="px-3 py-4">{account.invitation_status}</td><td className="px-3 py-4">{date(account.last_login_at)}</td><td className="px-3 py-4">{date(account.created_at)}</td><td className="px-3 py-4 text-right"><details className="relative inline-block text-left"><summary aria-label={`Buka aksi ${account.email || account.id}`} className="cursor-pointer list-none rounded-full border border-brand-softGray px-3 py-2 font-bold">•••</summary><div className="absolute right-0 z-20 mt-2 grid min-w-56 gap-1 border border-brand-softGray bg-white p-2 shadow-lg"><Link className="px-3 py-2 text-sm hover:bg-brand-offWhite" href={`/admin/access-control/${account.id}`}>Lihat Detail</Link>{canManage ? <><ActionButton onClick={() => void accountAction(account, "resend_invitation")} disabled={busyId === account.id}>Kirim Ulang Undangan</ActionButton><ActionButton onClick={() => void accountAction(account, "reset_password")} disabled={busyId === account.id}>Kirim Reset Password</ActionButton><ActionButton onClick={() => void accountAction(account, "revoke_sessions")} disabled={busyId === account.id}>Cabut Sesi</ActionButton><ActionButton onClick={() => void accountAction(account, account.account_status === "ACTIVE" ? "disable" : "enable")} disabled={busyId === account.id}>{account.account_status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan Kembali"}</ActionButton></> : null}<Link className="px-3 py-2 text-sm hover:bg-brand-offWhite" href={`/admin/access-control/${account.id}#aktivitas`}>Lihat Audit</Link></div></details></td></tr>)}</tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between text-sm"><p>{data?.pagination.total ?? 0} akun · halaman {data?.pagination.page ?? 1} dari {data?.pagination.pages ?? 1}</p><div className="flex gap-2"><button type="button" disabled={(data?.pagination.page ?? 1) <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} className="min-h-10 rounded-full border border-brand-softGray px-4 disabled:opacity-40">Sebelumnya</button><button type="button" disabled={(data?.pagination.page ?? 1) >= (data?.pagination.pages ?? 1)} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="min-h-10 rounded-full border border-brand-softGray px-4 disabled:opacity-40">Berikutnya</button></div></div>
      </section>

      <section className="border border-brand-softGray bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Matriks Terkunci</p>
        <h2 className="mt-2 text-2xl font-semibold">Hak Akses per Peran</h2>
        <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Capability efektif berasal dari role_permissions. Halaman ini tidak mengedit definisi permission.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{MANAGEABLE_ADMIN_ROLES.map((role) => { const count = data?.rolePermissions.filter((row) => row.role === role && row.granted).length ?? 0; return <div key={role} className="bg-brand-offWhite p-4"><p className="font-semibold">{ROLE_LABELS[role]}</p><p className="mt-1 text-sm text-brand-charcoal/60">{count} capability diberikan</p></div>; })}</div>
      </section>
    </div>
  );
}

function Field({ label, id, className = "", children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return <label htmlFor={id} className={`text-sm font-semibold ${className}`}>{label}{children}</label>;
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  const id = `account-filter-${label.toLowerCase()}`;
  return <label htmlFor={id} className="text-sm font-semibold">{label}<select id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-3">{children}</select></label>;
}

function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" data-admin-mutation="true" className="px-3 py-2 text-left text-sm hover:bg-brand-offWhite disabled:opacity-50" {...props}>{children}</button>;
}

function date(value: string | null) {
  if (!value) return "—";
  try { return formatAuditDate(value); } catch { return "—"; }
}
