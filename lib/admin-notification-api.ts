"use client";

import { createSupabaseClient } from "@/lib/supabase";

export async function notificationApiFetch<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const supabase = createSupabaseClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");

  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sesi admin tidak tersedia. Silakan login kembali.");

  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers
    }
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: unknown;
  } & T;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Operasi notifikasi gagal."
    );
  }

  return payload;
}
