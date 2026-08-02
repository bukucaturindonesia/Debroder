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
  isAdminRole,
  isLegacyAdminRoute,
  type AdminRole
} from "./admin-navigation";
import { isAccountStatus, type AdminAccessSnapshot } from "@/lib/access-control";
import { takeAdminFlash, type AdminFlash } from "./admin-flash";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/change-password");
  const [access, setAccess] = useState<AdminAccessSnapshot | null>(null);
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
          setAccessError("Layanan data belum tersedia. Hubungi pengelola sistem.");
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
      const session = await response.json().catch(() => ({})) as Partial<AdminAccessSnapshot> & {
        allowed?: boolean;
        home?: string;
        error?: string;
      };

      if (!active) return;
      const allowed = session.allowed;
      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      if (!isAdminAccess(session)) {
        setAccessError(session.error || "Akun ini tidak memiliki akses panel admin.");
        setChecking(false);
        return;
      }

      setAccess(session);
      setChecking(false);
      if (!allowed) {
        setAccessError("403 — Anda tidak memiliki akses ke halaman ini.");
      }
    }

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [isLoginPage, pathname, router]);

  useEffect(() => {
    if (isLoginPage) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "TOKEN_REFRESHED" || !session?.access_token) return;
      window.setTimeout(() => {
        void fetch(`/api/admin/session?path=${encodeURIComponent(pathname)}`, {
          cache: "no-store",
          headers: { authorization: `Bearer ${session.access_token}` }
        }).then((response) => {
          if (response.status === 401 || response.status === 403) router.refresh();
        });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [isLoginPage, pathname, router]);

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
    await fetch("/api/admin/session", { method: "DELETE", cache: "no-store" }).catch(() => undefined);
    if (supabase) await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  function blockReadOnlySubmit(event: SyntheticEvent<HTMLDivElement>) {
    if (access?.role !== "admin_guest") return;
    event.preventDefault();
    event.stopPropagation();
  }

  function blockReadOnlyMutation(event: MouseEvent<HTMLDivElement>) {
    if (access?.role !== "admin_guest") return;
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

  if (accessError || !access) {
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
  const globalDashboardRoute = pathname === "/admin" || pathname === "/admin/dashboard";

  const role: AdminRole = access.role;

  return (
    <AdminAccessProvider access={access}>
      <div
        className="admin-shell-root"
        data-admin-read-only={role === "admin_guest"}
        data-global-dashboard={globalDashboardRoute ? "true" : "false"}
      >
      <aside className="admin-shell-desktop-sidebar">
        <AdminSidebar access={access} onLogout={logout} />
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
              access={access}
              onNavigate={() => setMobileOpen(false)}
              onLogout={logout}
            />
          </aside>
        </div>
      ) : null}

      <div className="admin-shell-main">
        <AdminHeader
          access={access}
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

function isAdminAccess(value: Partial<AdminAccessSnapshot>): value is AdminAccessSnapshot {
  return typeof value.userId === "string"
    && typeof value.displayName === "string"
    && isAdminRole(value.role)
    && typeof value.roleLabel === "string"
    && isAccountStatus(value.accountStatus)
    && (value.primaryStoreId === null || typeof value.primaryStoreId === "string")
    && (value.primaryStoreName === null || typeof value.primaryStoreName === "string")
    && typeof value.allStoreAccess === "boolean"
    && typeof value.scopeLabel === "string"
    && Array.isArray(value.permissions)
    && typeof value.readOnly === "boolean";
}
