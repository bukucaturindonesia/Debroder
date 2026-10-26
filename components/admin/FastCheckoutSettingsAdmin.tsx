"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createSupabaseClient } from "@/lib/supabase";
type Settings = {
  origin_id: number | null;
  origin_label: string;
  couriers: string[];
  pickup_enabled: boolean;
  pickup_location_ids: string[];
  payment_enabled: boolean;
};
type Product = {
  id: string;
  name: string;
  shipping_weight_grams: number | null;
  shipping_length_cm: number | null;
  shipping_width_cm: number | null;
  shipping_height_cm: number | null;
};
type Data = {
  settings: Settings;
  products: Product[];
  stores: Array<{ id: string; nama_store: string; alamat: string }>;
  reconciliation: Array<{
    id: string;
    order_id: string;
    provider_order_id: string;
    status: string;
    reconciliation_note: string | null;
  }>;
  integration: {
    mode: string;
    paymentConfigured: boolean;
    shippingConfigured: boolean;
  };
};
const field = "min-h-11 w-full rounded border p-2";
export function FastCheckoutSettingsAdmin() {
  const [data, setData] = useState<Data | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(""),
    [origins, setOrigins] = useState<
      Array<{ id: number; label: string; token: string }>
    >([]),
    [origin, setOrigin] = useState<{
      id: number;
      label: string;
      token: string;
    } | null>(null);
  const [pickups, setPickups] = useState<string[] | null>(null);
  const request = useCallback(async (body?: unknown, q?: string) => {
    const auth = await createSupabaseClient()?.auth.getSession();
    const r = await fetch(
      `/api/admin/checkout-settings${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      {
        method: body ? "POST" : "GET",
        cache: "no-store",
        headers: {
          authorization: `Bearer ${auth?.data.session?.access_token || ""}`,
          "content-type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    const p = await r.json();
    if (!r.ok) throw new Error(p.error);
    return p;
  }, []);
  useEffect(() => {
    void request()
      .then(setData)
      .catch((e) => setMessage(e.message));
  }, [request]);
  async function save(event: FormEvent<HTMLFormElement>, product = false) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await request(
        product
          ? {
              productId: form.get("productId"),
              weight: Number(form.get("weight")),
              length: Number(form.get("length")),
              width: Number(form.get("width")),
              height: Number(form.get("height")),
            }
          : {
              origin_id: origin?.id ?? data?.settings.origin_id,
              origin_label: origin?.label ?? data?.settings.origin_label,
              ...(origin ? { origin_token: origin.token } : {}),
              couriers: String(form.get("couriers"))
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
              pickup_enabled: form.get("pickup") === "on",
              pickup_location_ids:
                pickups ?? data?.settings.pickup_location_ids ?? [],
              payment_enabled: form.get("payment") === "on",
            },
      );
      setData(await request());
      setMessage("Pengaturan tersimpan.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Pengaturan gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <section className="p-6">
        <h1>Pengiriman & Pembayaran</h1>
        <p role="status">{message || "Memuat pengaturan..."}</p>
        <button
          onClick={() => {
            void request()
              .then(setData)
              .catch((e) => setMessage(e.message));
          }}
        >
          Coba Lagi
        </button>
      </section>
    );
  return (
    <section className="max-w-4xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Pengiriman & Pembayaran</h1>
      <p className="mt-2">
        Midtrans: {data.integration.mode} ·{" "}
        {data.integration.paymentConfigured
          ? "Siap dikonfigurasi"
          : "Konfigurasi belum lengkap"}
        . RajaOngkir:{" "}
        {data.integration.shippingConfigured
          ? "Key tersedia"
          : "Belum dikonfigurasi"}
        .
      </p>
      <p role="status" className="my-4">
        {message}
      </p>
      <form onSubmit={save} className="grid gap-4 border p-4">
        <h2 className="font-semibold">Pengiriman</h2>
        <label>
          Lokasi asal (nama kelurahan/kode pos)
          <input
            className={field}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy || search.trim().length < 3}
          className="min-h-11 border px-4 disabled:opacity-50"
          onClick={() => {
            void request(undefined, search)
              .then((p) => setOrigins(p.destinations))
              .catch((e) => setMessage(e.message));
          }}
        >
          Cari Lokasi Asal
        </button>
        <ul>
          {origins.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="min-h-11 w-full border p-3 text-left"
                onClick={() => {
                  setOrigin(o);
                  setOrigins([]);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
        <p>
          Asal terpilih:{" "}
          {origin?.label || data.settings.origin_label || "Belum dipilih"}
        </p>
        <label>
          Kode kurir aktif, pisahkan koma
          <input
            required
            name="couriers"
            className={field}
            defaultValue={data.settings.couriers.join(",")}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="pickup"
            defaultChecked={data.settings.pickup_enabled}
          />{" "}
          Aktifkan ambil di toko
        </label>
        <fieldset>
          <legend>Lokasi pengambilan aktif</legend>
          {data.stores.map((s) => (
            <label key={s.id} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={(
                  pickups ?? data.settings.pickup_location_ids
                ).includes(s.id)}
                onChange={(e) =>
                  setPickups((old) =>
                    e.target.checked
                      ? [...(old ?? data.settings.pickup_location_ids), s.id]
                      : (old ?? data.settings.pickup_location_ids).filter(
                          (x) => x !== s.id,
                        ),
                  )
                }
              />
              {s.nama_store} — {s.alamat}
            </label>
          ))}
        </fieldset>
        <h2 className="font-semibold">Pembayaran</h2>
        <label>
          <input
            type="checkbox"
            name="payment"
            defaultChecked={data.settings.payment_enabled}
          />{" "}
          Aktifkan Midtrans Sandbox setelah konfigurasi lengkap
        </label>
        <button
          disabled={busy}
          className="min-h-11 bg-black px-4 text-white disabled:opacity-50"
        >
          Simpan Pengaturan
        </button>
      </form>
      <form
        onSubmit={(e) => save(e, true)}
        className="mt-6 grid gap-4 border p-4"
      >
        <h2 className="font-semibold">Berat & dimensi produk (PIM)</h2>
        <label>
          Produk
          <select name="productId" required className={field}>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.shipping_weight_grams || "belum diisi"} gram
              </option>
            ))}
          </select>
        </label>
        {["weight", "length", "width", "height"].map((name, index) => (
          <label key={name}>
            {
              [
                "Berat per produk (gram)",
                "Panjang (cm)",
                "Lebar (cm)",
                "Tinggi (cm)",
              ][index]
            }
            <input
              required
              name={name}
              type="number"
              min="1"
              className={field}
            />
          </label>
        ))}
        <button
          disabled={busy}
          className="min-h-11 border border-black px-4 disabled:opacity-50"
        >
          Simpan Data Produk
        </button>
      </form>
      <h2 className="mt-6 font-semibold">Pembayaran yang perlu diperiksa</h2>
      {!data.reconciliation.length ? (
        <p>Tidak ada antrian pemeriksaan.</p>
      ) : (
        <ul>
          {data.reconciliation.map((a) => (
            <li key={a.id} className="break-words border-b py-3">
              <a className="underline" href={`/admin/orders/${a.order_id}`}>
                {a.provider_order_id}
              </a>{" "}
              · {a.status}
              <p>
                {a.reconciliation_note ||
                  "Pembuatan transaksi belum dapat dipastikan. Jangan membuat order pengganti."}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
