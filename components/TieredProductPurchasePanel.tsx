"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart, type CartProductInput } from "@/components/CartProvider";
import { useOptionalProductVariantGallery } from "@/components/ProductVariantGalleryContext";
import { ProductDetailDisclosure } from "@/components/product/ProductDetailDisclosure";
import { cartTierProductKey } from "@/lib/cart-group-tier-pricing";
import type { ProductVariant, ProductVariantSize } from "@/lib/types";
import { formatRupiah } from "@/lib/url";
import {
  type InstantCustomSnapshot,
  type InstantServiceDefinition,
  type InstantServiceSelection
} from "@/lib/instant-custom";

export type ProductColorOption = {
  name: string;
  hex: string;
};

type ReadyStockPricingResponse =
  | {
      status: "priced";
      code: null;
      productId: string;
      productCategoryId: string;
      variantId: string;
      variantSizeId: string;
      sku: string;
      quantity: number;
      pricingQuantity: number;
      minimumQuantity: number;
      quotationQuantity: number | null;
      stockAvailable: number;
      unitPrice: number;
      productSubtotal: number;
      serviceTotal: number;
      total: number;
      tier: { id: string; minQuantity: number; maxQuantity: number | null } | null;
      instantCustomSnapshot?: InstantCustomSnapshot;
      message: null;
    }
  | {
      status: "quotation_required" | "unavailable";
      code: string;
      productId: string;
      variantSizeId: string;
      quantity: number;
      pricingQuantity: number;
      minimumQuantity: number;
      quotationQuantity: number | null;
      stockAvailable: number;
      unitPrice: null;
      productSubtotal: null;
      serviceTotal: null;
      total: null;
      tier: null;
      message: string;
    };

