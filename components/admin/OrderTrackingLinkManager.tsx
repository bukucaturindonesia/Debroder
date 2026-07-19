"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { formatAdminOrderDateTime } from "@/lib/admin-order-detail";

type LinkResult = {
  publicUrl: string;
  expiresAt: string;
  whatsappMessage: string;
  whatsappUrl: string | null;
};

export function OrderTrackingLinkManager({ orderId }: { orderId: string }) {
  const [result, setResult] = useState<LinkResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  async function rotate() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setCopied(null);
    try {
      const client = createSupabaseClient();
      if (!client) throw new Error("Layanan data belum tersedia. Hubungi pengelola sistem.");
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sesi Admin tidak aktif. Silakan login ulang.");
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/tracking-link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json() as LinkResult & { error?: string };
      if (!response.ok) throw new Error("Tautan pelacakan belum dapat dibuat. Coba lagi.");
      setResult(payload);
      setMessage("Tautan baru aktif. Tautan tracking sebelumnya sudah tidak berlaku.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Tautan tracking gagal dibuat.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, kind: "link" | "message") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setMessage("Browser tidak mengizinkan salin otomatis. Pilih teks lalu salin manual.");
    }
  }

  return (
    <section className="border border-brand-softGray bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Guest Tracking</p>
          <h2 className="mt-2 text-2xl font-semibold">Tautan Tracking Pelanggan</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/60">Buat atau rotasi tautan aman untuk dikirim manual melalui WhatsApp. Hanya hash token yang disimpan.</p>
        </div>
        <button type="button" onClick={() => void rotate()} disabled={busy} className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Membuat..." : "Buat / Rotasi Tautan"}
        </button>
      </div>

      {message ? <div className="mt-5 border border-brand-softGray bg-brand-offWhite p-4 text-sm font-semibold">{message}</div> : null}
      {result ? (
        <div className="mt-5 grid gap-4 border border-brand-softGray p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">Berlaku sampai</p>
            <p className="mt-1 text-sm font-semibold">{dateTime(result.expiresAt)}</p>
          </div>
          <div className="break-all bg-brand-offWhite p-3 text-xs">{result.publicUrl}</div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void copy(result.publicUrl, "link")} className="min-h-10 rounded-full border border-brand-charcoal px-4 text-sm font-semibold">{copied === "link" ? "Tautan Tersalin" : "Salin Tautan"}</button>
            <button type="button" onClick={() => void copy(result.whatsappMessage, "message")} className="min-h-10 rounded-full border border-brand-charcoal px-4 text-sm font-semibold">{copied === "message" ? "Template Tersalin" : "Salin Template WhatsApp"}</button>
            {result.whatsappUrl ? <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full bg-[#063d24] px-4 text-sm font-semibold text-white">Buka WhatsApp</a> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function dateTime(value: string) {
  return formatAdminOrderDateTime(value, { fallback: "-", timeZone: "Asia/Makassar" });
}
