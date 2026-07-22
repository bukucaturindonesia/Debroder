"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";
import {
  loadProductVariants,
  ProductVariantsRequestError,
  saveProductVariant,
  saveProductVariantSizes
} from "@/lib/admin-product-variants-api";
import { ProductColorSwatch } from "@/components/admin/products/workspace/ProductColorSwatch";
import { useProductWorkspace } from "@/components/admin/products/workspace/ProductWorkspaceShell";
import {
  activeProductVariantSizeIds,
  canManageProductVariants,
  emptyProductVariantForm,
  productVariantFormFromItem,
  sameProductVariantForm,
  sameSizeSelection,
  type ProductVariantColorMaster,
  type ProductVariantSaveState,
  type ProductVariantSettingsForm,
  type ProductVariantsPayload,
  type ProductWorkspaceVariant
} from "@/lib/product-variants";

const EMPTY_SIZE_IDS = new Set<string>();

type PendingAction =
  | { kind: "href"; href: string }
  | { kind: "select"; variantId: string }
  | { kind: "new" };

export function ProductVariantsPanel() {
  const { product } = useProductWorkspace();
  const [payload, setPayload] = useState<ProductVariantsPayload | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailForm, setDetailForm] = useState<ProductVariantSettingsForm | null>(null);
  const [detailBaseline, setDetailBaseline] = useState<ProductVariantSettingsForm | null>(null);
  const [selectedSizeIds, setSelectedSizeIds] = useState<Set<string>>(EMPTY_SIZE_IDS);
  const [sizeBaseline, setSizeBaseline] = useState<Set<string>>(EMPTY_SIZE_IDS);
  const [detailState, setDetailState] = useState<ProductVariantSaveState>("clean");
  const [sizeState, setSizeState] = useState<ProductVariantSaveState>("clean");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const selectedVariant = useMemo(
    () => payload?.variants.find((item) => item.id === selectedVariantId) || null,
    [payload, selectedVariantId]
  );

  const detailDirty = Boolean(
    detailForm && detailBaseline && !sameProductVariantForm(detailForm, detailBaseline)
  );
  const sizesDirty = Boolean(
    selectedVariant && !sameSizeSelection(selectedSizeIds, sizeBaseline)
  );
  const dirty = detailDirty || sizesDirty;
  const working = detailState === "saving" || sizeState === "saving";
  const canManage = Boolean(payload && canManageProductVariants(payload.capabilities));

  const openVariant = useCallback((nextPayload: ProductVariantsPayload, variantId: string) => {
    const variant = nextPayload.variants.find((item) => item.id === variantId) || null;
    if (!variant) return;
    const nextDetail = productVariantFormFromItem(variant);
    const nextSizes = new Set(activeProductVariantSizeIds(variant));
    setSelectedVariantId(variant.id);
    setCreating(false);
    setDetailForm(nextDetail);
    setDetailBaseline(nextDetail);
    setSelectedSizeIds(nextSizes);
    setSizeBaseline(nextSizes);
    setDetailState("clean");
    setSizeState("clean");
    setNotice("");
  }, []);

  const openNew = useCallback((nextPayload: ProductVariantsPayload) => {
    const nextDetail = emptyProductVariantForm({
      firstVariant: nextPayload.variants.length === 0,
      sortOrder: nextPayload.variants.length
        ? Math.max(...nextPayload.variants.map((item) => item.sortOrder)) + 1
        : 0
    });
    setSelectedVariantId(null);
    setCreating(true);
    setDetailForm(nextDetail);
    setDetailBaseline(nextDetail);
    setSelectedSizeIds(new Set());
    setSizeBaseline(new Set());
    setDetailState("clean");
    setSizeState("clean");
    setNotice("");
  }, []);

  const applyPayload = useCallback((nextPayload: ProductVariantsPayload, preferredId?: string | null) => {
    setPayload(nextPayload);
    const nextId = preferredId && nextPayload.variants.some((item) => item.id === preferredId)
      ? preferredId
      : nextPayload.variants.find((item) => item.isDefault)?.id || nextPayload.variants[0]?.id || null;
    if (nextId) openVariant(nextPayload, nextId);
    else openNew(nextPayload);
  }, [openNew, openVariant]);

  const reload = useCallback(() => {
    setPendingAction(null);
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void loadProductVariants(product.id, controller.signal)
      .then((nextPayload) => applyPayload(nextPayload, selectedVariantId))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Varian produk belum dapat dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // selectedVariantId deliberately excluded: reload should not run merely because selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyPayload, product.id, reloadToken]);

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
    const interceptNavigation = (event: MouseEvent) => {
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
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash
      ) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingAction({ kind: "href", href: `${url.pathname}${url.search}${url.hash}` });
    };
    document.addEventListener("click", interceptNavigation, true);
    return () => document.removeEventListener("click", interceptNavigation, true);
  }, [dirty]);

  const filteredVariants = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!payload) return [];
    return payload.variants.filter((item) =>
      !needle || `${item.name} ${item.slug} ${item.colorType}`.toLowerCase().includes(needle)
    );
  }, [payload, search]);

  const usedMasterIds = useMemo(() => {
    const ids = (payload?.variants || [])
      .map((item) => item.colorMasterId)
      .filter((item): item is string => Boolean(item));
    return new Set(ids);
  }, [payload]);
  const selectableMasters = useMemo(
    () => (payload?.colorMasters || []).filter((item) => !usedMasterIds.has(item.id)),
    [payload?.colorMasters, usedMasterIds]
  );
  const selectedMaster = useMemo(
    () => payload?.colorMasters.find((item) => item.id === detailForm?.colorMasterId) || null,
    [detailForm?.colorMasterId, payload?.colorMasters]
  );

  function updateDetail(patch: Partial<ProductVariantSettingsForm>) {
    if (!detailForm) return;
    const next = { ...detailForm, ...patch };
    setDetailForm(next);
    setNotice("");
    setDetailState(detailBaseline && sameProductVariantForm(next, detailBaseline) ? "clean" : "dirty");
  }

  function toggleSize(sizeId: string) {
    if (!canManage || working || !selectedVariant) return;
    const next = new Set(selectedSizeIds);
    if (next.has(sizeId)) next.delete(sizeId);
    else next.add(sizeId);
    setSelectedSizeIds(next);
    setNotice("");
    setSizeState(sameSizeSelection(next, sizeBaseline) ? "clean" : "dirty");
  }

  function requestVariant(variantId: string) {
    if (!payload || variantId === selectedVariantId) return;
    if (dirty) setPendingAction({ kind: "select", variantId });
    else openVariant(payload, variantId);
  }

  function requestNew() {
    if (!payload) return;
    if (dirty) setPendingAction({ kind: "new" });
    else openNew(payload);
  }

  function conflictState(reason: unknown, target: "detail" | "sizes") {
    const requestError = reason instanceof ProductVariantsRequestError
      ? reason
      : new ProductVariantsRequestError(500, "Varian produk belum berhasil disimpan.");
    const state: ProductVariantSaveState = requestError.status === 409 ? "conflict" : "error";
    if (target === "detail") setDetailState(state);
    else setSizeState(state);
    setNotice(requestError.message);
  }

  async function persistDetail(preserveSizeDraft = true) {
    if (!payload || !detailForm || !canManage || working) return null;
    const previousSelectedSizes = new Set(selectedSizeIds);
    const previousSizesDirty = sizesDirty;
    const defaultVariant = payload.variants.find((item) => item.isDefault) || null;
    setDetailState("saving");
    setNotice("");
    try {
      const result = await saveProductVariant(product.id, {
        variantId: selectedVariant?.id || null,
        colorMasterId: detailForm.colorMasterId,
        status: detailForm.status,
        isDefault: detailForm.isDefault,
        sortOrder: detailForm.sortOrder,
        expectedUpdatedAt: selectedVariant?.updatedAt || null,
        expectedDefaultUpdatedAt:
          detailForm.isDefault && defaultVariant && defaultVariant.id !== selectedVariant?.id
            ? defaultVariant.updatedAt
            : null
      });
      const updatedVariant = result.payload.variants.find((item) => item.id === result.variantId);
      setPayload(result.payload);
      if (updatedVariant) {
        const nextDetail = productVariantFormFromItem(updatedVariant);
        const serverSizes = new Set(activeProductVariantSizeIds(updatedVariant));
        setSelectedVariantId(updatedVariant.id);
        setCreating(false);
        setDetailForm(nextDetail);
        setDetailBaseline(nextDetail);
        setSizeBaseline(serverSizes);
        if (preserveSizeDraft && previousSizesDirty && selectedVariant) {
          setSelectedSizeIds(previousSelectedSizes);
          setSizeState("dirty");
        } else {
          setSelectedSizeIds(serverSizes);
          setSizeState("clean");
        }
      }
      setDetailState("saved");
      setNotice(result.message);
      return { payload: result.payload, variantId: result.variantId };
    } catch (reason) {
      conflictState(reason, "detail");
      return null;
    }
  }

  async function persistSizes(input?: {
    sourcePayload?: ProductVariantsPayload;
    variantId?: string;
    activeSizeIds?: Set<string>;
  }) {
    const sourcePayload = input?.sourcePayload || payload;
    const variantId = input?.variantId || selectedVariant?.id || null;
    const activeSizeIds = input?.activeSizeIds || selectedSizeIds;
    if (!sourcePayload || !variantId || !canManage || working) return null;
    const sourceVariant = sourcePayload.variants.find((item) => item.id === variantId) || null;
    if (!sourceVariant) return null;
    const expectedRowVersions = Object.fromEntries(
      sourceVariant.sizes
        .filter((item) => item.sellableId && item.updatedAt)
        .map((item) => [item.sellableId as string, item.updatedAt as string])
    );
    setSizeState("saving");
    setNotice("");
    try {
      const result = await saveProductVariantSizes(product.id, {
        variantId,
        activeSizeIds: [...activeSizeIds],
        expectedVariantUpdatedAt: sourceVariant.updatedAt,
        expectedRowVersions
      });
      setPayload(result.payload);
      const updatedVariant = result.payload.variants.find((item) => item.id === result.variantId);
      if (updatedVariant) {
        const nextDetail = productVariantFormFromItem(updatedVariant);
        const nextSizes = new Set(activeProductVariantSizeIds(updatedVariant));
        setSelectedVariantId(updatedVariant.id);
        setDetailForm(nextDetail);
        setDetailBaseline(nextDetail);
        setSelectedSizeIds(nextSizes);
        setSizeBaseline(nextSizes);
      }
      setSizeState("saved");
      setNotice(result.message);
      return result;
    } catch (reason) {
      conflictState(reason, "sizes");
      return null;
    }
  }

  async function saveDirty() {
    if (!payload) return null;
    let sourcePayload = payload;
    let variantId = selectedVariant?.id || null;
    const desiredSizes = new Set(selectedSizeIds);
    if (detailDirty) {
      const detailResult = await persistDetail(true);
      if (!detailResult) return null;
      sourcePayload = detailResult.payload;
      variantId = detailResult.variantId;
    }
    if (sizesDirty && variantId) {
      const sizeResult = await persistSizes({ sourcePayload, variantId, activeSizeIds: desiredSizes });
      if (!sizeResult) return null;
      sourcePayload = sizeResult.payload;
    }
    return sourcePayload;
  }

  function executePending(action: PendingAction, sourcePayload = payload) {
    setPendingAction(null);
    if (action.kind === "href") {
      window.location.assign(action.href);
      return;
    }
    if (!sourcePayload) return;
    if (action.kind === "new") openNew(sourcePayload);
    else openVariant(sourcePayload, action.variantId);
  }

  async function saveThenContinue() {
    const action = pendingAction;
    if (!action) return;
    const nextPayload = await saveDirty();
    if (nextPayload) executePending(action, nextPayload);
  }

  if (loading) {
    return <section aria-busy="true" className="h-[34rem] animate-pulse border border-brand-softGray bg-white" />;
  }

  if (error || !payload || !detailForm) {
    return (
      <section role="alert" className="border border-red-200 bg-red-50 p-6 text-red-950">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">WP-04 VARIANTS</p>
        <h2 className="mt-2 text-2xl font-semibold">Varian produk belum dapat dimuat</h2>
        <p className="mt-3 text-sm leading-6">{error || "Data varian tidak tersedia."}</p>
        <button type="button" onClick={reload} className="mt-5 min-h-10 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">
          Coba lagi
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">WP-04 VARIANTS</p>
            <h2 className="mt-2 text-2xl font-semibold">Varian dan multi-color</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/65">
              Kelola satu warna pada satu waktu, termasuk swatch solid, combination, pattern, ukuran tersedia, status, urutan, dan warna default.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SaveStateBadge label="Detail" state={detailState} />
            <SaveStateBadge label="Ukuran" state={sizeState} />
          </div>
        </div>

        {!canManage ? (
          <div role="status" className="mt-5 border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            MODE LIHAT SAJA — pengelolaan varian hanya tersedia untuk Owner atau Super Admin.
          </div>
        ) : null}

        {notice ? (
          <div
            role={detailState === "error" || detailState === "conflict" || sizeState === "error" || sizeState === "conflict" ? "alert" : "status"}
            className="mt-5 border border-brand-softGray bg-brand-offWhite px-5 py-4 text-sm"
          >
            <p className="font-semibold">{notice}</p>
            {detailState === "conflict" || sizeState === "conflict" ? (
              <button type="button" onClick={reload} className="mt-3 min-h-10 rounded-full bg-brand-charcoal px-5 text-xs font-semibold text-white">
                Muat ulang data terbaru
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
          <aside className="border border-brand-softGray">
            <div className="border-b border-brand-softGray p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Daftar warna</h3>
                  <p className="mt-1 text-xs text-brand-charcoal/55">{payload.variants.length} warna</p>
                </div>
                {canManage ? (
                  <button type="button" onClick={requestNew} className="min-h-10 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white">
                    Tambah warna
                  </button>
                ) : null}
              </div>
              <input
                type="search"
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                placeholder="Cari warna"
                className={`${controlClass} mt-4`}
              />
            </div>

            <div className="max-h-[48rem] overflow-y-auto p-2">
              {filteredVariants.length ? filteredVariants.map((workspaceVariant) => (
                <button
                  key={workspaceVariant.id}
                  type="button"
                  onClick={() => requestVariant(workspaceVariant.id)}
                  className={workspaceVariant.id === selectedVariantId && !creating
                    ? "grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 bg-brand-offWhite p-4 text-left"
                    : "grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 p-4 text-left hover:bg-brand-offWhite"}
                >
                  <ProductColorSwatch value={workspaceVariant} label={workspaceVariant.name} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{workspaceVariant.name}</span>
                      {workspaceVariant.isDefault ? <MiniBadge>Default</MiniBadge> : null}
                      <MiniBadge tone={workspaceVariant.status === "active" ? "success" : "muted"}>
                        {workspaceVariant.status === "active" ? "Aktif" : "Nonaktif"}
                      </MiniBadge>
                    </span>
                    <span className="mt-2 grid gap-1 text-xs text-brand-charcoal/55 sm:grid-cols-2">
                      <span>{workspaceVariant.activeSizeCount} ukuran aktif</span>
                      <span>{workspaceVariant.activeSkuCount} SKU aktif</span>
                      <span>{workspaceVariant.frontImageComplete ? "Front lengkap" : "Front belum ada"}</span>
                      <span>Urutan {workspaceVariant.sortOrder}</span>
                    </span>
                  </span>
                </button>
              )) : (
                <div className="p-6 text-sm text-brand-charcoal/60">
                  {payload.variants.length ? "Warna tidak ditemukan." : "Belum ada varian warna."}
                </div>
              )}
            </div>
          </aside>

          <div className="grid content-start gap-6">
            <section className="border border-brand-softGray p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">
                    {creating ? "WARNA BARU" : "DETAIL WARNA TERPILIH"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">
                    {creating ? "Tambahkan warna dari Color Master" : selectedVariant?.name || "Warna"}
                  </h3>
                </div>
                {selectedVariant ? <ProductColorSwatch value={selectedVariant} label={selectedVariant.name} className="h-14 w-14" /> : selectedMaster ? <ProductColorSwatch value={selectedMaster} label={selectedMaster.name} className="h-14 w-14" /> : null}
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {creating ? (
                  <Field label="Master warna" required>
                    <select
                      value={detailForm.colorMasterId}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDetail({ colorMasterId: event.target.value })}
                      disabled={!canManage || working}
                      className={controlClass}
                    >
                      <option value="">Pilih master warna</option>
                      {selectableMasters.map((master) => (
                        <option key={master.id} value={master.id}>{master.name} · {master.colorType}</option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <ReadOnlyField label="Master warna" value={selectedVariant?.colorMasterName || "Fallback legacy"} />
                )}

                <Field label="Status">
                  <select
                    value={detailForm.status}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDetail({ status: event.target.value === "inactive" ? "inactive" : "active" })}
                    disabled={!canManage || working}
                    className={controlClass}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </Field>

                <Field label="Urutan">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={detailForm.sortOrder}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => updateDetail({ sortOrder: Number(event.target.value) })}
                    disabled={!canManage || working}
                    className={controlClass}
                  />
                </Field>

                <label className="flex min-h-11 items-center gap-3 border border-brand-softGray px-4 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={detailForm.isDefault}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => updateDetail({ isDefault: event.target.checked })}
                    disabled={!canManage || working || Boolean(selectedVariant?.isDefault)}
                  />
                  Jadikan warna default
                </label>
              </div>

              {(selectedVariant || selectedMaster) ? (
                <SwatchContract value={selectedVariant || selectedMaster!} />
              ) : null}

              {canManage ? (
                <button
                  data-admin-mutation="true"
                  type="button"
                  onClick={() => void persistDetail()}
                  disabled={working || !detailDirty || (creating && !detailForm.colorMasterId)}
                  className="mt-6 min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {detailState === "saving" ? "Menyimpan..." : creating ? "Tambahkan Warna" : "Simpan Detail Warna"}
                </button>
              ) : null}
            </section>

            <section className="border border-brand-softGray p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">UKURAN TERSEDIA PER WARNA</p>
                  <h3 className="mt-2 text-xl font-semibold">{selectedVariant ? selectedVariant.name : "Simpan warna terlebih dahulu"}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/60">
                    Perbedaan ukuran antarwarna didukung. Menonaktifkan ukuran tidak menghapus SKU historis. Harga dan stok tetap dikelola pada WP-05.
                  </p>
                </div>
                {selectedVariant ? <MiniBadge>{selectedVariant.activeSizeCount} aktif</MiniBadge> : null}
              </div>

              {selectedVariant ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedVariant.sizes.map((size) => {
                    const checked = selectedSizeIds.has(size.sizeId);
                    return (
                      <label key={size.sizeId} className={checked ? "border border-brand-charcoal bg-brand-offWhite p-4" : "border border-brand-softGray p-4"}>
                        <span className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSize(size.sizeId)}
                            disabled={!canManage || working}
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold">{size.sizeName}</span>
                            <span className="mt-1 block break-all text-xs text-brand-charcoal/55">
                              {size.sku || "SKU dibuat saat ukuran diaktifkan"}
                            </span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 border border-dashed border-brand-softGray bg-brand-offWhite p-6 text-sm text-brand-charcoal/60">
                  Pilih warna existing atau simpan warna baru sebelum mengatur ukuran.
                </div>
              )}

              {canManage && selectedVariant ? (
                <button
                  data-admin-mutation="true"
                  type="button"
                  onClick={() => void persistSizes()}
                  disabled={working || !sizesDirty}
                  className="mt-6 min-h-11 rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {sizeState === "saving" ? "Menyimpan..." : "Simpan Ukuran Tersedia"}
                </button>
              ) : null}
            </section>
          </div>
        </div>
      </section>

      {pendingAction ? (
        <DirtyVariantsDialog
          saving={working}
          onDiscard={() => executePending(pendingAction)}
          onStay={() => setPendingAction(null)}
          onSave={() => void saveThenContinue()}
        />
      ) : null}
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-softGray px-4 py-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function SwatchContract({ value }: { value: ProductWorkspaceVariant | ProductVariantColorMaster }) {
  return (
    <div className="mt-5 grid gap-3 border border-brand-softGray bg-brand-offWhite p-4 text-xs sm:grid-cols-3">
      <ReadOnlyField label="Tipe swatch" value={value.colorType} />
      <ReadOnlyField label="Primary" value={value.primaryHex || value.colorHex} />
      <ReadOnlyField label="Secondary" value={value.secondaryHex || "Tidak digunakan"} />
      <ReadOnlyField label="Tertiary" value={value.tertiaryHex || "Tidak digunakan"} />
      <ReadOnlyField label="Arah" value={value.swatchDirection} />
      <ReadOnlyField label="Pattern" value={value.patternImageUrl ? "Gambar pattern tersedia" : "Tidak digunakan"} />
    </div>
  );
}


function SaveStateBadge({ label, state }: { label: string; state: ProductVariantSaveState }) {
  const labels: Record<ProductVariantSaveState, string> = {
    clean: "Bersih",
    dirty: "Belum disimpan",
    saving: "Menyimpan",
    saved: "Tersimpan",
    conflict: "Konflik versi",
    error: "Gagal"
  };
  const tone = state === "saved"
    ? "bg-green-50 text-green-800"
    : state === "conflict"
      ? "bg-amber-100 text-amber-900"
      : state === "error"
        ? "bg-red-50 text-red-800"
        : state === "dirty"
          ? "bg-blue-50 text-blue-800"
          : "bg-brand-offWhite text-brand-charcoal/65";
  return <span className={`rounded-full px-3 py-2 text-xs font-semibold ${tone}`}>{label}: {labels[state]}</span>;
}

function MiniBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "muted" }) {
  const className = tone === "success"
    ? "bg-green-50 text-green-800"
    : tone === "muted"
      ? "bg-gray-100 text-gray-600"
      : "bg-white text-brand-charcoal/70";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${className}`}>{children}</span>;
}

function DirtyVariantsDialog({
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
    <div role="dialog" aria-modal="true" aria-labelledby="dirty-variants-title" className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4">
      <section className="w-full max-w-lg bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">PERUBAHAN BELUM DISIMPAN</p>
        <h2 id="dirty-variants-title" className="mt-2 text-2xl font-semibold">Simpan perubahan sebelum keluar?</h2>
        <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Detail warna atau ukuran tersedia telah berubah dan belum tersimpan.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={onDiscard} disabled={saving} className="min-h-11 border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-45">Keluar tanpa menyimpan</button>
          <button type="button" onClick={onStay} disabled={saving} className="min-h-11 border border-brand-softGray px-4 text-sm font-semibold disabled:opacity-45">Tetap di sini</button>
          <button data-admin-mutation="true" type="button" onClick={onSave} disabled={saving} className="min-h-11 bg-brand-charcoal px-4 text-sm font-semibold text-white disabled:opacity-45">{saving ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </section>
    </div>
  );
}

const controlClass = "min-h-11 w-full rounded-lg border border-brand-softGray bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-brand-offWhite disabled:text-brand-charcoal/45";
