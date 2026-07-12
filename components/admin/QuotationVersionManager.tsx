"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type VersionRow = {
  id: string;
  quotation_id: string;
  version_number: number;
  version_status: string;
  snapshot: {
    quotation?: Record<string, unknown>;
    items?: Array<Record<string, unknown>>;
  };
  change_note: string | null;
  created_by: string | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
};

type QuotationMeta = {
  status: string;
  current_version: number;
  latest_version_id: string | null;
  sent_version_id: string | null;
  approved_version_id: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Terkirim",
  revision_requested: "Minta Revisi",
  approved: "Disetujui",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
  superseded: "Digantikan"
};

function date(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function money(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

function countItems(snapshot: VersionRow["snapshot"]) {
  return Array.isArray(snapshot?.items) ? snapshot.items.length : 0;
}

function countServices(snapshot: VersionRow["snapshot"]) {
  if (!Array.isArray(snapshot?.items)) return 0;
  return snapshot.items.reduce((total, item) => {
    const services = item.services;
    return total + (Array.isArray(services) ? services.length : 0);
  }, 0);
}

export function QuotationVersionManager() {
  const params = useParams<{ id?: string | string[] }>();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [meta, setMeta] = useState<QuotationMeta | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<VersionRow | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function loadVersions() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [quotationResult, versionResult] = await Promise.all([
      supabase
        .from("quotations")
        .select("status,current_version,latest_version_id,sent_version_id,approved_version_id")
        .eq("id", quotationId)
        .maybeSingle(),
      supabase
        .from("quotation_versions")
        .select("id,quotation_id,version_number,version_status,snapshot,change_note,created_by,sent_at,approved_at,created_at")
        .eq("quotation_id", quotationId)
        .order("version_number", { ascending: false })
    ]);

    setLoading(false);

    if (quotationResult.error || versionResult.error || !quotationResult.data) {
      setMessage("Riwayat versi quotation belum berhasil dimuat.");
      return;
    }

    setMeta(quotationResult.data as QuotationMeta);
    const nextVersions = (versionResult.data || []) as VersionRow[];
    setVersions(nextVersions);
    setSelected((current) => {
      if (current) {
        return nextVersions.find((item) => item.id === current.id) || null;
      }
      return nextVersions[0] || null;
    });
  }

  useEffect(() => {
    void loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  async function createRevision() {
    if (!meta || meta.status !== "revision_requested" || working) return;

    if (!revisionNote.trim()) {
      setMessage("Catatan revisi wajib diisi.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc("create_quotation_revision", {
      p_quotation_id: quotationId,
      p_note: revisionNote.trim()
    });

    setWorking(false);

    if (error) {
      setMessage("Versi revisi gagal dibuat.");
      return;
    }

    setRevisionNote("");
    setMessage("Versi revisi baru berhasil dibuat dan quotation kembali menjadi Draft.");
    await loadVersions();
    window.location.reload();
  }

  if (loading || !meta) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold opacity-50"
      >
        Memuat versi...
      </button>
    );
  }

  const currentSnapshot = selected?.snapshot?.quotation || {};

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold transition hover:border-brand-charcoal"
      >
        Versi v{meta.current_version}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[92] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <section className="mx-auto max-w-6xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <header className="flex flex-col gap-5 border-b border-brand-softGray bg-white p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  v1.2 · Phase 2
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Versioning Quotation</h2>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
                  Setiap versi terkirim disimpan sebagai snapshot yang tidak dapat ditimpa atau dihapus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={working}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                aria-label="Tutup"
              >
                ×
              </button>
            </header>

            <div className="grid gap-6 p-5 lg:grid-cols-[320px_minmax(0,1fr)] sm:p-7">
              <aside className="grid content-start gap-3">
                <div className="border border-brand-softGray bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                    Versi Aktif
                  </p>
                  <p className="mt-2 text-2xl font-semibold">v{meta.current_version}</p>
                  <p className="mt-1 text-sm text-brand-charcoal/60">
                    Status quotation: {meta.status}
                  </p>
                </div>

                {versions.length ? (
                  versions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => setSelected(version)}
                      className={`border p-4 text-left transition ${
                        selected?.id === version.id
                          ? "border-brand-charcoal bg-brand-charcoal text-white"
                          : "border-brand-softGray bg-white hover:border-brand-charcoal"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">Versi {version.version_number}</span>
                        <span className="text-xs font-semibold">
                          {STATUS_LABELS[version.version_status] || version.version_status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs opacity-70">{date(version.created_at)}</p>
                    </button>
                  ))
                ) : (
                  <div className="border border-dashed border-brand-softGray bg-white p-6 text-center">
                    <p className="font-semibold">Belum ada snapshot versi</p>
                    <p className="mt-2 text-sm text-brand-charcoal/60">
                      Snapshot pertama dibuat otomatis ketika quotation ditandai Terkirim.
                    </p>
                  </div>
                )}
              </aside>

              <div className="grid content-start gap-5">
                {message ? (
                  <div className="border border-brand-softGray bg-white p-4 text-sm font-semibold">
                    {message}
                  </div>
                ) : null}

                {meta.status === "revision_requested" ? (
                  <section className="border border-amber-200 bg-amber-50 p-5">
                    <h3 className="text-xl font-semibold text-amber-900">
                      Buat versi revisi baru
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-amber-900/80">
                      Versi sebelumnya tetap tersimpan. Quotation akan kembali menjadi Draft agar data dapat diedit.
                    </p>
                    <textarea
                      rows={4}
                      value={revisionNote}
                      onChange={(event) => setRevisionNote(event.target.value)}
                      placeholder="Jelaskan perubahan yang diminta pelanggan"
                      className="mt-4 w-full rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void createRevision()}
                      disabled={working}
                      className="mt-4 rounded-full bg-amber-800 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {working ? "Membuat Versi..." : "Buat Versi Revisi"}
                    </button>
                  </section>
                ) : null}

                {selected ? (
                  <>
                    <section className="border border-brand-softGray bg-white p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                            Snapshot
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold">
                            Versi {selected.version_number}
                          </h3>
                          <p className="mt-2 text-sm text-brand-charcoal/60">
                            {selected.change_note || "Tanpa catatan versi"}
                          </p>
                        </div>
                        <span className="w-fit rounded-full border border-brand-softGray px-3 py-1.5 text-xs font-semibold">
                          {STATUS_LABELS[selected.version_status] || selected.version_status}
                        </span>
                      </div>

                      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Info label="Dibuat" value={date(selected.created_at)} />
                        <Info label="Terkirim" value={date(selected.sent_at)} />
                        <Info label="Disetujui" value={date(selected.approved_at)} />
                        <Info label="Dibuat oleh" value={selected.created_by || "-"} />
                      </dl>
                    </section>

                    <section className="border border-brand-softGray bg-white p-5 sm:p-6">
                      <h3 className="text-xl font-semibold">Ringkasan Versi</h3>
                      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Info label="Pelanggan" value={String(currentSnapshot.customer_name || "-")} />
                        <Info label="Produk" value={`${countItems(selected.snapshot)} item`} />
                        <Info label="Layanan" value={`${countServices(selected.snapshot)} layanan`} />
                        <Info
                          label="Total"
                          value={money(
                            currentSnapshot.confirmed_total ??
                              currentSnapshot.estimated_total
                          )}
                        />
                      </dl>
                    </section>

                    <section className="border border-brand-softGray bg-white p-5 sm:p-6">
                      <h3 className="text-xl font-semibold">Item pada Versi Ini</h3>
                      {Array.isArray(selected.snapshot.items) &&
                      selected.snapshot.items.length ? (
                        <div className="mt-5 divide-y divide-brand-softGray border-y border-brand-softGray">
                          {selected.snapshot.items.map((item, index) => {
                            const services = Array.isArray(item.services)
                              ? item.services
                              : [];
                            return (
                              <article key={`${selected.id}-${index}`} className="py-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="font-semibold">
                                      {String(item.product_name_snapshot || "Produk")}
                                    </p>
                                    <p className="mt-1 text-sm text-brand-charcoal/60">
                                      {[
                                        item.color_name_snapshot ||
                                          item.variant_name_snapshot,
                                        item.size_name_snapshot,
                                        `${String(item.quantity || 0)} pcs`
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                    {services.length ? (
                                      <p className="mt-2 text-xs font-semibold text-brand-charcoal/55">
                                        {services.length} layanan tersimpan
                                      </p>
                                    ) : null}
                                  </div>
                                  <p className="font-semibold">
                                    {money(item.subtotal)}
                                  </p>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-brand-charcoal/60">
                          Tidak ada item pada snapshot ini.
                        </p>
                      )}
                    </section>
                  </>
                ) : (
                  <div className="border border-dashed border-brand-softGray bg-white p-8 text-center">
                    <p className="font-semibold">Belum ada versi untuk ditampilkan</p>
                  </div>
                )}

                <div className="border border-brand-softGray bg-white p-4 text-sm leading-6 text-brand-charcoal/60">
                  Versi historis tidak memiliki tombol Edit, Arsipkan, atau Hapus karena merupakan dokumen audit yang immutable. Revisi selalu dibuat sebagai versi baru.
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold">{value}</dd>
    </div>
  );
}
