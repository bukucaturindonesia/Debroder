"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type StoreOption = {
  id: string;
  name: string | null;
  nama_store: string | null;
  alamat: string | null;
};

type Eligibility = {
  quotationStatus: string;
  hasPendingPricing: boolean;
  approvedVersionId: string | null;
  confirmedTotal: number | null;
  approvedMockupCount: number;
  existingOrderId: string | null;
  customerId: string | null;
  customerName: string;
  companyName: string | null;
  customerPhone: string;
  customerEmail: string | null;
  billingAddress: string | null;
};

const fieldClassName =
  "mt-1 min-h-10 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-brand-charcoal outline-none focus:border-brand-green";

export function OrderConversionManager() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);
  const conversionKey = useMemo(
    () => `quotation-conversion-${quotationId}`,
    [quotationId]
  );

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [resolvedPrice, setResolvedPrice] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [confirmCustomerIdentity, setConfirmCustomerIdentity] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function loadEligibility() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) return;

    const [quotationResult, mockupResult, orderResult, storeResult] =
      await Promise.all([
        supabase
          .from("quotations")
          .select(
            "status,has_pending_pricing,approved_version_id,confirmed_total,customer_id,customer_name,company_name,customer_phone,customer_email,billing_address"
          )
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
          .maybeSingle(),
        supabase
          .from("stores")
          .select("id,name,nama_store,alamat")
          .eq("status_aktif", true)
          .in("status", ["published", "active"])
          .is("archived_at", null)
          .order("nama_store", { ascending: true })
      ]);

    if (quotationResult.error || !quotationResult.data) {
      setMessage("Kelayakan konversi pesanan belum dapat diperiksa.");
      return;
    }

    const quotation = quotationResult.data;
    setStores((storeResult.data as StoreOption[] | null) || []);
    setEligibility({
      quotationStatus: String(quotation.status || ""),
      hasPendingPricing: Boolean(quotation.has_pending_pricing),
      approvedVersionId: quotation.approved_version_id || null,
      confirmedTotal:
        quotation.confirmed_total === null || quotation.confirmed_total === undefined
          ? null
          : Number(quotation.confirmed_total),
      approvedMockupCount: mockupResult.count || 0,
      existingOrderId: orderResult.data?.id || null,
      customerId: quotation.customer_id || null,
      customerName: String(quotation.customer_name || ""),
      companyName: quotation.company_name || null,
      customerPhone: String(quotation.customer_phone || ""),
      customerEmail: quotation.customer_email || null,
      billingAddress: quotation.billing_address || null
    });
  }

  useEffect(() => {
    void loadEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  async function convert() {
    if (!quotationId || !eligibility || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    if (!confirmCustomerIdentity) {
      setMessage("Konfirmasi identitas pelanggan dari quotation terlebih dahulu.");
      return;
    }
    if (!deliveryMethod) {
      setMessage("Pilih metode penyerahan secara eksplisit.");
      return;
    }
    if (deliveryMethod === "pickup" && !pickupLocationId) {
      setMessage("Pilih toko pickup secara eksplisit.");
      return;
    }
    if (deliveryMethod === "shipping" && shippingAddress.trim().length < 10) {
      setMessage("Alamat pengiriman wajib diisi lengkap.");
      return;
    }
    if (!shippingCost.trim() || !/^\d+$/.test(shippingCost.trim())) {
      setMessage("Ongkir final wajib diisi; gunakan 0 untuk pickup.");
      return;
    }
    if (!paymentMethod) {
      setMessage("Pilih metode pembayaran secara eksplisit.");
      return;
    }
    if (
      !resolvedPrice.trim() ||
      !/^\d+$/.test(resolvedPrice.trim()) ||
      Number(resolvedPrice) !== eligibility.confirmedTotal
    ) {
      setMessage("Harga final wajib diisi dan harus sama dengan total quotation.");
      return;
    }
    if (!transactionStatus) {
      setMessage("Pilih status transaksi secara eksplisit.");
      return;
    }

    setWorking(true);
    setMessage("");

    const { data, error } = await supabase.rpc("convert_quotation_to_order", {
      p_quotation_id: quotationId,
      p_customer_id: eligibility.customerId,
      p_customer_name: eligibility.customerName,
      p_company_name: eligibility.companyName,
      p_customer_phone: eligibility.customerPhone,
      p_customer_email: eligibility.customerEmail,
      p_billing_address: eligibility.billingAddress,
      p_delivery_method: deliveryMethod,
      p_pickup_location_id: deliveryMethod === "pickup" ? pickupLocationId : null,
      p_shipping_address:
        deliveryMethod === "shipping" ? shippingAddress.trim() : null,
      p_payment_method: paymentMethod,
      p_shipping_cost: Number(shippingCost),
      p_resolved_price: Number(resolvedPrice),
      p_transaction_status: transactionStatus,
      p_idempotency_key: conversionKey
    });

    setWorking(false);

    if (error || !data?.id) {
      const text = (error?.message || "").toLowerCase();
      if (text.includes("approved mockup")) {
        setMessage("Tepat satu mockup aktif wajib disetujui pelanggan.");
      } else if (text.includes("approved quotation version")) {
        setMessage("Versi quotation terbaru belum valid sebagai versi disetujui.");
      } else if (text.includes("pricing")) {
        setMessage("Harga quotation belum final atau tidak sama dengan input.");
      } else if (text.includes("customer identity")) {
        setMessage("Identitas yang dikonfirmasi tidak sama dengan quotation.");
      } else if (text.includes("already has an order") || text.includes("replay")) {
        setMessage("Quotation ini sudah memiliki order atau replay-nya konflik.");
      } else if (text.includes("store scope") || text.includes("pickup store")) {
        setMessage("Toko pickup tidak aktif atau di luar scope akun Anda.");
      } else {
        setMessage("Quotation belum berhasil dikonversi menjadi order.");
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
    eligibility.confirmedTotal !== null &&
    eligibility.approvedMockupCount === 1;

  return (
    <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-black/10 bg-black/[0.02] p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-brand-charcoal">
          Kontrak transaksi order
        </h3>
        <p className="mt-1 text-xs leading-5 text-brand-charcoal/60">
          Semua input di bawah wajib dikonfirmasi sebelum quotation menjadi order.
          Pembayaran, stok, dan fulfillment tetap diproses oleh domainnya masing-masing.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-3 text-sm">
        <p className="font-semibold">Identitas pelanggan dari quotation</p>
        <p className="mt-1 text-brand-charcoal/70">
          {eligibility.customerName}
          {eligibility.companyName ? ` · ${eligibility.companyName}` : ""}
        </p>
        <p className="text-xs text-brand-charcoal/60">
          {eligibility.customerPhone}
          {eligibility.customerEmail ? ` · ${eligibility.customerEmail}` : ""}
        </p>
        <label className="mt-3 flex items-start gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={confirmCustomerIdentity}
            onChange={(event) => setConfirmCustomerIdentity(event.target.checked)}
            disabled={!eligible || working}
            className="mt-0.5 size-4 accent-brand-green"
          />
          <span>Saya mengonfirmasi identitas ini sebagai identitas transaksi.</span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Metode penyerahan
          <select
            aria-label="Metode penyerahan"
            value={deliveryMethod}
            onChange={(event) => {
              setDeliveryMethod(event.target.value);
              setPickupLocationId("");
              setShippingAddress("");
            }}
            disabled={!eligible || working}
            className={fieldClassName}
          >
            <option value="">Pilih metode</option>
            <option value="pickup">Pickup</option>
            <option value="shipping">Shipping</option>
          </select>
        </label>

        <label className="text-xs font-semibold">
          Status transaksi
          <select
            aria-label="Status transaksi"
            value={transactionStatus}
            onChange={(event) => setTransactionStatus(event.target.value)}
            disabled={!eligible || working}
            className={fieldClassName}
          >
            <option value="">Pilih status</option>
            <option value="under_review">Under review</option>
          </select>
        </label>
      </div>

      {deliveryMethod === "pickup" ? (
        <label className="block text-xs font-semibold">
          Toko pickup
          <select
            aria-label="Toko pickup"
            value={pickupLocationId}
            onChange={(event) => setPickupLocationId(event.target.value)}
            disabled={!eligible || working}
            className={fieldClassName}
          >
            <option value="">Pilih toko aktif</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.nama_store || store.name || store.id}
                {store.alamat ? ` — ${store.alamat}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {deliveryMethod === "shipping" ? (
        <label className="block text-xs font-semibold">
          Alamat pengiriman final
          <textarea
            aria-label="Alamat pengiriman final"
            value={shippingAddress}
            onChange={(event) => setShippingAddress(event.target.value)}
            disabled={!eligible || working}
            className={`${fieldClassName} min-h-24`}
          />
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Ongkir final (IDR)
          <input
            aria-label="Ongkir final"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={shippingCost}
            onChange={(event) => setShippingCost(event.target.value)}
            disabled={!eligible || working}
            placeholder={deliveryMethod === "pickup" ? "0" : "Wajib diisi"}
            className={fieldClassName}
          />
        </label>

        <label className="text-xs font-semibold">
          Metode pembayaran
          <select
            aria-label="Metode pembayaran"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            disabled={!eligible || working}
            className={fieldClassName}
          >
            <option value="">Pilih metode</option>
            <option value="bank_transfer">Bank transfer</option>
            {deliveryMethod === "pickup" ? (
              <option value="pay_at_store">Pay at store</option>
            ) : null}
          </select>
        </label>
      </div>

      <label className="block text-xs font-semibold">
        Harga quotation yang dikunci (IDR)
        <input
          aria-label="Harga quotation yang dikunci"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={resolvedPrice}
          onChange={(event) => setResolvedPrice(event.target.value)}
          disabled={!eligible || working}
          placeholder="Masukkan total quotation"
          className={fieldClassName}
        />
      </label>

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
            Quotation harus approved dengan harga final dan tepat satu mockup approved.
          </p>
        ) : null}
      </div>
    </div>
  );
}
