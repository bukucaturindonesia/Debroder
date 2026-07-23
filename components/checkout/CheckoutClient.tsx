"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { isCustomProjectCartItem, useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/url";
import { removeCustomDraft } from "@/lib/custom-commerce/draft-storage";
import { EMPTY_STRUCTURED_ADDRESS, StructuredIndonesiaAddress } from "@/components/checkout/StructuredIndonesiaAddress";
import type { StructuredIndonesiaAddressInput } from "@/lib/indonesia-address";

type StoreOption = { id: string; name: string; address: string; hours: string };
type CheckoutDraft = {
  idempotencyKey: string;
  accessToken: string;
  confirmationCode: string;
  createdAt: string;
  payloadHash?: string;
};
type CheckoutApiPayload = {
  code?: string;
  error?: string;
  reference?: string;
  found?: boolean;
  confirmationUrl?: string;
  trackingUrl?: string;
  trackingToken?: string;
  orderNumber?: string;
};
type RecoveryResult =
  | { kind: "found"; payload: CheckoutApiPayload }
  | { kind: "missing" }
  | { kind: "expired" }
  | { kind: "unsafe"; message: string; retryAfter: number }
  | { kind: "temporary"; message: string; retryAfter: number };

const RECOVERY_KEY = "debroder-checkout-recovery-v1";
const RECOVERY_TTL_MS = 2 * 60 * 60 * 1000;

function createDraft(): CheckoutDraft {
  const compact = () => crypto.randomUUID().replace(/-/g, "");
  return {
    idempotencyKey: compact(),
    accessToken: `${compact()}${compact()}`,
    confirmationCode: compact().slice(0, 8).toUpperCase(),
    createdAt: new Date().toISOString()
  };
}

