"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { SafeImage } from "@/components/SafeImage";
import { readCustomDraft, removeCustomDraft, writeCustomDraft } from "@/lib/custom-commerce/draft-storage";
import type {
  CustomCategoryCatalog,
  CustomDesignPackage,
  CustomDesignService,
  CustomPreset,
  CustomProject,
  CustomProjectItem,
  CustomProjectPricing,
  CustomProjectSnapshot,
  CustomVariantAllocation
} from "@/lib/custom-commerce/types";
import type { PimProduct, PimProductVariant, PimProductVariantSize } from "@/lib/types";
import { fallbackImages } from "@/lib/fallback-data";
import { formatRupiah } from "@/lib/url";

type BuilderProps = {
  catalogs: CustomCategoryCatalog[];
  initialCategoryId: string;
  preselectedProductId?: string | null;
  requestedDraftId?: string | null;
};

const steps = ["Produk", "Varian & Jumlah", "Desain & Layanan", "Alokasi", "Ringkasan"];

export function CustomProjectBuilder({ catalogs, initialCategoryId, preselectedProductId, requestedDraftId }: BuilderProps) {
  const cart = useCart();
  const initialCatalog = catalogs.find((catalog) => catalog.category.id === initialCategoryId) ?? catalogs[0];
  const [project, setProject] = useState<CustomProject>(() => createProject(initialCatalog));
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pricing, setPricing] = useState<CustomProjectPricing | null>(null);
  const [pricingState, setPricingState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [addProductValue, setAddProductValue] = useState("");

  useEffect(() => {
    const restored = readCustomDraft(requestedDraftId);
    if (restored && restored.items.every((item) => catalogs.some((catalog) => catalog.category.id === item.categoryId))) {
      setProject(restored);
      setMessage("Draft custom dipulihkan.");
    } else if (preselectedProductId) {
      const catalog = catalogs.find((candidate) => candidate.products.some((product) => product.id === preselectedProductId)) ?? initialCatalog;
      const product = catalog?.products.find((candidate) => candidate.id === preselectedProductId);
      if (catalog && product) setProject((current) => addProductGroup(current, catalog, product));
    }
    setHydrated(true);
  }, [catalogs, initialCatalog, preselectedProductId, requestedDraftId]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => writeCustomDraft(project), 350);
    return () => window.clearTimeout(timer);
  }, [hydrated, project]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const totalQuantity = project.items.reduce((sum, item) => sum + item.allocations.reduce((itemSum, allocation) => itemSum + allocation.quantity, 0), 0);
  const selectedCatalog = catalogs.find((catalog) => catalog.category.id === project.categoryId) ?? initialCatalog;

  function mutate(updater: (current: CustomProject) => CustomProject) {
    setProject((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
    setDirty(true);
    setPricing(null);
    setPricingState("idle");
    setMessage("");
  }

  function goToStep(target: number) {
    if (target <= step) {
      setStep(target);
      setMessage("");
      return;
    }
    for (let index = 0; index < target; index += 1) {
      const issue = validateBuilderStep(project, catalogs, index);
      if (issue) {
        setStep(index);
        setPricingState("error");
        setMessage(issue);
        return;
      }
    }
    setPricingState("idle");
    setMessage("");
    setStep(target);
  }

  function choosePreset(preset: CustomPreset) {
    if (!selectedCatalog) return;
    const product = selectedCatalog.products.find((candidate) => candidate.id === preset.defaultProductId) ?? selectedCatalog.products[0];
    if (!product) return;
    const next = createProject(selectedCatalog, "preset", preset.id);
    const item = createProjectItem(selectedCatalog, product, preset);
    setProject({ ...next, items: [item], updatedAt: new Date().toISOString() });
    setDirty(true);
    setPricing(null);
    setStep(1);
  }

  function startFree() {
    mutate((current) => ({ ...current, mode: "free", presetId: null }));
    setStep(0);
  }

  function addSelectedProduct() {
    const [categoryId, productId] = addProductValue.split(":");
    const catalog = catalogs.find((candidate) => candidate.category.id === categoryId);
    const product = catalog?.products.find((candidate) => candidate.id === productId);
    if (!catalog || !product) return;
    mutate((current) => addProductGroup(current, catalog, product));
    setAddProductValue("");
  }

  async function reprice() {
    for (let index = 0; index < steps.length - 1; index += 1) {
      const issue = validateBuilderStep(project, catalogs, index);
      if (issue) {
        setStep(index);
        setPricingState("error");
        setMessage(issue);
        return;
      }
    }
    setPricingState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/custom/reprice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project }) });
      const payload = await response.json() as { pricing?: CustomProjectPricing; error?: string };
      if (!response.ok || !payload.pricing) throw new Error("Harga belum dapat divalidasi. Periksa pilihan produk lalu coba lagi.");
      setPricing(payload.pricing);
      setPricingState("idle");
      setMessage(payload.pricing.status === "quotation_required" ? "Konfigurasi sudah diperiksa dan menunggu penawaran dari admin." : "Harga dan konfigurasi sudah diperiksa.");
      setDirty(false);
    } catch (error) {
      setPricingState("error");
      setMessage("Harga belum dapat divalidasi. Periksa pilihan produk lalu coba lagi.");
    }
  }

  function addToCart() {
    if (!pricing || pricing.issues.length) return;
    const snapshot: CustomProjectSnapshot = { ...project, pricing };
    cart.addCustomProject(snapshot);
    writeCustomDraft(project);
    setDirty(false);
    setMessage("Custom Project masuk ke keranjang.");
    cart.openCart();
  }

  async function discardDraft() {
    await deleteUploadRefs(project.items.flatMap((item) => item.uploads), project.sessionToken);
    removeCustomDraft(project.id);
    setProject(createProject(initialCatalog));
    setPricing(null);
    setDirty(false);
    setStep(0);
    setMessage("Draft dihapus.");
  }

  if (!initialCatalog) return null;
  const activeCatalog = selectedCatalog ?? initialCatalog;

  return (
    <section className="section-shell pb-20">
      <div className="rounded-[30px] bg-white p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Custom Project</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Rakit pesananmu</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-black/60">Satu proyek dapat memuat banyak produk, ukuran, paket desain, layanan, dan personalisasi.</p></div>
          <button type="button" onClick={() => void discardDraft()} className="text-sm font-semibold text-red-700 underline underline-offset-4">Hapus draft</button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <ModeButton active={project.mode === "preset"} title="Paket Instan" detail="Mulai dari preset CMS lalu edit sesuai kebutuhan." onClick={() => activeCatalog.presets[0] ? choosePreset(activeCatalog.presets[0]) : undefined} disabled={!activeCatalog.category.supportsQuickCustom || !activeCatalog.presets.length} />
          <ModeButton active={project.mode === "free"} title="Custom Bebas" detail="Bangun proyek dari produk PIM aktif." onClick={startFree} disabled={!activeCatalog.category.supportsFullCustom} />
        </div>

        {activeCatalog.category.supportsQuickCustom && activeCatalog.presets.length ? (
          <div className="mt-7"><h3 className="text-lg font-semibold">Paket Instan</h3><div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
            {activeCatalog.presets.map((preset) => <PresetCard key={preset.id} preset={preset} selected={project.presetId === preset.id} onClick={() => choosePreset(preset)} />)}
          </div></div>
        ) : null}

        <ol className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Tahapan Custom Project">
          {steps.map((label, index) => <li key={label}><button type="button" onClick={() => goToStep(index)} aria-current={step === index ? "step" : undefined} className={`min-h-11 w-full rounded-full px-3 text-xs font-semibold ${step === index ? "bg-black text-white" : "bg-[#f5f5ef] text-black/60"}`}>{index + 1}. {label}</button></li>)}
        </ol>

        <div className="mt-8">
          {step === 0 ? <ProductsStep catalogs={catalogs} project={project} addProductValue={addProductValue} setAddProductValue={setAddProductValue} addSelectedProduct={addSelectedProduct} mutate={mutate} /> : null}
          {step === 1 ? <AllocationsStep catalogs={catalogs} project={project} mutate={mutate} /> : null}
          {step === 2 ? <DesignStep catalogs={catalogs} project={project} mutate={mutate} /> : null}
          {step === 3 ? <AssignmentStep catalogs={catalogs} project={project} mutate={mutate} /> : null}
          {step === 4 ? <ReviewStep catalogs={catalogs} project={project} pricing={pricing} totalQuantity={totalQuantity} pricingState={pricingState} onReprice={reprice} onAddToCart={addToCart} /> : null}
        </div>

        {message ? <p role="status" className={`mt-6 rounded-2xl p-4 text-sm ${pricingState === "error" ? "bg-red-50 text-red-800" : "bg-[#e9f4ee] text-[#063d24]"}`}>{message}</p> : null}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-black/10 pt-6">
          <button type="button" disabled={step === 0} onClick={() => goToStep(Math.max(0, step - 1))} className="min-h-11 rounded-full border border-black/15 px-5 text-sm font-semibold disabled:opacity-35">Kembali</button>
          <button type="button" disabled={step === steps.length - 1} onClick={() => goToStep(Math.min(steps.length - 1, step + 1))} className="min-h-11 rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-35">Lanjut</button>
        </div>
      </div>
    </section>
  );
}

