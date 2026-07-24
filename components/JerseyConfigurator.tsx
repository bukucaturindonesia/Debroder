"use client";

import { useMemo, useState } from "react";
import { resolveJerseyConfiguredProduct } from "@/app/jersey/configurator/actions";
import { useCart } from "@/components/CartProvider";
import type {
  ConfiguredOption,
  ConfiguredOptionGroup,
  ConfiguredProductDraft
} from "@/lib/contracts";
import { CONTRACT_VERSIONS } from "@/lib/contracts";
import type { JerseyConfiguredProductConsumer } from "@/lib/jersey-configured-product/domain";

type JerseyConfiguratorProps = {
  consumer: JerseyConfiguredProductConsumer;
};

type TeamInfo = {
  teamName: string;
  sleeveRequirement: string;
  playerRoster: string;
  designReference: string;
  logoRequirement: string;
  sponsorRequirement: string;
  nameNumberRequirement: string;
  notes: string;
};

const EMPTY_TEAM_INFO: TeamInfo = {
  teamName: "",
  sleeveRequirement: "",
  playerRoster: "",
  designReference: "",
  logoRequirement: "",
  sponsorRequirement: "",
  nameNumberRequirement: "",
  notes: ""
};

function StepLabel({
  number,
  title,
  description
}: {
  number: number;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">Langkah {number}</p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-brand-charcoal">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-black/56">{description}</p> : null}
    </div>
  );
}

