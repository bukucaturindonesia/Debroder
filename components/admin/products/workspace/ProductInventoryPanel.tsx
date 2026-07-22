"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  loadProductInventory,
  mutateProductInventory,
  ProductInventoryRequestError
} from "@/lib/admin-product-inventory-api";
import {
  canManageProductInventory,
  draftFromInventoryRow,
  inventoryDraftChanged,
  inventoryModeLabel,
  inventorySaveChanges,
  updateInventoryDraft,
  type ProductInventoryDraft,
  type ProductInventoryMode,
  type ProductInventoryMutationSummary,
  type ProductInventoryPayload,
  type ProductInventoryQuery,
  type ProductInventorySaveState
} from "@/lib/product-inventory";
import { ProductColorSwatch } from "@/components/admin/products/workspace/ProductColorSwatch";
import { useProductWorkspace } from "@/components/admin/products/workspace/ProductWorkspaceShell";
import { formatRupiah } from "@/lib/url";

const defaultQuery: ProductInventoryQuery = {
  locationId: "all",
  mode: "stock",
  q: "",
  colorId: "",
  sizeId: "",
  status: "all",
  page: 1,
  pageSize: 50,
  copyFromVariantId: ""
};

type PendingTransition =
  | { kind: "location"; locationId: string }
  | { kind: "href"; href: string }
  | null;

