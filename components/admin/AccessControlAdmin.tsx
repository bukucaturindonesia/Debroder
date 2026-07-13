"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { phase13ApiFetch } from "@/lib/admin-phase13-api";
import {
  ADMIN_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  getRoleLabel,
  isAdminRole,
  isSuperAdminRole,
  type AdminProfile,
  type AdminRole,
  type PermissionDefinition,
  type RolePermission
} from "@/lib/access-control";

type RoleDraft = AdminRole | "viewer";

type AccessResponse = {
  profiles: AdminProfile[];
  definitions: PermissionDefinition[];
  rolePermissions: RolePermission[];
  actorRole: string;
};

export function AccessControlAdmin() {
  const [data, setData] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [draftRoles, setDraftRoles] = useState<Record<string, RoleDraft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await phase13ApiFetch<AccessResponse>("/api/admin/access-control");
      setData(payload);
      setDraftRoles(Object.fromEntries(payload.profiles.map((profile) => [profile.id, isAdminRole(profile.role) ? profile.role : "viewer"])));
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

  async function saveRole(profile: AdminProfile) {
    const role = draftRoles[profile.id];
    if (!role || role === profile.role) return;
    if (!isAdminRole(role)) {
      setError("Pilih role staf resmi sebelum menyimpan.");
      return;
    }
    setBusyId(profile.id);
    setError("");
    setNotice("");
    try {
      const payload = await phase13ApiFetch<{ profile: AdminProfile }>(
        `/api/admin/access-control/users/${profile.id}`,
        { method: "PATCH", body: JSON.stringify({ role }) }
      );
      setData((current) => current ? {
        ...current,
        profiles: current.profiles.map((item) => item.id === profile.id ? payload.profile : item)
      } : current);
      setNotice(`Role ${payload.profile.email || payload.profile.id} diperbarui menjadi ${getRoleLabel(payload.profile.role)}.`);
    } catch (saveError) {
      setDraftRoles((current) => ({ ...current, [profile.id]: isAdminRole(profile.role) ? profile.role : "viewer" }));
      setError(saveError instanceof Error ? saveError.message : "Role gagal diperbarui.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) return <AdminLoadingState label="Memuat role dan permission..." />;

  const canManage = isSuperAdminRole(data?.actorRole);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Phase 13"
        title="Role & Permission"
        description="Tetapkan role staf dan periksa matriks permission resmi v1.2. Perubahan role dicatat ke audit sistem."
      />

      {error ? <AdminAlert type="error">{error}</AdminAlert> : null}
      {notice ? <AdminAlert type="success">{notice}</AdminAlert> : null}
      {!canManage ? (
        <AdminAlert type="info">Mode baca saja. Hanya Super Admin yang dapat mengubah role pengguna.</AdminAlert>
      ) : null}

      <section className="border border-brand-softGray bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Pengguna</p>
            <h2 className="mt-2 text-2xl font-semibold">Penetapan Role</h2>
          </div>
          <p className="text-sm text-brand-charcoal/55">{data?.profiles.length ?? 0} profil terdaftar</p>
        </div>

        {(data?.profiles.length ?? 0) === 0 ? (
          <div className="mt-5"><AdminEmptyState title="Belum ada profil staf" description="Profil akan tampil setelah akun terhubung ke tabel profiles." /></div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-brand-softGray bg-brand-offWhite text-xs uppercase tracking-[0.12em] text-brand-charcoal/55">
                  <th className="px-4 py-3">Akun</th>
                  <th className="px-4 py-3">Role Saat Ini</th>
                  <th className="px-4 py-3">Role Baru</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data?.profiles.map((profile) => {
                  const draftRole = draftRoles[profile.id] || (isAdminRole(profile.role) ? profile.role : "viewer");
                  return (
                    <tr key={profile.id} className="border-b border-brand-softGray align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold">{profile.email || "Email tidak tersedia"}</p>
                        <p className="mt-1 font-mono text-xs text-brand-charcoal/45">{profile.id}</p>
                      </td>
                      <td className="px-4 py-4"><span className="rounded-full bg-brand-offWhite px-3 py-1.5 text-xs font-semibold">{getRoleLabel(profile.role)}</span></td>
                      <td className="px-4 py-4">
                        <select
                          value={draftRole}
                          disabled={!canManage || busyId === profile.id}
                          onChange={(event) => setDraftRoles((current) => ({ ...current, [profile.id]: event.target.value as RoleDraft }))}
                          className="min-h-11 min-w-56 border border-brand-softGray bg-white px-3 disabled:opacity-60"
                        >
                          {draftRole === "viewer" ? <option value="viewer" disabled>Viewer / belum staf</option> : null}
                          {ADMIN_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                        </select>
                        <p className="mt-2 max-w-sm text-xs leading-5 text-brand-charcoal/55">{isAdminRole(draftRole) ? ROLE_DESCRIPTIONS[draftRole] : "Akun belum memiliki role operasional v1.2."}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          disabled={!canManage || busyId === profile.id || draftRole === profile.role}
                          onClick={() => void saveRole(profile)}
                          className="inline-flex min-h-10 items-center rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busyId === profile.id ? "Menyimpan..." : "Simpan Role"}
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Matriks Terkunci</p>
          <h2 className="mt-2 text-2xl font-semibold">Permission per Role</h2>
          <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Matriks ini dibaca dari database. Perubahan permission dilakukan melalui migration yang terkontrol, bukan edit bebas di browser.</p>
        </div>

        {modules.map(([module, permissions]) => (
          <details key={module} className="border border-brand-softGray bg-white" open={module === "system" || module === "audit"}>
            <summary className="cursor-pointer p-5 font-semibold capitalize">{module} · {permissions.length} permission</summary>
            <div className="overflow-x-auto border-t border-brand-softGray">
              <table className="min-w-[980px] border-collapse text-xs">
                <thead><tr className="bg-brand-offWhite"><th className="sticky left-0 bg-brand-offWhite px-4 py-3 text-left">Permission</th>{ADMIN_ROLES.map((role) => <th key={role} className="px-3 py-3 text-center">{ROLE_LABELS[role]}</th>)}</tr></thead>
                <tbody>{permissions.map((permission) => (
                  <tr key={permission.permission_key} className="border-t border-brand-softGray">
                    <td className="sticky left-0 bg-white px-4 py-3"><p className="font-semibold">{permission.label}</p><p className="mt-1 font-mono text-[11px] text-brand-charcoal/45">{permission.permission_key}</p></td>
                    {ADMIN_ROLES.map((role) => <td key={role} className="px-3 py-3 text-center"><span aria-label={matrix.get(role)?.has(permission.permission_key) ? "Diizinkan" : "Tidak diizinkan"}>{matrix.get(role)?.has(permission.permission_key) ? "✓" : "—"}</span></td>)}
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