function OptionButton({
  item,
  selected,
  onClick
}: {
  item: ConfiguredOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-[18px] px-4 py-3 text-left transition ${
        selected
          ? "bg-[#e9f4ee] ring-1 ring-[#063d24]/30"
          : "bg-white/60 ring-1 ring-black/7 hover:ring-black/16"
      }`}
    >
      <span className="block text-sm font-semibold">{item.label}</span>
      {item.description ? <span className="mt-1 block text-xs leading-5 text-black/50">{item.description}</span> : null}
    </button>
  );
}

export function JerseyConfigurator({ consumer }: JerseyConfiguratorProps) {
  const cart = useCart();
  const definition = consumer.definition;
  const packageGroup = group(definition.optionGroups, "package");
  const materialGroup = group(definition.optionGroups, "material");
  const collarGroup = group(definition.optionGroups, "collar");
  const addonGroup = group(definition.optionGroups, "addons");
  const sizeDimension = definition.allocationDimensions.find(
    (dimension) => dimension.code === "size"
  );
  const [packageId, setPackageId] = useState(packageGroup?.options[0]?.id ?? "");
  const [materialId, setMaterialId] = useState(materialGroup?.options[0]?.id ?? "");
  const [collarId, setCollarId] = useState(collarGroup?.options[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [teamInfo, setTeamInfo] = useState<TeamInfo>(EMPTY_TEAM_INFO);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const quantity = useMemo(
    () => Object.values(sizeQuantities).reduce((total, value) => total + value, 0),
    [sizeQuantities]
  );
  const selectedPackage = packageGroup?.options.find((item) => item.id === packageId);
  const selectedMaterial = materialGroup?.options.find((item) => item.id === materialId);
  const selectedCollar = collarGroup?.options.find((item) => item.id === collarId);
  const selectedAddons = addonGroup?.options.filter((item) => addonIds.includes(item.id)) ?? [];
  const requiredTextReady = Object.entries(teamInfo)
    .filter(([key]) => key !== "notes")
    .every(([, value]) => value.trim().length > 0);
  const readyToSubmit = Boolean(
    packageId
    && materialId
    && collarId
    && quantity >= definition.quantityRules.minimum
    && quantity <= (definition.quantityRules.maximum ?? quantity)
    && requiredTextReady
  );

  function toggleAddon(id: string) {
    setAddonIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  function updateTeamInfo(key: keyof TeamInfo, value: string) {
    setTeamInfo((current) => ({ ...current, [key]: value }));
  }

  function updateSizeQuantity(size: string, rawValue: string) {
    const parsed = Math.max(0, Math.min(100, Number.parseInt(rawValue || "0", 10) || 0));
    setSizeQuantities((current) => ({ ...current, [size]: parsed }));
  }

  async function addConfiguredJerseyToCart() {
    if (!readyToSubmit || submitting) return;
    setSubmitting(true);
    setNotice("");
    const requestedAt = new Date().toISOString();
    const configurationId = crypto.randomUUID();
    const draft: ConfiguredProductDraft = {
      contractVersion: CONTRACT_VERSIONS.configuredProduct,
      id: configurationId,
      definitionId: definition.id,
      definitionVersion: definition.version,
      quantity,
      selections: [
        selection(packageGroup, [packageId]),
        selection(materialGroup, [materialId]),
        selection(collarGroup, [collarId]),
        selection(addonGroup, addonIds),
        textSelection(definition.optionGroups, "team_name", teamInfo.teamName),
        textSelection(definition.optionGroups, "sleeve_requirement", teamInfo.sleeveRequirement),
        textSelection(definition.optionGroups, "player_roster", teamInfo.playerRoster),
        textSelection(definition.optionGroups, "design_reference", teamInfo.designReference),
        textSelection(definition.optionGroups, "logo_requirement", teamInfo.logoRequirement),
        textSelection(definition.optionGroups, "sponsor_requirement", teamInfo.sponsorRequirement),
        textSelection(definition.optionGroups, "name_number_requirement", teamInfo.nameNumberRequirement)
      ].filter((entry) => entry.groupId.length > 0),
      allocations: Object.entries(sizeQuantities)
        .filter(([, value]) => value > 0)
        .map(([size, value]) => ({
          id: `jersey-size:${size}`,
          dimensions: { size },
          quantity: value
        })),
      services: definition.serviceRequirements.map((requirement) => ({
        requirementId: requirement.id,
        serviceCode: requirement.serviceCode,
        quantity
      })),
      uploads: [],
      ...(teamInfo.notes.trim() ? { note: teamInfo.notes.trim() } : {}),
      createdAt: requestedAt,
      updatedAt: requestedAt
    };

    try {
      const result = await resolveJerseyConfiguredProduct({
        productId: consumer.product.id,
        draft,
        requestId: crypto.randomUUID(),
        snapshotId: crypto.randomUUID(),
        requestedAt
      });
      if (!result.ok) {
        setNotice(result.error.message);
        return;
      }

      cart.addConfiguredProduct({
        snapshot: result.snapshot,
        name: consumer.product.name,
        category: "Jersey Custom",
        priceLabel: "Menunggu penawaran",
        href: `/jersey/configurator?product=${encodeURIComponent(consumer.product.slug)}`,
        imageUrl: consumer.product.imageUrl,
        imageAlt: consumer.product.imageAlt,
        size: sizeSummary(sizeQuantities),
        variantName: [selectedPackage?.label, selectedMaterial?.label, selectedCollar?.label]
          .filter((value): value is string => Boolean(value))
          .join(" · "),
        notes: teamInfo.notes.trim() || undefined
      });
      setNotice("Konfigurasi tervalidasi server dan masuk ke keranjang penawaran.");
    } catch {
      setNotice("Validasi server belum dapat diselesaikan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="configurator" data-reveal className="scroll-mt-14 bg-brand-offWhite py-10 sm:py-12">
      <div className="section-shell">
        <div className="mb-7 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Jersey Configurator</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-charcoal sm:text-4xl">Rakit kebutuhan jersey</h2>
          <p className="mt-3 text-sm leading-6 text-black/58 sm:text-base sm:leading-7">
            Pilihan akan divalidasi server dan disimpan sebagai snapshot konfigurasi. Harga tidak dihitung di browser dan menunggu penawaran resmi.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid gap-5">
            <OptionSection number={1} title="Paket jersey" group={packageGroup} selectedIds={[packageId]} onSelect={setPackageId} />
            <OptionSection number={2} title="Bahan" group={materialGroup} selectedIds={[materialId]} onSelect={setMaterialId} />
            <CollarSection group={collarGroup} selectedId={collarId} onSelect={setCollarId} />

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel
                number={4}
                title="Alokasi ukuran"
                description={`Isi quantity per ukuran. Minimum total ${definition.quantityRules.minimum} pcs.`}
              />
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(sizeDimension?.allowedValues ?? []).map((size) => (
                  <label key={size} className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/48">
                    {size}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      value={sizeQuantities[size] ?? 0}
                      onChange={(event) => updateSizeQuantity(size, event.target.value)}
                      className="min-h-11 rounded-[16px] border-0 bg-white/70 px-4 text-base font-semibold tracking-normal text-black outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold text-[#063d24]">Total: {quantity} pcs</p>
            </article>

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel number={5} title="Addon opsional" description="Pilih addon yang perlu ditinjau dalam penawaran." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(addonGroup?.options ?? []).map((item) => (
                  <OptionButton
                    key={item.id}
                    item={item}
                    selected={addonIds.includes(item.id)}
                    onClick={() => toggleAddon(item.id)}
                  />
                ))}
              </div>
            </article>

            <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
              <StepLabel
                number={6}
                title="Desain dan data tim"
                description="Lengkapi kebutuhan transaction-critical. Tautan desain akan ditinjau; upload file langsung belum dianggap tersimpan."
              />
              <div className="mt-5 grid gap-4">
                <TextField label="Nama tim / komunitas" value={teamInfo.teamName} onChange={(value) => updateTeamInfo("teamName", value)} />
                <TextField label="Kebutuhan lengan" value={teamInfo.sleeveRequirement} onChange={(value) => updateTeamInfo("sleeveRequirement", value)} placeholder="Contoh: pendek, panjang, atau kombinasi" />
                <TextArea label="Data pemain dan ukuran" value={teamInfo.playerRoster} onChange={(value) => updateTeamInfo("playerRoster", value)} placeholder="Nama pemain, nomor, dan ukuran per orang" />
                <TextField label="Tautan / referensi desain" value={teamInfo.designReference} onChange={(value) => updateTeamInfo("designReference", value)} placeholder="Tautan privat yang dapat ditinjau tim DEBRODER" />
                <TextArea label="Kebutuhan logo" value={teamInfo.logoRequirement} onChange={(value) => updateTeamInfo("logoRequirement", value)} />
                <TextArea label="Kebutuhan sponsor" value={teamInfo.sponsorRequirement} onChange={(value) => updateTeamInfo("sponsorRequirement", value)} />
                <TextArea label="Kebutuhan nama dan nomor" value={teamInfo.nameNumberRequirement} onChange={(value) => updateTeamInfo("nameNumberRequirement", value)} />
                <TextArea label="Catatan tambahan (opsional)" value={teamInfo.notes} onChange={(value) => updateTeamInfo("notes", value)} />
              </div>
            </article>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[30px] bg-white/70 p-5 ring-1 ring-black/6 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42">Status harga</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Penawaran diperlukan</h3>
              <p className="mt-3 text-sm leading-6 text-black/55">
                Browser tidak menentukan harga final. Admin akan meninjau konfigurasi tervalidasi sebelum penawaran dapat disetujui.
              </p>
              <div className="mt-5 grid gap-3 text-sm">
                <Summary label="Paket" value={selectedPackage?.label} />
                <Summary label="Bahan" value={selectedMaterial?.label} />
                <Summary label="Kerah" value={selectedCollar?.label} />
                <Summary label="Addon" value={selectedAddons.map((item) => item.label).join(", ") || "Tanpa addon"} />
                <Summary label="Ukuran" value={sizeSummary(sizeQuantities) || "Belum diisi"} />
                <Summary label="Total" value={`${quantity} pcs`} />
              </div>
              <div className="mt-5 rounded-[22px] bg-[#e9f4ee] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#063d24]">Layanan wajib</p>
                <p className="mt-2 text-sm font-semibold text-[#063d24]">
                  {definition.serviceRequirements.map((item) => item.label).join(", ")}
                </p>
              </div>
              <button
                type="button"
                disabled={!readyToSubmit || submitting}
                onClick={addConfiguredJerseyToCart}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#063d24] px-5 text-sm font-semibold text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? "Memvalidasi..." : "Masukkan ke Keranjang Penawaran"}
              </button>
              {notice ? <p role="status" className="mt-4 text-center text-xs leading-5 text-black/58">{notice}</p> : null}
              <p className="mt-4 text-center text-[11px] leading-5 text-black/45">
                Konfigurasi quotation-required tidak dapat diproses sebagai checkout berbayar sebelum validasi dan penawaran server terbaru.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function OptionSection({
  number,
  title,
  group: optionGroup,
  selectedIds,
  onSelect
}: {
  number: number;
  title: string;
  group?: ConfiguredOptionGroup;
  selectedIds: readonly string[];
  onSelect: (id: string) => void;
}) {
  return (
    <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
      <StepLabel number={number} title={title} description="Pilihan berasal dari master data aktif." />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {(optionGroup?.options ?? []).map((item) => (
          <OptionButton key={item.id} item={item} selected={selectedIds.includes(item.id)} onClick={() => onSelect(item.id)} />
        ))}
      </div>
    </article>
  );
}

function CollarSection({
  group: optionGroup,
  selectedId,
  onSelect
}: {
  group?: ConfiguredOptionGroup;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const labels = [...new Set((optionGroup?.options ?? []).map(collarGroupLabel))];
  return (
    <article className="rounded-[28px] bg-white/40 p-4 ring-1 ring-black/5 sm:p-6">
      <StepLabel number={3} title="Kerah" description="Model kerah berasal dari master data aktif." />
      <div className="mt-5 grid gap-5">
        {labels.map((label) => (
          <div key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">{label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(optionGroup?.options ?? [])
                .filter((item) => collarGroupLabel(item) === label)
                .map((item) => (
                  <OptionButton key={item.id} item={item} selected={selectedId === item.id} onClick={() => onSelect(item.id)} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-black/70">
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 rounded-[18px] border-0 bg-white/70 px-4 text-sm font-normal outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-black/70">
      {label}
      <textarea
        required={!label.includes("opsional")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="rounded-[18px] border-0 bg-white/70 p-4 text-sm font-normal leading-6 outline-none ring-1 ring-black/8 focus:ring-[#063d24]/35"
      />
    </label>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-black/55">{label}</span>
      <span className="text-right font-semibold">{value || "Belum dipilih"}</span>
    </div>
  );
}

function group(groups: readonly ConfiguredOptionGroup[], code: string) {
  return groups.find((item) => item.code === code);
}

function selection(optionGroup: ConfiguredOptionGroup | undefined, optionIds: readonly string[]) {
  return {
    groupId: optionGroup?.id ?? "",
    optionIds
  };
}

function textSelection(
  groups: readonly ConfiguredOptionGroup[],
  code: string,
  textValue: string
) {
  return {
    groupId: group(groups, code)?.id ?? "",
    optionIds: [],
    textValue: textValue.trim()
  };
}

function collarGroupLabel(item: ConfiguredOption) {
  const value = item.metadata?.groupLabel;
  return typeof value === "string" && value.trim() ? value : "Kerah";
}

function sizeSummary(values: Readonly<Record<string, number>>) {
  return Object.entries(values)
    .filter(([, quantity]) => quantity > 0)
    .map(([size, quantity]) => `${size} × ${quantity}`)
    .join(", ");
}
