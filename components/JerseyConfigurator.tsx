"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import type {
  JerseyAddon,
  JerseyCollar,
  JerseyConfiguratorData,
  JerseyMaterial,
  JerseyPackage,
  JerseyRequiredService
} from "@/lib/types";
import { formatRupiah } from "@/lib/url";

type JerseyConfiguratorProps = {
  config: JerseyConfiguratorData;
  jerseyName: string;
  jerseySlug: string;
  imageUrl?: string;
  imageAlt?: string;
};

type TeamInfo = {
  teamName: string;
  playerData: string;
  designReference: string;
  designFileName: string;
  notes: string;
};

const sizeOptions = ["S", "M", "L", "XL", "2XL", "3XL", "Mix Size"];
const sizeAdjustments: Record<string, number> = {
  "2XL": 5000,
  "3XL": 10000
};

function numeric(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function priceLabel(value: number | string | null | undefined) {
  const number = numeric(value);
  return number > 0 ? `+${formatRupiah(number)}` : "+0";
}

function StepLabel({ number, title, description }: { number: number; title: string; description?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">Langkah {number}</p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-brand-charcoal">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-black/56">{description}</p> : null}
    </div>
  );
}

function PackageButton({ item, selected, onClick }: { item: JerseyPackage; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-[24px] p-4 text-left transition ${selected ? "bg-white ring-1 ring-[#063d24]/35" : "bg-white/50 ring-1 ring-black/5 hover:ring-black/14"}`}
    >
      <span className="block text-base font-semibold text-brand-charcoal">{item.name}</span>
      <span className="mt-1 block text-sm font-semibold text-[#063d24]">{formatRupiah(numeric(item.base_price))}</span>
      {item.description ? <span className="mt-2 block text-xs leading-5 text-black/50">{item.description}</span> : null}
    </button>
  );
}

function SimpleOptionButton({ label, meta, selected, onClick }: { label: string; meta?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${selected ? "bg-[#111111] text-white" : "bg-white/60 text-black/70 ring-1 ring-black/8 hover:ring-black/18"}`}
    >
      {label}{meta ? <span className="ml-1 opacity-70">{meta}</span> : null}
    </button>
  );
}

