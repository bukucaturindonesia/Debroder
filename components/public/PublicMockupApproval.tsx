"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type PublicPart = {
  id: string;
  name: string;
  position: string | null;
  is_required: boolean;
  status: string;
  customer_notes: string | null;
  file: {
    id: string;
    file_name: string;
    mime_type: string | null;
    version_number: number;
  } | null;
};

type PublicData = {
  mockup_set: {
    id: string;
    title: string;
    status: string;
    notes: string | null;
    expires_at: string;
  };
  quotation: {
    quotation_number: string;
    customer_name: string;
    company_name: string | null;
  };
  parts: PublicPart[];
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_customer: "Menunggu Persetujuan Anda",
  approved: "Sudah Disetujui",
  revision_requested: "Perubahan Diminta",
  preparing: "Sedang Direvisi",
  ready_for_review: "Siap Diperiksa"
};

export function PublicMockupApproval({ token }: { token: string }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [revisionPart, setRevisionPart] = useState<PublicPart | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setInvalid(true);
      return;
    }

    setLoading(true);
    const { data: result, error } = await supabase.rpc(
      "get_public_mockup_review",
      { p_token: token }
    );
    setLoading(false);

    if (error || !result) {
      setInvalid(true);
      return;
    }

    setData(result as PublicData);
    setInvalid(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const progress = useMemo(() => {
    const required = data?.parts.filter((part) => part.is_required) || [];
    const approved = required.filter((part) => part.status === "approved");
    return { total: required.length, approved: approved.length };
  }, [data]);

  async function submitDecision(
    part: PublicPart,
    decision: "approved" | "revision_requested",
    note?: string
  ) {
    const supabase = createSupabaseClient();
    if (!supabase || workingId) return;

    if (decision === "revision_requested" && !note?.trim()) {
      setMessage("Tuliskan perubahan yang diperlukan.");
      return;
    }

    setWorkingId(part.id);
    setMessage("");

    const { data: result, error } = await supabase.rpc(
      "submit_mockup_part_decision",
      {
        p_token: token,
        p_mockup_part_id: part.id,
        p_decision: decision,
        p_note: note?.trim() || null
      }
    );

    setWorkingId(null);

    if (error) {
      setMessage(
        "Keputusan belum berhasil disimpan. Tautan mungkin sudah berakhir atau bagian ini sudah diproses."
      );
      return;
    }

    setRevisionPart(null);
    setRevisionNote("");

    if (result?.mockup_status === "approved") {
      setMessage(
        "Terima kasih. Semua bagian wajib sudah disetujui dan desain siap dilanjutkan."
      );
    } else if (decision === "approved") {
      setMessage(`${part.name} berhasil disetujui.`);
    } else {
      setMessage(`Permintaan perubahan untuk ${part.name} berhasil dikirim.`);
    }

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-16 text-[#111]">
        <div className="mx-auto max-w-5xl">
          <p className="text-lg font-semibold">Memuat mockup desain...</p>
        </div>
      </main>
    );
  }

  if (invalid || !data) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-16 text-[#111]">
        <section className="mx-auto max-w-2xl border border-black/10 bg-white p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
            DEBRODER
          </p>
          <h1 className="mt-4 text-3xl font-semibold">
            Tautan tidak tersedia
          </h1>
          <p className="mt-4 leading-7 text-black/60">
            Tautan persetujuan mungkin sudah kedaluwarsa, dinonaktifkan, atau digantikan dengan tautan baru. Hubungi admin DEBRODER untuk mendapatkan tautan terbaru.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-[#111] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="border border-black/10 bg-white p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            DEBRODER · Persetujuan Desain
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold sm:text-5xl">
                {data.mockup_set.title}
              </h1>
              <p className="mt-4 max-w-3xl leading-7 text-black/60">
                Halo {data.quotation.customer_name}, periksa setiap bagian desain di bawah. Setujui bagian yang sudah sesuai atau kirim catatan perubahan pada bagian yang perlu direvisi.
              </p>
            </div>
            <div className="border border-black/10 bg-[#f7f7f5] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                Penawaran
              </p>
              <p className="mt-2 font-semibold">
                {data.quotation.quotation_number}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <InfoCard
            label="Status"
            value={
              STATUS_LABELS[data.mockup_set.status] || "Sedang Diproses"
            }
          />
          <InfoCard
            label="Bagian wajib disetujui"
            value={`${progress.approved} dari ${progress.total}`}
          />
          <InfoCard
            label="Tautan berlaku sampai"
            value={new Intl.DateTimeFormat("id-ID", {
              dateStyle: "medium",
              timeStyle: "short"
            }).format(new Date(data.mockup_set.expires_at))}
          />
        </section>

        {message ? (
          <div className="mt-5 border border-black/10 bg-white p-4 text-sm font-semibold">
            {message}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5">
          {data.parts.map((part) => (
            <article
              key={part.id}
              className="border border-black/10 bg-white p-5 sm:p-7"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold">{part.name}</h2>
                    <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold">
                      {part.is_required ? "Wajib" : "Opsional"}
                    </span>
                    <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold">
                      {STATUS_LABELS[part.status] || part.status}
                    </span>
                  </div>
                  {part.position ? (
                    <p className="mt-3 text-sm text-black/60">
                      Posisi: {part.position}
                    </p>
                  ) : null}
                  {part.customer_notes ? (
                    <p className="mt-3 border-l-2 border-black pl-4 text-sm leading-6 text-black/65">
                      Catatan terakhir: {part.customer_notes}
                    </p>
                  ) : null}

                  {part.file ? (
                    <div className="mt-5">
                      <p className="text-sm font-semibold">
                        {part.file.file_name} · Versi {part.file.version_number}
                      </p>
                      <a
                        href={`/api/public/mockup-file/${token}/${part.file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex min-h-11 items-center rounded-full border border-black px-5 text-sm font-semibold"
                      >
                        Buka File Desain
                      </a>
                    </div>
                  ) : (
                    <p className="mt-5 text-sm font-semibold text-amber-800">
                      File desain belum tersedia.
                    </p>
                  )}
                </div>

                {part.status === "awaiting_customer" ? (
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        void submitDecision(part, "approved")
                      }
                      disabled={Boolean(workingId)}
                      className="min-h-11 rounded-full bg-black px-6 text-sm font-semibold text-white disabled:opacity-45"
                    >
                      {workingId === part.id
                        ? "Menyimpan..."
                        : "Setujui Bagian Ini"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRevisionPart(part);
                        setRevisionNote("");
                        setMessage("");
                      }}
                      disabled={Boolean(workingId)}
                      className="min-h-11 rounded-full border border-black px-6 text-sm font-semibold disabled:opacity-45"
                    >
                      Minta Perubahan
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <footer className="mt-8 border-t border-black/10 py-6 text-sm leading-6 text-black/55">
          Persetujuan hanya berlaku untuk bagian dan versi file yang ditampilkan pada halaman ini.
        </footer>
      </div>

      {revisionPart ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 sm:p-8">
          <section className="mx-auto max-w-xl bg-white p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
              Permintaan Perubahan
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {revisionPart.name}
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/60">
              Jelaskan perubahan yang diperlukan secara jelas agar tim DEBRODER dapat memperbaikinya dengan tepat.
            </p>
            <textarea
              rows={6}
              value={revisionNote}
              onChange={(event) => setRevisionNote(event.target.value)}
              placeholder="Contoh: logo diperkecil dan digeser sedikit ke kiri"
              className="mt-5 w-full border border-black/20 px-4 py-3"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void submitDecision(
                    revisionPart,
                    "revision_requested",
                    revisionNote
                  )
                }
                disabled={Boolean(workingId)}
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {workingId ? "Mengirim..." : "Kirim Permintaan Perubahan"}
              </button>
              <button
                type="button"
                onClick={() => setRevisionPart(null)}
                disabled={Boolean(workingId)}
                className="rounded-full border border-black px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
