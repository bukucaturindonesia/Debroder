import "server-only";

export type RecaptchaVerification = {
  configured: boolean;
  valid: boolean;
  message?: string;
  score?: number;
};

type RecaptchaResponse = {
  success?: boolean;
  score?: number;
  action?: string;
};

export async function verifyRecaptchaToken(
  token: string | null | undefined,
  action: string
): Promise<RecaptchaVerification> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? { configured: false, valid: false, message: "Keamanan reCAPTCHA belum dikonfigurasi." }
      : { configured: false, valid: true };
  }
  if (!token?.trim()) {
    return { configured: true, valid: false, message: "Token keamanan tidak tersedia." };
  }

  try {
    const body = new URLSearchParams({ secret, response: token.trim() });
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store"
    });
    if (!response.ok) {
      return { configured: true, valid: false, message: "Layanan verifikasi keamanan belum tersedia." };
    }
    const result = await response.json() as RecaptchaResponse;
    const score = result.score ?? 0;
    const valid = result.success === true && result.action === action && score >= 0.5;
    return valid
      ? { configured: true, valid: true, score }
      : { configured: true, valid: false, score, message: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." };
  } catch {
    return { configured: true, valid: false, message: "Layanan verifikasi keamanan belum tersedia." };
  }
}
