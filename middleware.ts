import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminPath } from "@/components/admin/layout/admin-navigation";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-session";

type MiddlewareAccessContext = {
  account_status?: unknown;
  permissions?: unknown;
  role?: unknown;
  scope_complete?: unknown;
  session_valid?: unknown;
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin/login" || pathname === "/admin/change-password") return NextResponse.next();

  const token = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  if (!token) return redirectToLogin(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return forbidden("Layanan otorisasi belum tersedia.", "ADMIN_SERVICE_UNAVAILABLE", 503);

  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/rpc/admin_access_context_v1`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: "{}"
    });
  } catch {
    return forbidden("Layanan otorisasi belum tersedia.", "ADMIN_SERVICE_UNAVAILABLE", 503);
  }

  if (response.status === 401) return redirectToLogin(request);
  if (!response.ok) return forbidden("Profil Admin belum dapat diverifikasi.", "ADMIN_PROFILE_INCOMPLETE");

  const access = await response.json().catch(() => null) as MiddlewareAccessContext | null;
  if (!access || access.session_valid !== true) return redirectToLogin(request);
  if (!isEnabledStatus(access.account_status)) {
    return forbidden("Akun Admin sedang dinonaktifkan.", "ADMIN_ACCOUNT_DISABLED");
  }
  if (access.scope_complete !== true || typeof access.role !== "string") {
    return forbidden("Role atau scope Admin belum lengkap.", "ADMIN_PROFILE_INCOMPLETE");
  }

  const permissions = Array.isArray(access.permissions)
    ? access.permissions.filter((value): value is string => typeof value === "string")
    : [];
  if (access.role !== "admin_guest" && !canAccessAdminPath(pathname, permissions)) {
    return forbidden("Anda tidak memiliki akses ke halaman ini.", "ADMIN_ACCESS_DENIED");
  }

  const next = NextResponse.next();
  next.headers.set("cache-control", "private, no-store");
  return next;
}

function isEnabledStatus(value: unknown) {
  return value === "ACTIVE" || value === "TESTING";
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
  return response;
}

function forbidden(message: string, code: string, status = 403) {
  const safeMessage = escapeHtml(message);
  const safeCode = escapeHtml(code);
  return new NextResponse(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Akses Ditolak | DEBRODER Admin</title><style>body{margin:0;background:#f7f7f5;color:#151515;font:16px system-ui,sans-serif}.box{max-width:560px;margin:14vh auto;padding:32px;border:1px solid #ddd;background:#fff}small{letter-spacing:.14em;color:#666}h1{font-size:30px}a{display:inline-block;margin-top:18px;color:inherit;font-weight:700}</style></head><body><main class="box"><small>DEBRODER ADMIN · ${safeCode}</small><h1>${status} — Akses Ditolak</h1><p>${safeMessage}</p><a href="/admin/login">Kembali ke Login</a></main></body></html>`, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] || character);
}

export const config = {
  matcher: ["/admin/:path*"]
};
