"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type Product = {
  id: string;
  nama: string;
  name: string | null;
  slug: string | null;
  price: number | null;
  harga: number | null;
  base_price: number | null;
  sku: string | null;
  minimum_order_qty: number;
  has_variants: boolean;
};

type ProductVariant = {
  id: string;
  product_id: string;
  variant_name: string;
  name: string | null;
  color_name: string;
  color_hex: string;
  hex_code: string | null;
  sku: string | null;
  price_adjustment: number;
};

type ProductSize = {
  id: string;
  variant_id: string;
  size_name: string;
  sku: string | null;
  stock: number;
  stock_quantity: number | null;
  price_adjustment: number;
};

type PriceTier = {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number | null;
  quote_required: boolean;
};

type PricingPreview = {
  status: "confirmed" | "pending";
  unitPrice: number | null;
  subtotal: number | null;
  basePrice: number | null;
  tierPrice: number | null;
  variantAdjustment: number;
  sizeAdjustment: number;
  note: string;
};

function money(value: number | null) {
  if (value === null) return "Menunggu penetapan harga";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function QuotationProductItemPanel() {
  const params = useParams<{ id?: string | string[] }>();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [quotationStatus, setQuotationStatus] = useState("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [quantity, setQuantity] = useState("12");
  const [customerNotes, setCustomerNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedProduct = products.find((item) => item.id === productId) || null;
  const productVariants = variants.filter((item) => item.product_id === productId);
  const selectedVariant = productVariants.find((item) => item.id === variantId) || null;
  const variantSizes = sizes.filter((item) => item.variant_id === variantId);
  const selectedSize = variantSizes.find((item) => item.id === sizeId) || null;

  const preview = useMemo<PricingPreview>(() => {
    if (!selectedProduct) {
      return {
        status: "pending",
        unitPrice: null,
        subtotal: null,
        basePrice: null,
        tierPrice: null,
        variantAdjustment: 0,
        sizeAdjustment: 0,
        note: "Pilih produk untuk melihat harga."
      };
    }

    const qty = Math.max(0, Math.floor(numberValue(quantity)));
    const basePrice = numberValue(
      selectedProduct.base_price ?? selectedProduct.price ?? selectedProduct.harga
    );
    const matchingTier = tiers
      .filter((tier) => tier.product_id === selectedProduct.id)
      .sort((a, b) => b.min_quantity - a.min_quantity)
      .find(
        (tier) =>
          qty >= tier.min_quantity &&
          (tier.max_quantity === null || qty <= tier.max_quantity)
      );
    const variantAdjustment = numberValue(selectedVariant?.price_adjustment);
    const sizeAdjustment = numberValue(selectedSize?.price_adjustment);

    if (matchingTier?.quote_required || matchingTier?.unit_price === null) {
      return {
        status: "pending",
        unitPrice: null,
        subtotal: null,
        basePrice,
        tierPrice: matchingTier?.unit_price ?? null,
        variantAdjustment,
        sizeAdjustment,
        note: "Jumlah ini membutuhkan penetapan harga manual."
      };
    }

    const tierPrice = matchingTier?.unit_price ?? null;
    const primaryPrice = tierPrice ?? basePrice;
    if (!primaryPrice) {
      return {
        status: "pending",
        unitPrice: null,
        subtotal: null,
        basePrice: basePrice || null,
        tierPrice,
        variantAdjustment,
        sizeAdjustment,
        note: "Harga dasar produk belum tersedia."
      };
    }

    const unitPrice = primaryPrice + variantAdjustment + sizeAdjustment;
    return {
      status: "confirmed",
      unitPrice,
      subtotal: unitPrice * qty,
      basePrice,
      tierPrice,
      variantAdjustment,
      sizeAdjustment,
      note: tierPrice
        ? "Harga tier diterapkan berdasarkan jumlah pesanan."
        : "Harga dasar produk diterapkan."
    };
  }, [quantity, selectedProduct, selectedSize, selectedVariant, tiers]);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      const supabase = createSupabaseClient();
      if (!supabase || !quotationId) {
        if (active) {
          setMessage("Sesi atau ID quotation belum tersedia.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const [quotationResult, productResult, variantResult, sizeResult, tierResult] =
        await Promise.all([
          supabase.from("quotations").select("status").eq("id", quotationId).maybeSingle(),
          supabase
            .from("products")
            .select("id,nama,name,slug,price,harga,base_price,sku,minimum_order_qty,has_variants")
            .eq("status_aktif", true)
            .order("nama", { ascending: true }),
          supabase
            .from("product_variants")
            .select("id,product_id,variant_name,name,color_name,color_hex,hex_code,sku,price_adjustment")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("product_variant_sizes")
            .select("id,variant_id,size_name,sku,stock,stock_quantity,price_adjustment")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("product_price_tiers")
            .select("id,product_id,min_quantity,max_quantity,unit_price,quote_required")
            .eq("status", "active")
            .order("sort_order", { ascending: true })
        ]);

      if (!active) return;
      setLoading(false);

      const firstError =
        quotationResult.error ||
        productResult.error ||
        variantResult.error ||
        sizeResult.error ||
        tierResult.error;

      if (firstError) {
        setMessage(`Data produk gagal dimuat: ${firstError.message}`);
        return;
      }

      setQuotationStatus(String(quotationResult.data?.status || ""));
      const nextProducts = (productResult.data || []) as Product[];
      setProducts(nextProducts);
      setVariants((variantResult.data || []) as ProductVariant[]);
      setSizes((sizeResult.data || []) as ProductSize[]);
      setTiers((tierResult.data || []) as PriceTier[]);

      if (nextProducts.length) {
        const firstProduct = nextProducts[0];
        setProductId(firstProduct.id);
        setQuantity(String(Math.max(1, firstProduct.minimum_order_qty || 1)));
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, [quotationId]);

  useEffect(() => {
    const firstVariant = productVariants[0];
    setVariantId(firstVariant?.id || "");
    setSizeId("");
    if (selectedProduct) {
      setQuantity(String(Math.max(1, selectedProduct.minimum_order_qty || 1)));
    }
    // productVariants is derived from productId; avoid resetting on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    setSizeId(variantSizes[0]?.id || "");
    // variantSizes is derived from variantId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId]);

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selectedProduct || !quotationId) return;

    const qty = Math.floor(numberValue(quantity));
    const minimum = Math.max(1, selectedProduct.minimum_order_qty || 1);
    if (qty < minimum) {
      setMessage(`Jumlah minimum produk ini adalah ${minimum} pcs.`);
      return;
    }
    if (selectedProduct.has_variants && !selectedVariant) {
      setMessage("Pilih warna atau varian produk.");
      return;
    }
    if (selectedVariant && variantSizes.length > 0 && !selectedSize) {
      setMessage("Pilih ukuran produk.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      setMessage("Layanan data belum tersedia. Hubungi pengelola sistem.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: lastItem } = await supabase
      .from("quotation_items")
      .select("sort_order")
      .eq("quotation_id", quotationId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const productName = selectedProduct.name || selectedProduct.nama;
    const variantName = selectedVariant?.name || selectedVariant?.variant_name || null;
    const colorName = selectedVariant?.color_name || variantName;
    const sku = selectedSize?.sku || selectedVariant?.sku || selectedProduct.sku || null;

    const payload = {
      quotation_id: quotationId,
      product_id: selectedProduct.id,
      product_variant_id: selectedVariant?.id || null,
      product_variant_size_id: selectedSize?.id || null,
      product_name_snapshot: productName,
      product_slug_snapshot: selectedProduct.slug,
      variant_name_snapshot: variantName,
      color_name_snapshot: colorName,
      color_hex_snapshot:
        selectedVariant?.hex_code || selectedVariant?.color_hex || null,
      size_name_snapshot: selectedSize?.size_name || null,
      sku_snapshot: sku,
      quantity: qty,
      base_price_snapshot: preview.basePrice,
      tier_price_snapshot: preview.tierPrice,
      variant_adjustment_snapshot: preview.variantAdjustment,
      size_adjustment_snapshot: preview.sizeAdjustment,
      unit_price: preview.unitPrice,
      pricing_status: preview.status,
      subtotal: preview.subtotal,
      customer_notes: customerNotes.trim() || null,
      production_notes: null,
      sort_order: numberValue(lastItem?.sort_order) + 10
    };

    const { error } = await supabase.from("quotation_items").insert(payload);
    if (error) {
      setSaving(false);
      setMessage("Produk belum dapat ditambahkan. Periksa data lalu coba lagi.");
      return;
    }

    const { error: refreshError } = await supabase.rpc("refresh_quotation_totals", {
      p_quotation_id: quotationId
    });

    if (refreshError) {
      setSaving(false);
      setMessage(
        `Produk tersimpan, tetapi total gagal diperbarui: ${refreshError.message}`
      );
      return;
    }

    setMessage("Produk berhasil ditambahkan ke quotation.");
    setSaving(false);
    setOpen(false);
    window.location.reload();
  }

  const editable = quotationStatus === "draft";
  const inputClass =
    "mt-2 min-h-11 w-full rounded-lg border border-brand-softGray bg-white px-4 text-sm outline-none focus:border-brand-charcoal disabled:bg-brand-offWhite disabled:text-brand-charcoal/45";

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold text-brand-charcoal/45"
      >
        Memuat produk...
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
        disabled={!editable || !products.length}
        className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-brand-charcoal/35"
      >
        Tambah Produk
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <div className="mx-auto max-w-3xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-softGray bg-white p-5 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  v1.2 Phase 1A
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-brand-charcoal">
                  Tambah Produk ke Penawaran
                </h2>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/65">
                  Pilih produk, warna, ukuran, dan jumlah. Snapshot harga disimpan saat item dibuat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveItem} className="grid gap-6 p-5 sm:p-7">
              {message ? (
                <div
                  role="status"
                  className={`border p-4 text-sm font-semibold ${
                    message.includes("berhasil")
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-brand-charcoal md:col-span-2">
                  Produk
                  <select
                    value={productId}
                    onChange={(event) => setProductId(event.target.value)}
                    className={inputClass}
                    disabled={saving}
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name || product.nama}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-brand-charcoal">
                  Warna / varian
                  <select
                    value={variantId}
                    onChange={(event) => setVariantId(event.target.value)}
                    className={inputClass}
                    disabled={saving || !productVariants.length}
                  >
                    {!productVariants.length ? (
                      <option value="">Tanpa varian</option>
                    ) : null}
                    {productVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.color_name || variant.name || variant.variant_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-brand-charcoal">
                  Ukuran
                  <select
                    value={sizeId}
                    onChange={(event) => setSizeId(event.target.value)}
                    className={inputClass}
                    disabled={saving || !variantSizes.length}
                  >
                    {!variantSizes.length ? (
                      <option value="">Tanpa ukuran</option>
                    ) : null}
                    {variantSizes.map((size) => {
                      const stock = size.stock_quantity ?? size.stock;
                      return (
                        <option key={size.id} value={size.id}>
                          {size.size_name} · stok {stock}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="text-sm font-semibold text-brand-charcoal">
                  Jumlah (pcs)
                  <input
                    type="number"
                    min={selectedProduct?.minimum_order_qty || 1}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className={inputClass}
                    disabled={saving}
                  />
                  <span className="mt-2 block text-xs font-medium text-brand-charcoal/55">
                    Minimum {selectedProduct?.minimum_order_qty || 1} pcs.
                  </span>
                </label>

                <label className="text-sm font-semibold text-brand-charcoal">
                  Catatan pelanggan
                  <input
                    value={customerNotes}
                    onChange={(event) => setCustomerNotes(event.target.value)}
                    placeholder="Contoh: warna hitam pekat"
                    className={inputClass}
                    disabled={saving}
                  />
                </label>
              </div>

              <section className="border border-brand-softGray bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">
                      Pratinjau Harga
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-brand-charcoal">
                      {money(preview.subtotal)}
                    </p>
                    <p className="mt-2 text-sm text-brand-charcoal/60">{preview.note}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-brand-charcoal">
                      {preview.unitPrice === null
                        ? "Harga pending"
                        : `${money(preview.unitPrice)} / pcs`}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-brand-charcoal/50">
                      {Math.max(0, Math.floor(numberValue(quantity)))} pcs
                    </p>
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3 border-t border-brand-softGray pt-5 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving || !selectedProduct}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Produk"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray bg-white px-6 text-sm font-semibold text-brand-charcoal disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