function ProductsStep({ catalogs, project, addProductValue, setAddProductValue, addSelectedProduct, mutate }: {
  catalogs: CustomCategoryCatalog[];
  project: CustomProject;
  addProductValue: string;
  setAddProductValue: (value: string) => void;
  addSelectedProduct: () => void;
  mutate: (updater: (project: CustomProject) => CustomProject) => void;
}) {
  return <div><StepHeading title="Produk" detail="Tambahkan satu atau beberapa produk custom. Konfigurasi yang sudah ada tidak akan hilang." />
    <div className="mt-5 grid gap-4 lg:grid-cols-2">{project.items.map((item) => {
      const catalog = catalogs.find((candidate) => candidate.category.id === item.categoryId);
      const product = catalog?.products.find((candidate) => candidate.id === item.productId);
      return <article key={item.id} className="flex gap-4 rounded-[24px] bg-[#f5f5ef] p-4">
        <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-white"><SafeImage src={productImage(product)} fallbackSrc={fallbackImages.product} alt={item.productName} fill className="object-cover" sizes="96px" /></div>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">{item.categoryName}</p><h3 className="mt-1 font-semibold">{item.productName}</h3><p className="mt-2 text-xs text-black/55">{item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0)} pcs · {item.leadTime}</p>
          <button type="button" disabled={project.items.length === 1} onClick={() => void deleteUploadRefs(item.uploads, project.sessionToken).finally(() => mutate((current) => ({ ...current, items: current.items.filter((candidate) => candidate.id !== item.id) })))} className="mt-3 text-xs font-semibold text-red-700 underline disabled:opacity-30">Hapus Product Group</button>
        </div>
      </article>;
    })}</div>
    <div className="mt-6 grid gap-3 rounded-[24px] border border-dashed border-black/20 p-4 sm:grid-cols-[1fr_auto]">
      <label className="grid gap-2 text-sm font-semibold">Tambah Produk Custom<select value={addProductValue} onChange={(event) => setAddProductValue(event.target.value)} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 font-normal"><option value="">Pilih produk</option>{catalogs.flatMap((catalog) => catalog.products.map((product) => <option key={`${catalog.category.id}:${product.id}`} value={`${catalog.category.id}:${product.id}`}>{catalog.category.name} · {product.name}</option>))}</select></label>
      <button type="button" disabled={!addProductValue} onClick={addSelectedProduct} className="min-h-11 self-end rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-35">+ Tambah Produk</button>
    </div>
  </div>;
}

