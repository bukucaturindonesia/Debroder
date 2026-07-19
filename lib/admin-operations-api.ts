import { createSupabaseClient } from "@/lib/supabase";

export async function operationsApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const client = createSupabaseClient();
  if (!client) throw new Error("Layanan data belum tersedia.");
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi admin telah berakhir.");
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      authorization: `Bearer ${token}`,
      ...init.headers
    }
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Operasi gagal diproses.");
  return payload;
}
