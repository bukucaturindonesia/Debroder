"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { phase13ApiFetch } from "@/lib/admin-phase13-api";
import {
  ACCOUNT_STATUSES,
  ASSIGNABLE_OPERATIONAL_ADMIN_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  canManageAdminAccounts,
  getRoleLabel,
  isAssignableOperationalAdminRole,
  isAdminRole,
  normalizeAccountStatus,
  type AccountStatus,
  type AdminProfile,
  type AdminRole,
  type AdminStore,
  type PermissionDefinition,
  type RolePermission
} from "@/lib/access-control";

type AccessResponse = {
  profiles: AdminProfile[];
  definitions: PermissionDefinition[];
  rolePermissions: RolePermission[];
  stores: AdminStore[];
  actorRole: string;
};

type AccountDraft = {
  role: AdminRole;
  accountStatus: AccountStatus;
  primaryStoreId: string;
  allStoreAccess: boolean;
  reason: string;
};

function draftFromProfile(profile: AdminProfile): AccountDraft {
  return {
    role: isAdminRole(profile.role) ? profile.role : "store_admin",
    accountStatus: normalizeAccountStatus(profile.account_status),
    primaryStoreId: profile.primary_store_id ?? "",
    allStoreAccess: profile.all_store_access === true,
    reason: ""
  };
}

function isProtectedProfile(profile: AdminProfile) {
  const email = profile.email?.toLowerCase() ?? "";
  return email === "fahmi@debroder.com" || profile.role === "owner" || profile.role === "superadmin" || profile.role === "super_admin";
}

