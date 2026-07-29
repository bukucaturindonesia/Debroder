"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart, type CartProductInput } from "@/components/CartProvider";
import { useOptionalProductVariantGallery } from "@/components/ProductVariantGalleryContext";
import { SafeImage } from "@/components/SafeImage";
import { cartTierProductKey } from "@/lib/cart-group-tier-pricing";
import { MAX_CART_LINE_QUANTITY, MAX_CART_TOTAL_QUANTITY } from "@/lib/cart-v5";
import {
  formatPdpRupiah,
  nextPdpPricingTier,
  pdpColorOptions,
  pdpSizeOptions,
  type PdpPricingTier
} from "@/lib/pdp-purchase";
import type { ProductVariant } from "@/lib/types";
import {
  type InstantCustomSnapshot,
  type InstantServiceDefinition,
  type InstantServiceSelection
} from "@/lib/instant-custom";

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
      tiers: PdpPricingTier[];
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
      tiers: PdpPricingTier[];
      message: string;
    };

type ProductPurchasePanelProps = {
  product: CartProductInput;
  subcategory?: string | null;
  description?: string | null;
  minimumQuantity?: number;
  whatsappUrl?: string;
  variants?: ProductVariant[];
  showAddToCart?: boolean;
  monochrome?: boolean;
  instantServices?: InstantServiceDefinition[];
  initialInstantMode?: boolean;
};

function variantCoverImage(variant?: ProductVariant) {
  if (!variant) return undefined;
  const cover =
    variant.variant_images?.find((image) => image.is_cover)
    || variant.variant_images?.[0];
  return cover?.image_url || variant.image_url || variant.images?.[0];
}

function safeMinimum(value?: number) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : 1;
}