export function ProductInventoryPanel() {
  const { product } = useProductWorkspace();
  const [query, setQuery] = useState<ProductInventoryQuery>(defaultQuery);
  const [payload, setPayload] = useState<ProductInventoryPayload | null>(null);
  const [drafts, setDrafts] = useState<Map<string, ProductInventoryDraft>>(
    new Map()
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] =
    useState<ProductInventorySaveState>("clean");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [reason, setReason] = useState(
    "Penyesuaian melalui Product Workspace WP-05"
  );
  const [bulkValue, setBulkValue] = useState("0");
  const [preview, setPreview] =
    useState<ProductInventoryMutationSummary | null>(null);
  const [pendingTransition, setPendingTransition] =
    useState<PendingTransition>(null);

  const dirtyDrafts = useMemo(
    () => [...drafts.values()].filter(inventoryDraftChanged),
    [drafts]
  );
  const dirty = dirtyDrafts.length > 0;
  const working = saveState === "saving";
  const reload = useCallback(
    () => setReloadToken((value) => value + 1),
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    const requestQuery: ProductInventoryQuery = {
      locationId: query.locationId,
      mode: query.mode,
      q: query.q,
      colorId: query.colorId,
      sizeId: query.sizeId,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
      copyFromVariantId: query.copyFromVariantId
    };
    void loadProductInventory(product.id, requestQuery, controller.signal)
      .then((next) => {
        setPayload(next);
        setQuery(next.query);
      })
      .catch((reasonValue: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          reasonValue instanceof Error
            ? reasonValue.message
            : "Harga dan stok belum dapat dimuat."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    product.id,
    query.locationId,
    query.mode,
    query.q,
    query.colorId,
    query.sizeId,
    query.status,
    query.page,
    query.pageSize,
    query.copyFromVariantId,
    reloadToken
  ]);

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

  const canEdit = Boolean(
    payload && canManageProductInventory(
      payload.capabilities,
      payload.selectedLocation
    )
  );
  const selectionById = useMemo(
    () => new Map(
      (payload?.selectionRows || []).map((row) => [row.sellableId, row])
    ),
    [payload?.selectionRows]
  );

  function changeFilter(patch: Partial<ProductInventoryQuery>) {
    setQuery((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1
    }));
  }

  function requestLocation(locationId: string) {
    if (locationId === query.locationId) return;
    if (dirty) {
      setPendingTransition({ kind: "location", locationId });
      return;
    }
    changeLocation(locationId);
  }

  function changeLocation(locationId: string) {
    discardDrafts();
    setQuery((current) => ({ ...current, locationId, page: 1 }));
  }

  function draftFor(sellableId: string) {
    return drafts.get(sellableId) || (
      selectionById.has(sellableId)
        ? draftFromInventoryRow(selectionById.get(sellableId)!)
        : null
    );
  }

  function patchDraft(
    sellableId: string,
    patch: Partial<Pick<
      ProductInventoryDraft,
      "stockQuantity" | "priceAdjustment" | "status"
    >>
  ) {
    const current = draftFor(sellableId);
    if (!current) return;
    const next = updateInventoryDraft(current, patch);
    setDrafts((previous) => {
      const copy = new Map(previous);
      if (inventoryDraftChanged(next)) copy.set(sellableId, next);
      else copy.delete(sellableId);
      return copy;
    });
    setSaveState("dirty");
    setNotice("");
    setPreview(null);
  }

  function toggleSelected(sellableId: string) {
    setSelectedIds((previous) => {
      const copy = new Set(previous);
      if (copy.has(sellableId)) copy.delete(sellableId);
      else copy.add(sellableId);
      return copy;
    });
  }

  function selectPage() {
    setSelectedIds((previous) => {
      const copy = new Set(previous);
      for (const row of payload?.rows || []) copy.add(row.sellableId);
      return copy;
    });
  }

  function selectAllMatching() {
    setSelectedIds(new Set(payload?.matchingRowIds || []));
  }

  function applyBulk() {
    if (!canEdit || !selectedIds.size) return;
    const numeric = Number(bulkValue);
    for (const id of selectedIds) {
      if (query.mode === "status") {
        patchDraft(id, {
          status: bulkValue === "inactive" ? "inactive" : "active"
        });
      } else if (Number.isInteger(numeric)) {
        patchDraft(
          id,
          query.mode === "price"
            ? { priceAdjustment: numeric }
            : { stockQuantity: numeric }
        );
      }
    }
  }

  function copyFromColor() {
    if (
      !canEdit ||
      !query.copyFromVariantId ||
      !payload?.copySourceRows.length ||
      !selectedIds.size
    ) return;
    const sourceBySize = new Map(
      payload.copySourceRows.map((row) => [row.sizeId, row])
    );
    for (const id of selectedIds) {
      const target = selectionById.get(id);
      if (!target) continue;
      const source = sourceBySize.get(target.sizeId);
      if (!source) continue;
      if (query.mode === "stock") {
        patchDraft(id, { stockQuantity: source.stockQuantity });
      } else if (query.mode === "price") {
        patchDraft(id, { priceAdjustment: source.priceAdjustment });
      } else {
        patchDraft(id, { status: source.status });
      }
    }
  }

  async function runPreview() {
    if (!payload || !canEdit || working) return false;
    const changes = inventorySaveChanges(dirtyDrafts);
    if (!changes.length) return false;
    setSaveState("saving");
    setNotice("");
    try {
      const result = await mutateProductInventory({
        productId: product.id,
        action: "preview",
        locationId: payload.selectedLocation.id || "",
        changes,
        reason
      });
      setPreview(result.summary);
      setSaveState("dirty");
      return true;
    } catch (reasonValue) {
      handleMutationError(reasonValue);
      return false;
    }
  }

  async function commit() {
    if (!payload || !canEdit || working) return false;
    const changes = inventorySaveChanges(dirtyDrafts);
    if (!changes.length) return false;
    setSaveState("saving");
    setNotice("");
    try {
      const result = await mutateProductInventory({
        productId: product.id,
        action: "commit",
        locationId: payload.selectedLocation.id || "",
        changes,
        reason
      });
      discardDrafts();
      setSaveState("saved");
      setNotice(result.message);
      reload();
      return true;
    } catch (reasonValue) {
      handleMutationError(reasonValue);
      return false;
    }
  }

  function handleMutationError(reasonValue: unknown) {
    const error = reasonValue instanceof ProductInventoryRequestError
      ? reasonValue
      : new ProductInventoryRequestError(
        500,
        "Perubahan belum berhasil disimpan."
      );
    setSaveState(error.status === 409 ? "conflict" : "error");
    setNotice(error.message);
    setPreview(null);
  }

  function discardDrafts() {
    setDrafts(new Map());
    setSelectedIds(new Set());
    setPreview(null);
    setSaveState("clean");
  }

  async function saveThenContinue() {
    const pending = pendingTransition;
    if (!pending) return;
    const saved = await commit();
    if (!saved) return;
    setPendingTransition(null);
    if (pending.kind === "href") window.location.assign(pending.href);
    else changeLocation(pending.locationId);
  }

  function discardThenContinue() {
    const pending = pendingTransition;
    discardDrafts();
    setPendingTransition(null);
    if (!pending) return;
    if (pending.kind === "href") window.location.assign(pending.href);
    else changeLocation(pending.locationId);
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
          WP-05 INVENTORY
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Harga dan stok belum dapat dimuat
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

  return (
    <>
      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
              WP-05 LOCATION-AWARE INVENTORY
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Harga &amp; Stok</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/65">
              Matrix SKU per produk dengan filter dan pagination 50 row.
              Semua Lokasi serta Legacy hanya dapat dilihat.
            </p>
          </div>
          <SaveStateBadge state={saveState} />
        </div>

        <LocationSelector
          payload={payload}
          selected={query.locationId}
          onSelect={requestLocation}
        />

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="On hand" value={payload.summary.onHand} />
          <SummaryCard label="Reserved" value={payload.summary.reserved} />
          <SummaryCard label="Available" value={payload.summary.available} />
        </dl>

        {payload.selectedLocation.kind === "all" ? (
          <InfoBanner>
            Semua Lokasi adalah total read-only dari seluruh inventory ledger.
          </InfoBanner>
        ) : payload.selectedLocation.legacy ? (
          <InfoBanner>
            Legacy System visible read-only. Saldo tidak dipindahkan ke store
            secara otomatis. Drift compatibility: {payload.legacyDriftCount} row.
          </InfoBanner>
        ) : !canEdit ? (
          <InfoBanner>
            MODE LIHAT SAJA — mutation Workspace inventory hanya untuk
            Owner/Super Admin.
          </InfoBanner>
        ) : null}

        {notice ? (
          <div
            role={saveState === "error" || saveState === "conflict"
              ? "alert"
              : "status"}
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
                onClick={() => {
                  discardDrafts();
                  reload();
                }}
                className="mt-3 min-h-10 rounded-full bg-brand-charcoal px-5 text-xs font-semibold text-white"
              >
                Muat ulang data terbaru
              </button>
            ) : null}
          </div>
        ) : null}

        <ModeTabs
          mode={query.mode}
          onChange={(mode) => changeFilter({ mode })}
        />
        <InventoryFilters
          payload={payload}
          query={query}
          onChange={changeFilter}
        />
        <BulkToolbar
          payload={payload}
          mode={query.mode}
          canEdit={canEdit}
          selectedCount={selectedIds.size}
          dirtyCount={dirtyDrafts.length}
          bulkValue={bulkValue}
          reason={reason}
          onBulkValue={setBulkValue}
          onReason={setReason}
          onSelectPage={selectPage}
          onSelectAll={selectAllMatching}
          onClear={() => setSelectedIds(new Set())}
          onApply={applyBulk}
          onCopy={copyFromColor}
          onPreview={() => void runPreview()}
        />

        <div className="mt-5 overflow-x-auto border border-brand-softGray">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead className="bg-brand-offWhite text-left text-xs uppercase tracking-[0.08em] text-brand-charcoal/55">
              <tr>
                <th className="p-3">Pilih</th>
                <th className="p-3">Warna</th>
                <th className="p-3">Ukuran</th>
                <th className="p-3">SKU</th>
                <th className="p-3">{inventoryModeLabel(query.mode)}</th>
                <th className="p-3">Reserved</th>
                <th className="p-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {payload.rows.length ? payload.rows.map((row) => {
                const draft = draftFor(row.sellableId);
                const stock = draft?.stockQuantity ?? row.stockQuantity;
                const price = draft?.priceAdjustment ?? row.priceAdjustment;
                const status = draft?.status ?? row.status;
                return (
                  <tr
                    key={row.sellableId}
                    className="border-t border-brand-softGray"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.sellableId)}
                        onChange={() => toggleSelected(row.sellableId)}
                        aria-label={`Pilih ${row.sku}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <ProductColorSwatch
                          value={row}
                          label={row.colorName}
                          className="h-8 w-8"
                        />
                        <span className="font-semibold">{row.colorName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold">{row.sizeName}</td>
                    <td className="p-3 font-mono text-xs">{row.sku}</td>
                    <td className="p-3">
                      {query.mode === "stock" ? (
                        <input
                          type="number"
                          min={row.reservedQuantity}
                          step={1}
                          value={stock}
                          disabled={!canEdit}
                          onChange={(event) => patchDraft(
                            row.sellableId,
                            { stockQuantity: Number(event.target.value) }
                          )}
                          className={controlClass}
                        />
                      ) : query.mode === "price" ? (
                        <div className="grid gap-1">
                          <input
                            type="number"
                            step={1}
                            value={price}
                            disabled={!canEdit}
                            onChange={(event) => patchDraft(
                              row.sellableId,
                              { priceAdjustment: Number(event.target.value) }
                            )}
                            className={controlClass}
                          />
                          <span className="text-xs text-brand-charcoal/55">
                            Final {formatRupiah(
                              row.basePrice + row.variantPriceAdjustment + price
                            )}
                          </span>
                        </div>
                      ) : (
                        <select
                          value={status}
                          disabled={!canEdit}
                          onChange={(event) => patchDraft(
                            row.sellableId,
                            {
                              status: event.target.value === "inactive"
                                ? "inactive"
                                : "active"
                            }
                          )}
                          className={controlClass}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      )}
                    </td>
                    <td className="p-3">{row.reservedQuantity}</td>
                    <td className="p-3 font-semibold">
                      {query.mode === "stock"
                        ? Math.max(0, stock - row.reservedQuantity)
                        : row.availableQuantity}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-brand-charcoal/60"
                  >
                    Tidak ada SKU yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={payload.pagination.page}
          pageCount={payload.pagination.pageCount}
          total={payload.pagination.total}
          onPage={(page) => changeFilter({ page })}
        />
      </section>

      {preview ? (
        <PreviewDialog
          summary={preview}
          saving={working}
          onCancel={() => setPreview(null)}
          onCommit={() => void commit()}
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

function LocationSelector({
  payload,
  selected,
  onSelect
}: {
  payload: ProductInventoryPayload;
  selected: string;
  onSelect: (locationId: string) => void;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <div className="flex min-w-max gap-2">
        <LocationButton
          active={selected === "all"}
          label="Semua Lokasi"
          detail={`Total ${payload.locations.reduce(
            (total, location) => total + location.summary.onHand,
            0
          )}`}
          onClick={() => onSelect("all")}
        />
        {payload.locations.map((location) => (
          <LocationButton
            key={location.id}
            active={selected === location.id}
            label={location.name}
            detail={location.legacy
              ? `Legacy ${location.summary.onHand}`
              : `On hand ${location.summary.onHand}`}
            onClick={() => onSelect(location.id)}
          />
        ))}
      </div>
    </div>
  );
}

function LocationButton({
  active,
  label,
  detail,
  onClick
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active
        ? "min-w-40 rounded-xl bg-brand-charcoal px-4 py-3 text-left text-white"
        : "min-w-40 rounded-xl border border-brand-softGray bg-white px-4 py-3 text-left"}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className={active
        ? "mt-1 block text-xs text-white/70"
        : "mt-1 block text-xs text-brand-charcoal/50"}
      >
        {detail}
      </span>
    </button>
  );
}

function ModeTabs({
  mode,
  onChange
}: {
  mode: ProductInventoryMode;
  onChange: (mode: ProductInventoryMode) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {(["stock", "price", "status"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={item === mode
            ? "rounded-full bg-brand-charcoal px-5 py-2.5 text-sm font-semibold text-white"
            : "rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold"}
        >
          {inventoryModeLabel(item)}
        </button>
      ))}
    </div>
  );
}

function InventoryFilters({
  payload,
  query,
  onChange
}: {
  payload: ProductInventoryPayload;
  query: ProductInventoryQuery;
  onChange: (patch: Partial<ProductInventoryQuery>) => void;
}) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <input
        value={query.q}
        onChange={(event) => onChange({ q: event.target.value })}
        placeholder="Cari SKU, warna, ukuran"
        className={controlClass}
      />
      <select
        value={query.colorId}
        onChange={(event) => onChange({ colorId: event.target.value })}
        className={controlClass}
      >
        <option value="">Semua warna</option>
        {payload.filters.colors.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      <select
        value={query.sizeId}
        onChange={(event) => onChange({ sizeId: event.target.value })}
        className={controlClass}
      >
        <option value="">Semua ukuran</option>
        {payload.filters.sizes.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      <select
        value={query.status}
        onChange={(event) => onChange({
          status: event.target.value === "active" ||
            event.target.value === "inactive"
            ? event.target.value
            : "all"
        })}
        className={controlClass}
      >
        <option value="all">Semua status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <select
        value={query.copyFromVariantId}
        onChange={(event) => onChange({
          copyFromVariantId: event.target.value
        })}
        className={controlClass}
      >
        <option value="">Sumber copy warna</option>
        {payload.filters.colors.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </div>
  );
}

function BulkToolbar({
  payload,
  mode,
  canEdit,
  selectedCount,
  dirtyCount,
  bulkValue,
  reason,
  onBulkValue,
  onReason,
  onSelectPage,
  onSelectAll,
  onClear,
  onApply,
  onCopy,
  onPreview
}: {
  payload: ProductInventoryPayload;
  mode: ProductInventoryMode;
  canEdit: boolean;
  selectedCount: number;
  dirtyCount: number;
  bulkValue: string;
  reason: string;
  onBulkValue: (value: string) => void;
  onReason: (value: string) => void;
  onSelectPage: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onApply: () => void;
  onCopy: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="mt-5 border border-brand-softGray bg-brand-offWhite p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSelectPage} className={secondaryButton}>
          Pilih page
        </button>
        <button type="button" onClick={onSelectAll} className={secondaryButton}>
          Pilih semua hasil ({payload.pagination.total})
        </button>
        <button type="button" onClick={onClear} className={secondaryButton}>
          Bersihkan pilihan
        </button>
        <span className="text-xs font-semibold text-brand-charcoal/60">
          {selectedCount} dipilih · {dirtyCount} berubah
        </span>
      </div>

      {canEdit ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,180px)_auto_auto_minmax(260px,1fr)_auto]">
          {mode === "status" ? (
            <select
              value={bulkValue}
              onChange={(event) => onBulkValue(event.target.value)}
              className={controlClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          ) : (
            <input
              type="number"
              min={mode === "stock" ? 0 : undefined}
              step={1}
              value={bulkValue}
              onChange={(event) => onBulkValue(event.target.value)}
              className={controlClass}
            />
          )}
          <button
            type="button"
            disabled={!selectedCount}
            onClick={onApply}
            className={secondaryButton}
          >
            Terapkan ke pilihan
          </button>
          <button
            type="button"
            disabled={
              !selectedCount ||
              !payload.query.copyFromVariantId ||
              !payload.copySourceRows.length
            }
            onClick={onCopy}
            className={secondaryButton}
          >
            Salin dari warna
          </button>
          <input
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            maxLength={240}
            placeholder="Alasan perubahan"
            className={controlClass}
          />
          <button
            data-admin-mutation="true"
            type="button"
            disabled={!dirtyCount || !reason.trim()}
            onClick={onPreview}
            className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45"
          >
            Tinjau {dirtyCount} perubahan
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  onPage
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-brand-charcoal/60">
        {total} SKU · halaman {page} dari {pageCount}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={secondaryButton}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className={secondaryButton}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

function PreviewDialog({
  summary,
  saving,
  onCancel,
  onCommit
}: {
  summary: ProductInventoryMutationSummary;
  saving: boolean;
  onCancel: () => void;
  onCommit: () => void;
}) {
  return (
    <Modal title="Konfirmasi perubahan matrix" eyebrow="WP-05 PREVIEW">
      <dl className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Row berubah" value={summary.changedRows} />
        <SummaryCard label="Stock row" value={summary.stockRows} />
        <SummaryCard label="Price row" value={summary.priceRows} />
        <SummaryCard label="Status row" value={summary.statusRows} />
        <SummaryCard label="Delta stok" value={summary.totalStockDelta} />
        <SummaryCard label="Dinonaktifkan" value={summary.deactivatedRows} />
      </dl>
      {summary.deactivatedRows ? (
        <p className="mt-4 border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
          Konfirmasi: {summary.deactivatedRows} SKU akan dinonaktifkan.
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className={secondaryButton}
        >
          Kembali
        </button>
        <button
          data-admin-mutation="true"
          type="button"
          disabled={saving}
          onClick={onCommit}
          className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45"
        >
          {saving ? "Menyimpan..." : "Konfirmasi simpan"}
        </button>
      </div>
    </Modal>
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
        Draft matrix tetap tersimpan ketika berpindah filter atau halaman,
        tetapi harus disimpan atau dibuang sebelum berpindah lokasi/modul.
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
      className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
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

function SaveStateBadge({ state }: { state: ProductInventorySaveState }) {
  const labels: Record<ProductInventorySaveState, string> = {
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-brand-softGray bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
        {label}
      </dt>
      <dd className="mt-2 text-xl font-semibold">{value}</dd>
    </div>
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

const controlClass =
  "min-h-11 w-full rounded-lg border border-brand-softGray bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-brand-offWhite disabled:text-brand-charcoal/45";
const secondaryButton =
  "min-h-10 rounded-full border border-brand-softGray bg-white px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45";
