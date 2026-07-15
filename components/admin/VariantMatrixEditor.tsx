"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ProductManagerItem,
  ProductManagerPayload
} from "@/lib/admin-product-api";
import {
  applyBulkMatrixValue,
  buildExistingMatrixRows,
  changedMatrixRows,
  generateVariantMatrix,
  normalizeSellableSku,
  summarizeVariantMatrix,
  validateVariantMatrix,
  type VariantMatrixColorOption,
  type VariantMatrixRow,
  type VariantMatrixSaveInput
} from "@/lib/variant-matrix";
import { formatRupiah } from "@/lib/url";

export function VariantMatrixEditor({
  product,
  payload,
  readOnly,
  canManage,
  working,
  onSave
}: {
  product: ProductManagerItem;
  payload: ProductManagerPayload;
  readOnly: boolean;
  canManage: boolean;
  working: boolean;
  onSave: (input: VariantMatrixSaveInput) => Promise<void>;
}) {
  const colorOptions = useMemo(() => buildColorOptions(product, payload), [product, payload]);
  const sizeOptions = useMemo(
    () => payload.sizeMaster.map((size) => ({ id: size.id, name: size.name, slug: size.slug, active: true })),
    [payload.sizeMaster]
  );
  const baseRows = useMemo(() => buildExistingMatrixRows(
    colorOptions,
    sizeOptions,
    product.variants.flatMap((variant) => variant.sellable.map((sellable) => ({
      id: sellable.id,
      variantId: variant.id,
      sizeId: sellable.sizeId,
      sku: sellable.sku,
      stockQuantity: sellable.stockQuantity,
      priceAdjustment: sellable.priceAdjustment,
      status: sellable.status,
      sortOrder: sellable.sortOrder
    })))
  ), [colorOptions, product.variants, sizeOptions]);

  const [rows, setRows] = useState<VariantMatrixRow[]>(baseRows);
  const [selectedColorKeys, setSelectedColorKeys] = useState<Set<string>>(new Set());
  const [selectedSizeIds, setSelectedSizeIds] = useState<Set<string>>(new Set());
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [bulkStock, setBulkStock] = useState("0");
  const [bulkPrice, setBulkPrice] = useState("0");
  const [bulkStatus, setBulkStatus] = useState<"active" | "inactive">("active");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRows(baseRows);
    setSelectedColorKeys(new Set(colorOptions.filter((color) => color.variantId).map((color) => color.key)));
    setSelectedSizeIds(new Set(baseRows.map((row) => row.sizeId).filter(Boolean)));
    setSelectedRowKeys(new Set());
    setMessage("");
  }, [baseRows, colorOptions, product.id, product.updatedAt]);

  const globalSkuOwners = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of payload.products) {
      for (const variant of item.variants) {
        for (const sellable of variant.sellable) {
          const sku = normalizeSellableSku(sellable.sku);
          if (sku) map.set(sku, sellable.id);
        }
      }
    }
    return map;
  }, [payload.products]);

  const issues = useMemo(() => validateVariantMatrix({
    productCode: product.sku || "",
    rows,
    globalSkuOwners,
    activeSizeIds: new Set(payload.sizeMaster.map((size) => size.id))
  }), [globalSkuOwners, payload.sizeMaster, product.sku, rows]);
  const summary = useMemo(() => summarizeVariantMatrix(rows, issues), [issues, rows]);
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  const selectedColors = colorOptions.filter((color) => selectedColorKeys.has(color.key));
  const selectedSizes = sizeOptions.filter((size) => selectedSizeIds.has(size.id));
  const totalCombinations = selectedColors.length * selectedSizes.length;
  const unsaved = summary.affected > 0;

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function generate() {
    const next = generateVariantMatrix({
      productCode: product.sku || "",
      colors: selectedColors,
      sizes: selectedSizes,
      existingRows: rows
    });
    setRows(next);
    setMessage(`${selectedColors.length} warna × ${selectedSizes.length} ukuran disiapkan sebagai ${totalCombinations} kombinasi. Belum ada database write.`);
  }

  function updateRow(key: string, patch: Partial<VariantMatrixRow>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  function applyBulk() {
    if (!selectedRowKeys.size) {
      setMessage("Pilih minimal satu row matrix sebelum menerapkan nilai massal.");
      return;
    }
    if (bulkStatus === "inactive" && !window.confirm(`Nonaktifkan ${selectedRowKeys.size} kombinasi terpilih? Data tidak akan dihapus.`)) return;
    const stock = Number(bulkStock);
    const price = Number(bulkPrice);
    setRows((current) => applyBulkMatrixValue(current, selectedRowKeys, {
      stockQuantity: stock,
      priceAdjustment: price,
      status: bulkStatus
    }));
    setMessage(`${selectedRowKeys.size} row diperbarui pada draft matrix. Tekan Simpan Matrix untuk commit.`);
  }

  async function save() {
    if (blockers.length) {
      setMessage("Save ditolak karena masih terdapat BLOCKER.");
      return;
    }
    const changed = changedMatrixRows(rows);
    if (!changed.length) {
      setMessage("Tidak ada perubahan. Database tidak disentuh.");
      return;
    }
    await onSave({ productId: product.id, rows: changed });
  }

  return (
    <section id="variant-matrix" className="scroll-mt-24 bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">PIM PHASE 3</p>
          <h2 className="mt-2 text-2xl font-semibold">Variant Matrix</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
            Generate warna × ukuran sebagai draft, review SKU/stok/harga, lalu simpan seluruh perubahan melalui service canonical.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-brand-offWhite px-3 py-2">{selectedColors.length} warna</span>
          <span className="rounded-full bg-brand-offWhite px-3 py-2">{selectedSizes.length} ukuran</span>
          <span className="rounded-full bg-brand-offWhite px-3 py-2">{totalCombinations} kombinasi</span>
          <span className={unsaved ? "rounded-full bg-amber-50 px-3 py-2 text-amber-800" : "rounded-full bg-green-50 px-3 py-2 text-green-800"}>
            {unsaved ? "Perubahan belum disimpan" : "Tersinkron"}
          </span>
        </div>
      </div>

      {readOnly ? (
        <div className="mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          MODE LIHAT SAJA — matrix dapat direview, tetapi Generate, bulk edit, dan Save dinonaktifkan.
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="border border-brand-softGray p-4">
          <h3 className="font-semibold">Pilih warna</h3>
          <p className="mt-1 text-xs text-brand-charcoal/50">Warna existing memakai product_variant ID. Warna baru memakai master warna existing.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {colorOptions.map((color) => (
              <label key={color.key} className="flex items-center gap-3 border border-brand-softGray p-3 text-sm">
                <input type="checkbox" checked={selectedColorKeys.has(color.key)} onChange={() => toggleSet(setSelectedColorKeys, color.key)} disabled={readOnly || working} />
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: color.hexCode }} />
                <span className="min-w-0"><strong className="block truncate">{color.name}</strong><span className="text-xs text-brand-charcoal/45">{color.variantId ? "Variant existing" : "Master warna"}</span></span>
              </label>
            ))}
          </div>
        </div>

        <div className="border border-brand-softGray p-4">
          <h3 className="font-semibold">Pilih ukuran</h3>
          <p className="mt-1 text-xs text-brand-charcoal/50">Identity ukuran selalu menggunakan product_size_master.id.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sizeOptions.map((size) => (
              <label key={size.id} className="flex items-center gap-2 border border-brand-softGray px-3 py-2 text-sm">
                <input type="checkbox" checked={selectedSizeIds.has(size.id)} onChange={() => toggleSet(setSelectedSizeIds, size.id)} disabled={readOnly || working} />
                <span>{size.name}</span>
              </label>
            ))}
          </div>
          {!readOnly && canManage ? (
            <button data-admin-mutation="true" type="button" onClick={generate} disabled={working || !selectedColors.length || !selectedSizes.length} className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">
              Generate Draft Matrix
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Baru" value={summary.created} />
        <SummaryCard label="Diperbarui" value={summary.updated} />
        <SummaryCard label="Tidak berubah" value={summary.unchanged} />
        <SummaryCard label="Dinonaktifkan" value={summary.deactivated} />
        <SummaryCard label="Konflik" value={summary.conflicts} />
        <SummaryCard label="Terdampak" value={summary.affected} />
      </div>

      {message ? <div role="status" className="mt-5 border border-brand-softGray bg-brand-offWhite px-4 py-3 text-sm font-medium">{message}</div> : null}

      <div className={blockers.length ? "mt-5 border border-amber-200 bg-amber-50 p-4" : "mt-5 border border-green-200 bg-green-50 p-4"}>
        <p className="text-sm font-semibold">{blockers.length ? `BLOCKER — ${blockers.length} konflik harus diperbaiki` : "READY — dry-run tidak menemukan blocker"}</p>
        {issues.length ? <ul className="mt-2 space-y-1 text-xs leading-5">{issues.slice(0, 20).map((issue) => <li key={`${issue.key}-${issue.message}`}>• {issue.message}</li>)}</ul> : <p className="mt-1 text-xs text-green-900/70">SKU, master reference, stok, harga, dan kombinasi siap disimpan.</p>}
      </div>

      {!readOnly && canManage ? (
        <div className="mt-6 border border-brand-softGray p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold">Bulk stok<input type="number" min={0} step={1} value={bulkStock} onChange={(event) => setBulkStock(event.target.value)} className="mt-2 block min-h-10 w-32 border border-brand-softGray px-3 text-sm" /></label>
            <label className="text-xs font-semibold">Bulk price adjustment<input type="number" step={1} value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} className="mt-2 block min-h-10 w-40 border border-brand-softGray px-3 text-sm" /></label>
            <label className="text-xs font-semibold">Bulk status<select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value === "inactive" ? "inactive" : "active")} className="mt-2 block min-h-10 w-36 border border-brand-softGray bg-white px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <button data-admin-mutation="true" type="button" onClick={applyBulk} disabled={working || !selectedRowKeys.size} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold disabled:opacity-45">Terapkan ke {selectedRowKeys.size} row</button>
            <button data-admin-mutation="true" type="button" onClick={() => void save()} disabled={working || !summary.affected || blockers.length > 0} className="min-h-10 rounded-full bg-brand-green px-5 text-xs font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : `Simpan Matrix (${summary.affected})`}</button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto border border-brand-softGray">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead className="bg-brand-offWhite text-xs uppercase tracking-[0.08em] text-brand-charcoal/55">
            <tr><th className="p-3">Pilih</th><th className="p-3">Warna</th><th className="p-3">Ukuran</th><th className="p-3">SKU</th><th className="p-3">Stok</th><th className="p-3">Adj. harga</th><th className="p-3">Harga akhir</th><th className="p-3">Status</th><th className="p-3">Validasi</th></tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => {
              const rowIssues = issues.filter((issue) => issue.key === row.key);
              const variantAdjustment = product.variants.find((variant) => variant.id === row.variantId)?.priceAdjustment || 0;
              return (
                <tr key={row.key} className="border-t border-brand-softGray align-top">
                  <td className="p-3"><input type="checkbox" checked={selectedRowKeys.has(row.key)} onChange={() => toggleSet(setSelectedRowKeys, row.key)} disabled={readOnly || working} /></td>
                  <td className="p-3"><span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: row.colorHex }} /><strong>{row.colorName}</strong></span></td>
                  <td className="p-3"><strong>{row.sizeName}</strong><span className="mt-1 block text-[11px] text-brand-charcoal/40">{row.sizeId || "Missing size_id"}</span></td>
                  <td className="p-3"><input value={row.sku} onChange={(event) => updateRow(row.key, { sku: normalizeSellableSku(event.target.value) })} disabled={readOnly || working} className="min-h-10 w-52 border border-brand-softGray px-3 font-mono text-xs" /></td>
                  <td className="p-3"><input type="number" min={0} step={1} value={row.stockQuantity} onChange={(event) => updateRow(row.key, { stockQuantity: Number(event.target.value) })} disabled={readOnly || working} className="min-h-10 w-24 border border-brand-softGray px-3" /></td>
                  <td className="p-3"><input type="number" step={1} value={row.priceAdjustment} onChange={(event) => updateRow(row.key, { priceAdjustment: Number(event.target.value) })} disabled={readOnly || working} className="min-h-10 w-28 border border-brand-softGray px-3" /></td>
                  <td className="p-3 font-semibold">{formatRupiah(product.basePrice + variantAdjustment + row.priceAdjustment)}</td>
                  <td className="p-3"><select value={row.status} onChange={(event) => updateRow(row.key, { status: event.target.value === "inactive" ? "inactive" : "active" })} disabled={readOnly || working} className="min-h-10 border border-brand-softGray bg-white px-3"><option value="active">Active</option><option value="inactive">Inactive</option></select></td>
                  <td className="p-3">{rowIssues.length ? <span className="font-semibold text-amber-800">BLOCKER</span> : <span className="font-semibold text-green-700">READY</span>}</td>
                </tr>
              );
            }) : <tr><td colSpan={9} className="p-8 text-center text-brand-charcoal/50">Belum ada kombinasi. Pilih warna dan ukuran lalu Generate Draft Matrix.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildColorOptions(product: ProductManagerItem, payload: ProductManagerPayload): VariantMatrixColorOption[] {
  const mastersBySlug = new Map(payload.colorMaster.map((color) => [color.slug, color]));
  const existing = product.variants.map((variant) => {
    const master = mastersBySlug.get(variant.slug);
    return {
      key: `variant:${variant.id}`,
      variantId: variant.id,
      colorMasterId: master?.id || null,
      name: variant.name,
      slug: variant.slug,
      hexCode: variant.hexCode,
      status: variant.status,
      sortOrder: variant.sortOrder
    } satisfies VariantMatrixColorOption;
  });
  const existingSlugs = new Set(product.variants.map((variant) => variant.slug));
  const available = payload.colorMaster.filter((master) => !existingSlugs.has(master.slug)).map((master, index) => ({
    key: `master:${master.id}`,
    variantId: null,
    colorMasterId: master.id,
    name: master.name,
    slug: master.slug,
    hexCode: master.colorHex,
    status: "active" as const,
    sortOrder: product.variants.length + index
  }));
  return [...existing, ...available];
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="bg-brand-offWhite p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-charcoal/45">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
