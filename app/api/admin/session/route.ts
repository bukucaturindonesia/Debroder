import { NextResponse } from "next/server";
import { canAccessAdminPath, getRoleHome } from "@/components/admin/layout/admin-navigation";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-session";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request);
    const pathname = safeAdminPath(new URL(request.url).searchParams.get("path"));
    const allowed = canAccessAdminPath(pathname, actor.permissions)
      || actor.role === "admin_guest";
    const response = NextResponse.json(
      {
        ...actor.access,
        allowed,
        home: getRoleHome(actor.role)
      },
      {
        status: allowed ? 200 : 403,
        headers: { "cache-control": "private, no-store" }
      }
    );

    const token = bearerToken(request);
    if (token) {
      response.cookies.set(ADMIN_ACCESS_COOKIE, token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/admin",
        maxAge: tokenMaxAge(token)
      });
    }
    return response;
  } catch (error) {
    const response = phase13ErrorResponse(error, request);
    const next = new NextResponse(response.body, response);
    if (response.status === 401 || response.status === 403) {
      next.cookies.set(ADMIN_ACCESS_COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
    }
    return next;
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, {
    headers: { "cache-control": "private, no-store" }
  });
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0
  });
  return response;
}

function safeAdminPath(value: string | null) {
  if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin/dashboard";
  }
  return value;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function tokenMaxAge(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) as { exp?: unknown };
    const remaining = typeof payload.exp === "number" ? Math.floor(payload.exp - Date.now() / 1000) : 300;
    return Math.max(60, Math.min(3600, remaining));
  } catch {
    return 300;
  }
}