export function AccessControlAdmin() {
  const [data, setData] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, AccountDraft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await phase13ApiFetch<AccessResponse>("/api/admin/access-control");
      setData(payload);
      setDrafts(Object.fromEntries(payload.profiles.map((profile) => [profile.id, draftFromProfile(profile)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data akses gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const matrix = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of data?.rolePermissions ?? []) {
      if (!row.granted) continue;
      const current = map.get(row.role) ?? new Set<string>();
      current.add(row.permission_key);
      map.set(row.role, current);
    }
    return map;
  }, [data?.rolePermissions]);

  const modules = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    for (const permission of data?.definitions ?? []) {
      const current = map.get(permission.module) ?? [];
      current.push(permission);
      map.set(permission.module, current);
    }
    return [...map.entries()];
  }, [data?.definitions]);

  function updateDraft(id: string, patch: Partial<AccountDraft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function saveAccount(profile: AdminProfile) {
    const draft = drafts[profile.id];
    if (!draft || isProtectedProfile(profile)) return;
    if (draft.reason.trim().length < 8) {
      setError("Isi alasan perubahan minimal 8 karakter.");
      return;
    }
    if (draft.role === "store_admin" && (!draft.primaryStoreId || draft.allStoreAccess)) {
      setError("Store Admin wajib memiliki tepat satu store dan tidak boleh memakai scope seluruh store.");
      return;
    }
    if (draft.role === "head_store" && (!draft.primaryStoreId || !draft.allStoreAccess)) {
      setError("Head Store wajib memakai Store Pettarani sebagai store utama dan scope seluruh store.");
      return;
    }

    setBusyId(profile.id);
    setError("");
    setNotice("");
    try {
      const payload = await phase13ApiFetch<{ profile: AdminProfile }>(
        `/api/admin/access-control/users/${profile.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: draft.role,
            accountStatus: draft.accountStatus,
            primaryStoreId: draft.primaryStoreId || null,
            allStoreAccess: draft.allStoreAccess,
            reason: draft.reason.trim()
          })
        }
      );
      setData((current) => current ? {
        ...current,
        profiles: current.profiles.map((item) => item.id === profile.id ? payload.profile : item)
      } : current);
      setDrafts((current) => ({ ...current, [profile.id]: draftFromProfile(payload.profile) }));
      setNotice(`Akses ${payload.profile.email || "pengguna"} berhasil diperbarui.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Akses akun belum dapat diperbarui.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) return <AdminLoadingState label="Memuat peran dan hak akses..." />;

  const canManage = canManageAdminAccounts(data?.actorRole);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="PENGGUNA & HAK AKSES"
        title="Peran dan Hak Akses"
        description="Kelola role, lifecycle, dan scope store. Akun TESTING dan ACTIVE dapat login; SUSPENDED, INACTIVE, dan LOCKED ditolak server."
      />

      {error ? <AdminAlert type="error">{error}</AdminAlert> : null}
      {notice ? <AdminAlert type="success">{notice}</AdminAlert> : null}
      {!canManage ? <AdminAlert type="info">Mode lihat saja. Hanya Owner atau Super Admin yang dapat mengubah akun.</AdminAlert> : null}

      <section className="border border-brand-softGray bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Akun personal</p>
            <h2 className="mt-2 text-2xl font-semibold">Role, Status, dan Scope</h2>
          </div>
          <p className="text-sm text-brand-charcoal/55">{data?.profiles.length ?? 0} profil terdaftar</p>
        </div>

        {(data?.profiles.length ?? 0) === 0 ? (
          <div className="mt-5"><AdminEmptyState title="Belum ada profil staf" description="Jalankan bootstrap akun setelah migration diterapkan." /></div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1320px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-brand-softGray bg-brand-offWhite text-xs uppercase tracking-[0.12em] text-brand-charcoal/55">
                  <th className="px-4 py-3">Akun</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Store utama</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Keamanan</th>
                  <th className="px-4 py-3">Alasan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data?.profiles.map((profile) => {
                  const draft = drafts[profile.id] ?? draftFromProfile(profile);
                  const protectedProfile = isProtectedProfile(profile);
                  const disabled = !canManage || protectedProfile || busyId === profile.id;
                  return (
                    <tr key={profile.id} className="border-b border-brand-softGray align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold">{profile.display_name || profile.email || "Email tidak tersedia"}</p>
                        <p className="mt-1 text-xs text-brand-charcoal/55">{profile.email}</p>
                        {protectedProfile ? <p className="mt-2 text-xs font-semibold text-amber-700">Akun dilindungi</p> : null}
                      </td>
                      <td className="px-4 py-4">
                        <select value={draft.role} disabled={disabled} onChange={(event) => updateDraft(profile.id, { role: event.target.value as AdminRole })} className="min-h-11 min-w-56 border border-brand-softGray bg-white px-3 disabled:opacity-60">
                          {isAdminRole(profile.role) && (protectedProfile || !isAssignableOperationalAdminRole(profile.role)) ? (
                            <option value={profile.role}>{protectedProfile ? getRoleLabel(profile.role) : `Legacy — ${getRoleLabel(profile.role)}`}</option>
                          ) : null}
                          {!protectedProfile ? ASSIGNABLE_OPERATIONAL_ADMIN_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>) : null}
                        </select>
                        <p className="mt-2 max-w-xs text-xs leading-5 text-brand-charcoal/55">{isAdminRole(draft.role) ? ROLE_DESCRIPTIONS[draft.role] : "Role tidak dikenali."}</p>
                      </td>
                      <td className="px-4 py-4">
                        <select value={draft.accountStatus} disabled={disabled} onChange={(event) => updateDraft(profile.id, { accountStatus: event.target.value as AccountStatus })} className="min-h-11 min-w-36 border border-brand-softGray bg-white px-3 disabled:opacity-60">
                          {ACCOUNT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <select value={draft.primaryStoreId} disabled={disabled} onChange={(event) => updateDraft(profile.id, { primaryStoreId: event.target.value })} className="min-h-11 min-w-48 border border-brand-softGray bg-white px-3 disabled:opacity-60">
                          <option value="">Tanpa store utama</option>
                          {data?.stores.map((store) => <option key={store.id} value={store.id}>{store.nama_store}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={draft.allStoreAccess} disabled={disabled} onChange={(event) => updateDraft(profile.id, { allStoreAccess: event.target.checked })} />
                          <span>Seluruh store</span>
                        </label>
                      </td>
                      <td className="px-4 py-4 text-xs leading-5">
                        <p>{profile.active_session_id ? "Sesi aktif terdaftar" : "Belum ada sesi aktif"}</p>
                        <p className="mt-1 text-brand-charcoal/50">Versi sesi: {profile.session_version ?? 0}</p>
                      </td>
                      <td className="px-4 py-4">
                        <textarea value={draft.reason} disabled={disabled} onChange={(event) => updateDraft(profile.id, { reason: event.target.value })} placeholder="Alasan perubahan..." rows={3} className="min-w-64 border border-brand-softGray bg-white p-3 disabled:opacity-60" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button type="button" disabled={disabled || draft.reason.trim().length < 8} onClick={() => void saveAccount(profile)} className="inline-flex min-h-10 items-center rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                          {busyId === profile.id ? "Menyimpan..." : "Simpan Akses"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="border border-brand-softGray bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Matriks terkunci</p>
          <h2 className="mt-2 text-2xl font-semibold">Hak Akses per Peran</h2>
          <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Matriks ini read-only. Perubahan permission dilakukan melalui migration yang direview, bukan toggle bebas.</p>
        </div>
        {modules.map(([module, permissions]) => (
          <details key={module} className="border border-brand-softGray bg-white" open={module === "system" || module === "order"}>
            <summary className="cursor-pointer p-5 font-semibold capitalize">{module} · {permissions.length} hak akses</summary>
            <div className="overflow-x-auto border-t border-brand-softGray">
              <table className="min-w-[980px] border-collapse text-xs">
                <thead><tr className="bg-brand-offWhite"><th className="sticky left-0 bg-brand-offWhite px-4 py-3 text-left">Hak Akses</th>{ASSIGNABLE_OPERATIONAL_ADMIN_ROLES.map((role) => <th key={role} className="px-3 py-3 text-center">{ROLE_LABELS[role]}</th>)}</tr></thead>
                <tbody>{permissions.map((permission) => (
                  <tr key={permission.permission_key} className="border-t border-brand-softGray">
                    <td className="sticky left-0 bg-white px-4 py-3"><p className="font-semibold">{permission.label}</p><p className="mt-1 font-mono text-[11px] text-brand-charcoal/45">{permission.permission_key}</p></td>
                    {ASSIGNABLE_OPERATIONAL_ADMIN_ROLES.map((role) => <td key={role} className="px-3 py-3 text-center">{matrix.get(role)?.has(permission.permission_key) ? "✓" : "—"}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
