"use client";

import type { MouseEvent, ReactNode, SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminHeader } from "./AdminHeader";
import { AdminGuestFullViewer } from "@/components/admin/AdminGuestFullViewer";
import { isAdminGuestFullViewerPath } from "@/lib/admin-full-viewer";
import { AdminAccessProvider } from "./AdminAccessContext";
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

      const token = data.session?.access_token;
      const response = await fetch(`/api/admin/session?path=${encodeURIComponent(pathname)}`, {
        cache: "no-store",
        headers: token ? { authorization: `Bearer ${token}` } : undefined
      });
      const session = await response.json().catch(() => ({})) as {
        role?: unknown;
        allowed?: boolean;
        home?: string;
        error?: string;
      };

      if (!active) return;

      if (!isAdminRole(session.role)) {
        setAccessError(session.error || "Akun ini tidak memiliki akses panel admin.");
        setChecking(false);
        return;
      }

      setRole(session.role);
      setChecking(false);
      if (!session.allowed) router.replace(session.home || getRoleHome(session.role));
    }

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [isLoginPage, pathname, router]);

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

  function blockReadOnlySubmit(event: SyntheticEvent<HTMLDivElement>) {
    if (role !== "admin_guest") return;
    event.preventDefault();
    event.stopPropagation();
  }

  function blockReadOnlyMutation(event: MouseEvent<HTMLDivElement>) {
    if (role !== "admin_guest") return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-admin-mutation="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
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
    <AdminAccessProvider role={role}>
      <div className="admin-shell-root" data-admin-read-only={role === "admin_guest"}>
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

        {role === "admin_guest" ? (
          <div className="admin-shell-read-only-banner" role="status">
            <span className="admin-shell-read-only-badge">MODE LIHAT SAJA</span>
            <p>Akun ini dapat melihat seluruh Panel Admin, tetapi tidak dapat melakukan perubahan.</p>
          </div>
        ) : null}

        <div
          className={`admin-shell-content ${
            legacyRoute ? "admin-shell-legacy" : "admin-shell-modern"
          }`}
          onSubmitCapture={blockReadOnlySubmit}
          onClickCapture={blockReadOnlyMutation}
        >
          {role === "admin_guest" && isAdminGuestFullViewerPath(pathname)
            ? <AdminGuestFullViewer pathname={pathname} />
            : children}
        </div>
      </div>
    </div>
    </AdminAccessProvider>
  );
}