function AddonButton({ item, selected, onClick }: { item: JerseyAddon; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-[18px] px-4 py-3 text-left transition ${selected ? "bg-[#e9f4ee] ring-1 ring-[#063d24]/30" : "bg-white/60 ring-1 ring-black/7 hover:ring-black/16"}`}
    >
      <span className="block text-sm font-semibold">{item.name}</span>
      <span className="mt-1 block text-xs text-black/50">{priceLabel(item.price_adjustment)} / pcs</span>
    </button>
  );
}

function RequiredServices({ services }: { services: JerseyRequiredService[] }) {
  const visible = services.length ? services : [{ service_name: "Cetak Sublim", service_slug: "cetak-sublim" }];
  return (
    <div className="rounded-[24px] bg-white/50 p-4 ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#063d24]">Layanan wajib</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visible.map((service) => (
          <span key={service.service_slug} className="rounded-full bg-[#e9f4ee] px-3 py-1.5 text-xs font-semibold text-[#063d24]">
            {service.service_name}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-black/50">Layanan ini otomatis masuk ke pesanan jersey dan tidak bisa dihapus.</p>
    </div>
  );
}

export function JerseyConfigurator({ config, jerseyName, jerseySlug, imageUrl, imageAlt }: JerseyConfiguratorProps) {
  const cart = useCart();
  const packages = config.packages.length ? config.packages : [];
  const materials = config.materials.length ? config.materials : [];
  const collars = config.collars.length ? config.collars : [];
  const addons = config.addons.length ? config.addons : [];
  const minQty = Math.max(1, Number(config.settings.minimum_order_qty || 6));

  const [packageSlug, setPackageSlug] = useState(packages[0]?.slug || "");
  const [materialSlug, setMaterialSlug] = useState(materials[0]?.slug || "");
  const [collarSlug, setCollarSlug] = useState(collars[0]?.slug || "");
  const [size, setSize] = useState("Mix Size");
  const [quantity, setQuantity] = useState(minQty);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [teamInfo, setTeamInfo] = useState<TeamInfo>({
    teamName: "",
    playerData: "",
    designReference: "",
    designFileName: "",
    notes: ""
  });

  const selectedPackage = packages.find((item) => item.slug === packageSlug) || packages[0];
  const selectedMaterial = materials.find((item) => item.slug === materialSlug) || materials[0];
  const selectedCollar = collars.find((item) => item.slug === collarSlug) || collars[0];
  const activeAddons = addons.filter((item) => selectedAddons.includes(item.slug));
  const safeQty = Math.max(minQty, quantity);

  const price = useMemo(() => {
    const packagePrice = numeric(selectedPackage?.base_price);
    const materialAdjustment = numeric(selectedMaterial?.price_adjustment);
    const collarAdjustment = numeric(selectedCollar?.price_adjustment);
    const addonTotal = activeAddons.reduce((total, item) => total + numeric(item.price_adjustment), 0);
    const sizeAdjustment = sizeAdjustments[size] || 0;
    const unitPrice = packagePrice + materialAdjustment + collarAdjustment + addonTotal + sizeAdjustment;
    return {
      packagePrice,
      materialAdjustment,
      collarAdjustment,
      addonTotal,
      sizeAdjustment,
      unitPrice,
      total: unitPrice * safeQty
    };
  }, [activeAddons, safeQty, selectedCollar, selectedMaterial, selectedPackage, size]);

  function toggleAddon(slug: string) {
    setSelectedAddons((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  function updateTeamInfo(key: keyof TeamInfo, value: string) {
    setTeamInfo((current) => ({ ...current, [key]: value }));
  }

  function addConfiguredJerseyToCart() {
    const requiredServices = config.requiredServices.length ? config.requiredServices : [{ service_name: "Cetak Sublim", service_slug: "cetak-sublim" }];
    cart.addItem({
      id: `jersey-config-${jerseySlug}-${Date.now()}`,
      name: jerseyName,
      category: "Jersey Custom",
      priceLabel: formatRupiah(price.unitPrice),
      priceValue: price.unitPrice,
      href: `/jersey/${jerseySlug}`,
      imageUrl,
      imageAlt,
      defaultSize: size,
      defaultQuantity: safeQty,
      variantName: [selectedPackage?.name, selectedMaterial?.name, selectedCollar?.name].filter(Boolean).join(" · "),
      variantSku: "JERSEY-CONFIG",
      variantSnapshot: {
        configurator_type: "jersey",
        package: selectedPackage,
        material: selectedMaterial,
        collar: selectedCollar,
        size,
        quantity: safeQty,
        addons: activeAddons,
        required_services: requiredServices,
        price_breakdown: price,
        team_information: teamInfo,
        minimum_order_qty: minQty
      }
    });
  }

  return (
    <section id="configurator" data-reveal className="scroll-mt-14 bg-brand-offWhite py-10 sm:py-12">
      <div className="section-shell">
        <div className="mb-7 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Jersey Configurator</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-charcoal sm:text-4xl">Rakit pesanan jersey</h2>
          <p className="mt-3 text-sm leading-6 text-black/58 sm:text-base sm:leading-7">Pilih paket, bahan, kerah, ukuran, jumlah, dan addon. Estimasi harga berubah langsung sebelum masuk keranjang.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid gap-5">
            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel number={1} title="Paket jersey" description={`Minimum order ${minQty} pcs. Paket bisa diedit dari Admin PIM V2.`} />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {packages.map((item) => <PackageButton key={item.slug} item={item} selected={item.slug === selectedPackage?.slug} onClick={() => setPackageSlug(item.slug)} />)}
              </div>
            </article>

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel number={2} title="Bahan" description="Bahan emboss otomatis menambah harga sesuai master data." />
              <div className="mt-5 flex flex-wrap gap-2">
                {materials.map((item) => <SimpleOptionButton key={item.slug} label={item.name} meta={priceLabel(item.price_adjustment)} selected={item.slug === selectedMaterial?.slug} onClick={() => setMaterialSlug(item.slug)} />)}
              </div>
            </article>

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel number={3} title="Kerah" description="Pilih model kerah Regular atau Classic sesuai kebutuhan desain." />
              <div className="mt-5 grid gap-5">
                {config.collarGroups.map((group) => {
                  const groupCollars = collars.filter((collar) => (collar.group_slug || "regular") === group.slug);
                  if (!groupCollars.length) return null;
                  return (
                    <div key={group.slug}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">{group.name}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {groupCollars.map((item) => <SimpleOptionButton key={item.slug} label={item.name} meta={priceLabel(item.price_adjustment)} selected={item.slug === selectedCollar?.slug} onClick={() => setCollarSlug(item.slug)} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel number={4} title="Ukuran dan jumlah" description="Gunakan Mix Size jika ukuran tiap pemain berbeda." />
              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_220px]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">Ukuran</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizeOptions.map((item) => <SimpleOptionButton key={item} label={item} meta={sizeAdjustments[item] ? priceLabel(sizeAdjustments[item]) : undefined} selected={size === item} onClick={() => setSize(item)} />)}
                  </div>
                </div>
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                  Jumlah pcs
                  <input value={quantity} min={minQty} inputMode="numeric" onChange={(event) => setQuantity(Math.max(minQty, Number(event.target.value || minQty)))} className="min-h-12 rounded-full border-0 bg-white/70 px-5 text-base font-semibold tracking-normal text-black outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35" />
                  <span className="text-[11px] font-medium normal-case tracking-normal text-black/45">Minimum {minQty} pcs</span>
                </label>
              </div>
            </article>

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel number={5} title="Addon opsional" description="Tambahan dihitung per pcs dan masuk ke estimasi harga." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {addons.map((item) => <AddonButton key={item.slug} item={item} selected={selectedAddons.includes(item.slug)} onClick={() => toggleAddon(item.slug)} />)}
              </div>
            </article>

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel number={6} title="Desain dan data tim" description="Untuk V1, file desain dicatat di keranjang/WhatsApp. Upload server penuh bisa ditambahkan di tahap berikutnya." />
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-black/70">Nama tim / komunitas
                  <input value={teamInfo.teamName} onChange={(event) => updateTeamInfo("teamName", event.target.value)} placeholder="Contoh: Garuda FC" className="min-h-12 rounded-[18px] border-0 bg-white/70 px-4 text-sm font-normal outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-black/70">Link desain / referensi
                  <input value={teamInfo.designReference} onChange={(event) => updateTeamInfo("designReference", event.target.value)} placeholder="Link Google Drive, Canva, atau catatan desain" className="min-h-12 rounded-[18px] border-0 bg-white/70 px-4 text-sm font-normal outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-black/70">Upload desain
                  <input type="file" accept="image/*,.pdf,.ai,.cdr,.psd,.zip" onChange={(event) => updateTeamInfo("designFileName", event.target.files?.[0]?.name || "")} className="rounded-[18px] bg-white/70 px-4 py-3 text-sm font-normal outline-none ring-1 ring-black/8 file:mr-3 file:rounded-full file:border-0 file:bg-[#063d24] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white" />
                  {teamInfo.designFileName ? <span className="text-xs font-medium text-black/50">File dipilih: {teamInfo.designFileName}</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-semibold text-black/70">Data pemain
                  <textarea value={teamInfo.playerData} onChange={(event) => updateTeamInfo("playerData", event.target.value)} rows={4} placeholder="Contoh:\n1. Andi - L - No. 10\n2. Fajar - XL - No. 7" className="rounded-[18px] border-0 bg-white/70 p-4 text-sm font-normal leading-6 outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-black/70">Catatan tambahan
                  <textarea value={teamInfo.notes} onChange={(event) => updateTeamInfo("notes", event.target.value)} rows={3} placeholder="Contoh: deadline, warna dominan, atau arahan khusus." className="rounded-[18px] border-0 bg-white/70 p-4 text-sm font-normal leading-6 outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35" />
                </label>
              </div>
            </article>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[30px] bg-white/70 p-5 ring-1 ring-black/6 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42">Live Price</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Estimasi jersey</h3>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-black/55">Paket</span><span className="font-semibold">{formatRupiah(price.packagePrice)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-black/55">Bahan</span><span className="font-semibold">{price.materialAdjustment ? formatRupiah(price.materialAdjustment) : "+0"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-black/55">Kerah</span><span className="font-semibold">{price.collarAdjustment ? formatRupiah(price.collarAdjustment) : "+0"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-black/55">Addon</span><span className="font-semibold">{price.addonTotal ? formatRupiah(price.addonTotal) : "+0"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-black/55">Ukuran</span><span className="font-semibold">{price.sizeAdjustment ? formatRupiah(price.sizeAdjustment) : "+0"}</span></div>
                <div className="border-t border-black/8 pt-3">
                  <div className="flex justify-between gap-4"><span className="font-semibold">Harga / pcs</span><span className="font-semibold">{formatRupiah(price.unitPrice)}</span></div>
                  <div className="mt-2 flex justify-between gap-4"><span className="font-semibold">Qty</span><span className="font-semibold">{safeQty} pcs</span></div>
                </div>
                <div className="rounded-[22px] bg-[#e9f4ee] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[#063d24]">Estimasi Total</span>
                    <span className="text-2xl font-bold text-[#063d24]">{formatRupiah(price.total)}</span>
                  </div>
                </div>
              </div>
              <RequiredServices services={config.requiredServices} />
              <button type="button" onClick={addConfiguredJerseyToCart} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#063d24] px-5 text-sm font-semibold text-white transition hover:bg-[#111111]">
                Masukkan ke Keranjang
              </button>
              <p className="mt-4 text-center text-[11px] leading-5 text-black/45">Harga final tetap dikonfirmasi admin lewat WhatsApp setelah desain dan data tim dicek.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