function AllocationsStep({ catalogs, project, mutate }: { catalogs: CustomCategoryCatalog[]; project: CustomProject; mutate: (updater: (project: CustomProject) => CustomProject) => void }) {
  return <div><StepHeading title="Varian & Jumlah" detail="Setiap baris adalah kombinasi warna/ukuran aktual. Harga ukuran dan varian dihitung terpisah." />
    <div className="mt-5 grid gap-6">{project.items.map((item) => {
      const catalog = catalogs.find((candidate) => candidate.category.id === item.categoryId);
      const product = catalog?.products.find((candidate) => candidate.id === item.productId);
      if (!product) return null;
      const options = variantSizeOptions(product);
      return <section key={item.id} className="rounded-[24px] bg-[#f5f5ef] p-4 sm:p-5"><div className="flex items-center justify-between gap-4"><h3 className="font-semibold">{item.productName}</h3><span className="text-sm font-semibold">{item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0)} pcs</span></div>
        <div className="mt-4 grid gap-3">{item.allocations.map((allocation) => <div key={allocation.id} className="grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-[1fr_120px_auto]">
          <label className="grid gap-1 text-xs font-semibold text-black/55">Varian / ukuran<select value={allocation.variantSizeId} onChange={(event) => mutate((current) => updateProjectItem(current, item.id, (target) => ({ ...target, allocations: target.allocations.map((candidate) => candidate.id === allocation.id ? allocationFromOption(options.find((option) => option.variantSize.id === event.target.value)!, candidate.quantity, candidate.id, candidate.designPackageId) : candidate) })))} className="min-h-11 rounded-xl border border-black/15 px-3 text-sm font-normal text-black">{options.map((option) => <option key={option.variantSize.id} value={option.variantSize.id}>{option.variant.name} · {option.variantSize.size.name} · {option.variantSize.sku}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-black/55">Jumlah<input type="number" min={1} max={1000} value={allocation.quantity} onChange={(event) => mutate((current) => updateProjectItem(current, item.id, (target) => ({ ...target, allocations: target.allocations.map((candidate) => candidate.id === allocation.id ? { ...candidate, quantity: clampQuantity(event.target.value) } : candidate) })))} className="min-h-11 rounded-xl border border-black/15 px-3 text-sm text-black" /></label>
          <button type="button" disabled={item.allocations.length === 1} onClick={() => mutate((current) => updateProjectItem(current, item.id, (target) => ({ ...target, allocations: target.allocations.filter((candidate) => candidate.id !== allocation.id) })))} className="self-end pb-3 text-xs font-semibold text-red-700 underline disabled:opacity-30">Hapus</button>
        </div>)}</div>
        <button type="button" onClick={() => mutate((current) => updateProjectItem(current, item.id, (target) => ({ ...target, allocations: [...target.allocations, allocationFromOption(options[0], 1)] })))} className="mt-4 min-h-10 rounded-full border border-black/15 px-4 text-xs font-semibold">+ Tambah kombinasi</button>
      </section>;
    })}</div>
  </div>;
}

function DesignStep({ catalogs, project, mutate }: { catalogs: CustomCategoryCatalog[]; project: CustomProject; mutate: (updater: (project: CustomProject) => CustomProject) => void }) {
  return <div><StepHeading title="Desain & Layanan" detail="Satu Paket Desain dapat memuat beberapa layanan. Paket dapat diduplikasi lalu dialokasikan ke kombinasi berbeda." />
    <div className="mt-5 grid gap-7">{project.items.map((item) => {
      const catalog = catalogs.find((candidate) => candidate.category.id === item.categoryId);
      if (!catalog) return null;
      return <section key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{item.productName}</h3><button type="button" onClick={() => mutate((current) => updateProjectItem(current, item.id, (target) => ({ ...target, designPackages: [...target.designPackages, createDesignPackage(target.designPackages.length + 1)] })))} className="min-h-10 rounded-full bg-black px-4 text-xs font-semibold text-white">+ Paket Desain</button></div>
        <div className="mt-4 grid gap-4">{item.designPackages.map((designPackage) => <DesignPackageEditor key={designPackage.id} catalog={catalog} item={item} designPackage={designPackage} sessionToken={project.sessionToken} mutate={mutate} />)}</div>
      </section>;
    })}</div>
  </div>;
}

function DesignPackageEditor({ catalog, item, designPackage, sessionToken, mutate }: { catalog: CustomCategoryCatalog; item: CustomProjectItem; designPackage: CustomDesignPackage; sessionToken: string; mutate: (updater: (project: CustomProject) => CustomProject) => void }) {
  const [serviceId, setServiceId] = useState("");
  const compatibleServices = catalog.services.filter((service) => catalog.compatibility.some((rule) => rule.serviceId === service.id && (!rule.productId || rule.productId === item.productId) && (!rule.categoryId || rule.categoryId === item.categoryId)));
  const usedServiceIds = new Set(designPackage.services.map((service) => service.serviceId));

  function updatePackage(update: (current: CustomDesignPackage) => CustomDesignPackage) {
    mutate((project) => updateProjectItem(project, item.id, (target) => ({ ...target, designPackages: target.designPackages.map((candidate) => candidate.id === designPackage.id ? update(candidate) : candidate) })));
  }

  function addService() {
    if (!serviceId || usedServiceIds.has(serviceId)) return;
    mutate((project) => updateProjectItem(project, item.id, (target) => {
      const autoAssign = target.designPackages.length === 1;
      return {
        ...target,
        designPackages: target.designPackages.map((candidate) => candidate.id === designPackage.id ? { ...candidate, services: [...candidate.services, createDesignService(serviceId)] } : candidate),
        allocations: autoAssign ? target.allocations.map((allocation) => allocation.designPackageId === null ? { ...allocation, designPackageId: designPackage.id } : allocation) : target.allocations
      };
    }));
    setServiceId("");
  }

  function duplicate() {
    mutate((project) => updateProjectItem(project, item.id, (target) => ({
      ...target,
      designPackages: [...target.designPackages, {
        ...designPackage,
        id: localId(),
        name: `${designPackage.name} (salinan)`,
        services: designPackage.services.map((service) => ({ ...service, id: localId() }))
      }]
    })));
  }

  const assignedQuantity = item.allocations.filter((allocation) => allocation.designPackageId === designPackage.id).reduce((sum, allocation) => sum + allocation.quantity, 0);

  return <article className="rounded-[24px] bg-[#f5f5ef] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><input aria-label="Nama Paket Desain" value={designPackage.name} maxLength={120} onChange={(event) => updatePackage((current) => ({ ...current, name: event.target.value }))} className="min-h-10 rounded-xl border border-black/15 bg-white px-3 font-semibold" /><div className="flex gap-3"><button type="button" onClick={duplicate} className="text-xs font-semibold underline">Duplikasi</button><button type="button" disabled={item.designPackages.length === 1} onClick={() => mutate((project) => updateProjectItem(project, item.id, (target) => ({ ...target, designPackages: target.designPackages.filter((candidate) => candidate.id !== designPackage.id), allocations: target.allocations.map((allocation) => allocation.designPackageId === designPackage.id ? { ...allocation, designPackageId: null } : allocation) })))} className="text-xs font-semibold text-red-700 underline disabled:opacity-30">Hapus</button></div></div>
    <div className="mt-4 grid gap-3">{designPackage.services.map((selection) => <ServiceEditor key={selection.id} catalog={catalog} item={item} selection={selection} sessionToken={sessionToken} attachUpload={(upload) => mutate((project) => updateProjectItem(project, item.id, (target) => target.uploads.some((candidate) => candidate.id === upload.id) ? target : { ...target, uploads: [...target.uploads, upload] }))} updatePackage={updatePackage} />)}</div>
    {designPackage.services.length ? <p className={`mt-3 text-xs font-semibold ${assignedQuantity ? "text-[#063d24]" : "text-red-700"}`}>{assignedQuantity ? `Layanan paket ini dialokasikan ke ${assignedQuantity} pcs.` : "Layanan sudah dipilih, tetapi paket belum dialokasikan. Selesaikan pada tahap Alokasi."}</p> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-sm"><option value="">Tambah layanan</option>{compatibleServices.filter((service) => !usedServiceIds.has(service.id)).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><button type="button" disabled={!serviceId} onClick={addService} className="min-h-11 rounded-full border border-black/15 px-4 text-xs font-semibold disabled:opacity-35">Tambah</button></div>
  </article>;
}

function ServiceEditor({ catalog, item, selection, sessionToken, attachUpload, updatePackage }: { catalog: CustomCategoryCatalog; item: CustomProjectItem; selection: CustomDesignService; sessionToken: string; attachUpload: (upload: CustomProjectItem["uploads"][number]) => void; updatePackage: (update: (current: CustomDesignPackage) => CustomDesignPackage) => void }) {
  const service = catalog.services.find((candidate) => candidate.id === selection.serviceId);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  if (!service) return null;
  const compatibleRules = catalog.compatibility.filter((rule) => rule.serviceId === service.id && (!rule.productId || rule.productId === item.productId) && (!rule.categoryId || rule.categoryId === item.categoryId));
  const allowedPlacementIds = new Set(compatibleRules.map((rule) => rule.placementId).filter(Boolean));
  const allowedPrintSizeIds = new Set(compatibleRules.map((rule) => rule.printSizeId).filter(Boolean));
  const placements = allowedPlacementIds.size ? catalog.placements.filter((placement) => allowedPlacementIds.has(placement.id)) : catalog.placements;
  const printSizes = allowedPrintSizeIds.size ? catalog.printSizes.filter((printSize) => allowedPrintSizeIds.has(printSize.id)) : catalog.printSizes;

  function update(updates: Partial<CustomDesignService>) {
    updatePackage((current) => ({ ...current, services: current.services.map((candidate) => candidate.id === selection.id ? { ...candidate, ...updates } : candidate) }));
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true); setUploadError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("session_token", sessionToken);
      const response = await fetch("/api/customer-uploads", { method: "POST", body: form });
      const payload = await response.json() as { upload?: CustomProjectItem["uploads"][number]; error?: string };
      if (!response.ok || !payload.upload) throw new Error("File belum dapat diunggah. Periksa jenis dan ukuran file lalu coba lagi.");
      updatePackage((current) => ({ ...current, services: current.services.map((candidate) => candidate.id === selection.id ? { ...candidate, uploadIds: [...candidate.uploadIds, payload.upload!.id] } : candidate) }));
      attachUpload(payload.upload);
    } catch (error) { setUploadError(error instanceof Error ? error.message : "File belum dapat diunggah. Coba lagi."); }
    finally { setUploading(false); }
  }

  return <div className="rounded-2xl bg-white p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{service.name}</p>{service.description ? <p className="mt-1 text-xs leading-5 text-black/55">{service.description}</p> : null}</div><button type="button" onClick={() => updatePackage((current) => ({ ...current, services: current.services.filter((candidate) => candidate.id !== selection.id) }))} className="text-xs font-semibold text-red-700 underline">Hapus</button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Field label="Placement"><select value={selection.placementId ?? ""} onChange={(event) => update({ placementId: event.target.value || null })}><option value="">Pilih placement</option>{placements.map((placement) => <option key={placement.id} value={placement.id}>{placement.name}{placement.priceAdjustment ? ` (+${formatRupiah(placement.priceAdjustment)})` : ""}</option>)}</select></Field>
      <Field label="Ukuran cetak"><select value={selection.printSizeId ?? ""} onChange={(event) => update({ printSizeId: event.target.value || null })}><option value="">Pilih ukuran</option>{printSizes.map((printSize) => <option key={printSize.id} value={printSize.id}>{printSize.name}{printSize.priceAdjustment ? ` (+${formatRupiah(printSize.priceAdjustment)})` : ""}</option>)}</select></Field>
      <Field label={`Catatan${service.requiresNotes ? " *" : ""}`}><input value={selection.note} maxLength={1000} required={service.requiresNotes} onChange={(event) => update({ note: event.target.value })} /></Field>
      <Field label={`File desain${service.requiresUpload ? " *" : ""}`}><input type="file" disabled={uploading} accept={service.allowedFileTypes.map((extension) => `.${extension}`).join(",")} onChange={(event) => upload(event.target.files?.[0])} /></Field>
    </div>{selection.uploadIds.length ? <p className="mt-3 text-xs text-[#063d24]">{selection.uploadIds.length} file terhubung.</p> : null}{uploadError ? <p className="mt-3 text-xs text-red-700">{uploadError}</p> : null}
  </div>;
}

