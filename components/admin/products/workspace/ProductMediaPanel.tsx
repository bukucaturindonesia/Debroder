/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";
import { ProductColorSwatch } from "@/components/admin/products/workspace/ProductColorSwatch";
import { useProductWorkspace } from "@/components/admin/products/workspace/ProductWorkspaceShell";
import {
  loadProductMedia,
  ProductMediaRequestError,
  saveProductMedia
} from "@/lib/admin-product-media-api";
import {
  canManageProductMedia,
  changedProductMediaSlots,
  completeProductMediaSlots,
  productMediaCompleteness,
  productMediaRoleDescription,
  productMediaRoleLabel,
  type ProductMediaAsset,
  type ProductMediaPayload,
  type ProductMediaQuery,
  type ProductMediaSaveState,
  type ProductMediaSlotDraft
} from "@/lib/product-media";
import {
  ProductMediaUploadError,
  uploadProductMediaAsset
} from "@/lib/product-media-upload";
import type { ProductImageRole } from "@/lib/product-manager";

const EMPTY_QUERY: ProductMediaQuery = {
  variantId: "",
  includeLibrary: false,
  q: "",
  page: 1,
  pageSize: 24
};

type PendingTransition =
  | { kind: "variant"; variantId: string }
  | { kind: "href"; href: string }
  | null;

