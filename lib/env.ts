export function getSiteUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (rawUrl) {
    return rawUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getWhatsAppNumber(): string | null {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "");
  return number && number.length >= 8 ? number : null;
}

export function getPublicSupabaseEnv():
  | { url: string; anonKey: string }
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getAdminSupabaseEnv():
  | { url: string; serviceRoleKey: string }
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