function AssignmentStep({ catalogs, project, mutate }: { catalogs: CustomCategoryCatalog[]; project: CustomProject; mutate: (updater: (project: CustomProject) => CustomProject) => void }) {
  return <div><StepHeading title="Alokasi" detail="Tentukan Paket Desain per kombinasi. Pilih tanpa layanan untuk quantity yang hanya membutuhkan produk dasar." />
    <div className="mt-5 grid gap-6">{project.items.map((item) => {
      const catalog = catalogs.find((candidate) => candidate.category.id === item.categoryId);
      return <section key={item.id} className="rounded-[24px] bg-[#f5f5ef] p-4 sm:p-5"><h3 className="font-semibold">{item.productName}</h3><div className="mt-4 grid gap-3">{item.allocations.map((allocation) => <div key={allocation.id} className="grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-[1fr_1fr]"><div><p className="text-sm font-semibold">{allocation.variantName} · {allocation.sizeName}</p><p className="mt-1 text-xs text-black/55">{allocation.sku} · {allocation.quantity} pcs</p></div><Field label="Paket Desain"><select value={allocation.designPackageId ?? ""} onChange={(event) => mutate((current) => updateProjectItem(current, item.id, (target) => ({ ...target, allocations: target.allocations.map((candidate) => candidate.id === allocation.id ? { ...candidate, designPackageId: event.target.value || null } : candidate) })))}><option value="">Tanpa layanan</option>{item.designPackages.map((designPackage) => <option key={designPackage.id} value={designPackage.id}>{designPackage.name}</option>)}</select></Field></div>)}</div>
        {catalog?.personalizationRules.length ? <PersonalizationEditor item={item} catalog={catalog} mutate={mutate} /> : null}
      </section>;
    })}</div>
  </div>;
}

