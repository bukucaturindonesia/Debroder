"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { CheckoutClient } from "./CheckoutClient";
import { SafeImage } from "@/components/SafeImage";
import { cartItemSubtotal } from "@/lib/cart-v5";
import { fallbackImages } from "@/lib/fallback-data";
import { formatRupiah } from "@/lib/url";
import type { Destination, ShippingRate } from "@/lib/fast-checkout/contracts";
import { openSnap } from "@/lib/fast-checkout/snap-browser";

type Store = { id: string; name: string; address: string; hours: string };
type Quote = { rate: ShippingRate; token: string; expiresAt: number };
type Session = {
  orderId: string;
  orderNumber: string;
  trackingToken: string;
  total: number;
  confirmationUrl: string;
};
type Draft = {
  key: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  search: string;
  destination: (Destination & { token: string }) | null;
  quote: Quote | null;
  fulfillment: "shipping" | "pickup";
  pickup: string;
  session: Session | null;
};
const STORAGE = "debroder-fast-checkout-v1";
const inputClass =
  "min-h-12 w-full min-w-0 rounded border border-black/25 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#063d24]";
async function call<T>(
  url: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const p = await r.json();
  if (!r.ok) throw new Error(p.error || "Proses belum tersedia. Coba lagi.");
  return p;
}
export function CheckoutEntry({ stores }: { stores: Store[] }) {
  const cart = useCart();
  const [legacyRecovery, setLegacyRecovery] = useState<boolean | null>(null);
  useEffect(() => {
    setLegacyRecovery(
      Boolean(sessionStorage.getItem("debroder-checkout-recovery-v1")),
    );
  }, []);
  const eligible = cart.items.every(
    (item) => item.lineType === "ready_stock" && !item.instantCustom,
  );
  if (legacyRecovery === null)
    return (
      <p role="status" className="section-shell py-16">
        Memeriksa checkout sebelumnya...
      </p>
    );
  return eligible && !legacyRecovery ? (
    <FastCheckoutClient stores={stores} />
  ) : (
    <CheckoutClient stores={stores} />
  );
}
export function FastCheckoutClient({ stores }: { stores: Store[] }) {
  const cart = useCart(),
    auth = useCustomerAuth(),
    router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cfg, setCfg] = useState<{
    enabled: boolean;
    pickupEnabled: boolean;
    pickupLocationIds: string[];
    shippingConfigured: boolean;
  } | null>(null);
  const [results, setResults] = useState<
      Array<Destination & { token: string }>
    >([]),
    [quotes, setQuotes] = useState<Quote[]>([]);
  const [subtotal, setSubtotal] = useState<number | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [searching, setSearching] = useState(false);
  const [clock, setClock] = useState(Date.now()),
    [retrySearch, setRetrySearch] = useState(0);
  const submitting = useRef(false),
    quoteRequest = useRef(0);
  const items = useMemo(
    () =>
      cart.items
        .filter((x) => x.lineType === "ready_stock")
        .map((x) => ({ variantSizeId: x.variantSizeId, quantity: x.quantity }))
        .sort((a, b) => a.variantSizeId.localeCompare(b.variantSizeId)),
    [cart.items],
  );
  const basketKey = JSON.stringify(items);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE);
      if (saved) {
        const v = JSON.parse(saved);
        if (v.key && typeof v.name === "string") {
          setDraft(v);
          return;
        }
      }
    } catch {
      /* fresh draft */
    }
    setDraft({
      key: crypto.randomUUID().replaceAll("-", ""),
      name: "",
      phone: "",
      email: "",
      address: "",
      search: "",
      destination: null,
      quote: null,
      fulfillment: "shipping",
      pickup: "",
      session: null,
    });
  }, []);
  useEffect(() => {
    if (draft) sessionStorage.setItem(STORAGE, JSON.stringify(draft));
  }, [draft]);
  useEffect(() => {
    if (!cart.isLoaded || (!cart.items.length && !draft?.session)) return;
    void call<NonNullable<typeof cfg>>("/api/checkout/fast/config")
      .then(setCfg)
      .catch((e) => setError(e.message));
  }, [cart.isLoaded, cart.items.length, draft?.session]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!auth.profile) return;
    setDraft((d) =>
      d
        ? {
            ...d,
            name: d.name || auth.profile!.fullName,
            phone: d.phone || auth.profile!.phone || "",
            email: auth.profile!.email,
          }
        : d,
    );
  }, [auth.profile]);
  useEffect(() => {
    if (!auth.accessToken) return;
    let active = true;
    void call<{
      addresses: Array<{
        isDefault: boolean;
        formattedAddress: string;
        address: {
          addressDetail: string;
          recipientName: string;
          recipientPhone: string;
          postalCode: string;
        };
      }>;
    }>("/api/customer/addresses", undefined, auth.accessToken)
      .then((p) => {
        const saved = p.addresses.find((x) => x.isDefault) || p.addresses[0];
        if (active && saved)
          setDraft((d) =>
            d && !d.address
              ? {
                  ...d,
                  address: saved.address.addressDetail,
                  name: d.name || saved.address.recipientName,
                  phone: d.phone || saved.address.recipientPhone,
                  search: d.search || saved.address.postalCode,
                }
              : d,
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [auth.accessToken]);
  useEffect(() => {
    setDraft((d) => (d && !d.session ? { ...d, quote: null } : d));
    setQuotes([]);
    setSubtotal(null);
    quoteRequest.current++;
  }, [basketKey]);
  const search = draft?.search || "";
  useEffect(() => {
    if (
      search.trim().length < 3 ||
      draft?.destination ||
      !cfg?.shippingConfigured
    ) {
      setResults([]);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      void fetch(`/api/shipping/destinations?q=${encodeURIComponent(search)}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (r) => {
          const p = await r.json();
          if (!r.ok) throw new Error(p.error);
          if (active) {
            setResults(p.destinations);
            setError("");
          }
        })
        .catch((e) => {
          if (active && e.name !== "AbortError")
            setError(e.message || "Lokasi belum dapat dicari.");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, draft?.destination, cfg?.shippingConfigured, retrySearch]);
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) =>
      d
        ? {
            ...d,
            [key]: value,
            ...(["address", "pickup", "fulfillment"].includes(key)
              ? { quote: null }
              : {}),
          }
        : d,
    );
  }
  async function rates() {
    if (!draft?.destination) return;
    const request = ++quoteRequest.current;
    setBusy(true);
    setError("");
    setQuotes([]);
    change("quote", null);
    try {
      const p = await call<{ quotes: Quote[]; subtotal: number }>(
        "/api/shipping/quotes",
        { items, destinationToken: draft.destination.token },
      );
      if (request === quoteRequest.current) {
        setQuotes(p.quotes);
        setSubtotal(p.subtotal);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Ongkir belum dapat dihitung. Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function refresh(session: Session) {
    const p = await call<{
      paymentStatus: string;
      orderStatus: string;
      confirmationUrl: string;
    }>("/api/payments/midtrans/status", {
      orderId: session.orderId,
      trackingToken: session.trackingToken,
    });
    if (p.paymentStatus === "paid") {
      sessionStorage.removeItem(STORAGE);
      // Do not remove newer/different cart contents added while payment was
      // pending. Remove purchased lines only when the basket still matches.
      const stored = sessionStorage.getItem(`${STORAGE}-basket`);
      if (stored === basketKey) cart.clearCart();
      router.replace(p.confirmationUrl);
    } else
      setError(
        `Status pembayaran: ${p.paymentStatus === "unpaid" ? "menunggu pembayaran" : p.paymentStatus}. Pesanan ${session.orderNumber} tetap tersimpan.`,
      );
  }
  async function recover() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const p = await call<{ found: boolean; session?: Session }>(
        "/api/checkout/fast/recover",
        { key: draft.key },
      );
      if (p.found && p.session) {
        setDraft({ ...draft, session: p.session });
        setError(
          "Pesanan lama berhasil dipulihkan. Lanjutkan pembayaran pada pesanan yang sama.",
        );
      } else
        setError(
          "Belum ada pesanan tercatat untuk checkout ini. Pilihan Anda tetap tersimpan.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pemulihan belum tersedia.");
    } finally {
      setBusy(false);
    }
  }
  async function pay(event?: FormEvent) {
    event?.preventDefault();
    if (!draft || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      let session = draft.session;
      if (!session) {
        const valid = await cart.revalidate();
        if (!valid.ok)
          throw new Error(
            "Harga atau stok berubah. Tinjau keranjang sebelum membayar.",
          );
        session = await call<Session>(
          "/api/checkout/fast",
          {
            idempotencyKey: draft.key,
            items,
            customer: {
              name: draft.name,
              phone: draft.phone,
              email: draft.email,
            },
            addressDetail: draft.address,
            fulfillment: draft.fulfillment,
            ...(draft.fulfillment === "shipping"
              ? { quoteToken: draft.quote?.token }
              : { pickupLocationId: draft.pickup }),
          },
          auth.accessToken || undefined,
        );
        const next = { ...draft, session };
        sessionStorage.setItem(`${STORAGE}-basket`, basketKey);
        sessionStorage.setItem(STORAGE, JSON.stringify(next));
        setDraft(next);
      }
      const p = await call<{
        paid?: boolean;
        token: string;
        redirectUrl: string;
        clientKey: string;
      }>("/api/payments/midtrans/snap", {
        orderId: session.orderId,
        trackingToken: session.trackingToken,
      });
      if (p.paid) {
        await refresh(session);
        return;
      }
      await openSnap(p, () => {
        void refresh(session!).catch(() =>
          setError("Status belum dapat diperiksa. Coba Lagi."),
        );
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Pembayaran belum tersedia. Keranjang tetap tersimpan.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  if (!draft || !cart.isLoaded)
    return (
      <p role="status" className="section-shell py-16">
        Memuat checkout...
      </p>
    );
  if (!items.length && !draft.session)
    return (
      <section className="section-shell py-16">
        <h1>Keranjang masih kosong.</h1>
        <Link href="/koleksi">Lihat Koleksi</Link>
      </section>
    );
  const shipping = draft.fulfillment === "shipping",
    quoteValid = Boolean(draft.quote && draft.quote.expiresAt > clock);
  const displayedSubtotal =
    subtotal ??
    cart.items.reduce((sum, item) => sum + cartItemSubtotal(item), 0);
  const total =
    draft.session?.total ??
    displayedSubtotal + (shipping ? draft.quote?.rate.cost || 0 : 0);
  const disabled =
    busy ||
    !cfg?.enabled ||
    (!draft.session &&
      (!cart.checkoutDecision.allowed ||
        draft.name.trim().length < 2 ||
        !/^(?:\+?62|0)[0-9]{8,13}$/.test(draft.phone) ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email) ||
        !Number.isSafeInteger(total) ||
        total <= 0 ||
        (shipping
          ? !quoteValid || draft.address.trim().length < 5
          : !draft.pickup)));
  const availableStores = stores.filter((s) =>
    cfg?.pickupLocationIds.includes(s.id),
  );
  return (
    <section className="section-shell py-8 sm:py-12">
      <h1 className="text-3xl font-semibold">Checkout</h1>
      <p className="mt-2 text-sm text-black/60">
        Lengkapi penerima, pilih pengiriman, lalu bayar dengan aman.
      </p>
      <form
        onSubmit={pay}
        className="mt-6 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)]"
      >
        <div className="grid min-w-0 gap-7">
          <section aria-labelledby="fast-products">
            <h2 id="fast-products" className="text-lg font-semibold">
              1. Ringkasan produk
            </h2>
            <ul className="mt-3 divide-y">
              {cart.items.map((item) => (
                <li key={item.lineId} className="flex min-w-0 gap-3 py-3">
                  <div className="w-14 shrink-0">
                    <SafeImage
                      src={item.imageUrl || fallbackImages.product}
                      alt=""
                      sizes="56px"
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{item.name}</p>
                    <p className="text-sm text-black/60">
                      {item.color} · {item.size} × {item.quantity}
                    </p>
                    <p className="text-sm">
                      {formatRupiah(cartItemSubtotal(item))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/keranjang" className="text-sm underline">
              Ubah keranjang
            </Link>
          </section>
          {!draft.session ? (
            <>
              <section aria-labelledby="fast-recipient">
                <h2 id="fast-recipient" className="text-lg font-semibold">
                  2. Informasi penerima
                </h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label>
                    Nama penerima
                    <input
                      required
                      autoComplete="name"
                      className={inputClass}
                      value={draft.name}
                      onChange={(e) => change("name", e.target.value)}
                    />
                  </label>
                  <label>
                    Nomor WhatsApp
                    <input
                      required
                      type="tel"
                      autoComplete="tel"
                      className={inputClass}
                      value={draft.phone}
                      onChange={(e) => change("phone", e.target.value)}
                    />
                  </label>
                  <label className="sm:col-span-2">
                    Email untuk pesanan
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      readOnly={Boolean(auth.profile)}
                      className={inputClass}
                      value={draft.email}
                      onChange={(e) => change("email", e.target.value)}
                    />
                  </label>
                </div>
                <p className="mt-3 text-sm">
                  {auth.profile ? (
                    "Data akun digunakan untuk pesanan ini."
                  ) : (
                    <>
                      Lanjutkan sebagai tamu atau{" "}
                      <Link
                        className="underline"
                        href="/login?next=%2Fcheckout"
                      >
                        masuk
                      </Link>
                      .
                    </>
                  )}
                </p>
              </section>
              <section aria-labelledby="fast-shipping">
                <h2 id="fast-shipping" className="text-lg font-semibold">
                  3. Pengiriman
                </h2>
                <div className="my-3 flex flex-wrap gap-4">
                  <label>
                    <input
                      type="radio"
                      name="fulfillment"
                      checked={shipping}
                      onChange={() => change("fulfillment", "shipping")}
                    />{" "}
                    Kirim ke alamat
                  </label>
                  {cfg?.pickupEnabled && availableStores.length > 0 ? (
                    <label>
                      <input
                        type="radio"
                        name="fulfillment"
                        checked={!shipping}
                        onChange={() => change("fulfillment", "pickup")}
                      />{" "}
                      Ambil di toko
                    </label>
                  ) : null}
                </div>
                {shipping ? (
                  <div className="grid gap-4">
                    <label>
                      Cari kota, kecamatan, atau kode pos
                      <input
                        className={inputClass}
                        value={draft.search}
                        onChange={(e) => {
                          quoteRequest.current++;
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  search: e.target.value,
                                  destination: null,
                                  quote: null,
                                }
                              : d,
                          );
                          setQuotes([]);
                        }}
                        autoComplete="off"
                        aria-describedby="destination-help"
                      />
                    </label>
                    <p id="destination-help" className="text-sm text-black/60">
                      Pilih hasil pencarian agar lokasi dan kode pos
                      terverifikasi.
                    </p>
                    {searching ? <p role="status">Mencari lokasi...</p> : null}
                    <ul className="grid gap-2">
                      {results.map((result) => (
                        <li key={result.id}>
                          <button
                            type="button"
                            className="min-h-12 w-full break-words border p-3 text-left focus-visible:outline-2"
                            onClick={() => {
                              quoteRequest.current++;
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      destination: result,
                                      search: result.label,
                                      quote: null,
                                    }
                                  : d,
                              );
                              setQuotes([]);
                              setResults([]);
                            }}
                          >
                            {result.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <label>
                      Alamat lengkap, nomor rumah, dan patokan
                      <textarea
                        required
                        minLength={5}
                        autoComplete="street-address"
                        className={`${inputClass} py-3`}
                        value={draft.address}
                        onChange={(e) => change("address", e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={rates}
                      disabled={
                        busy || !draft.destination || !cfg?.shippingConfigured
                      }
                      className="min-h-12 border border-black px-4 disabled:opacity-40"
                    >
                      {busy
                        ? "Menghitung ongkir..."
                        : "Hitung Ongkir / Coba Lagi"}
                    </button>
                    {quotes.map((q) => (
                      <label
                        key={`${q.rate.code}:${q.rate.service}`}
                        className="flex min-h-14 items-start gap-3 border p-3"
                      >
                        <input
                          type="radio"
                          name="courier"
                          checked={draft.quote?.token === q.token}
                          onChange={() =>
                            change(
                              "quote",
                              q.token === draft.quote?.token ? null : q,
                            )
                          }
                        />
                        <span className="min-w-0 break-words">
                          <strong>
                            {q.rate.name} {q.rate.service}
                          </strong>
                          <span className="block">
                            {formatRupiah(q.rate.cost)}
                            {q.rate.etd ? ` · ${q.rate.etd}` : ""}
                          </span>
                        </span>
                      </label>
                    ))}
                    {draft.quote && !quoteValid ? (
                      <p role="alert" className="text-red-700">
                        Tarif sudah kedaluwarsa. Hitung ongkir kembali.
                      </p>
                    ) : null}
                    {!cfg?.shippingConfigured ? (
                      <p className="text-sm text-amber-800">
                        Perhitungan ongkir belum tersedia.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="min-h-11 justify-self-start text-sm underline"
                      onClick={() => setRetrySearch((x) => x + 1)}
                    >
                      Coba Lagi pencarian lokasi
                    </button>
                  </div>
                ) : (
                  <label>
                    Lokasi pengambilan
                    <select
                      required
                      className={inputClass}
                      value={draft.pickup}
                      onChange={(e) => change("pickup", e.target.value)}
                    >
                      <option value="">Pilih toko</option>
                      {availableStores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.address}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </section>
            </>
          ) : (
            <section className="border p-4">
              <h2 className="font-semibold">
                Pesanan {draft.session.orderNumber}
              </h2>
              <p>
                Pilihan Anda tersimpan. Lanjutkan atau periksa status pembayaran
                pada pesanan yang sama.
              </p>
              <button
                type="button"
                className="mt-3 min-h-11 underline"
                disabled={busy}
                onClick={() => {
                  void refresh(draft.session!).catch(() =>
                    setError("Status belum dapat diperiksa. Coba Lagi."),
                  );
                }}
              >
                Periksa Status
              </button>
            </section>
          )}
        </div>
        <aside className="min-w-0 self-start border border-black/15 p-4 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">4. Ringkasan biaya</h2>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-3 text-sm">
            <dt>Subtotal produk</dt>
            <dd>{formatRupiah(displayedSubtotal)}</dd>
            <dt>Ongkos kirim</dt>
            <dd>
              {shipping
                ? draft.quote
                  ? formatRupiah(draft.quote.rate.cost)
                  : "Pilih kurir"
                : formatRupiah(0)}
            </dd>
            <dt className="border-t pt-3 font-semibold">Total</dt>
            <dd className="border-t pt-3 font-semibold">
              {shipping && !draft.quote && !draft.session
                ? "Belum final"
                : formatRupiah(total)}
            </dd>
          </dl>
          {error ? (
            <p
              role="alert"
              className="mt-4 break-words border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}
          {!cfg?.enabled ? (
            <p className="mt-3 text-sm text-amber-800">
              Pembayaran belum tersedia. Keranjang Anda tetap tersimpan.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={disabled}
            className="mt-5 min-h-12 w-full bg-[#063d24] px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            {busy ? "Menyiapkan pembayaran..." : "BAYAR SEKARANG"}
          </button>
          {!draft.session ? (
            <button
              type="button"
              disabled={busy}
              onClick={recover}
              className="mt-2 min-h-11 w-full text-sm underline"
            >
              Pulihkan Pesanan
            </button>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-black/60">
            Semua biaya ditampilkan sebelum pembayaran. Status pembayaran
            dikonfirmasi oleh server.
          </p>
        </aside>
      </form>
    </section>
  );
}
