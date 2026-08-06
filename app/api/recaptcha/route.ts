import { NextResponse } from "next/server";
import { verifyRecaptchaToken } from "@/lib/recaptcha-server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { token?: string; action?: string } | null;
  if (!payload?.action) {
    return NextResponse.json({ success: false, message: "Permintaan tidak valid." }, { status: 400 });
  }
  const verification = await verifyRecaptchaToken(payload.token, payload.action);
  if (!verification.valid) {
    return NextResponse.json(
      { success: false, configured: verification.configured, message: verification.message },
      { status: verification.configured ? 403 : 503 }
    );
  }
  return NextResponse.json({ success: true, configured: verification.configured, score: verification.score });
}
