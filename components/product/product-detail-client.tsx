"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  CartItem,
  CustomService,
  CustomerUploadRef,
  PimProduct as Product,
  ProductConfigurationSnapshot,
  ProductSize,
  RevalidationResult
} from "@/lib/types";
import {
  applyProductTierToItems,
  createServiceAllocation,
  getProductTotalQuantity,
  summarizeBulkOrder,
  validateServiceQuantityInputs,
  validateServiceSelections
} from "@/lib/bulk-ordering";
import {
  clearProductConfiguration,
  decodeConfigurationFromShare,
  encodeConfigurationForShare,
  readProductConfiguration,
  writeProductConfiguration
} from "@/lib/configuration-storage";
import { addItemsToCart } from "@/lib/cart/storage";
import {
  createCartItem,
  getCartQuantity,
  mergeCartItems,
  updateCartItemQuantity,
  validateSelection
} from "@/lib/cart/operations";
import { formatRupiah } from "@/lib/money";
import {
  getActiveVariantSizes,
  getActiveVariants,
  getDefaultVariant,
  isVariantOutOfStock,
  sortVariantImages
} from "@/lib/product-utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface ProductDetailClientProps {
  product: Product;
  initialColorSlug: string | null;
  customServices: CustomService[];
}

type MessageTone = "warning" | "danger" | null;