type ProductPurchasePanelProps = {
  product: CartProductInput;
  colors?: string[];
  sizes?: string[];
  sizeGuide?: string[];
  bulkOrderNote?: string | null;
  whatsappUrl?: string;
  variants?: ProductVariant[];
  showAddToCart?: boolean;
  showBuyNow?: boolean;
  monochrome?: boolean;
  instantServices?: InstantServiceDefinition[];
  initialInstantMode?: boolean;
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

export function TieredProductPurchasePanel({
  product,
  colors = [],
  sizes = [],
  sizeGuide = [],
  bulkOrderNote,
  whatsappUrl,
  variants = [],
  showAddToCart = true,
  showBuyNow = false,
  monochrome = false,
  instantServices = [],
  initialInstantMode = false
}: ProductPurchasePanelProps) {
  const cart = useCart();
  const router = useRouter();
  const variantGallery = useOptionalProductVariantGallery();
  const interactionLocked = useRef(false);
  const uploadSessionToken = useRef(`instant_${crypto.randomUUID().replace(/-/g, "")}`);
  const [instantMode, setInstantMode] = useState(initialInstantMode);
  const [selectedServices, setSelectedServices] = useState<Record<string, {
    inputs: Record<string, string>;
    uploadIds: string[];
    note: string;
  }>>({});
  const [uploadingServiceId, setUploadingServiceId] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState("");

  const [pricingResult, setPricingResult] = useState<{
    requestKey: string;
    value: ReadyStockPricingResponse;
  } | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

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

  const selectedVariantSize = findSize(selectedVariant, selectedSize);

  const existingProductQuantity = product.id
    ? cart.items.reduce(
        (total, item) =>
          cartTierProductKey(item) === product.id ? total + item.quantity : total,
        0
      )
    : 0;
  const pricingQuantity = quantity + existingProductQuantity;
  const instantSelections: InstantServiceSelection[] = useMemo(() =>
    Object.entries(selectedServices).map(([serviceId, selection]) => ({
      serviceId,
      inputs: selection.inputs,
      uploadIds: selection.uploadIds,
      uploadSessionToken: uploadSessionToken.current,
      note: selection.note || undefined
    })), [selectedServices]);
  const pricingRequest = useMemo(() => ({
    productId: product.id ?? "",
    variantSizeId: selectedVariantSize?.id ?? "",
    quantity,
    pricingQuantity,
    instantServices: instantMode ? instantSelections : []
  }), [instantMode, instantSelections, pricingQuantity, product.id, quantity, selectedVariantSize?.id]);
  const pricingRequestKey = useMemo(() => JSON.stringify(pricingRequest), [pricingRequest]);
  const pricing = pricingResult?.requestKey === pricingRequestKey
    ? pricingResult.value
    : null;

  useEffect(() => {
    if (!pricingRequest.productId || !pricingRequest.variantSizeId) {
      setPricingResult(null);
      setPricingLoading(false);
      setPricingError("");
      return;
    }

    setPricingResult(null);
    setPricingLoading(true);
    setPricingError("");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/pricing/ready-stock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: pricingRequestKey
        });
        const payload = await response.json() as ReadyStockPricingResponse;
        if (
          !payload
          || !["priced", "quotation_required", "unavailable"].includes(payload.status)
          || payload.productId !== pricingRequest.productId
          || payload.variantSizeId !== pricingRequest.variantSizeId
          || payload.quantity !== pricingRequest.quantity
          || payload.pricingQuantity !== pricingRequest.pricingQuantity
        ) {
          throw new Error("Respons harga tidak sesuai dengan konfigurasi aktif.");
        }
        setPricingResult({ requestKey: pricingRequestKey, value: payload });
        if (payload.status === "unavailable") setPricingError(payload.message);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPricingResult(null);
        setPricingError(error instanceof Error ? error.message : "Harga belum dapat divalidasi.");
      } finally {
        if (!controller.signal.aborted) setPricingLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pricingRequest, pricingRequestKey]);

  const minimumQuantity = pricing?.minimumQuantity ?? 1;
  const belowMinimum = quantity < minimumQuantity;
  const quoteRequired = pricing?.status === "quotation_required";
  const exactPricing = pricing?.status === "priced" ? pricing : null;
  const unavailable = sizeIsUnavailable(selectedVariantSize) || pricing?.status === "unavailable";
  const stockAvailable = pricing?.stockAvailable ?? selectedVariantSize?.stock ?? 0;
  const stockLabel = stockAvailable > 0 ? `Stok ${stockAvailable}` : "Stok kosong";
  const selectedSku = exactPricing?.sku ?? selectedVariantSize?.sku ?? selectedVariant?.sku ?? product.sku;
  const unitPriceLabel = exactPricing
    ? formatRupiah(exactPricing.unitPrice)
    : quoteRequired
      ? "Penawaran resmi"
      : pricingLoading
        ? "Memvalidasi harga..."
        : "Pilih konfigurasi";
  const serviceTotal = exactPricing?.serviceTotal ?? 0;
  const payableSubtotal = exactPricing?.total ?? 0;
  const tierDescription = pricingLoading
    ? "Sistem sedang menghitung harga pasti"
    : belowMinimum
      ? `Minimum order ${minimumQuantity} pcs`
      : quoteRequired
        ? pricing.message
        : exactPricing?.tier
          ? `Harga pasti tier ${exactPricing.tier.minQuantity}-${exactPricing.tier.maxQuantity ?? "seterusnya"} pcs`
          : exactPricing
            ? "Harga pasti berdasarkan konfigurasi aktif"
            : "Pilih varian, ukuran, dan jumlah untuk melihat harga pasti";

  const guideRows = sizeGuide;

  function addSelectedToCart() {
    if (!exactPricing || belowMinimum || unavailable || pricingLoading || interactionLocked.current) return false;
    if (instantMode && (instantSelections.length === 0 || uploadingServiceId)) {
      setServiceError(uploadingServiceId ? "Tunggu upload selesai." : "Pilih minimal satu layanan Custom Instan.");
      return false;
    }
    setServiceError("");
    interactionLocked.current = true;
    window.setTimeout(() => {
      interactionLocked.current = false;
    }, 500);

    cart.addItem({
      ...product,
      priceLabel: formatRupiah(exactPricing.unitPrice),
      priceValue: exactPricing.unitPrice,
      imageUrl: variantCoverImage(selectedVariant) || product.imageUrl,
      defaultColor: selectedColor,
      defaultColorHex: colorOptions.find((option) => option.name === selectedColor)?.hex,
      defaultSize: selectedSize,
      defaultQuantity: quantity,
      variantId: exactPricing.variantId,
      variantSizeId: exactPricing.variantSizeId,
      variantName: selectedVariant?.variant_name || selectedVariant?.color_name,
      variantSku: exactPricing.sku,
      stockLabel,
      stockAvailable: exactPricing.stockAvailable,
      variantSnapshot: {
        pricing_source: "server_canonical",
        product_id: exactPricing.productId,
        product_category_id: exactPricing.productCategoryId,
        variant_id: exactPricing.variantId,
        size_id: exactPricing.variantSizeId,
        sku: exactPricing.sku,
        selected_quantity: quantity,
        pricing_quantity: exactPricing.pricingQuantity,
        applied_tier: exactPricing.tier,
        minimum_order_qty: exactPricing.minimumQuantity,
        quotation_quantity: exactPricing.quotationQuantity,
        quote_required: false,
        unit_price: exactPricing.unitPrice,
        subtotal: exactPricing.productSubtotal
      },
      ...(exactPricing.instantCustomSnapshot
        ? { instantCustom: exactPricing.instantCustomSnapshot }
        : {})
    });
    return true;
  }

  function toggleInstantService(serviceId: string) {
    setSelectedServices((current) => {
      if (current[serviceId]) {
        const next = { ...current };
        delete next[serviceId];
        return next;
      }
      return { ...current, [serviceId]: { inputs: {}, uploadIds: [], note: "" } };
    });
  }

  function updateInstantService(serviceId: string, patch: Partial<{ inputs: Record<string, string>; note: string }>) {
    setSelectedServices((current) => ({
      ...current,
      [serviceId]: {
        ...(current[serviceId] ?? { inputs: {}, uploadIds: [], note: "" }),
        ...patch
      }
    }));
  }

  async function uploadInstantServiceFile(serviceId: string, file?: File) {
    if (!file) return;
    setUploadingServiceId(serviceId);
    setServiceError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("session_token", uploadSessionToken.current);
      const response = await fetch("/api/customer-uploads", { method: "POST", body: form });
      const payload: unknown = await response.json();
      const upload = payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as { upload?: { id?: unknown } }).upload
        : undefined;
      if (!response.ok || typeof upload?.id !== "string") throw new Error("Upload file layanan gagal.");
      const uploadId = upload.id;
      setSelectedServices((current) => ({
        ...current,
        [serviceId]: {
          ...(current[serviceId] ?? { inputs: {}, uploadIds: [], note: "" }),
          uploadIds: [uploadId]
        }
      }));
    } catch (error) {
      setServiceError(error instanceof Error ? error.message : "Upload file layanan gagal.");
    } finally {
      setUploadingServiceId(null);
    }
  }

  function buySelectedNow() {
    if (!addSelectedToCart()) return;
    cart.closeCart();
    router.push("/checkout");
  }

  return (
    <div className="mt-7 grid gap-6">
      <fieldset className="min-w-0">
        <legend className="sr-only">Pilih warna produk</legend>
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
              <label
                key={option.name}
                title={option.name}
                className={`grid h-12 w-12 cursor-pointer place-items-center rounded-full outline-none transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-experience-focus ${
                  selected
                    ? "ring-2 ring-black ring-offset-2 ring-offset-[#F7F7F4]"
                    : "ring-1 ring-black/10 hover:ring-black/30"
                }`}
              >
                <input
                  type="radio"
                  name="product-color"
                  value={option.name}
                  checked={selected}
                  onChange={() => setSelectedColor(option.name)}
                  aria-label={`Pilih warna ${option.name}`}
                  className="sr-only"
                />
                <span
                  className="h-7 w-7 rounded-full border border-black/10"
                  style={{ backgroundColor: option.hex }}
                />
              </label>
            );
          })}
        </div>

        {hasVariants ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-charcoal/55">
            {selectedSku ? <span>SKU: {selectedSku}</span> : null}
            <span>{stockLabel}</span>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="sr-only">Pilih ukuran produk</legend>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-brand-charcoal">
            Ukuran:{" "}
            <span className="font-normal text-brand-charcoal/60">
              {selectedSize}
            </span>
          </p>
          {guideRows.length ? (
            <a
              href="#panduan-ukuran"
              className="inline-flex min-h-12 items-center text-xs font-semibold text-brand-charcoal underline-offset-4 hover:underline"
            >
              Panduan Ukuran
            </a>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {sizeOptions.map((size) => {
            const selected = size === selectedSize;
            const sizeRecord = findSize(selectedVariant, size);
            const disabled = sizeIsUnavailable(sizeRecord);

            return (
              <label
                key={size}
                className={`grid min-h-12 min-w-12 place-items-center rounded-full px-4 text-sm font-semibold outline-none transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-experience-focus ${
                  disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer"
                } ${
                  selected
                    ? "bg-brand-charcoal text-white"
                    : "bg-white/70 text-brand-charcoal ring-1 ring-black/10 hover:ring-black/25"
                }`}
              >
                <input
                  type="radio"
                  name="product-size"
                  value={size}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => setSelectedSize(size)}
                  aria-label={`Pilih ukuran ${size}`}
                  className="sr-only"
                />
                {size}
              </label>
            );
          })}
        </div>
      </fieldset>

      <section className="grid gap-4 border-y border-[#e5e5e5] py-5">
        {instantServices.length ? (
          <div className="grid gap-3 border-b border-black/10 pb-5">
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Mode pembelian">
              <button type="button" aria-pressed={!instantMode} onClick={() => setInstantMode(false)} className={`min-h-12 rounded-full px-4 text-sm font-semibold ${!instantMode ? "bg-black text-white" : "border border-black/15 bg-white"}`}>Ready Stock</button>
              <button type="button" aria-pressed={instantMode} onClick={() => setInstantMode(true)} className={`min-h-12 rounded-full px-4 text-sm font-semibold ${instantMode ? "bg-black text-white" : "border border-black/15 bg-white"}`}>Custom Instan</button>
            </div>
            {instantMode ? (
              <div className="grid gap-3">
                <p className="text-sm leading-6 text-black/60">Gunakan SKU Ready Stock yang dipilih, lalu tambahkan layanan berikut. Harga dikonfirmasi ulang oleh server saat checkout.</p>
                {instantServices.map((service) => {
                  const selected = selectedServices[service.id];
                  return (
                    <div key={service.id} className="border-t border-black/10 bg-white pt-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input type="checkbox" checked={Boolean(selected)} onChange={() => toggleInstantService(service.id)} className="mt-1 h-5 w-5" />
                        <span className="flex-1">
                          <span className="block font-semibold">{service.name}</span>
                          <span className="text-xs text-black/55">{service.description || "Harga pasti dihitung setelah konfigurasi."}</span>
                        </span>
                      </label>
                      {selected ? (
                        <div className="mt-4 grid gap-3">
                          {service.inputSchema.map((field) => (
                            <label key={field.key} className="grid gap-1 text-sm">
                              <span className="font-medium">{field.label}{field.required ? " *" : ""}</span>
                              {field.type === "select" ? (
                                <select value={selected.inputs[field.key] ?? ""} onChange={(event) => updateInstantService(service.id, { inputs: { ...selected.inputs, [field.key]: event.target.value } })} className="min-h-11 rounded-xl border border-black/15 px-3">
                                  <option value="">Pilih</option>
                                  {field.options?.map((option) => <option key={option}>{option}</option>)}
                                </select>
                              ) : field.type === "textarea" ? (
                                <textarea value={selected.inputs[field.key] ?? ""} maxLength={field.maxLength} onChange={(event) => updateInstantService(service.id, { inputs: { ...selected.inputs, [field.key]: event.target.value } })} className="min-h-24 rounded-xl border border-black/15 p-3" />
                              ) : (
                                <input type={field.type} value={selected.inputs[field.key] ?? ""} maxLength={field.maxLength} onChange={(event) => updateInstantService(service.id, { inputs: { ...selected.inputs, [field.key]: event.target.value } })} className="min-h-11 rounded-xl border border-black/15 px-3" />
                              )}
                            </label>
                          ))}
                          {service.requiresNotes ? <textarea aria-label={`Catatan ${service.name}`} placeholder="Catatan layanan *" value={selected.note} onChange={(event) => updateInstantService(service.id, { note: event.target.value })} className="min-h-24 rounded-xl border border-black/15 p-3 text-sm" /> : null}
                          {service.requiresUpload ? <label className="grid gap-1 text-sm"><span className="font-medium">File desain *</span><input type="file" accept=".ai,.cdr,.eps,.jpeg,.jpg,.pdf,.png,.psd,.svg,.zip" onChange={(event) => void uploadInstantServiceFile(service.id, event.target.files?.[0])} />{selected.uploadIds.length ? <span className="text-xs text-emerald-700">File siap</span> : null}</label> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {exactPricing && instantMode ? <p className="text-sm font-semibold">Total layanan: {formatRupiah(serviceTotal)}</p> : null}
                {serviceError ? <p role="alert" className="text-sm text-red-700">{serviceError}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">
              Jumlah pesanan
            </p>
            <p className="mt-1 text-xs text-brand-charcoal/55">
              Total jumlah menentukan harga per pcs.
            </p>
          </div>

          <div className="inline-flex min-h-12 items-center overflow-hidden rounded-full bg-white ring-1 ring-black/10">
            <button
              type="button"
              className="grid h-12 w-12 place-items-center text-lg transition hover:bg-black/5"
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
              className="h-12 w-16 bg-transparent text-center text-sm font-semibold outline-none"
              inputMode="numeric"
              aria-label="Jumlah produk"
            />
            <button
              type="button"
              className="grid h-12 w-12 place-items-center text-lg transition hover:bg-black/5"
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
                  : "bg-black/[0.06] text-black"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em]">
                {tierDescription}
              </p>
              {exactPricing && !belowMinimum ? (
                <p className="mt-2 text-sm">
                  Subtotal:{" "}
                  <span className="font-semibold">
                    {formatRupiah(payableSubtotal)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="text-right">
              <p className="text-xl font-semibold">
                {unitPriceLabel}
              </p>
              {exactPricing ? (
                <p className="text-xs opacity-70">/ pcs</p>
              ) : null}
            </div>
          </div>
        </div>
        {pricingError ? <p role="alert" className="text-sm text-red-700">{pricingError}</p> : null}

        <div className={`grid gap-2 ${showAddToCart && showBuyNow ? "sm:grid-cols-2" : ""}`}>
          {showAddToCart ? (
            <button
              type="button"
              disabled={unavailable || belowMinimum || pricingLoading || !exactPricing}
              onClick={addSelectedToCart}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/75 disabled:cursor-not-allowed disabled:bg-black/20"
            >
              {unavailable
                ? "Varian Tidak Tersedia"
                : pricingLoading
                  ? "Memuat Harga..."
                  : belowMinimum
                    ? `Minimum ${minimumQuantity} pcs`
                    : quoteRequired
                      ? "Lanjut melalui konsultasi"
                      : pricingError
                        ? "Harga belum tersedia"
                        : "Tambah ke Keranjang"}
            </button>
          ) : (
            <p className="flex min-h-12 items-center justify-center rounded-full bg-black/10 px-6 text-center text-sm font-semibold text-black/55">
              Ready Stock tidak tersedia
            </p>
          )}
          {showBuyNow ? (
            <button
              type="button"
              disabled={unavailable || belowMinimum || pricingLoading || !exactPricing}
              onClick={buySelectedNow}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-black bg-white px-6 text-sm font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/20 disabled:text-black/30"
            >
              Beli Sekarang
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

      <section className="border-y border-[#e5e5e5] py-5">
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

      {guideRows.length ? (
        <div id="panduan-ukuran" className="border-b border-[#e5e5e5]">
          <ProductDetailDisclosure
            id="product-size-guide"
            title="Panduan Ukuran"
          >
            <div className="mt-4 grid gap-2">
              {guideRows.map((row, index) => {
                const [label, ...rest] = row.split(":");
                return (
                  <div
                    key={`${row}-${index}`}
                    className="grid gap-1 border-t border-[#e5e5e5] py-3 text-sm sm:grid-cols-[100px_1fr] sm:gap-4"
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
          </ProductDetailDisclosure>
        </div>
      ) : null}
    </div>
  );
}