export function CheckoutClient({ stores }: { stores: StoreOption[] }) {
  const cart = useCart();
  const router = useRouter();
  const draft = useRef<CheckoutDraft | null>(null);
  const [fulfillment, setFulfillment] = useState<"pickup" | "shipping">(stores.length ? "pickup" : "shipping");
  const [submitting, setSubmitting] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [structuredAddress, setStructuredAddress] = useState<StructuredIndonesiaAddressInput>(EMPTY_STRUCTURED_ADDRESS);
  const [formattedStructuredAddress, setFormattedStructuredAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const readyItems = useMemo(() => cart.items.filter((item) => !isCustomProjectCartItem(item) && item.variantSizeId && Number(item.priceValue) >= 0), [cart.items]);
  const customItems = useMemo(() => cart.items.filter(isCustomProjectCartItem), [cart.items]);
  const unsupportedItems = cart.items.filter((item) => !isCustomProjectCartItem(item) && !item.variantSizeId);
  const mixedCart = readyItems.length > 0 && customItems.length > 0;
  const subtotal = readyItems.reduce((sum, item) => sum + Number(item.priceValue || 0) * item.quantity, 0)
    + customItems.reduce((sum, item) => sum + Number(item.customProject?.pricing.finalTotal || 0), 0);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = window.setInterval(() => {
      setRetryAfter((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfter]);

  useEffect(() => {
    let active = true;
    async function recover() {
      const stored = readStoredDraft();
      if (!stored) {
        if (active) setRecovering(false);
        return;
      }
      draft.current = stored;
      const result = await recoverStoredCheckout(stored);
      if (!active) return;
      if (result.kind === "found") {
        storeOrderSession(stored, result.payload);
        sessionStorage.removeItem(RECOVERY_KEY);
        router.replace(result.payload.confirmationUrl!);
        return;
      }
      if (result.kind === "expired" || (
        result.kind === "missing"
        && Date.now() - new Date(stored.createdAt).getTime() > RECOVERY_TTL_MS
      )) {
        sessionStorage.removeItem(RECOVERY_KEY);
        draft.current = null;
      } else if (result.kind === "unsafe") {
        setError(result.message);
      } else if (result.kind === "temporary") {
        setRetryAfter(result.retryAfter);
      }
      setRecovering(false);
    }
    void recover();
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || retryAfter > 0 || unsupportedItems.length || mixedCart || readyItems.length + customItems.length === 0) return;
    if (fulfillment === "shipping" && !addressConfirmed) {
      setError("Konfirmasi alamat terstruktur sebelum membuat order.");
      return;
    }

    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const businessPayload = {
      customer: {
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        notes: form.get("notes")
      },
      fulfillment: {
        method: fulfillment,
        address: fulfillment === "shipping" ? formattedStructuredAddress : undefined,
        addressSnapshot: fulfillment === "shipping" ? structuredAddress : undefined,
        pickupLocationId: fulfillment === "pickup" ? form.get("pickupLocationId") : undefined,
        paymentMethod: fulfillment === "pickup" ? form.get("paymentMethod") : "bank_transfer"
      },
      items: readyItems
        .map((item) => ({ variantSizeId: item.variantSizeId, quantity: item.quantity, note: item.notes }))
        .sort((left, right) => String(left.variantSizeId).localeCompare(String(right.variantSizeId))),
      customProjects: customItems
        .map((item) => ({ project: item.customProject }))
        .sort((left, right) => String(left.project?.id ?? "").localeCompare(String(right.project?.id ?? "")))
    };
    const payloadHash = await hashBusinessPayload(businessPayload);
    let currentDraft = draft.current ?? readStoredDraft() ?? createDraft();

    if (currentDraft.payloadHash && currentDraft.payloadHash !== payloadHash) {
      const recovery = await recoverStoredCheckout(currentDraft);
      if (recovery.kind === "found") {
        storeOrderSession(currentDraft, recovery.payload);
        sessionStorage.removeItem(RECOVERY_KEY);
        router.replace(recovery.payload.confirmationUrl!);
        setSubmitting(false);
        return;
      }
      if (recovery.kind === "missing" || recovery.kind === "expired") {
        currentDraft = createDraft();
      } else {
        setError(recovery.message);
        if (recovery.kind === "temporary") setRetryAfter(recovery.retryAfter);
        setSubmitting(false);
        return;
      }
    }

    currentDraft = { ...currentDraft, payloadHash };
    draft.current = currentDraft;
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(currentDraft));

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...currentDraft, ...businessPayload })
      });
      const payload = await readCheckoutPayload(response);
      if (!response.ok || !payload.confirmationUrl) {
        if (payload.code === "CHECKOUT_IDEMPOTENCY_CONFLICT") {
          const recovery = await recoverStoredCheckout(currentDraft);
          if (recovery.kind === "found") {
            storeOrderSession(currentDraft, recovery.payload);
            sessionStorage.removeItem(RECOVERY_KEY);
            router.replace(recovery.payload.confirmationUrl!);
            return;
          }
          if (recovery.kind === "missing" || recovery.kind === "expired") {
            const nextDraft = createDraft();
            draft.current = nextDraft;
            sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(nextDraft));
            setError("Data checkout berubah. Kunci checkout baru sudah disiapkan; periksa data lalu tekan Buat Pesanan kembali.");
            return;
          }
          setError(recovery.message);
          if (recovery.kind === "temporary") setRetryAfter(recovery.retryAfter);
          return;
        }

        const retrySeconds = retryAfterFromResponse(response);
        if (retrySeconds > 0) setRetryAfter(retrySeconds);
        const reference = payload.reference ? ` Referensi: ${payload.reference}.` : "";
        const waiting = retrySeconds > 0 ? ` Coba lagi dalam ${retrySeconds} detik.` : "";
        setError(`${payload.error || "Pesanan belum dapat dibuat."}${waiting}${reference}`);
        return;
      }

      storeOrderSession(currentDraft, payload);
      sessionStorage.removeItem(RECOVERY_KEY);
      customItems.forEach((item) => item.customProject ? removeCustomDraft(item.customProject.id) : undefined);
      cart.clearCart();
      router.push(payload.confirmationUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout gagal. Keranjang dan kunci pemulihan tetap tersimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart.isLoaded || recovering) return <CheckoutMessage title={recovering ? "Memulihkan checkout..." : "Memuat keranjang..."} />;
  if (!cart.items.length) return <CheckoutMessage title="Keranjang masih kosong." action="/koleksi" actionLabel="Lihat Koleksi" />;

  return (
    <section className="bg-[#f6f5f0] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Checkout Tanpa Akun</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Selesaikan pesanan dengan cepat</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">Tidak perlu masuk ke akun. Ketersediaan produk siap beli, konfigurasi custom, jumlah minimum, kecocokan layanan, dan harga akan diperiksa kembali saat pesanan dibuat.</p>

        {mixedCart ? (
          <div className="mt-7 border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            <p className="font-semibold">Ready Stock dan pesanan Custom harus dipisahkan.</p>
            <p className="mt-1">Selesaikan salah satu jenis pesanan terlebih dahulu agar stok, produksi, pembayaran, dan pengiriman tidak tercampur.</p>
            <Link className="mt-3 inline-flex font-semibold underline" href="/keranjang">Atur ulang keranjang</Link>
          </div>
        ) : null}

        {unsupportedItems.length ? (
          <div className="mt-7 border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            <p className="font-semibold">Ada produk Jersey custom yang perlu diproses secara terpisah.</p>
            <p className="mt-1">Proyek custom non-Jersey dapat dilanjutkan di sini. Produk Jersey custom tetap mengikuti konfigurator Jersey.</p>
            <div className="mt-3 flex gap-3"><Link className="font-semibold underline" href="/keranjang">Ubah keranjang</Link><Link className="font-semibold underline" href="/jersey/configurator">Buka Konfigurator Jersey</Link></div>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6">
            <Panel title="Data pelanggan">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama lengkap"><input name="name" autoComplete="name" minLength={2} maxLength={150} required /></Field>
                <Field label="Nomor WhatsApp"><input name="phone" type="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" required /></Field>
                <Field label="Email (opsional)"><input name="email" type="email" autoComplete="email" /></Field>
                <Field label="Catatan (opsional)"><input name="notes" maxLength={2000} /></Field>
              </div>
            </Panel>

            <Panel title="Metode Pengiriman">
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice checked={fulfillment === "pickup"} disabled={!stores.length} onChange={() => setFulfillment("pickup")} title="Ambil di Toko" detail="Tanpa ongkir; stok disimpan selama 12 jam setelah WhatsApp diverifikasi." />
                <Choice checked={fulfillment === "shipping"} onChange={() => setFulfillment("shipping")} title="Kurir Eksternal" detail="Admin mengecek ongkir; stok direservasi 24 jam setelah total disetujui." />
              </div>
              {fulfillment === "pickup" ? (
                <div className="mt-5 grid gap-4">
                  <Field label="Lokasi pengambilan"><select name="pickupLocationId" required defaultValue=""><option value="" disabled>Pilih toko</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name} — {store.address}</option>)}</select></Field>
                  <Field label="Cara pembayaran"><select name="paymentMethod" defaultValue="bank_transfer"><option value="bank_transfer">Transfer bank</option><option value="pay_at_store">Bayar di toko</option></select></Field>
                </div>
              ) : (
                <div className="mt-5"><StructuredIndonesiaAddress value={structuredAddress} confirmed={addressConfirmed} onChange={(next) => { setStructuredAddress(next); setAddressConfirmed(false); }} onConfirmedChange={setAddressConfirmed} onFormattedAddressChange={setFormattedStructuredAddress} /></div>
              )}
            </Panel>
          </div>

          <aside className="h-fit rounded-[28px] bg-white p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold">Ringkasan pesanan</h2>
            <div className="mt-5 grid gap-4">{readyItems.map((item) => (
              <div key={item.cartId} className="flex justify-between gap-4 border-b border-black/10 pb-4 text-sm">
                <div><p className="font-semibold">{item.name}</p><p className="mt-1 text-black/55">{item.variantName || item.color} · {item.size} · {item.variantSku || item.sku} × {item.quantity}</p></div>
                <p className="shrink-0 font-semibold">{formatRupiah(Number(item.priceValue || 0) * item.quantity)}</p>
              </div>
            ))}{customItems.map((item) => <div key={item.cartId} className="flex justify-between gap-4 border-b border-black/10 pb-4 text-sm"><div><p className="font-semibold">{item.name}</p><p className="mt-1 text-black/55">{item.customProject?.items.length} grup produk · {item.customProject?.pricing.totalQuantity} pcs · {item.customProject?.pricing.status === "final" ? "Harga final" : item.customProject?.pricing.status === "estimated" ? "Estimasi" : "Menunggu pemeriksaan"}</p></div><p className="shrink-0 font-semibold">{item.customProject?.pricing.finalTotal ? formatRupiah(item.customProject.pricing.finalTotal) : "Diperiksa admin"}</p></div>)}</div>
            <div className="mt-5 flex items-center justify-between"><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong></div>
            <p className="mt-3 text-xs leading-5 text-black/50">{fulfillment === "shipping" ? "Admin akan menambahkan ongkir pada pesanan ini, lalu Anda dapat menyetujui total akhirnya." : "Pengambilan di toko tidak dikenakan ongkir."}</p>
            {error ? <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <button type="submit" disabled={submitting || retryAfter > 0 || mixedCart || Boolean(unsupportedItems.length) || (fulfillment === "shipping" && !addressConfirmed)} className="mt-5 min-h-12 w-full rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-45">{submitting ? "Membuat pesanan..." : retryAfter > 0 ? `Coba lagi ${retryAfter} dtk` : "Buat Pesanan"}</button>
            <p className="mt-3 text-center text-[11px] leading-5 text-black/45">Pesanan menggunakan kunci pemulihan yang sama selama hasil sebelumnya belum diketahui. Jangan membuka checkout baru ketika jaringan terputus.</p>
          </aside>
        </form>
      </div>
    </section>
  );
}

