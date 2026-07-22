/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import {
  loadProductInformation,
  ProductInformationRequestError,
  saveProductInformation
} from "@/lib/admin-product-information-api";
import {
  canEditProductInformation,
  productInformationFormFromProduct,
  productInformationInput,
  sameProductInformation,
  slugifyProductInformation,
  workspaceProductFromInformation,
  type ProductInformationFormValue,
  type ProductInformationPayload,
  type ProductInformationSaveState
} from "@/lib/product-information";
import { useProductWorkspace } from "@/components/admin/products/workspace/ProductWorkspaceShell";

export function ProductInformationForm() {
  const {
    product: workspaceProduct,
    updateWorkspaceProduct
  } = useProductWorkspace();
  const [payload, setPayload] = useState<ProductInformationPayload | null>(null);
  const [form, setForm] = useState<ProductInformationFormValue | null>(null);
  const [baseline, setBaseline] = useState<ProductInformationFormValue | null>(null);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<ProductInformationSaveState>("clean");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const reloadData = useCallback(() => {
    setPendingHref(null);
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setNotice("");
    void loadProductInformation(workspaceProduct.id, controller.signal)
      .then((next) => {
        const nextForm = productInformationFormFromProduct(next.product);
        setPayload(next);
        setForm(nextForm);
        setBaseline(nextForm);
        setExpectedUpdatedAt(next.product.updatedAt);
        setSaveState("clean");
        updateWorkspaceProduct(workspaceProductFromInformation(next.product));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          reason instanceof Error
            ? reason.message
            : "Informasi produk belum dapat dimuat."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadToken, updateWorkspaceProduct, workspaceProduct.id]);

  const isDirty = useMemo(
    () => Boolean(form && baseline && !sameProductInformation(form, baseline)),
    [baseline, form]
  );

  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const interceptNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
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
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", interceptNavigation, true);
    return () => document.removeEventListener("click", interceptNavigation, true);
  }, [isDirty]);

  const canEdit = Boolean(
    payload &&
    canEditProductInformation(payload.capabilities, payload.product.status)
  );
  const readOnly = !canEdit;
  const working = saveState === "saving";

  const filteredSubcategories = useMemo(
    () => (payload?.subcategories || []).filter(
      (item) => item.categoryId === form?.productCategoryId
    ),
    [form?.productCategoryId, payload?.subcategories]
  );

  const updateForm = useCallback((
    patch: Partial<ProductInformationFormValue>
  ) => {
    if (!form) return;
    const next = { ...form, ...patch };
    setForm(next);
    setNotice("");
    setSaveState(
      baseline && sameProductInformation(next, baseline) ? "clean" : "dirty"
    );
  }, [baseline, form]);

  const save = useCallback(async () => {
    if (!payload || !form || !canEdit || working) return false;
    setSaveState("saving");
    setNotice("");
    try {
      const result = await saveProductInformation(
        payload.product.id,
        productInformationInput(payload.product.id, form),
        expectedUpdatedAt
      );
      const nextForm = productInformationFormFromProduct(result.product);
      setPayload((current) => current ? { ...current, product: result.product } : current);
      setForm(nextForm);
      setBaseline(nextForm);
      setExpectedUpdatedAt(result.product.updatedAt);
      setSaveState("saved");
      setNotice(result.message);
      updateWorkspaceProduct(workspaceProductFromInformation(result.product));
      return true;
    } catch (reason) {
      const requestError = reason instanceof ProductInformationRequestError
        ? reason
        : new ProductInformationRequestError(
          500,
          "Informasi produk belum berhasil disimpan."
        );
      const detail = requestError.issues.length
        ? requestError.issues.map((issue) => issue.message).join(" • ")
        : requestError.message;
      setNotice(detail);
      setSaveState(requestError.status === 409 ? "conflict" : "error");
      return false;
    }
  }, [
    canEdit,
    expectedUpdatedAt,
    form,
    payload,
    updateWorkspaceProduct,
    working
  ]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save();
  }

  async function saveThenLeave() {
    const destination = pendingHref;
    if (!destination) return;
    const saved = await save();
    if (saved) window.location.assign(destination);
  }

  function leaveWithoutSaving() {
    const destination = pendingHref;
    setPendingHref(null);
    if (destination) window.location.assign(destination);
  }

  if (loading) {
    return (
      <section aria-busy="true" className="h-96 animate-pulse border border-brand-softGray bg-white" />
    );
  }

  if (loadError || !payload || !form) {
    return (
      <section role="alert" className="border border-red-200 bg-red-50 p-6 text-red-950">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">WP-03 INFORMATION</p>
        <h2 className="mt-2 text-2xl font-semibold">Informasi produk belum dapat dimuat</h2>
        <p className="mt-3 text-sm leading-6">{loadError || "Data tidak tersedia."}</p>
        <button
          type="button"
          onClick={reloadData}
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
              WP-03 INFORMATION
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Informasi produk</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/65">
              Kelola data root produk saja. Varian, stok, media, dan Publish tetap berada di checkpoint masing-masing.
            </p>
          </div>
          <SaveStateBadge state={saveState} />
        </div>

        {readOnly ? (
          <div role="status" className="mt-5 border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            {payload.role === "admin_guest"
              ? "MODE LIHAT SAJA — Admin Guest tidak dapat mengubah informasi produk."
              : "Produk ini tidak dapat diubah oleh role saat ini karena status lifecycle-nya."}
          </div>
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
                onClick={reloadData}
                className="mt-3 min-h-10 rounded-full bg-brand-charcoal px-5 text-xs font-semibold text-white"
              >
                Muat ulang data terbaru
              </button>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Nama produk" required>
            <input
              value={form.name}
              onChange={(event) => updateForm({ name: event.target.value })}
              disabled={readOnly || working}
              required
              className={controlClass}
            />
          </Field>

          <Field label="Slug" required>
            <input
              value={form.slug}
              onChange={(event) => updateForm({
                slug: slugifyProductInformation(event.target.value)
              })}
              disabled={readOnly || working}
              required
              placeholder="kaos-cotton-combed-24s"
              className={controlClass}
            />
          </Field>

          <Field label="Kategori" required>
            <select
              value={form.productCategoryId}
              onChange={(event) => updateForm({
                productCategoryId: event.target.value,
                productSubcategoryId: null
              })}
              disabled={readOnly || working}
              required
              className={controlClass}
            >
              <option value="">Pilih kategori</option>
              {payload.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Subkategori">
            <select
              value={form.productSubcategoryId || ""}
              onChange={(event) => updateForm({
                productSubcategoryId: event.target.value || null
              })}
              disabled={readOnly || working || !form.productCategoryId}
              className={controlClass}
            >
              <option value="">Tanpa subkategori</option>
              {filteredSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Harga dasar" required>
            <input
              type="number"
              min={0}
              step={1}
              value={form.basePrice}
              onChange={(event) => updateForm({ basePrice: Number(event.target.value) })}
              disabled={readOnly || working}
              required
              className={controlClass}
            />
          </Field>

          <Field label="SKU induk">
            <input
              value={form.sku}
              onChange={(event) => updateForm({ sku: event.target.value })}
              disabled={readOnly || working}
              placeholder="Opsional"
              className={controlClass}
            />
          </Field>

          <Field label="Jenis produk">
            <select
              value={form.productType}
              onChange={(event) => updateForm({ productType: event.target.value })}
              disabled={readOnly || working}
              className={controlClass}
            >
              <option value="standard_product">Produk standar</option>
              <option value="configurable_product">Produk dengan konfigurasi</option>
              <option value="production_service">Layanan produksi</option>
            </select>
          </Field>

          <Field label="Metode harga">
            <select
              value={form.pricingMode}
              onChange={(event) => updateForm({ pricingMode: event.target.value })}
              disabled={readOnly || working}
              className={controlClass}
            >
              <option value="fixed_price">Harga tetap</option>
              <option value="variant_based">Berdasarkan varian</option>
              <option value="configurator_based">Berdasarkan konfigurasi</option>
              <option value="custom_quote">Penawaran harga custom</option>
            </select>
          </Field>

          <Field label="Jumlah minimum pesanan">
            <input
              type="number"
              min={1}
              step={1}
              value={form.minimumOrderQty}
              onChange={(event) => updateForm({
                minimumOrderQty: Number(event.target.value)
              })}
              disabled={readOnly || working}
              className={controlClass}
            />
          </Field>

          <div className="hidden lg:block" />

          <Field label="Deskripsi">
            <textarea
              rows={6}
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              disabled={readOnly || working}
              className={controlClass}
            />
          </Field>

          <div className="grid gap-5">
            <Field label="SEO title">
              <input
                value={form.seoTitle}
                onChange={(event) => updateForm({ seoTitle: event.target.value })}
                disabled={readOnly || working}
                className={controlClass}
              />
            </Field>
            <Field label="SEO description">
              <textarea
                rows={3}
                value={form.seoDescription}
                onChange={(event) => updateForm({
                  seoDescription: event.target.value
                })}
                disabled={readOnly || working}
                className={controlClass}
              />
            </Field>
          </div>

          {payload.product.imageUrl ? (
            <div className="border border-brand-softGray bg-brand-offWhite p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                Gambar utama lama — hanya referensi
              </p>
              <div className="mt-3 flex items-center gap-4">
                <img
                  src={payload.product.imageUrl}
                  alt={payload.product.name}
                  className="aspect-[4/5] w-20 object-cover"
                />
                <p className="text-xs leading-5 text-brand-charcoal/60">
                  Media per warna tetap dikelola pada WP-06.
                </p>
              </div>
            </div>
          ) : null}

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
              <button
                data-admin-mutation="true"
                type="submit"
                disabled={working || !isDirty}
                className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {working ? "Menyimpan..." : "Simpan Informasi"}
              </button>
              <p className="text-xs text-brand-charcoal/55">
                Perubahan dibandingkan dengan versi <code>{expectedUpdatedAt || "tanpa timestamp"}</code>.
              </p>
            </div>
          ) : null}
        </form>
      </section>

      {pendingHref ? (
        <DirtyNavigationDialog
          saving={working}
          onDiscard={leaveWithoutSaving}
          onStay={() => setPendingHref(null)}
          onSave={() => void saveThenLeave()}
        />
      ) : null}
    </>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function SaveStateBadge({ state }: { state: ProductInformationSaveState }) {
  const labels: Record<ProductInformationSaveState, string> = {
    clean: "Bersih",
    dirty: "Belum disimpan",
    saving: "Menyimpan",
    saved: "Tersimpan",
    conflict: "Konflik versi",
    error: "Gagal"
  };
  const className = state === "saved"
    ? "bg-green-50 text-green-800"
    : state === "conflict"
      ? "bg-amber-100 text-amber-900"
      : state === "error"
        ? "bg-red-50 text-red-800"
        : state === "dirty"
          ? "bg-blue-50 text-blue-800"
          : "bg-brand-offWhite text-brand-charcoal/65";
  return (
    <span className={`rounded-full px-4 py-2 text-xs font-semibold ${className}`}>
      {labels[state]}
    </span>
  );
}

function DirtyNavigationDialog({
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dirty-information-title"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
    >
      <section className="w-full max-w-lg bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
          PERUBAHAN BELUM DISIMPAN
        </p>
        <h2 id="dirty-information-title" className="mt-2 text-2xl font-semibold">
          Simpan perubahan sebelum keluar?
        </h2>
        <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
          Informasi produk sudah berubah dan belum tersimpan di server.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="min-h-11 border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-45"
          >
            Keluar tanpa menyimpan
          </button>
          <button
            type="button"
            onClick={onStay}
            disabled={saving}
            className="min-h-11 border border-brand-softGray px-4 text-sm font-semibold disabled:opacity-45"
          >
            Tetap di sini
          </button>
          <button
            data-admin-mutation="true"
            type="button"
            onClick={onSave}
            disabled={saving}
            className="min-h-11 bg-brand-charcoal px-4 text-sm font-semibold text-white disabled:opacity-45"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </section>
    </div>
  );
}

const controlClass =
  "min-h-11 w-full rounded-lg border border-brand-softGray bg-white px-4 py-3 font-normal disabled:cursor-not-allowed disabled:bg-brand-offWhite disabled:text-brand-charcoal/45";
