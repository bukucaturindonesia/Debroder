"use client";

export async function customerRecaptchaToken(action: string) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey) return null;
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error("Verifikasi keamanan belum siap. Muat ulang halaman.");
  return new Promise<string>((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
    });
  });
}