async function recoverStoredCheckout(stored: CheckoutDraft): Promise<RecoveryResult> {
  try {
    const response = await fetch(`/api/checkout?idempotencyKey=${encodeURIComponent(stored.idempotencyKey)}`, { cache: "no-store" });
    const payload = await readCheckoutPayload(response);
    if (response.ok && payload.found && payload.confirmationUrl) return { kind: "found", payload };
    if (response.status === 404) return { kind: "missing" };
    if (response.status === 410) return { kind: "expired" };
    const retryAfter = retryAfterFromResponse(response);
    if (response.status === 503 || response.status === 429) {
      return {
        kind: "temporary",
        message: payload.error || "Status checkout sebelumnya belum dapat diperiksa. Jangan membuat checkout baru.",
        retryAfter: retryAfter || 15
      };
    }
    return {
      kind: "unsafe",
      message: payload.error || "Checkout sebelumnya tidak dapat dipastikan dengan aman. Hubungi Admin DEBRODER.",
      retryAfter: 0
    };
  } catch {
    return {
      kind: "temporary",
      message: "Jaringan belum dapat memastikan checkout sebelumnya. Kunci lama tetap disimpan untuk mencegah order ganda.",
      retryAfter: 15
    };
  }
}

async function readCheckoutPayload(response: Response): Promise<CheckoutApiPayload> {
  return response.json().catch(() => ({})) as Promise<CheckoutApiPayload>;
}

