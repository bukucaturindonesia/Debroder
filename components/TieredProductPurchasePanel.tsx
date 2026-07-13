"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart, type CartProductInput } from "@/components/CartProvider";
import { useOptionalProductVariantGallery } from "@/components/ProductVariantGalleryContext";
import { createSupabaseClient } from "@/lib/supabase";
import type { ProductVariant, ProductVariantSize } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

export type ProductColorOption = {
  name: string;
  hex: string;
};

type ProductPriceTier = {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number | null;
  quote_required: boolean;
  status: string;
  sort_order: number;
};

type ProductMinimumRule = {
  id: string;
  product_id: string;
  minimum_quantity: number;
  minimum_for_tier_quantity: number | null;
  quotation_quantity: number | null;
  status: string;
};

type ProductPurchasePanelProps = {
  product: CartProductInput;
  colors?: string[];
  sizes?: string[];
  sizeGuide?: string[];
  bulkOrderNote?: string | null;
  whatsappUrl?: string;
  variants?: ProductVariant[];
  showBuyNow?: boolean;
  monochrome?: boolean;
};

const baseColors: ProductColorOption[] = [
  { name: "Hitam", hex: "#111111" },
  { name: "Putih", hex: "#F7F7F4" },
  { name: "Abu Muda", hex: "#D9D9D6" },
  { name: "Abu Tua", hex: "#6B7280" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Biru Royal", hex: "#1D4ED8" },
  { name: "Biru Muda", hex: "#7DD3FC" },
  { name: "Forest Green", hex: "#063D24" },
  { name: "Hijau Botol", hex: "#14532D" },
  { name: "Army", hex: "#4B5320" },
  { name: "Merah", hex: "#DC2626" },
  { name: "Maroon", hex: "#6F1D1B" },
  { name: "Kuning", hex: "#FACC15" },
  { name: "Orange", hex: "#F97316" },
  { name: "Cream", hex: "#EADFC8" },
  { name: "Beige", hex: "#D6C4A5" },
  { name: "Cokelat", hex: "#7C4A2D" },
  { name: "Ungu", hex: "#6D28D9" },
  { name: "Pink", hex: "#F9A8D4" },
  { name: "Tosca", hex: "#14B8A6" }
];

const defaultSizes = ["S", "M", "L", "XL", "2XL", "3XL", "Mix Size"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function moneyNumber(value?: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[^\d-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function colorHex(value: string) {
  const key = slugify(value);
  const direct = baseColors.find((color) => slugify(color.name) === key);
  if (direct) return direct.hex;

  const aliases: Record<string, string> = {
    black: "#111111",
    white: "#F7F7F4",
    grey: "#9CA3AF",
    gray: "#9CA3AF",
    abu: "#9CA3AF",
    blue: "#1D4ED8",
    biru: "#1D4ED8",
    green: "#14532D",
    hijau: "#14532D",
    forest: "#063D24",
    red: "#DC2626",
    merah: "#DC2626",
    yellow: "#FACC15",
    kuning: "#FACC15",
    brown: "#7C4A2D",
    cokelat: "#7C4A2D",
    purple: "#6D28D9",
    ungu: "#6D28D9",
    teal: "#14B8A6",
    tosca: "#14B8A6"
  };

  return aliases[key] || "#D9D9D6";
}

function uniqueList(values: string[]) {
  const map = new Map<string, string>();
  values.filter(Boolean).forEach((value) => {
    const clean = value.trim();
    if (clean) map.set(slugify(clean), clean);
  });
  return Array.from(map.values());
}

function sanitizeQuantity(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function variantLabel(variant: ProductVariant) {
  return variant.color_name || variant.variant_name || "Varian";
}

function variantCoverImage(variant?: ProductVariant) {
  if (!variant) return undefined;
  const cover =
    variant.variant_images?.find((image) => image.is_cover) ||
    variant.variant_images?.[0];
  return cover?.image_url || variant.image_url || variant.images?.[0];
}

function activeVariantSizes(variant?: ProductVariant) {
  return (variant?.sizes || []).filter((size) => size.is_active !== false);
}

function findSize(variant: ProductVariant | undefined, selectedSize: string) {
  return activeVariantSizes(variant).find(
    (size) => size.size_name === selectedSize
  );
}

function sizeIsUnavailable(size?: ProductVariantSize) {
  return Boolean(size && Number(size.stock) <= 0);
}

function findTier(tiers: ProductPriceTier[], quantity: number) {
  return tiers.find(
    (tier) =>
      tier.status === "active" &&
      quantity >= tier.min_quantity &&
      (tier.max_quantity === null || quantity <= tier.max_quantity)
  );
}

export function TieredProductPurchasePanel({
  product,
  colors = [],
  sizes = [],
  sizeGuide = [],
  bulkOrderNote,
  whatsappUrl,
  variants = [],
  showBuyNow = false,
  monochrome = false
}: ProductPurchasePanelProps) {
  const cart = useCart();
  const router = useRouter();
  const variantGallery = useOptionalProductVariantGallery();
  const interactionLocked = useRef(false);

  const [tiers, setTiers] = useState<ProductPriceTier[]>([]);
  const [minimumRule, setMinimumRule] =
    useState<ProductMinimumRule | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  const activeVariants = useMemo(
    () => variants.filter((variant) => variant.is_active !== false),
    [variants]
  );
  const hasVariants = activeVariants.length > 0;

  const colorOptions = useMemo(() => {
    if (hasVariants) {
      return activeVariants.map((variant) => ({
        name: variantLabel(variant),
        hex: variant.color_hex || colorHex(variantLabel(variant)),
        variant
      }));
    }

    const productColors = uniqueList(colors);
    const baseNames = baseColors.map((color) => color.name);
    return uniqueList([...productColors, ...baseNames])
      .slice(0, Math.max(20, productColors.length))
      .map((name) => ({
        name,
        hex: colorHex(name),
        variant: undefined
      }));
  }, [activeVariants, colors, hasVariants]);

  const [selectedColor, setSelectedColor] = useState(
    colorOptions[0]?.name || "Hitam"
  );
  const selectedVariant = colorOptions.find(
    (option) => option.name === selectedColor
  )?.variant;

  const sizeOptions = useMemo(() => {
    const variantSizes = activeVariantSizes(selectedVariant).map(
      (size) => size.size_name
    );
    return variantSizes.length
      ? uniqueList(variantSizes)
      : uniqueList([...(sizes || []), ...defaultSizes]);
  }, [selectedVariant, sizes]);

  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "S");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const productId = product.id;
    let cancelled = false;

    async function loadPricing() {
      setPricingLoading(true);

      const db = createSupabaseClient();

      if (!db || !productId) {
        if (!cancelled) setPricingLoading(false);
        return;
      }

      const [tierResult, minimumResult] = await Promise.all([
        db
          .from("product_price_tiers")
          .select(
            "id,product_id,min_quantity,max_quantity,unit_price,quote_required,status,sort_order"
          )
          .eq("product_id", productId)
          .eq("status", "active")
          .order("min_quantity", { ascending: true }),
        db
          .from("product_minimum_rules")
          .select(
            "id,product_id,minimum_quantity,minimum_for_tier_quantity,quotation_quantity,status"
          )
          .eq("product_id", productId)
          .eq("status", "active")
          .maybeSingle()
      ]);

      if (cancelled) return;

      setTiers((tierResult.data || []) as ProductPriceTier[]);
      setMinimumRule(
        minimumResult.data
          ? (minimumResult.data as ProductMinimumRule)
          : null
      );
      setPricingLoading(false);
    }

    void loadPricing();

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    if (!colorOptions.some((option) => option.name === selectedColor)) {
      setSelectedColor(colorOptions[0]?.name || "Hitam");
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    if (!sizeOptions.includes(selectedSize)) {
      setSelectedSize(sizeOptions[0] || "S");
    }
  }, [selectedSize, sizeOptions]);

  useEffect(() => {
    variantGallery?.selectVariant(selectedVariant?.id || null);
  }, [selectedVariant?.id, variantGallery]);

  useEffect(() => {
    const minimum = minimumRule?.minimum_quantity || 1;
    if (minimum > 1) {
      setQuantity((current) => (current < minimum ? minimum : current));
    }
  }, [minimumRule?.minimum_quantity]);

  const selectedVariantSize = findSize(selectedVariant, selectedSize);
  const unavailable = sizeIsUnavailable(selectedVariantSize);
  const stockLabel = selectedVariantSize
    ? selectedVariantSize.stock > 0
      ? `Stok ${selectedVariantSize.stock}`
      : "Stok kosong"
    : hasVariants
      ? "Stok mengikuti varian"
      : "Siap dikonfirmasi";

  const selectedSku =
    selectedVariantSize?.sku || selectedVariant?.sku || product.sku;

  const baseProductPrice = moneyNumber(
    product.priceValue || product.priceLabel
  );
  const variantAdjustment =
    moneyNumber(selectedVariant?.price_adjustment) +
    moneyNumber(selectedVariantSize?.price_adjustment);

  const activeTier = findTier(tiers, quantity);
  const minimumQuantity = minimumRule?.minimum_quantity || 1;
  const belowMinimum = quantity < minimumQuantity;

  const quotationQuantity =
    minimumRule?.quotation_quantity ||
    tiers.find((tier) => tier.quote_required)?.min_quantity ||
    null;

  const quoteRequired =
    Boolean(activeTier?.quote_required) ||
    Boolean(quotationQuantity && quantity >= quotationQuantity);

  const tierBasePrice =
    activeTier && !activeTier.quote_required && activeTier.unit_price !== null
      ? Number(activeTier.unit_price)
      : baseProductPrice;

  const unitPriceValue = quoteRequired
    ? 0
    : tierBasePrice + variantAdjustment;

  const unitPriceLabel = quoteRequired
    ? "Minta penawaran"
    : unitPriceValue > 0
      ? formatRupiah(unitPriceValue)
      : product.priceLabel;

  const subtotal = quoteRequired ? 0 : unitPriceValue * quantity;

  const tierDescription = pricingLoading
    ? "Memuat harga grosir..."
    : belowMinimum
      ? `Minimum order ${minimumQuantity} pcs`
      : quoteRequired
        ? `Pesanan ${quantity} pcs perlu penawaran khusus`
        : activeTier
          ? `Tier grosir ${activeTier.min_quantity}–${
              activeTier.max_quantity ?? "∞"
            } pcs`
          : "Harga normal produk";

  const guideRows = sizeGuide.length
    ? sizeGuide
    : sizeOptions
        .filter((size) => size !== "Mix Size")
        .map(
          (size) =>
            `${size}: Sesuaikan dengan panduan ukuran produk ini.`
        );

  function addSelectedToCart() {
    if (belowMinimum || unavailable || interactionLocked.current) return false;
    interactionLocked.current = true;
    window.setTimeout(() => {
      interactionLocked.current = false;
    }, 500);

    cart.addItem({
      ...product,
      priceLabel: unitPriceLabel,
      priceValue: unitPriceValue || undefined,
      imageUrl: variantCoverImage(selectedVariant) || product.imageUrl,
      defaultColor: selectedColor,
      defaultColorHex: colorOptions.find(
        (option) => option.name === selectedColor
      )?.hex,
      defaultSize: selectedSize,
      defaultQuantity: quantity,
      variantId: selectedVariant?.id,
      variantSizeId: selectedVariantSize?.id,
      variantName:
        selectedVariant?.variant_name || selectedVariant?.color_name,
      variantSku: selectedSku || undefined,
      stockLabel,
      variantSnapshot: {
        variant_id: selectedVariant?.id,
        variant_name: selectedVariant?.variant_name,
        color_name: selectedVariant?.color_name,
        color_hex: selectedVariant?.color_hex,
        size_id: selectedVariantSize?.id,
        size_name: selectedVariantSize?.size_name,
        sku: selectedSku,
        stock: selectedVariantSize?.stock,
        base_product_price: baseProductPrice,
        variant_adjustment: variantAdjustment,
        selected_quantity: quantity,
        applied_tier: activeTier
          ? {
              id: activeTier.id,
              min_quantity: activeTier.min_quantity,
              max_quantity: activeTier.max_quantity,
              unit_price: activeTier.unit_price,
              quote_required: activeTier.quote_required
            }
          : null,
        minimum_order_qty: minimumQuantity,
        quotation_quantity: quotationQuantity,
        quote_required: quoteRequired,
        unit_price: unitPriceValue || null,
        subtotal: subtotal || null
      }
    });
    return true;
  }

  function buySelectedNow() {
    if (!addSelectedToCart()) return;
    cart.closeCart();
    router.push("/keranjang");
  }

  return (
    <div className="mt-7 grid gap-6">
      <section>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-brand-charcoal">
            Warna:{" "}
            <span className="font-normal text-brand-charcoal/60">
              {selectedColor}
            </span>
          </p>
          <span className="text-xs text-brand-charcoal/50">
            {hasVariants
              ? `${colorOptions.length} varian warna`
              : "20 warna dasar"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2.5">
          {colorOptions.map((option) => {
            const selected = option.name === selectedColor;
            return (
              <button
                key={option.name}
                type="button"
                title={option.name}
                aria-label={`Pilih warna ${option.name}`}
                aria-pressed={selected}
                onClick={() => setSelectedColor(option.name)}
                className={`grid h-9 w-9 place-items-center rounded-full transition ${
                  selected
                    ? `ring-2 ${monochrome ? "ring-black" : "ring-brand-green"} ring-offset-2 ring-offset-[#F7F7F4]`
                    : "ring-1 ring-black/10 hover:ring-black/30"
                }`}
              >
                <span
                  className="h-7 w-7 rounded-full border border-black/10"
                  style={{ backgroundColor: option.hex }}
                />
              </button>
            );
          })}
        </div>

        {hasVariants ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-charcoal/55">
            {selectedSku ? <span>SKU: {selectedSku}</span> : null}
            <span>{stockLabel}</span>
          </div>
        ) : null}
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-brand-charcoal">
            Ukuran:{" "}
            <span className="font-normal text-brand-charcoal/60">
              {selectedSize}
            </span>
          </p>
          <a
            href="#panduan-ukuran"
            className="text-xs font-semibold text-brand-charcoal underline-offset-4 hover:underline"
          >
            Panduan Ukuran
          </a>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {sizeOptions.map((size) => {
            const selected = size === selectedSize;
            const sizeRecord = findSize(selectedVariant, size);
            const disabled = sizeIsUnavailable(sizeRecord);

            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => setSelectedSize(size)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  selected
                    ? "bg-brand-charcoal text-white"
                    : "bg-white/70 text-brand-charcoal ring-1 ring-black/10 hover:ring-black/25"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-[22px] bg-white/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">
              Jumlah pesanan
            </p>
            <p className="mt-1 text-xs text-brand-charcoal/55">
              Total jumlah menentukan harga per pcs.
            </p>
          </div>

          <div className="inline-flex min-h-11 items-center overflow-hidden rounded-full bg-white ring-1 ring-black/10">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center text-lg transition hover:bg-black/5"
              onClick={() =>
                setQuantity((value) => Math.max(1, value - 1))
              }
              aria-label="Kurangi jumlah"
            >
              −
            </button>
            <input
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  sanitizeQuantity(Number(event.target.value || 1))
                )
              }
              className="h-11 w-16 bg-transparent text-center text-sm font-semibold outline-none"
              inputMode="numeric"
              aria-label="Jumlah produk"
            />
            <button
              type="button"
              className="grid h-11 w-11 place-items-center text-lg transition hover:bg-black/5"
              onClick={() => setQuantity((value) => value + 1)}
              aria-label="Tambah jumlah"
            >
              +
            </button>
          </div>
        </div>

        <div
          className={`rounded-[18px] p-4 ${
            belowMinimum
              ? "bg-red-50 text-red-800"
              : quoteRequired
                ? "bg-amber-50 text-amber-900"
                : monochrome
                  ? "bg-black/[0.06] text-black"
                  : "bg-[#e9f4ee] text-[#063d24]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em]">
                {tierDescription}
              </p>
              {!quoteRequired && !belowMinimum ? (
                <p className="mt-2 text-sm">
                  Subtotal:{" "}
                  <span className="font-semibold">
                    {formatRupiah(subtotal)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="text-right">
              <p className="text-xl font-semibold">
                {unitPriceLabel || "Konfirmasi admin"}
              </p>
              {!quoteRequired ? (
                <p className="text-xs opacity-70">/ pcs</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className={`grid gap-2 ${showBuyNow ? "sm:grid-cols-2" : ""}`}>
          <button
            type="button"
            disabled={unavailable || belowMinimum || pricingLoading}
            onClick={addSelectedToCart}
            className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-black/20 ${monochrome ? "bg-black text-white hover:bg-black/75" : "bg-brand-green text-white hover:bg-brand-charcoal"}`}
          >
            {unavailable
              ? "Varian Tidak Tersedia"
              : pricingLoading
                ? "Memuat Harga..."
                : belowMinimum
                  ? `Minimum ${minimumQuantity} pcs`
                  : quoteRequired
                    ? "Tambahkan untuk Penawaran"
                    : "Tambah ke Keranjang"}
          </button>
          {showBuyNow ? (
            <button
              type="button"
              disabled={unavailable || belowMinimum || pricingLoading}
              onClick={buySelectedNow}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-black bg-white px-6 text-sm font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/20 disabled:text-black/30"
            >
              Buy Now
            </button>
          ) : null}
        </div>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/70 px-6 text-sm font-semibold text-brand-charcoal ring-1 ring-black/10 transition hover:ring-black/25"
          >
            Tanya via WhatsApp
          </a>
        ) : null}
      </section>

      <section className="rounded-[22px] bg-white/60 p-4">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${monochrome ? "bg-black/[0.06]" : "bg-[#e9f4ee]"}`}>
            👕
          </span>
          <div>
            <h2 className="text-sm font-semibold text-brand-charcoal">
              Pesanan Grosir Ada Diskon
            </h2>
            <p className="mt-1 text-sm leading-6 text-brand-charcoal/60">
              {bulkOrderNote ||
                "Harga otomatis mengikuti total jumlah pesanan. Pesanan besar yang memerlukan pengecekan akan diarahkan ke penawaran khusus."}
            </p>
          </div>
        </div>
      </section>

      <section
        id="panduan-ukuran"
        className="rounded-[22px] bg-white/50 p-4"
      >
        <details>
          <summary className="cursor-pointer list-none text-sm font-semibold text-brand-charcoal">
            Panduan Ukuran
          </summary>
          <div className="mt-4 grid gap-2">
            {guideRows.map((row, index) => {
              const [label, ...rest] = row.split(":");
              return (
                <div
                  key={`${row}-${index}`}
                  className="grid gap-1 rounded-2xl bg-white/70 p-3 text-sm sm:grid-cols-[100px_1fr] sm:gap-4"
                >
                  <p className="font-semibold text-brand-charcoal">
                    {rest.length ? label.trim() : `Panduan ${index + 1}`}
                  </p>
                  <p className="text-brand-charcoal/60">
                    {rest.length ? rest.join(":").trim() : row.trim()}
                  </p>
                </div>
              );
            })}
          </div>
        </details>
      </section>
    </div>
  );
}
