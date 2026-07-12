"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type Eligibility = {
  quotationStatus: string;
  hasPendingPricing: boolean;
  approvedVersionId: string | null;
  approvedMockupCount: number;
  existingOrderId: string | null;
};

export function OrderConversionManager() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function loadEligibility() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) return;

    const [quotationResult, mockupResult, orderResult] = await Promise.all([
      supabase
        .from("quotations")
        .select("status,has_pending_pricing,approved_version_id")
        .eq("id", quotationId)
        .maybeSingle(),
      supabase
        .from("mockup_sets")
        .select("id", { count: "exact", head: true })
        .eq("quotation_id", quotationId)
        .eq("status", "approved")
        .is("archived_at", null),
      supabase
        .from("orders")
        .select("id")
        .eq("quotation_id", quotationId)
        .maybeSingle()
    ]);

    if (quotationResult.error || !quotationResult.data) {
      setMessage("Kelayakan konversi pesanan belum dapat diperiksa.");
      return;
    }

    setEligibility({
      quotationStatus: String(quotationResult.data.status || ""),
      hasPendingPricing: Boolean(quotationResult.data.has_pending_pricing),
      approvedVersionId: quotationResult.data.approved_version_id || null,
      approvedMockupCount: mockupResult.count || 0,
      existingOrderId: orderResult.data?.id || null
    });
  }

  useEffect(() => {
    void loadEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  async function convert() {
    if (!quotationId || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    setMessage("");

    const { data, error } = await supabase.rpc("convert_quotation_to_order", {
      p_quotation_id: quotationId
    });

    setWorking(false);

    if (error || !data?.id) {
      const text = (error?.message || "").toLowerCase();
      if (text.includes("approved mockup")) {
        setMessage("Mockup wajib disetujui pelanggan sebelum menjadi pesanan.");
      } else if (text.includes("approved quotation version")) {
        setMessage("Versi penawaran terbaru belum tercatat sebagai versi yang disetujui.");
      } else if (text.includes("pending pricing")) {
        setMessage("Masih ada harga yang belum pasti.");
      } else if (text.includes("already been converted")) {
        setMessage("Penawaran ini sudah pernah dikonversi menjadi pesanan.");
      } else {
        setMessage("Penawaran belum berhasil dikonversi menjadi pesanan.");
      }
      await loadEligibility();
      return;
    }

    router.push(`/admin/orders/${data.id}`);
    router.refresh();
  }

  if (!eligibility) return null;

  if (eligibility.existingOrderId) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/admin/orders/${eligibility.existingOrderId}`)}
        className="inline-flex min-h-10 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
      >
        Buka Pesanan
      </button>
    );
  }

  const eligible =
    eligibility.quotationStatus === "approved" &&
    !eligibility.hasPendingPricing &&
    Boolean(eligibility.approvedVersionId) &&
    eligibility.approvedMockupCount > 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void convert()}
        disabled={!eligible || working}
        className="inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        {working ? "Membuat Pesanan..." : "Konversi Menjadi Pesanan"}
      </button>
      {message ? (
        <p className="max-w-sm text-right text-xs font-semibold text-red-700">
          {message}
        </p>
      ) : !eligible ? (
        <p className="max-w-sm text-right text-xs text-brand-charcoal/55">
          Penawaran dan mockup wajib disetujui, serta seluruh harga harus pasti.
        </p>
      ) : null}
    </div>
  );
}