function retryAfterFromResponse(response: Response) {
  const value = Number(response.headers.get("retry-after") || 0);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
}

async function hashBusinessPayload(value: unknown) {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function storeOrderSession(draftValue: CheckoutDraft, payload: CheckoutApiPayload) {
  const trackingToken = payload.trackingToken || draftValue.accessToken;
  sessionStorage.setItem(`debroder-order-${trackingToken}`, JSON.stringify({
    confirmationCode: draftValue.confirmationCode,
    orderNumber: payload.orderNumber,
    trackingUrl: payload.trackingUrl
  }));
}

function readStoredDraft(): CheckoutDraft | null {
  try {
    const value = sessionStorage.getItem(RECOVERY_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<CheckoutDraft>;
    if (!parsed.idempotencyKey || !parsed.accessToken || !parsed.confirmationCode || !parsed.createdAt) return null;
    return parsed as CheckoutDraft;
  } catch {
    return null;
  }
}

function CheckoutMessage({ title, action, actionLabel }: { title: string; action?: string; actionLabel?: string }) {
  return <section className="bg-[#f6f5f0] px-4 py-24"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center"><h1 className="text-2xl font-semibold">{title}</h1>{action ? <Link href={action} className="mt-5 inline-flex rounded-full bg-black px-5 py-3 font-semibold text-white hover:bg-black/75">{actionLabel}</Link> : null}</div></section>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-[28px] bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">{title}</h2><div className="mt-5">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-3 [&_select]:min-h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-black/15 [&_select]:px-3 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-black/15 [&_textarea]:p-3">{label}{children}</label>; }
function Choice({ checked, disabled, onChange, title, detail }: { checked: boolean; disabled?: boolean; onChange: () => void; title: string; detail: string }) { return <button type="button" disabled={disabled} onClick={onChange} className={`rounded-2xl border p-4 text-left disabled:opacity-40 ${checked ? "border-[#063d24] bg-emerald-50" : "border-black/10"}`}><span className="font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-black/55">{detail}</span></button>; }