export function TieredProductPurchasePanel({
  product,
  subcategory,
  description,
  minimumQuantity = 1,
  whatsappUrl,
  variants = [],
  showAddToCart = true,
  monochrome = false,
  instantServices = [],
  initialInstantMode = false
}: ProductPurchasePanelProps) {
  const cart = useCart();
  const variantGallery = useOptionalProductVariantGallery();
  const colorFieldsetRef = useRef<HTMLFieldSetElement>(null);
  const sizeFieldsetRef = useRef<HTMLFieldSetElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const interactionLocked = useRef(false);
  const uploadSessionToken = useRef("");

  const colors = useMemo(() => pdpColorOptions(variants), [variants]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const selectedColor = colors.find((option) => option.variantId === selectedVariantId) || null;
  const sizes = useMemo(() => pdpSizeOptions(selectedColor?.variant), [selectedColor]);
  const [selectedVariantSizeId, setSelectedVariantSizeId] = useState("");
  const selectedSize = sizes.find((option) => option.variantSizeId === selectedVariantSizeId) || null;
  const initialMinimumQuantity = safeMinimum(minimumQuantity);
  const [quantityInput, setQuantityInput] = useState(String(initialMinimumQuantity));
  const [validationMessage, setValidationMessage] = useState("");
  const [cartFeedback, setCartFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (!uploadSessionToken.current) {
      uploadSessionToken.current = `instant_${crypto.randomUUID().replace(/-/g, "")}`;
    }
  }, []);

  useEffect(() => {
    if (selectedVariantId && !colors.some((option) => option.variantId === selectedVariantId)) {
      setSelectedVariantId("");
      setSelectedVariantSizeId("");
    }
  }, [colors, selectedVariantId]);

  useEffect(() => {
    variantGallery?.selectVariant(selectedVariantId || null);
  }, [selectedVariantId, variantGallery]);

  const quantity = Number(quantityInput);
  const quantityIsInteger = /^\d+$/.test(quantityInput)
    && Number.isSafeInteger(quantity)
    && quantity > 0;
  const selectedStockLimit = selectedSize
    ? Math.min(MAX_CART_LINE_QUANTITY, selectedSize.stock)
    : MAX_CART_LINE_QUANTITY;
  const quantityWithinStock = quantityIsInteger && quantity <= selectedStockLimit;

  const existingProductQuantity = product.id
    ? cart.items.reduce(
        (total, item) =>
          cartTierProductKey(item) === product.id ? total + item.quantity : total,
        0
      )
    : 0;
  const pricingQuantity = quantityIsInteger ? quantity + existingProductQuantity : 0;
  const pricingQuantityValid = pricingQuantity > 0
    && pricingQuantity <= MAX_CART_TOTAL_QUANTITY;

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
    variantSizeId: selectedSize?.variantSizeId ?? "",
    quantity: quantityIsInteger ? quantity : 0,
    pricingQuantity: pricingQuantityValid ? pricingQuantity : 0,
    instantServices: instantMode ? instantSelections : []
  }), [
    instantMode,
    instantSelections,
    pricingQuantity,
    pricingQuantityValid,
    product.id,
    quantity,
    quantityIsInteger,
    selectedSize?.variantSizeId
  ]);
  const pricingRequestKey = useMemo(() => JSON.stringify(pricingRequest), [pricingRequest]);
  const pricing = pricingResult?.requestKey === pricingRequestKey
    ? pricingResult.value
    : null;

  useEffect(() => {
    if (
      !pricingRequest.productId
      || !pricingRequest.variantSizeId
      || !pricingRequest.quantity
      || !pricingRequest.pricingQuantity
      || !quantityWithinStock
    ) {
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
          || !Array.isArray(payload.tiers)
        ) {
          throw new Error("PRICE_RESPONSE_MISMATCH");
        }
        setPricingResult({ requestKey: pricingRequestKey, value: payload });
        if (payload.status === "unavailable") setPricingError(payload.message);
      } catch {
        if (controller.signal.aborted) return;
        setPricingResult(null);
        setPricingError("Harga belum dapat dikonfirmasi. Coba lagi.");
      } finally {
        if (!controller.signal.aborted) setPricingLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pricingRequest, pricingRequestKey, quantityWithinStock]);

  const effectiveMinimumQuantity = pricing?.minimumQuantity ?? initialMinimumQuantity;
  const belowMinimum = quantityIsInteger && quantity < effectiveMinimumQuantity;
  const exactPricing = pricing?.status === "priced" ? pricing : null;
  const quoteRequired = pricing?.status === "quotation_required";
  const unavailable = selectedColor?.disabled
    || selectedSize?.disabled
    || pricing?.status === "unavailable";
  const tiers = pricing?.tiers || [];
  const nextTier = nextPdpPricingTier(tiers, pricing?.pricingQuantity ?? pricingQuantity);
  const stockAvailable = pricing?.stockAvailable ?? selectedSize?.stock ?? 0;
  const selectedSku = exactPricing?.sku
    ?? selectedSize?.sku
    ?? selectedColor?.variant.sku
    ?? product.sku;
  const basePriceLabel = formatPdpRupiah(product.priceValue)
    || formatPdpRupiah(product.priceLabel)
    || "Harga belum tersedia";
  const currentUnitPriceLabel = exactPricing
    ? formatPdpRupiah(exactPricing.unitPrice)
    : basePriceLabel;
  const purchaseReady = Boolean(
    selectedColor
    && selectedSize
    && quantityWithinStock
    && pricingQuantityValid
    && !belowMinimum
    && !unavailable
    && !pricingLoading
    && exactPricing
    && (!instantMode || (instantSelections.length > 0 && !uploadingServiceId))
  );

  function chooseColor(variantId: string) {
    const nextColor = colors.find((option) => option.variantId === variantId);
    if (!nextColor || nextColor.disabled) return;
    const previousSizeName = selectedSize?.name;
    const compatibleSize = previousSizeName
      ? pdpSizeOptions(nextColor.variant).find(
          (option) => option.name === previousSizeName && !option.disabled
        )
      : null;
    setSelectedVariantId(variantId);
    setSelectedVariantSizeId(compatibleSize?.variantSizeId || "");
    setValidationMessage("");
    setCartFeedback("");
  }

  function chooseSize(variantSizeId: string) {
    const nextSize = sizes.find((option) => option.variantSizeId === variantSizeId);
    if (!nextSize || nextSize.disabled) return;
    setSelectedVariantSizeId(variantSizeId);
    setValidationMessage("");
    setCartFeedback("");
  }

  function changeQuantity(nextValue: string) {
    setQuantityInput(nextValue);
    setCartFeedback("");
    if (!/^\d+$/.test(nextValue) || Number(nextValue) < 1) {
      setValidationMessage("Jumlah harus berupa angka bulat minimal 1.");
      return;
    }
    const nextQuantity = Number(nextValue);
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity > selectedStockLimit) {
      setValidationMessage(`Jumlah maksimum untuk pilihan ini ${selectedStockLimit} pcs.`);
      return;
    }
    if (nextQuantity + existingProductQuantity > MAX_CART_TOTAL_QUANTITY) {
      setValidationMessage(`Total produk di keranjang tidak boleh melebihi ${MAX_CART_TOTAL_QUANTITY} pcs.`);
      return;
    }
    setValidationMessage("");
  }

  function decrementQuantity() {
    if (!quantityIsInteger || quantity <= 1) {
      setValidationMessage("Jumlah minimum adalah 1 pcs.");
      quantityInputRef.current?.focus();
      return;
    }
    changeQuantity(String(quantity - 1));
  }

  function incrementQuantity() {
    const nextQuantity = quantityIsInteger ? quantity + 1 : 1;
    if (nextQuantity > selectedStockLimit) {
      setValidationMessage(`Stok pilihan ini maksimal ${selectedStockLimit} pcs.`);
      quantityInputRef.current?.focus();
      return;
    }
    changeQuantity(String(nextQuantity));
  }

  function focusFirstInvalidControl() {
    if (!selectedColor) {
      setValidationMessage("Pilih warna yang tersedia terlebih dahulu.");
      colorFieldsetRef.current?.focus();
      return false;
    }
    if (!selectedSize) {
      setValidationMessage("Pilih ukuran yang tersedia terlebih dahulu.");
      sizeFieldsetRef.current?.focus();
      return false;
    }
    if (!quantityWithinStock || !pricingQuantityValid) {
      setValidationMessage(
        quantityIsInteger
          ? `Jumlah maksimum untuk pilihan ini ${selectedStockLimit} pcs.`
          : "Masukkan jumlah dalam angka bulat."
      );
      quantityInputRef.current?.focus();
      return false;
    }
    if (belowMinimum) {
      setValidationMessage(`Minimum pembelian ${effectiveMinimumQuantity} pcs.`);
      quantityInputRef.current?.focus();
      return false;
    }
    if (pricingLoading) {
      setValidationMessage("Tunggu harga selesai dikonfirmasi.");
      return false;
    }
    if (quoteRequired) {
      setValidationMessage(pricing.message);
      return false;
    }
    if (unavailable) {
      setValidationMessage(pricingError || "Pilihan ini sedang tidak tersedia.");
      return false;
    }
    if (!exactPricing) {
      setValidationMessage(pricingError || "Harga belum dapat dikonfirmasi. Coba lagi.");
      return false;
    }
    if (instantMode && (instantSelections.length === 0 || uploadingServiceId)) {
      setValidationMessage(
        uploadingServiceId
          ? "Tunggu file selesai diunggah."
          : "Pilih minimal satu layanan Custom Instan."
      );
      return false;
    }
    return true;
  }

  function addSelectedToCart() {
    if (!focusFirstInvalidControl() || !exactPricing || !selectedColor || !selectedSize) {
      return;
    }
    if (interactionLocked.current) return;
    interactionLocked.current = true;
    setSubmitting(true);
    setValidationMessage("");
    setCartFeedback("");

    cart.addItem({
      ...product,
      priceLabel: formatPdpRupiah(exactPricing.unitPrice),
      priceValue: exactPricing.unitPrice,
      imageUrl: variantCoverImage(selectedColor.variant) || product.imageUrl,
      defaultColor: selectedColor.name,
      defaultColorHex: selectedColor.hex || undefined,
      defaultSize: selectedSize.name,
      defaultQuantity: quantity,
      variantId: exactPricing.variantId,
      variantSizeId: exactPricing.variantSizeId,
      variantName: selectedColor.variant.variant_name || selectedColor.variant.color_name,
      variantSku: exactPricing.sku,
      stockLabel: `Stok ${exactPricing.stockAvailable}`,
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
        pricing_tiers: exactPricing.tiers,
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
    setCartFeedback(`${product.name} berhasil ditambahkan ke keranjang.`);
    window.setTimeout(() => {
      interactionLocked.current = false;
      setSubmitting(false);
    }, 500);
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

  function updateInstantService(
    serviceId: string,
    patch: Partial<{ inputs: Record<string, string>; note: string }>
  ) {
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
      if (!response.ok || typeof upload?.id !== "string") {
        throw new Error("Upload file layanan gagal.");
      }
      const uploadId = upload.id;
      setSelectedServices((current) => ({
        ...current,
        [serviceId]: {
          ...(current[serviceId] ?? { inputs: {}, uploadIds: [], note: "" }),
          uploadIds: [uploadId]
        }
      }));
    } catch {
      setServiceError("File belum dapat diunggah. Periksa file lalu coba lagi.");
    } finally {
      setUploadingServiceId(null);
    }
  }

  return (
    <div className="min-w-0 pb-[max(0px,env(safe-area-inset-bottom))]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/50">
          {[product.category, subcategory].filter(Boolean).join(" · ")}
        </p>
        <h1 className="mt-3 max-w-xl text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[40px]">
          {product.name}
        </h1>
        <div className="mt-4" aria-live="polite" aria-atomic="true">
          <p className="text-2xl font-semibold tracking-[-0.02em] text-brand-charcoal">
            {currentUnitPriceLabel}
          </p>
          <p className="mt-1 text-xs text-brand-charcoal/55">
            {exactPricing ? "Harga per pcs untuk pilihan aktif" : "Harga dasar"}
            {pricingLoading ? " · Mengonfirmasi harga…" : ""}
          </p>
        </div>
        {description ? (
          <p className="mt-5 max-w-xl text-[15px] leading-6 text-brand-charcoal/65">
            {description}
          </p>
        ) : null}
      </header>

      <div className="mt-8 grid gap-7">
        <fieldset
          ref={colorFieldsetRef}
          tabIndex={-1}
          aria-describedby="pdp-purchase-feedback"
          className="min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-4"
        >
          <legend className="text-sm font-semibold text-brand-charcoal">
            Pilih warna
            {selectedColor ? <span className="font-normal text-brand-charcoal/60"> · {selectedColor.name}</span> : null}
          </legend>
          {colors.length ? (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {colors.map((option) => {
                const selected = option.variantId === selectedVariantId;
                return (
                  <button
                    key={option.variantId}
                    type="button"
                    aria-label={`${option.name}${option.disabled ? ", tidak tersedia" : ""}`}
                    aria-pressed={selected}
                    disabled={option.disabled}
                    onClick={() => chooseColor(option.variantId)}
                    className={`group min-w-0 rounded-sm text-left outline-none transition focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                      selected ? "ring-2 ring-black ring-offset-2" : "ring-1 ring-black/15 hover:ring-black/45"
                    }`}
                  >
                    <span className="relative block aspect-[4/5] overflow-hidden bg-[#f3f3ef]">
                      {option.imageUrl ? (
                        <SafeImage
                          src={option.imageUrl}
                          alt={`${product.name} warna ${option.name}`}
                          unavailableLabel="Foto tidak tersedia"
                          fill
                          className="object-cover"
                          objectFit="cover"
                          sizes="96px"
                        />
                      ) : option.hex ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-3 rounded-full border border-black/15"
                          style={{ backgroundColor: option.hex }}
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center px-2 text-center text-[10px] font-semibold text-black/45">
                          Foto tidak tersedia
                        </span>
                      )}
                    </span>
                    <span className="block truncate px-2 py-2 text-center text-[11px] font-semibold">
                      {option.name}
                    </span>
                    {option.disabled ? (
                      <span className="block px-2 pb-2 text-center text-[10px] font-semibold text-red-700">
                        Tidak tersedia
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 border border-black/10 bg-[#f7f7f4] p-4 text-sm text-brand-charcoal/60">
              Pilihan warna belum tersedia untuk produk ini.
            </p>
          )}
        </fieldset>

        <fieldset
          ref={sizeFieldsetRef}
          tabIndex={-1}
          aria-describedby="pdp-purchase-feedback"
          className="min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-4"
        >
          <legend className="text-sm font-semibold text-brand-charcoal">
            Pilih ukuran
            {selectedSize ? <span className="font-normal text-brand-charcoal/60"> · {selectedSize.name}</span> : null}
          </legend>
          {!selectedColor ? (
            <p className="mt-3 text-sm text-brand-charcoal/55">Pilih warna untuk melihat ukuran yang tersedia.</p>
          ) : sizes.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {sizes.map((option) => {
                const selected = option.variantSizeId === selectedVariantSizeId;
                return (
                  <button
                    key={option.variantSizeId}
                    type="button"
                    aria-label={`Ukuran ${option.name}${option.disabled ? ", stok habis" : `, stok ${option.stock}`}`}
                    aria-pressed={selected}
                    disabled={option.disabled}
                    onClick={() => chooseSize(option.variantSizeId)}
                    className={`relative min-h-12 border px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                      selected
                        ? "border-black bg-black text-white"
                        : option.disabled
                          ? "border-black/10 bg-black/[0.035] text-black/40"
                          : "border-black/20 bg-white text-black hover:border-black"
                    }`}
                  >
                    <span className={option.disabled ? "line-through" : ""}>{option.name}</span>
                    {option.disabled ? <span className="ml-1 text-[10px] no-underline">Habis</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 border border-black/10 bg-[#f7f7f4] p-4 text-sm text-brand-charcoal/60">
              Ukuran canonical belum tersedia untuk warna ini.
            </p>
          )}
          {selectedColor ? (
            <p className="mt-3 text-xs text-brand-charcoal/55">
              {[selectedSku ? `SKU ${selectedSku}` : null, selectedSize ? `Stok ${stockAvailable}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </fieldset>

        {instantServices.length ? (
          <section className="border-y border-black/10 py-5" aria-labelledby="instant-mode-title">
            <h2 id="instant-mode-title" className="text-sm font-semibold">Pilihan layanan</h2>
            <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Mode pembelian">
              <button
                type="button"
                aria-pressed={!instantMode}
                onClick={() => setInstantMode(false)}
                className={`min-h-12 rounded-full px-4 text-sm font-semibold ${!instantMode ? "bg-black text-white" : "border border-black/15 bg-white"}`}
              >
                Ready Stock
              </button>
              <button
                type="button"
                aria-pressed={instantMode}
                onClick={() => setInstantMode(true)}
                className={`min-h-12 rounded-full px-4 text-sm font-semibold ${instantMode ? "bg-black text-white" : "border border-black/15 bg-white"}`}
              >
                Custom Instan
              </button>
            </div>
            {instantMode ? (
              <div className="mt-4 grid gap-4">
                {instantServices.map((service) => {
                  const selected = selectedServices[service.id];
                  return (
                    <div key={service.id} className="border-t border-black/10 pt-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={() => toggleInstantService(service.id)}
                          className="mt-1 h-5 w-5"
                        />
                        <span className="flex-1">
                          <span className="block font-semibold">{service.name}</span>
                          {service.description ? <span className="text-xs text-black/55">{service.description}</span> : null}
                        </span>
                      </label>
                      {selected ? (
                        <div className="mt-4 grid gap-3">
                          {service.inputSchema.map((field) => (
                            <label key={field.key} className="grid gap-1 text-sm">
                              <span className="font-medium">{field.label}{field.required ? " *" : ""}</span>
                              {field.type === "select" ? (
                                <select
                                  value={selected.inputs[field.key] ?? ""}
                                  onChange={(event) => updateInstantService(service.id, {
                                    inputs: { ...selected.inputs, [field.key]: event.target.value }
                                  })}
                                  className="min-h-11 rounded-xl border border-black/15 px-3"
                                >
                                  <option value="">Pilih</option>
                                  {field.options?.map((option) => <option key={option}>{option}</option>)}
                                </select>
                              ) : field.type === "textarea" ? (
                                <textarea
                                  value={selected.inputs[field.key] ?? ""}
                                  maxLength={field.maxLength}
                                  onChange={(event) => updateInstantService(service.id, {
                                    inputs: { ...selected.inputs, [field.key]: event.target.value }
                                  })}
                                  className="min-h-24 rounded-xl border border-black/15 p-3"
                                />
                              ) : (
                                <input
                                  type={field.type}
                                  value={selected.inputs[field.key] ?? ""}
                                  maxLength={field.maxLength}
                                  onChange={(event) => updateInstantService(service.id, {
                                    inputs: { ...selected.inputs, [field.key]: event.target.value }
                                  })}
                                  className="min-h-11 rounded-xl border border-black/15 px-3"
                                />
                              )}
                            </label>
                          ))}
                          {service.requiresNotes ? (
                            <textarea
                              aria-label={`Catatan ${service.name}`}
                              placeholder="Catatan layanan *"
                              value={selected.note}
                              onChange={(event) => updateInstantService(service.id, { note: event.target.value })}
                              className="min-h-24 rounded-xl border border-black/15 p-3 text-sm"
                            />
                          ) : null}
                          {service.requiresUpload ? (
                            <label className="grid gap-1 text-sm">
                              <span className="font-medium">File desain *</span>
                              <input
                                type="file"
                                accept=".ai,.cdr,.eps,.jpeg,.jpg,.pdf,.png,.psd,.svg,.zip"
                                onChange={(event) => void uploadInstantServiceFile(service.id, event.target.files?.[0])}
                              />
                              {selected.uploadIds.length ? <span className="text-xs text-emerald-700">File siap</span> : null}
                            </label>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {exactPricing && instantMode ? (
                  <p className="text-sm font-semibold">Total layanan: {formatPdpRupiah(exactPricing.serviceTotal)}</p>
                ) : null}
                {serviceError ? <p role="alert" className="text-sm text-red-700">{serviceError}</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="pdp-quantity-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="pdp-quantity-title" className="text-sm font-semibold">Jumlah</h2>
              <p className="mt-1 text-xs text-brand-charcoal/55">
                Minimum {effectiveMinimumQuantity} pcs · Maksimum pilihan {selectedStockLimit} pcs
              </p>
            </div>
            <div className="inline-flex min-h-12 items-center overflow-hidden rounded-full border border-black/15 bg-white">
              <button
                type="button"
                disabled={quantityIsInteger && quantity <= 1}
                onClick={decrementQuantity}
                aria-label="Kurangi jumlah"
                className="grid h-12 w-12 place-items-center text-lg outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-experience-focus disabled:cursor-not-allowed disabled:opacity-30"
              >
                −
              </button>
              <input
                ref={quantityInputRef}
                value={quantityInput}
                onChange={(event) => changeQuantity(event.target.value)}
                onBlur={() => {
                  if (!quantityWithinStock) {
                    setValidationMessage(
                      quantityIsInteger
                        ? `Jumlah maksimum untuk pilihan ini ${selectedStockLimit} pcs.`
                        : "Jumlah harus berupa angka bulat minimal 1."
                    );
                  }
                }}
                min={1}
                max={selectedStockLimit}
                step={1}
                inputMode="numeric"
                aria-label="Jumlah produk"
                aria-invalid={!quantityWithinStock}
                aria-describedby="pdp-purchase-feedback"
                className="h-12 w-16 bg-transparent text-center text-sm font-semibold outline-none"
              />
              <button
                type="button"
                disabled={quantityIsInteger && quantity >= selectedStockLimit}
                onClick={incrementQuantity}
                aria-label="Tambah jumlah"
                className="grid h-12 w-12 place-items-center text-lg outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-experience-focus disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="pdp-tier-title">
          <h2 id="pdp-tier-title" className="text-sm font-semibold">Harga berdasarkan jumlah</h2>
          {tiers.length ? (
            <>
              <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
                {tiers.map((tier) => {
                  const active = exactPricing?.tier?.id === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`grid grid-cols-[1fr_auto] gap-4 py-3 text-sm ${active ? "font-semibold text-black" : "text-black/60"}`}
                      aria-current={active ? "true" : undefined}
                    >
                      <span>
                        {tier.minQuantity}–{tier.maxQuantity ?? "seterusnya"} pcs
                        {active ? " · Aktif" : ""}
                      </span>
                      <span>{tier.quoteRequired || tier.unitPrice === null ? "Penawaran resmi" : `${formatPdpRupiah(tier.unitPrice)} / pcs`}</span>
                    </div>
                  );
                })}
              </div>
              {nextTier ? (
                <p className="mt-3 text-xs leading-5 text-brand-charcoal/60">
                  Tambahkan {Math.max(0, nextTier.minQuantity - (pricing?.pricingQuantity ?? pricingQuantity))} pcs untuk tier berikutnya.
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/55">
              {selectedSize
                ? pricingLoading
                  ? "Mengonfirmasi harga untuk jumlah ini…"
                  : "Produk ini tidak memiliki tier harga tambahan."
                : "Pilih warna dan ukuran untuk melihat harga berdasarkan jumlah."}
            </p>
          )}
        </section>

        <section
          className={`border p-5 ${monochrome ? "border-black/20 bg-black/[0.035]" : "border-[#d8e5dc] bg-[#f4f8f5]"}`}
          aria-labelledby="pdp-subtotal-title"
          aria-live="polite"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="pdp-subtotal-title" className="text-sm font-semibold">Subtotal</h2>
              <p className="mt-1 text-xs text-brand-charcoal/55">
                {exactPricing
                  ? `${quantity} pcs × ${formatPdpRupiah(exactPricing.unitPrice)}`
                  : "Lengkapi pilihan untuk melihat subtotal."}
              </p>
            </div>
            <p className="text-right text-2xl font-semibold tracking-[-0.02em]">
              {exactPricing ? formatPdpRupiah(exactPricing.total) : "—"}
            </p>
          </div>
        </section>

        <div>
          {showAddToCart ? (
            <button
              type="button"
              aria-disabled={!purchaseReady}
              aria-describedby="pdp-purchase-feedback"
              disabled={submitting}
              onClick={addSelectedToCart}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-black px-6 text-base font-semibold text-white outline-none transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-black/45"
            >
              {submitting ? "Menambahkan…" : "Tambah ke Keranjang"}
            </button>
          ) : (
            <p className="flex min-h-14 items-center justify-center rounded-full bg-black/10 px-6 text-center text-sm font-semibold text-black/55">
              Ready Stock tidak tersedia
            </p>
          )}
          <div id="pdp-purchase-feedback" className="mt-3 min-h-5 text-sm" aria-live="assertive">
            {validationMessage || pricingError || serviceError ? (
              <p role="alert" className="text-red-700">{validationMessage || pricingError || serviceError}</p>
            ) : cartFeedback ? (
              <p role="status" className="text-emerald-700">{cartFeedback}</p>
            ) : (
              <p className="text-brand-charcoal/55">
                {!selectedColor
                  ? "Pilih warna untuk melanjutkan."
                  : !selectedSize
                    ? "Pilih ukuran untuk melanjutkan."
                    : pricingLoading
                      ? "Harga sedang dikonfirmasi."
                      : exactPricing
                        ? "Pilihan siap ditambahkan."
                        : "Harga perlu dikonfirmasi sebelum masuk keranjang."}
              </p>
            )}
          </div>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-1 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2"
            >
              Butuh bantuan memilih? Hubungi WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
