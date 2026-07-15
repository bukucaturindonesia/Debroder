"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { createSupabaseClient } from "@/lib/supabase";

type ViewerResource = {
  label: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  unavailable: boolean;
};

type ViewerPayload = {
  pathname: string;
  eyebrow: string;
  title: string;
  description: string;
  resources: ViewerResource[];
};

export function AdminGuestFullViewer({ pathname }: { pathname: string }) {
  const [payload, setPayload] = useState<ViewerPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setError("");
      const supabase = createSupabaseClient();
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) throw new Error("Sesi Admin Guest tidak tersedia.");

      const response = await fetch(`/api/admin/full-viewer?path=${encodeURIComponent(pathname)}`, {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` }
      });
      const body = await response.json().catch(() => ({})) as ViewerPayload & { error?: string };
      if (!response.ok) throw new Error(body.error || "Panel read-only gagal dimuat.");
      if (active) setPayload(body);
    }

    void load().catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Panel read-only gagal dimuat.");
    });

    return () => { active = false; };
  }, [pathname]);

  const totalRows = useMemo(
    () => payload?.resources.reduce((sum, resource) => sum + resource.rows.length, 0) ?? 0,
    [payload]
  );

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow={payload?.eyebrow || "ADMIN GUEST"}
        title={payload?.title || "Memuat Panel Read-Only"}
        description={payload?.description || "Data aman sedang dimuat dalam mode lihat saja."}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Summary label="Mode" value="Lihat saja" />
        <Summary label="Kelompok data" value={payload ? String(payload.resources.length) : "—"} />
        <Summary label="Baris ditampilkan" value={payload ? String(totalRows) : "—"} />
      </section>

      {error ? (
        <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {!payload && !error ? (
        <div className="border border-brand-softGray bg-white p-6 text-sm text-brand-charcoal/60">
          Memuat data panel yang sudah disanitasi…
        </div>
      ) : null}

      {payload?.resources.map((resource) => (
        <ViewerTable key={`${payload.pathname}:${resource.label}`} resource={resource} />
      ))}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-brand-softGray bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function ViewerTable({ resource }: { resource: ViewerResource }) {
  const visibleColumns = resource.columns.filter((column) =>
    resource.rows.some((row) => Object.prototype.hasOwnProperty.call(row, column))
  );

  return (
    <section className="border border-brand-softGray bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-green">READ-ONLY DATA</p>
          <h2 className="mt-2 text-xl font-semibold">{resource.label}</h2>
        </div>
        <span className="rounded-full bg-brand-offWhite px-3 py-2 text-xs font-semibold text-brand-charcoal/60">
          {resource.rows.length} baris
        </span>
      </div>

      {resource.unavailable ? (
        <p className="mt-4 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Data ini tidak tersedia untuk tampilan saat ini. Tidak ada fallback ke data privat.
        </p>
      ) : resource.rows.length === 0 ? (
        <p className="mt-4 border border-brand-softGray bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">
          Belum ada data untuk ditampilkan.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-softGray text-xs uppercase tracking-[0.12em] text-brand-charcoal/45">
                {visibleColumns.map((column) => <th key={column} className="p-3">{humanize(column)}</th>)}
              </tr>
            </thead>
            <tbody>
              {resource.rows.map((row, rowIndex) => (
                <tr key={String(row.id || `${resource.label}-${rowIndex}`)} className="border-b border-brand-softGray/70 align-top">
                  {visibleColumns.map((column) => (
                    <td key={column} className="max-w-[320px] p-3 text-brand-charcoal/75">
                      {formatValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return new Intl.NumberFormat("id-ID").format(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}t/i.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(date);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