export function ProductMediaPanel() {
  const { product } = useProductWorkspace();
  const [payload, setPayload] = useState<ProductMediaPayload | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [colorQuery, setColorQuery] = useState("");
  const [drafts, setDrafts] = useState<ProductMediaSlotDraft[]>([]);
  const [baseline, setBaseline] = useState<ProductMediaSlotDraft[]>([]);
  const [saveState, setSaveState] =
    useState<ProductMediaSaveState>("clean");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingTransition, setPendingTransition] =
    useState<PendingTransition>(null);
  const [pickerRole, setPickerRole] =
    useState<ProductImageRole | null>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploadingRole, setUploadingRole] =
    useState<ProductImageRole | null>(null);

  const reload = useCallback(
    () => setReloadToken((value) => value + 1),
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    void loadProductMedia(
      product.id,
      {
        ...EMPTY_QUERY,
        variantId: selectedVariantId
      },
      controller.signal
    )
      .then((next) => {
        const nextDrafts = completeProductMediaSlots(next.slots);
        setPayload(next);
        setSelectedVariantId(next.selectedVariantId || "");
        setDrafts(nextDrafts);
        setBaseline(nextDrafts);
        setSaveState("clean");
        setNotice("");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          reason instanceof Error
            ? reason.message
            : "Media produk belum dapat dimuat."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [product.id, selectedVariantId, reloadToken]);

  const changes = useMemo(
    () => changedProductMediaSlots(drafts, baseline),
    [baseline, drafts]
  );
  const dirty = changes.length > 0;
  const working = saveState === "saving";
  const canEdit = Boolean(
    payload && canManageProductMedia(payload.capabilities)
  );
  const selectedVariant = payload?.variants.find(
    (variant) => variant.id === selectedVariantId
  ) || null;
  const completeness = useMemo(
    () => productMediaCompleteness(drafts),
    [drafts]
  );
  const visibleVariants = useMemo(() => {
    const needle = colorQuery.trim().toLowerCase();
    return (payload?.variants || []).filter((variant) =>
      !needle || `${variant.name} ${variant.slug}`
        .toLowerCase()
        .includes(needle)
    );
  }, [colorQuery, payload?.variants]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const intercept = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingTransition({
        kind: "href",
        href: `${url.pathname}${url.search}${url.hash}`
      });
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [dirty]);

  useEffect(() => {
    if (!pickerRole || !payload?.selectedVariantId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLibraryLoading(true);
      void loadProductMedia(
        product.id,
        {
          variantId: payload.selectedVariantId || "",
          includeLibrary: true,
          q: libraryQuery,
          page: libraryPage,
          pageSize: 24
        },
        controller.signal
      )
        .then((next) => {
          setPayload((current) => current
            ? {
              ...current,
              mediaAssets: next.mediaAssets,
              library: next.library
            }
            : next
          );
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setNotice(
            reason instanceof Error
              ? reason.message
              : "Media Library belum dapat dimuat."
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLibraryLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [libraryPage, libraryQuery, payload?.selectedVariantId, pickerRole, product.id]);

  function requestVariant(variantId: string) {
    if (variantId === selectedVariantId) return;
    if (dirty) {
      setPendingTransition({ kind: "variant", variantId });
      return;
    }
    setSelectedVariantId(variantId);
  }

  function patchSlot(
    role: ProductImageRole,
    patch: Partial<ProductMediaSlotDraft>
  ) {
    setDrafts((current) => current.map((slot) =>
      slot.role === role ? { ...slot, ...patch } : slot
    ));
    setSaveState("dirty");
    setNotice("");
  }

  function chooseAsset(role: ProductImageRole, asset: ProductMediaAsset) {
    patchSlot(role, {
      mediaAssetId: asset.id,
      imageUrl: asset.publicUrl,
      altText: asset.altText ||
        `${selectedVariant?.name || "Warna"} ${productMediaRoleLabel(role)}`
    });
    setPickerRole(null);
  }

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    role: ProductImageRole
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedVariant || !canEdit) return;
    setUploadingRole(role);
    setNotice("");
    try {
      const result = await uploadProductMediaAsset({
        file,
        variantId: selectedVariant.id,
        role,
        colorName: selectedVariant.name
      });
      chooseAsset(role, result.asset);
      setNotice(
        result.ratioWarning
          ? "Foto tersimpan di Media Library. Rasio bukan 4:5 dan akan mengikuti crop/focal point slot."
          : "Foto tersimpan di Media Library dan dipilih untuk slot."
      );
    } catch (reason) {
      setNotice(
        reason instanceof ProductMediaUploadError
          ? reason.message
          : "Upload media belum berhasil."
      );
      setSaveState("error");
    } finally {
      setUploadingRole(null);
    }
  }

  async function save() {
    if (
      !payload ||
      !selectedVariant ||
      !canEdit ||
      working ||
      !changes.length
    ) return false;
    setSaveState("saving");
    setNotice("");
    try {
      const result = await saveProductMedia({
        productId: product.id,
        variantId: selectedVariant.id,
        expectedVariantUpdatedAt: selectedVariant.updatedAt,
        changes
      });
      const nextDrafts = completeProductMediaSlots(result.payload.slots);
      setPayload(result.payload);
      setDrafts(nextDrafts);
      setBaseline(nextDrafts);
      setSaveState("saved");
      setNotice(result.message);
      return true;
    } catch (reason) {
      const error = reason instanceof ProductMediaRequestError
        ? reason
        : new ProductMediaRequestError(
          500,
          "Media belum berhasil disimpan."
        );
      setSaveState(error.status === 409 ? "conflict" : "error");
      setNotice(error.message);
      return false;
    }
  }

  function discard() {
    setDrafts(baseline.map((slot) => ({ ...slot })));
    setSaveState("clean");
    setNotice("");
  }

  async function saveThenContinue() {
    const pending = pendingTransition;
    if (!pending) return;
    const saved = await save();
    if (!saved) return;
    setPendingTransition(null);
    if (pending.kind === "href") window.location.assign(pending.href);
    else setSelectedVariantId(pending.variantId);
  }

  function discardThenContinue() {
    const pending = pendingTransition;
    discard();
    setPendingTransition(null);
    if (!pending) return;
    if (pending.kind === "href") window.location.assign(pending.href);
    else setSelectedVariantId(pending.variantId);
  }

  if (loading && !payload) {
    return (
      <section
        aria-busy="true"
        className="h-[34rem] animate-pulse border border-brand-softGray bg-white"
      />
    );
  }

  if (loadError || !payload) {
    return (
      <section
        role="alert"
        className="border border-red-200 bg-red-50 p-6 text-red-950"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
          WP-06 MEDIA
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Media produk belum dapat dimuat
        </h2>
        <p className="mt-3 text-sm">
          {loadError || "Data tidak tersedia."}
        </p>
        <button
          type="button"
          onClick={reload}
          className="mt-5 min-h-10 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
        >
          Coba lagi
        </button>
      </section>
    );
  }

  if (!payload.variants.length || !selectedVariant) {
    return (
      <section className="border border-brand-softGray bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
          WP-06 MEDIA
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Belum ada warna produk
        </h2>
        <p className="mt-3 text-sm text-brand-charcoal/60">
          Buat color variant pada modul Varian sebelum mengisi empat slot media.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
              WP-06 ONE-COLOR MEDIA
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Media per warna</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/65">
              Hanya empat slot warna terpilih yang dimuat. Front wajib untuk Publish; Back, Detail, dan Lifestyle disarankan.
            </p>
          </div>
          <SaveStateBadge state={saveState} />
        </div>

        {!canEdit ? (
          <InfoBanner>
            MODE LIHAT SAJA — pengelolaan media hanya untuk Owner/Super Admin.
          </InfoBanner>
        ) : null}

        {notice ? (
          <div
            role={saveState === "error" || saveState === "conflict" ? "alert" : "status"}
            className={saveState === "conflict"
              ? "mt-5 border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950"
              : saveState === "error"
                ? "mt-5 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-950"
                : "mt-5 border border-brand-softGray bg-brand-offWhite px-5 py-4 text-sm"}
          >
            <p className="font-semibold">{notice}</p>
            {saveState === "conflict" ? (
              <button
                type="button"
                onClick={reload}
                className="mt-3 min-h-10 rounded-full bg-brand-charcoal px-5 text-xs font-semibold text-white"
              >
                Muat ulang data terbaru
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(230px,320px)_minmax(0,1fr)]">
          <aside className="border border-brand-softGray bg-brand-offWhite p-3">
            <input
              value={colorQuery}
              onChange={(event) => setColorQuery(event.target.value)}
              placeholder="Cari warna..."
              className={controlClass}
            />
            <div className="mt-3 grid max-h-[44rem] gap-2 overflow-y-auto">
              {visibleVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => requestVariant(variant.id)}
                  className={variant.id === selectedVariant.id
                    ? "flex items-center gap-3 rounded-xl bg-brand-charcoal p-3 text-left text-white"
                    : "flex items-center gap-3 rounded-xl bg-white p-3 text-left hover:bg-white/70"}
                >
                  <ProductColorSwatch
                    value={variant}
                    label={variant.name}
                    className="h-9 w-9"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {variant.name}
                    </span>
                    <span className={variant.id === selectedVariant.id
                      ? "mt-1 block text-xs text-white/65"
                      : "mt-1 block text-xs text-brand-charcoal/50"}
                    >
                      {variant.imageCount}/4 · {variant.hasFrontImage ? "Front siap" : "Front kosong"}
                    </span>
                  </span>
                  <span className={variant.status === "active"
                    ? "rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-800"
                    : "rounded-full bg-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-700"}
                  >
                    {variant.status === "active" ? "ACTIVE" : "INACTIVE"}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-brand-softGray bg-brand-offWhite p-4">
              <div className="flex items-center gap-3">
                <ProductColorSwatch
                  value={selectedVariant}
                  label={selectedVariant.name}
                  className="h-11 w-11"
                />
                <div>
                  <h3 className="font-semibold">{selectedVariant.name}</h3>
                  <p className="mt-1 text-xs text-brand-charcoal/55">
                    {completeness.complete}/4 slot · {completeness.frontReady ? "minimum Publish terpenuhi" : "front image wajib"}
                  </p>
                </div>
              </div>
              <span className={completeness.frontReady
                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800"
                : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"}
              >
                {completeness.frontReady ? "FRONT SIAP" : "FRONT WAJIB"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {drafts.map((slot) => (
                <MediaSlotCard
                  key={slot.role}
                  slot={slot}
                  canEdit={canEdit}
                  busy={uploadingRole === slot.role || working}
                  onPatch={(patch) => patchSlot(slot.role, patch)}
                  onPick={() => {
                    setLibraryPage(1);
                    setLibraryQuery("");
                    setPickerRole(slot.role);
                  }}
                  onUpload={(event) => void upload(event, slot.role)}
                  onClear={() => patchSlot(slot.role, {
                    mediaAssetId: null,
                    imageUrl: null,
                    altText: ""
                  })}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {dirty && canEdit ? (
        <div className="sticky bottom-3 z-40 mt-4 flex flex-wrap items-center justify-between gap-3 border border-brand-softGray bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold">
            {changes.length} slot belum disimpan
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={working}
              onClick={discard}
              className={secondaryButton}
            >
              Batalkan
            </button>
            <button
              data-admin-mutation="true"
              type="button"
              disabled={working}
              onClick={() => void save()}
              className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45"
            >
              {working ? "Menyimpan..." : "Simpan Media"}
            </button>
          </div>
        </div>
      ) : null}

      {pickerRole ? (
        <MediaPicker
          role={pickerRole}
          assets={payload.mediaAssets}
          query={libraryQuery}
          page={payload.library.page}
          pageCount={payload.library.pageCount}
          total={payload.library.total}
          loading={libraryLoading}
          onQuery={(value) => {
            setLibraryQuery(value);
            setLibraryPage(1);
          }}
          onPage={setLibraryPage}
          onChoose={(asset) => chooseAsset(pickerRole, asset)}
          onClose={() => setPickerRole(null)}
        />
      ) : null}

      {pendingTransition ? (
        <DirtyDialog
          saving={working}
          onDiscard={discardThenContinue}
          onStay={() => setPendingTransition(null)}
          onSave={() => void saveThenContinue()}
        />
      ) : null}
    </>
  );
}

function MediaSlotCard({
  slot,
  canEdit,
  busy,
  onPatch,
  onPick,
  onUpload,
  onClear
}: {
  slot: ProductMediaSlotDraft;
  canEdit: boolean;
  busy: boolean;
  onPatch: (patch: Partial<ProductMediaSlotDraft>) => void;
  onPick: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <article className="border border-brand-softGray bg-brand-offWhite p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">
            {productMediaRoleLabel(slot.role)}
          </h4>
          <p className="mt-1 text-xs leading-5 text-brand-charcoal/55">
            {productMediaRoleDescription(slot.role)}
          </p>
        </div>
        {slot.role === "front" ? (
          <span className="rounded-full bg-brand-green px-2 py-1 text-[10px] font-semibold text-white">
            WAJIB
          </span>
        ) : null}
      </div>

      <div className="relative mt-3 aspect-[4/5] overflow-hidden bg-white">
        {slot.imageUrl ? (
          <img
            src={slot.imageUrl}
            alt={slot.altText || productMediaRoleLabel(slot.role)}
            className={slot.objectFit === "contain"
              ? "h-full w-full object-contain"
              : "h-full w-full object-cover"}
            style={{
              objectPosition: slot.objectPosition ||
                `${slot.focalX}% ${slot.focalY}%`,
              transform: `scale(${slot.focalZoom})`
            }}
          />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center text-xs font-semibold text-brand-charcoal/35">
            Belum ada foto
          </div>
        )}
      </div>

      {canEdit ? (
        <div className="mt-3 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={onPick}
              className={secondaryButton}
            >
              Pilih dari Media Library
            </button>
            <label className="grid min-h-10 cursor-pointer place-items-center rounded-full bg-brand-charcoal px-4 text-center text-xs font-semibold text-white">
              {busy ? "Memproses..." : "Unggah foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={onUpload}
              />
            </label>
          </div>

          <label className="grid gap-1 text-xs font-semibold">
            Alt text
            <input
              value={slot.altText}
              maxLength={180}
              disabled={busy}
              onChange={(event) => onPatch({ altText: event.target.value })}
              className={controlClass}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold">
              Object fit
              <select
                value={slot.objectFit}
                disabled={busy}
                onChange={(event) => onPatch({
                  objectFit: event.target.value === "contain" ? "contain" : "cover"
                })}
                className={controlClass}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Zoom {slot.focalZoom.toFixed(1)}×
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={slot.focalZoom}
                disabled={busy}
                onChange={(event) => onPatch({
                  focalZoom: Number(event.target.value)
                })}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Fokus X {Math.round(slot.focalX)}%
              <input
                type="range"
                min={0}
                max={100}
                value={slot.focalX}
                disabled={busy}
                onChange={(event) => {
                  const focalX = Number(event.target.value);
                  onPatch({
                    focalX,
                    objectPosition: `${focalX}% ${slot.focalY}%`
                  });
                }}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Fokus Y {Math.round(slot.focalY)}%
              <input
                type="range"
                min={0}
                max={100}
                value={slot.focalY}
                disabled={busy}
                onChange={(event) => {
                  const focalY = Number(event.target.value);
                  onPatch({
                    focalY,
                    objectPosition: `${slot.focalX}% ${focalY}%`
                  });
                }}
              />
            </label>
          </div>

          {slot.imageUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={onClear}
              className="min-h-10 text-xs font-semibold text-red-700 disabled:opacity-45"
            >
              Kosongkan slot
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function MediaPicker({
  role,
  assets,
  query,
  page,
  pageCount,
  total,
  loading,
  onQuery,
  onPage,
  onChoose,
  onClose
}: {
  role: ProductImageRole;
  assets: ProductMediaAsset[];
  query: string;
  page: number;
  pageCount: number;
  total: number;
  loading: boolean;
  onQuery: (value: string) => void;
  onPage: (page: number) => void;
  onChoose: (asset: ProductMediaAsset) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Media Library"
      className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-4 sm:p-8"
    >
      <section className="mx-auto max-w-6xl bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
              MEDIA LIBRARY
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              Pilih untuk {productMediaRoleLabel(role)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand-offWhite text-xl"
          >
            ×
          </button>
        </div>

        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Cari nama, folder, atau alt text..."
          className="mt-5 min-h-11 w-full border border-brand-softGray px-4"
        />

        {loading ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="aspect-[4/5] animate-pulse bg-brand-offWhite" />
            ))}
          </div>
        ) : assets.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => {
              const ratioReady = isFourFive(asset.width, asset.height);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onChoose(asset)}
                  className="overflow-hidden border border-brand-softGray bg-white text-left"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-brand-offWhite">
                    <img
                      src={asset.publicUrl}
                      alt={asset.altText || asset.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-semibold">{asset.name}</p>
                    <p className="mt-1 text-[10px] text-brand-charcoal/50">
                      {asset.width && asset.height
                        ? `${asset.width} × ${asset.height}px`
                        : "Dimensi belum tersedia"}
                    </p>
                    <p className={ratioReady
                      ? "mt-1 text-[10px] font-semibold text-brand-green"
                      : "mt-1 text-[10px] font-semibold text-amber-700"}
                    >
                      {ratioReady ? "Rasio 4:5" : "Akan mengikuti crop 4:5"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 bg-brand-offWhite p-6 text-sm text-brand-charcoal/60">
            Tidak ada media yang sesuai pencarian.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-charcoal/60">
            {total} aset · halaman {page} dari {pageCount}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPage(page - 1)}
              className={secondaryButton}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => onPage(page + 1)}
              className={secondaryButton}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DirtyDialog({
  saving,
  onDiscard,
  onStay,
  onSave
}: {
  saving: boolean;
  onDiscard: () => void;
  onStay: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      title="Simpan perubahan sebelum keluar?"
      eyebrow="PERUBAHAN BELUM DISIMPAN"
    >
      <p className="text-sm leading-6 text-brand-charcoal/65">
        Slot media warna terpilih sudah berubah dan belum disimpan.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={saving}
          onClick={onDiscard}
          className="min-h-11 border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-45"
        >
          Keluar tanpa menyimpan
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onStay}
          className={secondaryButton}
        >
          Tetap di sini
        </button>
        <button
          data-admin-mutation="true"
          type="button"
          disabled={saving}
          onClick={onSave}
          className="min-h-11 bg-brand-charcoal px-4 text-sm font-semibold text-white disabled:opacity-45"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] grid place-items-center bg-black/45 p-4"
    >
      <section className="w-full max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

function SaveStateBadge({ state }: { state: ProductMediaSaveState }) {
  const labels: Record<ProductMediaSaveState, string> = {
    clean: "Bersih",
    dirty: "Belum disimpan",
    saving: "Menyimpan",
    saved: "Tersimpan",
    conflict: "Konflik versi",
    error: "Gagal"
  };
  return (
    <span className="rounded-full bg-brand-offWhite px-4 py-2 text-xs font-semibold">
      {labels[state]}
    </span>
  );
}

function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="mt-5 border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900"
    >
      {children}
    </div>
  );
}

function isFourFive(width: number | null, height: number | null) {
  if (!width || !height) return false;
  return Math.abs(width / height - 0.8) <= 0.025;
}

const controlClass =
  "min-h-11 w-full rounded-lg border border-brand-softGray bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-brand-offWhite disabled:text-brand-charcoal/45";
const secondaryButton =
  "min-h-10 rounded-full border border-brand-softGray bg-white px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45";