function PersonalizationEditor({ item, catalog, mutate }: { item: CustomProjectItem; catalog: CustomCategoryCatalog; mutate: (updater: (project: CustomProject) => CustomProject) => void }) {
  const quantity = item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  const update = (updates: Partial<CustomProjectItem["personalization"]>) => mutate((project) => updateProjectItem(project, item.id, (target) => ({ ...target, personalization: { ...target.personalization, ...updates } })));
  return <div className="mt-5 rounded-2xl bg-white p-4"><h4 className="font-semibold">Personalisasi</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">
    <Field label="Aturan"><select value={item.personalization.ruleId ?? ""} onChange={(event) => update({ ruleId: event.target.value || null })}><option value="">Tanpa personalisasi</option>{catalog.personalizationRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></Field>
    {item.personalization.ruleId ? <Field label="Mode"><select value={item.personalization.mode} onChange={(event) => update({ mode: event.target.value === "per_item" ? "per_item" : "same_for_all" })}><option value="same_for_all">Sama untuk semua</option><option value="per_item">Berbeda per item</option></select></Field> : null}
  </div>
  {item.personalization.ruleId && item.personalization.mode === "same_for_all" ? <div className="mt-3"><Field label="Isi personalisasi"><input value={item.personalization.sharedValue} maxLength={120} onChange={(event) => update({ sharedValue: event.target.value })} /></Field></div> : null}
  {item.personalization.ruleId && item.personalization.mode === "per_item" ? <div className="mt-3"><Field label={`Satu baris per item (${quantity} baris)`}><textarea rows={Math.min(10, Math.max(4, quantity))} value={item.personalization.entries.join("\n")} onChange={(event) => update({ entries: event.target.value.split("\n").slice(0, quantity).map((entry) => entry.slice(0, 120)) })} /></Field><p className="mt-2 text-xs text-black/50">Terisi {item.personalization.entries.filter(Boolean).length} dari {quantity}.</p></div> : null}
  </div>;
}

function ReviewStep({ catalogs, project, pricing, totalQuantity, pricingState, onReprice, onAddToCart }: { catalogs: CustomCategoryCatalog[]; project: CustomProject; pricing: CustomProjectPricing | null; totalQuantity: number; pricingState: "idle" | "loading" | "error"; onReprice: () => void; onAddToCart: () => void }) {
  return <div><StepHeading title="Ringkasan" detail="Sistem memeriksa ulang produk, varian, jumlah minimum, kecocokan layanan, file, personalisasi, dan harga." />
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]"><div className="grid gap-4">{project.items.map((item) => { const catalog = catalogs.find((candidate) => candidate.category.id === item.categoryId); return <article key={item.id} className="rounded-[24px] bg-[#f5f5ef] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">{item.categoryName}</p><h3 className="mt-1 text-lg font-semibold">{item.productName}</h3></div><span className="font-semibold">{item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0)} pcs</span></div><div className="mt-4 grid gap-2 text-sm text-black/60">{item.allocations.map((allocation) => <p key={allocation.id}>{allocation.variantName} · {allocation.sizeName} · {allocation.quantity} pcs · {item.designPackages.find((designPackage) => designPackage.id === allocation.designPackageId)?.name || "Tanpa layanan"}</p>)}</div>{item.designPackages.map((designPackage) => designPackage.services.length ? <div key={designPackage.id} className="mt-4 border-t border-black/10 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/45">{designPackage.name}</p>{designPackage.services.map((selection) => { const service = catalog?.services.find((candidate) => candidate.id === selection.serviceId); const placement = catalog?.placements.find((candidate) => candidate.id === selection.placementId); const printSize = catalog?.printSizes.find((candidate) => candidate.id === selection.printSizeId); return <p key={selection.id} className="mt-2 text-sm text-black/65">{service?.name || "Layanan"}{printSize ? ` · ${printSize.name}` : ""}{placement ? ` · ${placement.name}` : ""}{selection.uploadIds.length ? ` · ${selection.uploadIds.length} file` : ""}</p>; })}</div> : null)}{item.personalization.ruleId ? <p className="mt-4 text-sm text-black/65">Personalisasi: {item.personalization.mode === "same_for_all" ? item.personalization.sharedValue : `${item.personalization.entries.length} data individual`}</p> : null}{item.note ? <p className="mt-2 text-sm text-black/65">Catatan: {item.note}</p> : null}</article>; })}</div>
      <aside className="h-fit rounded-[24px] border border-black/10 p-5 lg:sticky lg:top-28"><h3 className="text-xl font-semibold">Total proyek</h3><p className="mt-2 text-sm text-black/55">{project.items.length} grup produk · {totalQuantity} pcs</p>
        {pricing ? <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">{pricing.status === "final" ? "Harga final" : pricing.status === "estimated" ? "Estimasi" : "Perlu penawaran"}</p><p className="mt-2 text-2xl font-bold">{pricing.status === "final" ? formatRupiah(pricing.finalTotal) : pricing.status === "estimated" ? `${formatRupiah(pricing.estimatedMinTotal)} – ${formatRupiah(pricing.estimatedMaxTotal)}` : "Diperiksa admin"}</p><div className="mt-4 max-h-56 overflow-y-auto border-t border-black/10 pt-3 text-xs text-black/60">{pricing.lines.map((line) => <div key={line.key} className="flex justify-between gap-3 py-1"><span>{line.label} × {line.quantity}</span><span>{line.subtotal === null ? "Diperiksa" : formatRupiah(line.subtotal)}</span></div>)}</div></div> : <p className="mt-5 rounded-2xl bg-[#f5f5ef] p-4 text-sm leading-6 text-black/60">Harga harus diperiksa sebelum proyek masuk ke keranjang.</p>}
        <button type="button" disabled={pricingState === "loading"} onClick={onReprice} className="mt-5 min-h-12 w-full rounded-full border border-black/15 px-4 text-sm font-semibold disabled:opacity-40">{pricingState === "loading" ? "Memvalidasi..." : pricing ? "Validasi ulang" : "Validasi harga"}</button>
        <button type="button" disabled={!pricing || Boolean(pricing.issues.length)} onClick={onAddToCart} className="mt-3 min-h-12 w-full rounded-full bg-black px-4 text-sm font-semibold text-white disabled:opacity-35">Gunakan Konfigurasi Ini & Lanjut ke Keranjang</button>
      </aside>
    </div>
  </div>;
}

function validateBuilderStep(project: CustomProject, catalogs: CustomCategoryCatalog[], step: number) {
  if (step === 0 && !project.items.length) return "Tambahkan minimal satu produk PIM sebelum melanjutkan.";
  if (step === 1 && project.items.some((item) => !item.allocations.length || item.allocations.some((allocation) => allocation.quantity < 1))) return "Lengkapi varian dan jumlah pada setiap Product Group.";
  if (step === 2) {
    for (const item of project.items) {
      const catalog = catalogs.find((candidate) => candidate.category.id === item.categoryId);
      if (!catalog) return `Katalog ${item.categoryName} tidak lagi tersedia.`;
      for (const designPackage of item.designPackages) {
        for (const selection of designPackage.services) {
          const service = catalog.services.find((candidate) => candidate.id === selection.serviceId);
          if (!service) return `Layanan pada ${designPackage.name} tidak lagi tersedia.`;
          const rules = catalog.compatibility.filter((rule) => rule.serviceId === service.id && (!rule.productId || rule.productId === item.productId));
          if (rules.some((rule) => rule.placementId) && !selection.placementId) return `Pilih placement untuk ${service.name}.`;
          if (rules.some((rule) => rule.printSizeId) && !selection.printSizeId) return `Pilih ukuran cetak untuk ${service.name}.`;
          if (service.requiresNotes && !selection.note.trim()) return `Isi catatan untuk ${service.name}.`;
          if (service.requiresUpload && !selection.uploadIds.length) return `Unggah file desain untuk ${service.name}.`;
        }
      }
    }
  }
  if (step === 3) {
    for (const item of project.items) {
      const usedPackages = new Set(item.allocations.map((allocation) => allocation.designPackageId).filter(Boolean));
      if (item.designPackages.some((designPackage) => designPackage.services.length && !usedPackages.has(designPackage.id))) return `Alokasikan semua Paket Desain pada ${item.productName}.`;
      if (item.personalization.ruleId && item.personalization.mode === "same_for_all" && !item.personalization.sharedValue.trim()) return `Lengkapi personalisasi ${item.productName}.`;
      const quantity = item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      if (item.personalization.ruleId && item.personalization.mode === "per_item" && (item.personalization.entries.length !== quantity || item.personalization.entries.some((entry) => !entry.trim()))) return `Lengkapi ${quantity} data personalisasi untuk ${item.productName}.`;
    }
  }
  return null;
}

function ModeButton({ active, title, detail, onClick, disabled }: { active: boolean; title: string; detail: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} aria-pressed={active} onClick={onClick} className={`rounded-[22px] border p-4 text-left disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-black bg-black text-white" : "border-black/10 bg-[#f5f5ef]"}`}><span className="font-semibold">{title}</span><span className={`mt-1 block text-xs leading-5 ${active ? "text-white/70" : "text-black/55"}`}>{detail}</span></button>;
}

function PresetCard({ preset, selected, onClick }: { preset: CustomPreset; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`min-w-[240px] snap-start overflow-hidden rounded-[22px] text-left ${selected ? "ring-2 ring-black" : "ring-1 ring-black/10"}`}><div className="relative aspect-[4/3] bg-[#e9e9e4]"><SafeImage src={preset.mockupUrl} fallbackSrc={fallbackImages.product} alt={preset.mockupAlt || preset.name} fill className="object-cover" sizes="240px" /></div><div className="p-4"><p className="font-semibold">{preset.name}</p>{preset.shortDescription ? <p className="mt-1 text-xs leading-5 text-black/55">{preset.shortDescription}</p> : null}</div></button>;
}

function StepHeading({ title, detail }: { title: string; detail: string }) { return <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Tahap</p><h3 className="mt-1 text-2xl font-semibold">{title}</h3><p className="mt-2 max-w-3xl text-sm leading-7 text-black/60">{detail}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-semibold text-black/55 [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-3 [&_select]:min-h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-black/15 [&_select]:px-3 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-black/15 [&_textarea]:p-3">{label}{children}</label>; }

function createProject(catalog: CustomCategoryCatalog | undefined, mode: CustomProject["mode"] = "free", presetId: string | null = null): CustomProject {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: localId(),
    mode,
    presetId,
    categoryId: catalog?.category.id ?? "",
    categoryName: catalog?.category.name ?? "",
    categorySlug: catalog?.category.slug ?? "",
    sessionToken: `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`,
    items: [],
    note: "",
    createdAt: now,
    updatedAt: now
  };
}

function createProjectItem(catalog: CustomCategoryCatalog, product: PimProduct, preset?: CustomPreset): CustomProjectItem {
  const defaults = preset?.configurationDefaults ?? {};
  const options = variantSizeOptions(product);
  const requestedVariantSizeId = typeof defaults.variant_size_id === "string" ? defaults.variant_size_id : "";
  const option = options.find((candidate) => candidate.variantSize.id === requestedVariantSizeId) ?? options[0];
  const minimum = Math.max(1, product.minimumRule?.status === "active" ? product.minimumRule.minimumQuantity : 1);
  const requestedQuantity = typeof defaults.quantity === "number" ? defaults.quantity : minimum;
  const serviceIds = Array.isArray(defaults.service_ids)
    ? defaults.service_ids.filter((value): value is string => typeof value === "string" && catalog.services.some((service) => service.id === value))
    : [];
  const designPackage = createDesignPackage(1, serviceIds);
  const allocation = allocationFromOption(option, Math.max(minimum, clampQuantity(requestedQuantity)), undefined, serviceIds.length ? designPackage.id : null);
  const requestedPersonalizationRule = typeof defaults.personalization_rule_id === "string" && catalog.personalizationRules.some((rule) => rule.id === defaults.personalization_rule_id)
    ? defaults.personalization_rule_id
    : null;
  return {
    id: localId(),
    categoryId: catalog.category.id,
    categoryName: catalog.category.name,
    categorySlug: catalog.category.slug,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    allocations: [allocation],
    designPackages: [designPackage],
    personalization: { ruleId: requestedPersonalizationRule, mode: "same_for_all", sharedValue: "", entries: [] },
    uploads: [],
    note: "",
    leadTime: preset?.leadTimeDisplay || catalog.category.leadTimeDisplay
  };
}

function addProductGroup(project: CustomProject, catalog: CustomCategoryCatalog, product: PimProduct) {
  return { ...project, items: [...project.items, createProjectItem(catalog, product)] };
}

function createDesignPackage(sequence: number, serviceIds: string[] = []): CustomDesignPackage {
  return { id: localId(), name: `Desain ${sequence}`, services: serviceIds.map(createDesignService) };
}

function createDesignService(serviceId: string): CustomDesignService {
  return { id: localId(), serviceId, placementId: null, printSizeId: null, note: "", uploadIds: [] };
}

function variantSizeOptions(product: PimProduct): Array<{ variant: PimProductVariant; variantSize: PimProductVariantSize }> {
  return product.variants
    .filter((variant) => variant.status === "active")
    .flatMap((variant) => variant.sizes.filter((variantSize) => variantSize.status === "active" && variantSize.size.status === "active").map((variantSize) => ({ variant, variantSize })));
}

function allocationFromOption(option: { variant: PimProductVariant; variantSize: PimProductVariantSize }, quantity: number, id = localId(), designPackageId: string | null = null): CustomVariantAllocation {
  return {
    id,
    variantId: option.variant.id,
    variantSizeId: option.variantSize.id,
    variantName: option.variant.name,
    colorHex: option.variant.hexCode,
    sizeName: option.variantSize.size.name,
    sku: option.variantSize.sku,
    quantity,
    designPackageId
  };
}

function updateProjectItem(project: CustomProject, itemId: string, update: (item: CustomProjectItem) => CustomProjectItem): CustomProject {
  return { ...project, items: project.items.map((item) => item.id === itemId ? update(item) : item) };
}

function productImage(product: PimProduct | undefined) {
  if (!product) return null;
  const defaultVariant = product.variants.find((variant) => variant.isDefault) ?? product.variants[0];
  return defaultVariant?.images.find((image) => image.imageRole === "front")?.imageUrl ?? defaultVariant?.images[0]?.imageUrl ?? null;
}

function clampQuantity(value: unknown) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(1000, Math.max(1, number)) : 1;
}

function localId() {
  return crypto.randomUUID();
}

async function deleteUploadRefs(uploads: CustomProjectItem["uploads"], sessionToken: string) {
  await Promise.allSettled(uploads.map((upload) => fetch("/api/customer-uploads", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_token: sessionToken, storage_path: upload.storage_path })
  })));
}