export function ProductDetailClient({
  product,
  initialColorSlug,
  customServices
}: ProductDetailClientProps) {
  const defaultVariant = useMemo(
    () => getDefaultVariant(product, initialColorSlug),
    [product, initialColorSlug]
  );
  const activeVariants = useMemo(() => getActiveVariants(product), [product]);
  const [selectedVariantId, setSelectedVariantId] = useState(
    defaultVariant?.id ?? ""
  );
  const selectedVariant =
    activeVariants.find((variant) => variant.id === selectedVariantId) ??
    defaultVariant;
  const activeSizes = useMemo(
    () => (selectedVariant ? getActiveVariantSizes(selectedVariant) : []),
    [selectedVariant]
  );
  const allActiveSizes = useMemo(() => {
    const uniqueSizes = new Map<string, ProductSize>();

    for (const variant of activeVariants) {
      for (const variantSize of getActiveVariantSizes(variant)) {
        uniqueSizes.set(variantSize.size.id, variantSize.size);
      }
    }

    return [...uniqueSizes.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [activeVariants]);
  const [selectedVariantSizeId, setSelectedVariantSizeId] = useState("");
  const selectedVariantSize =
    activeSizes.find((variantSize) => variantSize.id === selectedVariantSizeId) ??
    null;
  const [quantity, setQuantity] = useState(1);
  const [bulkMode, setBulkMode] = useState(false);
  const [draftItems, setDraftItems] = useState<CartItem[]>([]);
  const [serviceSelections, setServiceSelections] = useState<
    Record<string, boolean>
  >({});
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const [serviceNotes, setServiceNotes] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [generalNote, setGeneralNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [uploadRefs, setUploadRefs] = useState<CustomerUploadRef[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>(null);

  const images = selectedVariant ? sortVariantImages(selectedVariant.images) : [];
  const totalQuantity = getProductTotalQuantity(draftItems);
  const selectedCustomServices = useMemo(
    () =>
      customServices.filter(
        (service) => service.status === "active" && serviceSelections[service.slug]
      ),
    [customServices, serviceSelections]
  );
  const tieredItems = useMemo(
    () => applyProductTierToItems(product, draftItems),
    [product, draftItems]
  );
  const configuredItems = useMemo(
    () =>
      tieredItems.map((item, index) => {
        const services = selectedCustomServices.flatMap((service) => {
          if (service.pricingType === "fixed_per_order" && index > 0) {
            return [];
          }

          const allocatedQuantity =
            service.pricingType === "fixed_per_order"
              ? 1
              : getAllocatedServiceQuantity(
                  tieredItems,
                  index,
                  serviceQuantities[service.slug] ?? totalQuantity
                );

          if (allocatedQuantity < 1) {
            return [];
          }

          return [
            createServiceAllocation(
              service,
              allocatedQuantity,
              serviceNotes[service.slug]
            )
          ];
        });
        const estimatedServiceTotal = services.reduce(
          (sum, service) =>
            sum +
            (service.unit_price === null
              ? 0
              : service.unit_price * service.quantity) +
            (service.flat_price ?? 0),
          0
        );

        return {
          ...item,
          line_note: itemNotes[item.product_variant_size_id] ?? item.line_note,
          services,
          upload_refs: uploadRefs,
          estimated_service_total: estimatedServiceTotal,
          final_service_total: services.some((service) => service.quote_required)
            ? undefined
            : estimatedServiceTotal,
          requires_review:
            item.requires_review ||
            services.some((service) => service.quote_required) ||
            selectedCustomServices.some(
              (service) => service.requiresUpload && uploadRefs.length === 0
            )
        };
      }),
    [
      generalNote,
      itemNotes,
      selectedCustomServices,
      serviceNotes,
      serviceQuantities,
      tieredItems,
      totalQuantity,
      uploadRefs
    ]
  );
  const bulkSummary = useMemo(
    () => summarizeBulkOrder(product, configuredItems),
    [product, configuredItems]
  );
  const serviceIssues = useMemo(
    () => [
      ...validateServiceSelections(selectedCustomServices, totalQuantity),
      ...validateServiceQuantityInputs(
        selectedCustomServices,
        totalQuantity,
        serviceQuantities
      )
    ],
    [selectedCustomServices, serviceQuantities, totalQuantity]
  );
  const requiresDesignUpload = selectedCustomServices.some(
    (service) => service.requiresUpload
  );
  const uploadAccept = useMemo(() => {
    const extensions = selectedCustomServices
      .filter((service) => service.requiresUpload)
      .flatMap((service) => service.allowedFileTypes);
    const uniqueExtensions =
      extensions.length > 0
        ? extensions
        : ["png", "jpg", "jpeg", "pdf", "svg", "ai", "eps", "zip"];

    return [...new Set(uniqueExtensions)]
      .map((extension) => `.${extension}`)
      .join(",");
  }, [selectedCustomServices]);
  const missingDesignUpload = requiresDesignUpload && uploadRefs.length === 0;
  const previewUnitPrice =
    configuredItems[0]?.unit_price ??
    product.basePrice +
      (selectedVariant?.priceAdjustment ?? 0) +
      (selectedVariantSize?.priceAdjustment ?? 0) +
      (selectedVariantSize?.size.priceAdjustment ?? 0);
  const configurationSnapshot = useMemo(
    () =>
      createConfigurationSnapshot(
        product,
        configuredItems,
        generalNote,
        uploadRefs
      ),
    [configuredItems, generalNote, product, uploadRefs]
  );

  useEffect(() => {
    const storedToken = window.localStorage.getItem("debroder_quote_session");
    const nextToken =
      storedToken ??
      (window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

    window.localStorage.setItem("debroder_quote_session", nextToken);
    setSessionToken(nextToken);

    const search = new URL(window.location.href).searchParams;
    const shared = search.get("config");
    const snapshot = shared
      ? decodeConfigurationFromShare(shared)
      : readProductConfiguration();

    if (snapshot?.product_id === product.id) {
      const restoredServiceSelections: Record<string, boolean> = {};
      const restoredServiceQuantities: Record<string, number> = {};
      const restoredServiceNotes: Record<string, string> = {};

      for (const item of snapshot.items) {
        for (const service of item.services ?? []) {
          restoredServiceSelections[service.service_slug] = true;
          restoredServiceQuantities[service.service_slug] =
            (restoredServiceQuantities[service.service_slug] ?? 0) +
            service.quantity;
          if (service.note) {
            restoredServiceNotes[service.service_slug] = service.note;
          }
        }
      }

      setDraftItems(snapshot.items);
      setGeneralNote(snapshot.note);
      setItemNotes(
        Object.fromEntries(
          snapshot.items
            .filter((item) => item.line_note)
            .map((item) => [item.product_variant_size_id, item.line_note ?? ""])
        )
      );
      setServiceSelections(restoredServiceSelections);
      setServiceQuantities(restoredServiceQuantities);
      setServiceNotes(restoredServiceNotes);
      setUploadRefs(snapshot.upload_refs ?? []);
      setBulkMode(snapshot.items.length > 1);
    }
  }, [product.id]);

  useEffect(() => {
    writeProductConfiguration(configurationSnapshot);
  }, [configurationSnapshot]);

  function chooseVariant(variantId: string, colorSlug: string) {
    setSelectedVariantId(variantId);
    setSelectedVariantSizeId("");
    setQuantity(1);
    window.history.replaceState(null, "", `?color=${colorSlug}`);
  }

  function addChoice() {
    if (!selectedVariant || !selectedVariantSize) {
      setNotice("Pilih warna dan ukuran aktif terlebih dahulu.", "danger");
      return;
    }

    const issues = validateSelection(selectedVariant, selectedVariantSize, quantity);
    if (issues.some((issue) => issue.severity === "error")) {
      setNotice(issues.map((issue) => issue.message).join(" "), "danger");
      return;
    }

    const cartItem = createCartItem(
      product,
      selectedVariant,
      selectedVariantSize,
      quantity
    );
    const mergeResult = mergeCartItems(draftItems, [cartItem]);
    setDraftItems(mergeResult.items);
    setNotice(
      mergeResult.warnings[0] ?? "Pilihan ditambahkan.",
      mergeResult.warnings.length > 0 ? "warning" : null
    );
  }

  async function addAllToCart() {
    if (configuredItems.length === 0) {
      setNotice("Belum ada pilihan produk.", "danger");
      return;
    }

    const blockingIssues = [...bulkSummary.issues, ...serviceIssues].filter(
      (issue) => issue.severity === "error"
    );
    if (blockingIssues.length > 0) {
      setNotice(blockingIssues.map((issue) => issue.message).join(" "), "danger");
      return;
    }

    setIsAddingCart(true);

    try {
      const response = await fetch("/api/cart/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: configuredItems.map((item) => ({
            product_id: item.product_id,
            product_variant_size_id: item.product_variant_size_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            price_tier_id: item.price_tier?.tier_id ?? null
          }))
        })
      });

      if (!response.ok) {
        setNotice("Validasi stok dan harga gagal. Coba lagi.", "danger");
        return;
      }

      const payload = (await response.json()) as { items?: RevalidationResult[] };
      const blockingMessages =
        payload.items
          ?.filter((item) => item.status !== "ok")
          .map((item) => item.message ?? "Data produk berubah.") ?? [];

      if (blockingMessages.length > 0) {
        setNotice(blockingMessages.join(" "), "warning");
        return;
      }

      const warnings = addItemsToCart(configuredItems);
      setDraftItems([]);
      clearProductConfiguration();
      setNotice(
        warnings[0] ??
          (missingDesignUpload
            ? "Masuk keranjang. Desain dapat dilengkapi saat penawaran."
            : "Semua pilihan masuk keranjang."),
        warnings.length > 0 || missingDesignUpload ? "warning" : null
      );
    } finally {
      setIsAddingCart(false);
    }
  }

  function updateDraftQuantity(productVariantSizeId: string, nextQuantity: number) {
    const result = updateCartItemQuantity(
      draftItems,
      productVariantSizeId,
      nextQuantity
    );
    setDraftItems(result.items);
    if (result.warnings.length > 0) {
      setNotice(result.warnings.join(" "), "warning");
    }
  }

  function updateMatrixQuantity(
    variantId: string,
    sizeId: string,
    nextQuantity: number
  ) {
    const variant = activeVariants.find((candidate) => candidate.id === variantId);
    const variantSize = variant?.sizes.find(
      (candidate) => candidate.size.id === sizeId
    );

    if (!variant || !variantSize) {
      return;
    }

    const cappedQuantity = Math.min(
      Math.max(0, Number.isFinite(nextQuantity) ? nextQuantity : 0),
      variantSize.stockQuantity
    );

    if (cappedQuantity < nextQuantity) {
      setNotice(
        `Stok ${variant.name} ukuran ${variantSize.size.name} hanya tersisa ${variantSize.stockQuantity} pcs.`,
        "warning"
      );
    }

    setDraftItems((current) => {
      const remaining = current.filter(
        (item) => item.product_variant_size_id !== variantSize.id
      );

      if (cappedQuantity < 1) {
        return remaining;
      }

      return [
        ...remaining,
        createCartItem(product, variant, variantSize, cappedQuantity)
      ];
    });
  }

  async function uploadDesign(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_token", sessionToken);

    try {
      const response = await fetch("/api/customer-uploads", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as {
        upload?: CustomerUploadRef;
        error?: string;
      };

      if (!response.ok || !payload.upload) {
        setNotice(
          "File desain belum dapat diunggah. Periksa jenis dan ukuran file lalu coba lagi.",
          response.status === 503 ? "warning" : "danger"
        );
        return;
      }

      setUploadRefs((current) => [...current, payload.upload as CustomerUploadRef]);
      setNotice("File desain berhasil disimpan.", null);
    } finally {
      setIsUploading(false);
    }
  }

  async function removeUpload(upload: CustomerUploadRef) {
    if (!upload.storage_path) {
      setUploadRefs((current) => current.filter((item) => item !== upload));
      return;
    }

    const response = await fetch("/api/customer-uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_token: sessionToken,
        storage_path: upload.storage_path
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setNotice("File belum dapat dihapus. Coba lagi.", "danger");
      return;
    }

    setUploadRefs((current) =>
      current.filter((item) => item.storage_path !== upload.storage_path)
    );
    setNotice("File desain dihapus.", null);
  }

  async function shareConfiguration() {
    if (configuredItems.length === 0) {
      setNotice("Belum ada konfigurasi untuk dibagikan.", "danger");
      return;
    }

    const token = encodeConfigurationForShare(configurationSnapshot);
    const url = new URL(window.location.href);
    url.searchParams.set("config", token);
    const nextUrl = url.toString();
    window.history.replaceState(null, "", nextUrl);
    setShareUrl(nextUrl);

    try {
      await window.navigator.clipboard.writeText(nextUrl);
      setNotice("Tautan konfigurasi disalin.", null);
    } catch {
      setNotice("Tautan konfigurasi siap.", null);
    }
  }

  async function saveQuotationDraft() {
    if (configuredItems.length === 0) {
      setNotice("Belum ada pilihan produk.", "danger");
      return;
    }

    if (contactWhatsapp.trim().length < 8) {
      setNotice("Nomor WhatsApp kontak wajib diisi.", "danger");
      return;
    }

    setIsSavingQuote(true);

    try {
      const response = await fetch("/api/quotation-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          contact_name: contactName,
          contact_whatsapp: contactWhatsapp,
          snapshot: configurationSnapshot
        })
      });
      const payload = (await response.json()) as {
        quotation_number?: string;
        error?: string;
      };

      if (!response.ok) {
        setNotice(
          "Draf penawaran belum dapat disimpan. Periksa pilihan Anda lalu coba lagi.",
          response.status === 503 ? "warning" : "danger"
        );
        return;
      }

      setNotice(
        `Draft penawaran ${payload.quotation_number ?? ""} tersimpan.`,
        null
      );
    } finally {
      setIsSavingQuote(false);
    }
  }

  function removeDraftItem(productVariantSizeId: string) {
    setDraftItems((current) =>
      current.filter(
        (candidate) =>
          candidate.product_variant_size_id !== productVariantSizeId
      )
    );
  }

  function setNotice(nextMessage: string, tone: MessageTone) {
    setMessage(nextMessage);
    setMessageTone(tone);
  }

  return (
    <div className="page-shell product-page">
      <div>
        <div className="desktop-gallery gallery-grid">
          {images.map((image) => (
            <img
              src={image.imageUrl}
              alt={image.altText ?? `${product.name} ${selectedVariant?.name ?? ""}`}
              key={image.id}
            />
          ))}
        </div>
        <div className="mobile-gallery" aria-label="Galeri produk">
          {images.map((image, index) => (
            <img
              src={image.imageUrl}
              alt={image.altText ?? `${product.name} foto ${index + 1}`}
              key={image.id}
            />
          ))}
        </div>
      </div>

      <aside className="product-panel">
        <div className="stack">
          <p className="eyebrow">{product.category?.name ?? "Produk"}</p>
          <h1 className="product-title">{product.name}</h1>
          {product.description ? <p className="muted">{product.description}</p> : null}
          <strong>{formatRupiah(previewUnitPrice)}</strong>
        </div>

        <div className="segmented-control" aria-label="Mode pemesanan">
          <button
            aria-pressed={!bulkMode}
            onClick={() => setBulkMode(false)}
            type="button"
          >
            Satuan
          </button>
          <button
            aria-pressed={bulkMode}
            onClick={() => setBulkMode(true)}
            type="button"
          >
            Bulk
          </button>
        </div>

        <section className="bulk-summary" aria-label="Ringkasan harga bulk">
          <div>
            <span className="muted">Total qty</span>
            <strong>{bulkSummary.totalQuantity} pcs</strong>
          </div>
          <div>
            <span className="muted">Tier aktif</span>
            <strong>{formatTierLabel(bulkSummary.tier)}</strong>
          </div>
          <div>
            <span className="muted">Estimasi</span>
            <strong>{formatRupiah(bulkSummary.estimatedGrandTotal)}</strong>
          </div>
        </section>

        {bulkSummary.nextTier ? (
          <div className="notice">
            Tambah {bulkSummary.nextTier.minQuantity - bulkSummary.totalQuantity} pcs
            untuk tier {formatTierLabel(bulkSummary.nextTier)}.
          </div>
        ) : null}

        {bulkSummary.issues.length > 0 ? (
          <div className="notice warning">
            {bulkSummary.issues.map((issue) => (
              <p key={issue.field}>{issue.message}</p>
            ))}
          </div>
        ) : null}

        {bulkMode ? (
          <section className="stack" aria-labelledby="bulk-title">
            <h2 className="section-title" id="bulk-title">
              Matrix Bulk
            </h2>
            <div className="bulk-matrix-wrap">
              <table className="bulk-matrix">
                <thead>
                  <tr>
                    <th>Warna</th>
                    {allActiveSizes.map((size) => (
                      <th key={size.id}>{size.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeVariants.map((variant) => (
                    <tr key={variant.id}>
                      <th>
                        <span
                          className="mini-swatch"
                          style={{ background: variant.hexCode }}
                        />
                        {variant.name}
                      </th>
                      {allActiveSizes.map((size) => {
                        const variantSize = variant.sizes.find(
                          (candidate) => candidate.size.id === size.id
                        );
                        const draftItem = draftItems.find(
                          (item) =>
                            item.product_variant_size_id === variantSize?.id
                        );
                        const isUnavailable =
                          !variantSize ||
                          variantSize.status !== "active" ||
                          variantSize.stockQuantity <= 0;

                        return (
                          <td key={size.id}>
                            <input
                              aria-label={`${variant.name} ${size.name}`}
                              className="matrix-input"
                              disabled={isUnavailable}
                              inputMode="numeric"
                              min={0}
                              max={variantSize?.stockQuantity ?? 0}
                              onChange={(event) =>
                                updateMatrixQuantity(
                                  variant.id,
                                  size.id,
                                  Number(event.target.value)
                                )
                              }
                              type="number"
                              value={draftItem?.quantity ?? ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <>
            <section className="stack" aria-labelledby="warna-title">
              <h2 className="section-title" id="warna-title">
                Warna
              </h2>
              <div className="control-row">
                {activeVariants.map((variant) => (
                  <button
                    aria-label={`${variant.name}${
                      isVariantOutOfStock(variant) ? " stok habis" : ""
                    }`}
                    aria-pressed={variant.id === selectedVariant?.id}
                    className="swatch-button"
                    disabled={variant.status !== "active"}
                    key={variant.id}
                    onClick={() => chooseVariant(variant.id, variant.slug)}
                    type="button"
                    title={variant.name}
                  >
                    <span style={{ background: variant.hexCode }} />
                  </button>
                ))}
              </div>
              {selectedVariant ? (
                <span className="muted">
                  {selectedVariant.name}
                  {isVariantOutOfStock(selectedVariant) ? " - Stok Habis" : ""}
                </span>
              ) : null}
            </section>

            <section className="stack" aria-labelledby="ukuran-title">
              <h2 className="section-title" id="ukuran-title">
                Ukuran
              </h2>
              <div className="control-row">
                {activeSizes.map((variantSize) => (
                  <button
                    aria-pressed={variantSize.id === selectedVariantSizeId}
                    className="size-button"
                    disabled={variantSize.stockQuantity <= 0}
                    key={variantSize.id}
                    onClick={() => setSelectedVariantSizeId(variantSize.id)}
                    type="button"
                  >
                    {variantSize.size.name}
                  </button>
                ))}
              </div>
              {selectedVariantSize ? (
                <span className="muted">
                  Stok {selectedVariantSize.stockQuantity} pcs - SKU{" "}
                  {selectedVariantSize.sku}
                </span>
              ) : null}
            </section>

            <section className="stack" aria-labelledby="qty-title">
              <h2 className="section-title" id="qty-title">
                Quantity
              </h2>
              <div className="control-row">
                <input
                  className="quantity-input"
                  inputMode="numeric"
                  min={1}
                  max={selectedVariantSize?.stockQuantity ?? 1}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  type="number"
                  value={quantity}
                />
                <button
                  className="secondary-button"
                  onClick={addChoice}
                  type="button"
                >
                  Tambahkan ke Pilihan
                </button>
              </div>
            </section>
          </>
        )}

        <section className="stack" aria-labelledby="service-title">
          <h2 className="section-title" id="service-title">
            Custom Service
          </h2>
          <div className="service-list">
            {customServices
              .filter((service) => service.status === "active")
              .map((service) => (
                <div className="service-option" key={service.id}>
                  <label>
                    <input
                      checked={Boolean(serviceSelections[service.slug])}
                      onChange={() =>
                        setServiceSelections((current) => ({
                          ...current,
                          [service.slug]: !current[service.slug]
                        }))
                      }
                      type="checkbox"
                    />
                    <span>
                      <strong>{service.name}</strong>
                      <small>{formatServicePrice(service)}</small>
                    </span>
                  </label>
                  {serviceSelections[service.slug] &&
                  service.pricingType !== "fixed_per_order" ? (
                    <input
                      aria-label={`Quantity ${service.name}`}
                      className="quantity-input"
                      min={1}
                      max={Math.max(totalQuantity, 1)}
                      onChange={(event) =>
                        setServiceQuantities((current) => ({
                          ...current,
                          [service.slug]: Number(event.target.value)
                        }))
                      }
                      type="number"
                      value={serviceQuantities[service.slug] ?? totalQuantity}
                    />
                  ) : null}
                  {serviceSelections[service.slug] && service.requiresNotes ? (
                    <textarea
                      className="textarea-input compact"
                      onChange={(event) =>
                        setServiceNotes((current) => ({
                          ...current,
                          [service.slug]: event.target.value
                        }))
                      }
                      placeholder={`Catatan ${service.name}`}
                      value={serviceNotes[service.slug] ?? ""}
                    />
                  ) : null}
                </div>
              ))}
          </div>
          {serviceIssues.length > 0 ? (
            <div className="notice danger">
              {serviceIssues.map((issue) => (
                <p key={issue.field}>{issue.message}</p>
              ))}
            </div>
          ) : null}
        </section>

        {requiresDesignUpload ? (
          <section className="stack" aria-labelledby="upload-title">
            <h2 className="section-title" id="upload-title">
              File Desain
            </h2>
            <input
              accept={uploadAccept}
              className="text-input"
              disabled={isUploading}
              onChange={(event) => void uploadDesign(event.currentTarget.files?.[0])}
              type="file"
            />
            {isUploading ? <p className="muted">Mengunggah...</p> : null}
            {uploadRefs.length > 0 ? (
              <div className="upload-list">
                {uploadRefs.map((upload) => (
                  <span key={upload.storage_path ?? upload.file_name}>
                    {upload.file_name}
                    {upload.signed_url ? (
                      <a href={upload.signed_url} rel="noreferrer" target="_blank">
                        Pratinjau
                      </a>
                    ) : null}
                    <button
                      className="icon-button"
                      onClick={() => void removeUpload(upload)}
                      type="button"
                    >
                      Hapus
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">Belum ada file desain.</p>
            )}
          </section>
        ) : null}

        <section className="stack" aria-labelledby="notes-title">
          <h2 className="section-title" id="notes-title">
            Catatan
          </h2>
          <textarea
            className="textarea-input"
            onChange={(event) => setGeneralNote(event.target.value)}
            placeholder="Detail penempatan logo, deadline, alamat, atau kebutuhan lain"
            value={generalNote}
          />
          <div className="field-grid compact-grid">
            <input
              className="text-input"
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Nama kontak"
              type="text"
              value={contactName}
            />
            <input
              className="text-input"
              inputMode="tel"
              onChange={(event) => setContactWhatsapp(event.target.value)}
              placeholder="WhatsApp"
              type="tel"
              value={contactWhatsapp}
            />
          </div>
        </section>

        {message ? (
          <div className={`notice ${messageTone ?? ""}`} role="status">
            {message}
          </div>
        ) : null}

        <section className="stack" aria-labelledby="pilihan-title">
          <h2 className="section-title" id="pilihan-title">
            Pilihan Anda
          </h2>
          <div className="choice-list">
            {configuredItems.length === 0 ? (
              <p className="muted">Belum ada kombinasi.</p>
            ) : (
              configuredItems.map((item) => (
                <div className="choice-row" key={item.product_variant_size_id}>
                  <div className="choice-meta">
                    <strong>
                      {item.warna} / {item.ukuran}
                    </strong>
                    <span className="muted">
                      {item.sku} - {formatRupiah(item.unit_price)}
                    </span>
                    {item.services && item.services.length > 0 ? (
                      <span className="muted">
                        {item.services
                          .map((service) => service.service_name)
                          .join(", ")}
                      </span>
                    ) : null}
                    <textarea
                      className="textarea-input compact"
                      onChange={(event) =>
                        setItemNotes((current) => ({
                          ...current,
                          [item.product_variant_size_id]: event.target.value
                        }))
                      }
                      placeholder={`Catatan ${item.warna} / ${item.ukuran}`}
                      value={itemNotes[item.product_variant_size_id] ?? ""}
                    />
                  </div>
                  <div className="control-row">
                    <input
                      className="quantity-input"
                      min={1}
                      max={item.stock_snapshot}
                      onChange={(event) =>
                        updateDraftQuantity(
                          item.product_variant_size_id,
                          Number(event.target.value)
                        )
                      }
                      type="number"
                      value={item.quantity}
                    />
                    <button
                      className="danger-button"
                      onClick={() => removeDraftItem(item.product_variant_size_id)}
                      type="button"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="quote-summary">
            <div>
              <span className="muted">Produk</span>
              <strong>{formatRupiah(bulkSummary.estimatedProductTotal)}</strong>
            </div>
            <div>
              <span className="muted">Custom</span>
              <strong>{formatRupiah(bulkSummary.estimatedServiceTotal)}</strong>
            </div>
            <div>
              <span className="muted">Total estimasi</span>
              <strong>{formatRupiah(bulkSummary.estimatedGrandTotal)}</strong>
            </div>
          </div>

          <div className="control-row">
            <button
              className="primary-button"
              disabled={configuredItems.length === 0 || isAddingCart}
              onClick={addAllToCart}
              type="button"
            >
              {isAddingCart ? "Memvalidasi..." : "Tambah Semua ke Keranjang"}
            </button>
            <button
              className="secondary-button"
              disabled={configuredItems.length === 0}
              onClick={shareConfiguration}
              type="button"
            >
              Bagikan Konfigurasi
            </button>
            <button
              className="secondary-button"
              disabled={configuredItems.length === 0 || isSavingQuote}
              onClick={saveQuotationDraft}
              type="button"
            >
              {isSavingQuote ? "Menyimpan..." : "Simpan Draft Penawaran"}
            </button>
            <a
              className="secondary-button"
              href={buildWhatsAppUrl(configuredItems, { generalNote })}
              rel="noreferrer"
              target="_blank"
            >
              Kirim WhatsApp
            </a>
            <Link className="secondary-button" href="/keranjang">
              Lihat Keranjang ({getCartQuantity(configuredItems)})
            </Link>
          </div>

          {shareUrl ? (
            <input
              aria-label="Tautan konfigurasi"
              className="text-input"
              readOnly
              value={shareUrl}
            />
          ) : null}
        </section>
      </aside>
    </div>
  );
}

function getAllocatedServiceQuantity(
  items: CartItem[],
  itemIndex: number,
  requestedQuantity: number
): number {
  const previousQuantity = items
    .slice(0, itemIndex)
    .reduce((sum, item) => sum + item.quantity, 0);
  const currentItem = items[itemIndex];

  if (!currentItem) {
    return 0;
  }

  const remainingQuantity = requestedQuantity - previousQuantity;
  return Math.min(currentItem.quantity, Math.max(0, remainingQuantity));
}

function createConfigurationSnapshot(
  product: Product,
  items: CartItem[],
  note: string,
  uploadRefs: CustomerUploadRef[]
): ProductConfigurationSnapshot {
  const summary = summarizeBulkOrder(product, items);
  const now = new Date().toISOString();

  return {
    product_id: product.id,
    product_slug: product.slug,
    product_name: product.name,
    items,
    note,
    upload_refs: uploadRefs,
    total_quantity: summary.totalQuantity,
    estimated_product_total: summary.estimatedProductTotal,
    estimated_service_total: summary.estimatedServiceTotal,
    estimated_grand_total: summary.estimatedGrandTotal,
    requires_review: summary.requiresReview,
    created_at: now,
    updated_at: now
  };
}

function formatTierLabel(tier: ReturnType<typeof summarizeBulkOrder>["tier"]) {
  if (!tier) {
    return "Retail";
  }

  const range =
    tier.maxQuantity === null
      ? `${tier.minQuantity}+`
      : `${tier.minQuantity}-${tier.maxQuantity}`;
  const price = tier.quoteRequired
    ? "Minta penawaran"
    : formatRupiah(tier.unitPrice ?? 0);

  return `${range} pcs - ${price}`;
}

function formatServicePrice(service: CustomService) {
  if (service.pricingType === "fixed_per_order") {
    return `${formatRupiah(service.basePrice)} / order`;
  }

  if (service.pricingType === "fixed_per_item") {
    return `${formatRupiah(service.basePrice)} / pcs`;
  }

  if (service.estimatedMinPrice !== null && service.estimatedMaxPrice !== null) {
    return `${formatRupiah(service.estimatedMinPrice)}-${formatRupiah(
      service.estimatedMaxPrice
    )}`;
  }

  return "Minta penawaran";
}
