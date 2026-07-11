"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type ProductRow = {
  id: string;
  nama: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  variant_name: string | null;
  color_name: string | null;
  sku: string | null;
};

type RelationCounts = {
  sizes: number;
  images: number;
  orders: number;
  quotations: number;
};

function variantLabel(variant?: VariantRow | null) {
  return variant?.variant_name || variant?.color_name || "Varian";
}

export function VariantDeleteManager() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [counts, setCounts] = useState<RelationCounts>({
    sizes: 0,
    images: 0,
    orders: 0,
    quotations: 0
  });
  const [message, setMessage] = useState<string | null>(null);

  const productVariants = useMemo(
    () => variants.filter((variant) => variant.product_id === productId),
    [variants, productId]
  );

  const selectedVariant =
    variants.find((variant) => variant.id === variantId) || null;
  const expectedText = variantLabel(selectedVariant);

  async function loadData() {
    const supabase = createSupabaseClient();

    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const [productResult, variantResult] = await Promise.all([
      supabase.from("products").select("id,nama").order("nama"),
      supabase
        .from("product_variants")
        .select("id,product_id,variant_name,color_name,sku")
        .order("sort_order")
    ]);

    setLoading(false);

    if (productResult.error || variantResult.error) {
      setMessage(
        productResult.error?.message ||
          variantResult.error?.message ||
          "Gagal memuat data."
      );
      return;
    }

    const nextProducts = (productResult.data || []) as ProductRow[];
    const nextVariants = (variantResult.data || []) as VariantRow[];

    setProducts(nextProducts);
    setVariants(nextVariants);

    const nextProductId = productId || nextProducts[0]?.id || "";
    setProductId(nextProductId);

    const firstVariant = nextVariants.find(
      (variant) => variant.product_id === nextProductId
    );
    setVariantId((current) => current || firstVariant?.id || "");
  }

  async function loadCounts(targetVariantId: string) {
    const supabase = createSupabaseClient();

    if (!supabase || !targetVariantId) {
      setCounts({ sizes: 0, images: 0, orders: 0, quotations: 0 });
      return;
    }

    const [sizes, images, orders, quotations] = await Promise.all([
      supabase
        .from("product_variant_sizes")
        .select("id", { count: "exact", head: true })
        .eq("variant_id", targetVariantId),
      supabase
        .from("product_variant_images")
        .select("id", { count: "exact", head: true })
        .eq("variant_id", targetVariantId),
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("variant_id", targetVariantId),
      supabase
        .from("quotation_draft_items")
        .select("id", { count: "exact", head: true })
        .eq("product_variant_id", targetVariantId)
    ]);

    setCounts({
      sizes: sizes.count || 0,
      images: images.count || 0,
      orders: orders.count || 0,
      quotations: quotations.count || 0
    });
  }

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open]);

  useEffect(() => {
    const firstVariant = productVariants[0];

    if (!productVariants.some((variant) => variant.id === variantId)) {
      setVariantId(firstVariant?.id || "");
    }
  }, [productId, productVariants, variantId]);

  useEffect(() => {
    setConfirmText("");
    void loadCounts(variantId);
  }, [variantId]);

  async function deleteVariant() {
    if (!selectedVariant || confirmText.trim() !== expectedText) {
      return;
    }

    const supabase = createSupabaseClient();

    if (!supabase) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", selectedVariant.id);

    setDeleting(false);

    if (error) {
      setMessage(`Varian gagal dihapus: ${error.message}`);
      return;
    }

    setMessage(`Varian ${expectedText} berhasil dihapus.`);
    setConfirmText("");
    setVariantId("");
    await loadData();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[110] rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        Hapus Varian
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[130] overflow-y-auto bg-black/60 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Hapus varian produk"
        >
          <div className="mx-auto max-w-xl bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                  Zona berbahaya
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Hapus varian produk
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Ukuran dan galeri milik varian akan ikut terhapus. Riwayat
                  order dan quotation tetap tersimpan, tetapi referensi
                  variannya menjadi kosong.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-xl"
              >
                ×
              </button>
            </div>

            {message ? (
              <p className="mt-5 border p-4 text-sm font-semibold">{message}</p>
            ) : null}

            <div className="mt-6 grid gap-4">
              <label className="text-sm font-semibold">
                Produk
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="mt-2 min-h-11 w-full border px-4"
                >
                  <option value="">Pilih produk</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.nama}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Varian
                <select
                  value={variantId}
                  onChange={(event) => setVariantId(event.target.value)}
                  className="mt-2 min-h-11 w-full border px-4"
                >
                  <option value="">Pilih varian</option>
                  {productVariants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variantLabel(variant)}
                      {variant.sku ? ` — ${variant.sku}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedVariant ? (
                <div className="grid grid-cols-2 gap-3 bg-black/[0.03] p-4 text-sm sm:grid-cols-4">
                  <div>
                    <span className="block text-xs text-black/50">Ukuran</span>
                    <strong>{counts.sizes}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-black/50">Foto</span>
                    <strong>{counts.images}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-black/50">
                      Order terkait
                    </span>
                    <strong>{counts.orders}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-black/50">
                      Quotation terkait
                    </span>
                    <strong>{counts.quotations}</strong>
                  </div>
                </div>
              ) : null}

              <label className="text-sm font-semibold">
                Ketik nama varian untuk konfirmasi:{" "}
                <span className="text-red-700">
                  {expectedText || "—"}
                </span>
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  className="mt-2 min-h-11 w-full border px-4"
                  placeholder={expectedText || "Pilih varian dahulu"}
                />
              </label>

              <button
                type="button"
                disabled={
                  loading ||
                  deleting ||
                  !selectedVariant ||
                  confirmText.trim() !== expectedText
                }
                onClick={() => void deleteVariant()}
                className="min-h-12 rounded-full bg-red-700 px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? "Menghapus..." : "Hapus varian permanen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
