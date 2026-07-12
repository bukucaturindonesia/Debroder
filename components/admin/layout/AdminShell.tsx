"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import {
  getRoleHome,
  isAdminRole,
  isLegacyAdminRoute,
  roleCanAccessPath,
  type AdminRole
} from "./admin-navigation";
import { takeAdminFlash, type AdminFlash } from "./admin-flash";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname.startsWith("/admin/login");
  const [role, setRole] = useState<AdminRole | null>(null);
  const [checking, setChecking] = useState(!isLoginPage);
  const [accessError, setAccessError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flash, setFlash] = useState<AdminFlash | null>(null);

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    let active = true;

    async function verifyAccess() {
      setChecking(true);
      setAccessError("");

      const supabase = createSupabaseClient();
      if (!supabase) {
        if (active) {
          setAccessError("Supabase belum dikonfigurasi.");
          setChecking(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !profile || !isAdminRole(profile.role)) {
        setAccessError("Akun ini tidak memiliki akses panel admin.");
        setChecking(false);
        return;
      }

      setRole(profile.role);
      setChecking(false);
    }

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [isLoginPage, router]);

  useEffect(() => {
    if (!role || isLoginPage) return;
    if (!roleCanAccessPath(role, pathname)) {
      router.replace(getRoleHome(role));
    }
  }, [isLoginPage, pathname, role, router]);

  useEffect(() => {
    setMobileOpen(false);
    const nextFlash = takeAdminFlash();
    if (!nextFlash) return;

    setFlash(nextFlash);
    const timer = window.setTimeout(() => setFlash(null), 5000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  async function logout() {
    const supabase = createSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  if (isLoginPage) return children;

  if (checking) {
    return (
      <main className="min-h-screen bg-brand-offWhite p-6 text-brand-charcoal">
        <div className="mx-auto mt-24 max-w-lg border border-brand-softGray bg-white p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
            DEBRODER Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Memeriksa Akses</h1>
          <p className="mt-3 text-sm text-brand-charcoal/65">
            Mohon tunggu, sesi dan role admin sedang diverifikasi.
          </p>
        </div>
      </main>
    );
  }

  if (accessError || !role) {
    return (
      <main className="min-h-screen bg-brand-offWhite p-6 text-brand-charcoal">
        <div className="mx-auto mt-24 max-w-lg border border-brand-softGray bg-white p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
            DEBRODER Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Akses Ditolak</h1>
          <p className="mt-3 text-sm text-brand-charcoal/65">
            {accessError || "Role admin tidak dapat diverifikasi."}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white"
          >
            Kembali ke Login
          </button>
        </div>
      </main>
    );
  }

  const legacyRoute = isLegacyAdminRoute(pathname);

  return (
    <div className="admin-shell-root">
      <aside className="admin-shell-desktop-sidebar">
        <AdminSidebar role={role} onLogout={logout} />
      </aside>

      {mobileOpen ? (
        <div className="admin-shell-mobile-layer lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu admin"
            className="admin-shell-mobile-backdrop"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="admin-shell-mobile-sidebar">
            <AdminSidebar
              role={role}
              onNavigate={() => setMobileOpen(false)}
              onLogout={logout}
            />
          </aside>
        </div>
      ) : null}

      <div className="admin-shell-main">
        <AdminHeader
          role={role}
          onOpenMenu={() => setMobileOpen(true)}
          onLogout={logout}
        />

        {flash ? (
          <div
            role="status"
            className={`admin-shell-flash admin-shell-flash-${flash.type}`}
          >
            <p className="font-semibold">{flash.message}</p>
            <button
              type="button"
              onClick={() => setFlash(null)}
              className="ml-4 text-xs font-semibold underline"
            >
              Tutup
            </button>
          </div>
        ) : null}

        <div
          className={`admin-shell-content ${
            legacyRoute ? "admin-shell-legacy" : "admin-shell-modern"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
