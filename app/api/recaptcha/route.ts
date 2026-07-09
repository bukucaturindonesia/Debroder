import { NextResponse } from "next/server";

type RecaptchaResponse = {
  success?: boolean;
  score?: number;
  action?: string;
};

export async function POST(request: Request) {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ success: false, message: "Keamanan reCAPTCHA belum dikonfigurasi." }, { status: 503 });
    }
    return NextResponse.json({ success: true, configured: false });
  }

  let payload: { token?: string; action?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!payload.token || !payload.action) {
    return NextResponse.json({ success: false, message: "Token keamanan tidak tersedia." }, { status: 400 });
  }

  const body = new URLSearchParams({ secret, response: payload.token });
  const verification = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });
  const result = (await verification.json()) as RecaptchaResponse;
  const score = result.score ?? 0;
  const valid = result.success === true && result.action === payload.action && score >= 0.5;

  if (!valid) {
    return NextResponse.json({ success: false, message: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." }, { status: 403 });
  }

  return NextResponse.json({ success: true, score });
}
