export const EDITABLE_PRICING_KINDS = [
  "SERVICE",
  "PERSONALIZATION",
  "SETUP_FEE",
  "DESIGN_FEE",
  "DISCOUNT",
  "ADJUSTMENT",
  "SHIPPING",
  "OTHER"
] as const;

export type EditablePricingKind = (typeof EDITABLE_PRICING_KINDS)[number];

export type OrderProductSnapshot = {
  id: string;
  productName: string;
  variantName: string | null;
  color: string | null;
  size: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  source: "order_item_snapshot";
};

export type EditablePricingLine = {
  id: string;
  kind: EditablePricingKind;
  label: string;
  source: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  serviceCode: string;
  placement: string;
  printSize: string;
  reason: string;
};

export type ServiceSummary = {
  id: string;
  name: string;
  method: string | null;
  printSize: string | null;
  placement: string | null;
  quantity: number | null;
  personalization: string | null;
  note: string | null;
  fileAvailable: boolean;
  preset: string | null;
};

export type PricingConfirmations = {
  product: boolean;
  service: boolean;
};

export type PricingTotals = {
  product: number;
  service: number;
  personalization: number;
  setupDesign: number;
  adjustment: number;
  discount: number;
  shipping: number;
  other: number;
  final: number;
};

export type PricingValidation = {
  blockers: string[];
  duplicateLineIds: string[];
  totals: PricingTotals;
  canFinalize: boolean;
};

export function productSnapshotsFromOrderItems(items: Array<Record<string, unknown>>): OrderProductSnapshot[] {
  return items.map((item) => {
    const quantity = integer(item.quantity);
    const unitPrice = integer(item.unit_price);
    const storedSubtotal = integer(item.subtotal);
    return {
      id: text(item.id) || cryptoSafeId("product"),
      productName: text(item.product_name) || "Produk tanpa nama",
      variantName: nullableText(item.variant_name),
      color: nullableText(item.color),
      size: nullableText(item.size),
      sku: nullableText(item.sku),
      quantity: quantity ?? 0,
      unitPrice,
      subtotal: storedSubtotal ?? (quantity !== null && unitPrice !== null ? quantity * unitPrice : null),
      source: "order_item_snapshot"
    };
  });
}

export function serviceSummariesFromSnapshot(value: unknown): ServiceSummary[] {
  if (!Array.isArray(value)) return [];
  const summaries: ServiceSummary[] = [];

  for (const projectCandidate of value) {
    const project = record(projectCandidate);
    if (!project) continue;
    const preset = nullableText(project.presetId);
    const pricing = record(project.pricing);
    const lines = Array.isArray(pricing?.lines) ? pricing.lines : [];
    for (const lineCandidate of lines) {
      const line = record(lineCandidate);
      if (!line || text(line.kind) === "product") continue;
      const name = text(line.displayLabel) || text(line.label) || "Layanan custom";
      summaries.push({
        id: text(line.key) || cryptoSafeId("service"),
        name,
        method: nullableText(line.serviceName) ?? nullableText(line.serviceSlug),
        printSize: nullableText(line.printSizeName),
        placement: nullableText(line.placementName),
        quantity: integer(line.quantity),
        personalization: text(line.kind) === "personalization" ? name : null,
        note: null,
        fileAvailable: projectHasUpload(project),
        preset
      });
    }

    if (lines.length === 0 && Array.isArray(project.items)) {
      for (const itemCandidate of project.items) {
        const item = record(itemCandidate);
        if (!item) continue;
        const quantity = arrayRecords(item.allocations).reduce((sum, allocation) => sum + (integer(allocation.quantity) ?? 0), 0);
        const packages = arrayRecords(item.designPackages);
        for (const designPackage of packages) {
          for (const service of arrayRecords(designPackage.services)) {
            summaries.push({
              id: text(service.id) || cryptoSafeId("legacy-service"),
              name: text(designPackage.name) || "Layanan custom legacy",
              method: nullableText(service.serviceName) ?? nullableText(service.serviceId),
              printSize: nullableText(service.printSizeName) ?? nullableText(service.printSizeId),
              placement: nullableText(service.placementName) ?? nullableText(service.placementId),
              quantity: quantity || null,
              personalization: personalizationLabel(item.personalization),
              note: nullableText(service.note) ?? nullableText(item.note),
              fileAvailable: Array.isArray(item.uploads) && item.uploads.length > 0,
              preset
            });
          }
        }
      }
    }
  }

  return dedupeSummaries(summaries);
}

export function editableLinesFromSnapshot(value: unknown): EditablePricingLine[] {
  if (!Array.isArray(value)) return [];
  const lines: EditablePricingLine[] = [];
  for (const projectCandidate of value) {
    const project = record(projectCandidate);
    const pricing = record(project?.pricing);
    if (!pricing || !Array.isArray(pricing.lines)) continue;
    for (const candidate of pricing.lines) {
      const source = record(candidate);
      if (!source || text(source.kind) === "product") continue;
      const rawKind = text(source.kind);
      const kind: EditablePricingKind = rawKind === "personalization" ? "PERSONALIZATION" : "SERVICE";
      lines.push({
        id: text(source.key) || cryptoSafeId("snapshot-price"),
        kind,
        label: text(source.displayLabel) || text(source.label) || "Layanan custom",
        source: text(source.sourceRuleId) || "custom_order_snapshot",
        quantity: integer(source.quantity) ?? 1,
        unit: integer(source.quantity) === 1 ? "order" : "pcs",
        unitPrice: integer(source.unitPrice) ?? 0,
        serviceCode: text(source.serviceSlug) || text(source.serviceId),
        placement: text(source.placementName),
        printSize: text(source.printSizeName),
        reason: ""
      });
    }
  }
  return lines;
}

export function createEmptyPricingLine(kind: EditablePricingKind = "SERVICE"): EditablePricingLine {
  return {
    id: cryptoSafeId("price"),
    kind,
    label: "",
    source: "admin_manual",
    quantity: 1,
    unit: kind === "SETUP_FEE" || kind === "DESIGN_FEE" ? "order" : "pcs",
    unitPrice: 0,
    serviceCode: "",
    placement: "",
    printSize: "",
    reason: ""
  };
}

export function lineSubtotal(line: EditablePricingLine): number {
  if (!Number.isSafeInteger(line.quantity) || !Number.isSafeInteger(line.unitPrice)) return 0;
  const unsigned = Math.abs(line.quantity * line.unitPrice);
  if (line.kind === "DISCOUNT") return -unsigned;
  if (line.kind === "ADJUSTMENT") return line.quantity * line.unitPrice;
  return unsigned;
}

export function calculatePricingTotals(products: OrderProductSnapshot[], lines: EditablePricingLine[]): PricingTotals {
  const totals: PricingTotals = {
    product: products.reduce((sum, product) => sum + (product.subtotal ?? 0), 0),
    service: 0,
    personalization: 0,
    setupDesign: 0,
    adjustment: 0,
    discount: 0,
    shipping: 0,
    other: 0,
    final: 0
  };

  for (const line of lines) {
    const subtotal = lineSubtotal(line);
    if (line.kind === "SERVICE") totals.service += subtotal;
    else if (line.kind === "PERSONALIZATION") totals.personalization += subtotal;
    else if (line.kind === "SETUP_FEE" || line.kind === "DESIGN_FEE") totals.setupDesign += subtotal;
    else if (line.kind === "ADJUSTMENT") totals.adjustment += subtotal;
    else if (line.kind === "DISCOUNT") totals.discount += Math.abs(subtotal);
    else if (line.kind === "SHIPPING") totals.shipping += subtotal;
    else totals.other += subtotal;
  }

  totals.final = totals.product + totals.service + totals.personalization + totals.setupDesign
    + totals.adjustment - totals.discount + totals.shipping + totals.other;
  return totals;
}

export function validatePricingWorkspace(input: {
  products: OrderProductSnapshot[];
  lines: EditablePricingLine[];
  confirmations: PricingConfirmations;
  validDays: number;
  requiresServiceConfirmation: boolean;
}): PricingValidation {
  const blockers: string[] = [];
  const invalidProduct = input.products.find((product) => !Number.isSafeInteger(product.quantity)
    || product.quantity <= 0
    || product.unitPrice === null
    || !Number.isSafeInteger(product.unitPrice)
    || product.unitPrice <= 0
    || product.subtotal === null
    || !Number.isSafeInteger(product.subtotal));
  if (input.products.length === 0) blockers.push("Order belum memiliki product base line.");
  else if (invalidProduct) blockers.push(`Harga dasar produk ${invalidProduct.productName} belum tersedia atau tidak valid.`);

  if (!input.confirmations.product) blockers.push("Konfirmasi produk, varian, jumlah, dan harga dasar belum diberikan.");
  if (input.requiresServiceConfirmation && !input.confirmations.service) blockers.push("Konfirmasi layanan dan spesifikasi custom belum diberikan.");
  if (!Number.isInteger(input.validDays) || input.validDays < 1 || input.validDays > 30) blockers.push("Masa berlaku penawaran harus 1–30 hari.");

  for (const line of input.lines) {
    if (!EDITABLE_PRICING_KINDS.includes(line.kind)) blockers.push(`Jenis komponen ${line.label || line.id} tidak valid.`);
    if (!line.label.trim()) blockers.push("Setiap komponen harga wajib memiliki label.");
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) blockers.push(`${line.label || "Komponen"}: quantity harus berupa integer positif.`);
    if (!Number.isSafeInteger(line.unitPrice)) blockers.push(`${line.label || "Komponen"}: harga harus berupa integer Rupiah.`);
    if (line.kind !== "ADJUSTMENT" && line.unitPrice < 0) blockers.push(`${line.label || "Komponen"}: harga negatif hanya boleh digunakan pada adjustment.`);
    if ((line.kind === "ADJUSTMENT" || line.kind === "DISCOUNT" || line.kind === "OTHER") && line.reason.trim().length < 5) {
      blockers.push(`${line.label || "Komponen"}: alasan minimal 5 karakter wajib diisi.`);
    }
  }

  const duplicate = findDuplicateCharges(input.lines);
  blockers.push(...duplicate.messages);
  const totals = calculatePricingTotals(input.products, input.lines);
  if (!Number.isSafeInteger(totals.final) || totals.final <= 0) blockers.push("Total final order berbayar harus lebih besar dari Rp0.");
  return {
    blockers: unique(blockers),
    duplicateLineIds: duplicate.lineIds,
    totals,
    canFinalize: blockers.length === 0
  };
}

export function findDuplicateCharges(lines: EditablePricingLine[]): { messages: string[]; lineIds: string[] } {
  const messages: string[] = [];
  const lineIds = new Set<string>();
  const identities = new Map<string, EditablePricingLine>();

  for (const line of lines) {
    const identity = [line.kind, line.serviceCode, line.label, line.placement, line.printSize]
      .map(normalizeIdentity)
      .join("|");
    const previous = identities.get(identity);
    if (previous) {
      messages.push(`Komponen harga terduplikasi: ${previous.label} dan ${line.label}.`);
      lineIds.add(previous.id);
      lineIds.add(line.id);
    } else identities.set(identity, line);
  }

  for (const kind of ["SETUP_FEE", "PERSONALIZATION"] as const) {
    const grouped = new Map<string, EditablePricingLine>();
    for (const line of lines.filter((candidate) => candidate.kind === kind)) {
      const key = normalizeIdentity(line.serviceCode || line.label);
      const previous = grouped.get(key);
      if (previous) {
        messages.push(`${kind === "SETUP_FEE" ? "Setup fee" : "Personalisasi"} terduplikasi: ${previous.label} dan ${line.label}.`);
        lineIds.add(previous.id);
        lineIds.add(line.id);
      } else grouped.set(key, line);
    }
  }

  const services = new Map<string, EditablePricingLine>();
  for (const line of lines.filter((candidate) => candidate.kind === "SERVICE")) {
    const key = [line.serviceCode || line.label, line.placement, line.printSize].map(normalizeIdentity).join("|");
    const previous = services.get(key);
    if (previous) {
      messages.push(`Layanan atau placement terduplikasi: ${previous.label} dan ${line.label}.`);
      lineIds.add(previous.id);
      lineIds.add(line.id);
    } else services.set(key, line);
  }

  const dtfLines = lines.filter((line) => line.kind === "SERVICE" && /(^|\W)dtf(\W|$)/i.test(`${line.serviceCode} ${line.label}`));
  const generic = dtfLines.filter((line) => !line.placement.trim() && !line.printSize.trim());
  const specific = dtfLines.filter((line) => line.placement.trim() || line.printSize.trim());
  if (generic.length > 0 && specific.length > 0) {
    messages.push(`Biaya DTF generic bertabrakan dengan rincian DTF spesifik: ${[...generic, ...specific].map((line) => line.label).join(", ")}. Hapus biaya untuk pekerjaan yang sama.`);
    for (const line of [...generic, ...specific]) lineIds.add(line.id);
  }

  return { messages: unique(messages), lineIds: [...lineIds] };
}

export function normalizeDraftLines(value: unknown): EditablePricingLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const line = record(candidate);
    const kind = text(line?.kind) as EditablePricingKind;
    if (!line || !EDITABLE_PRICING_KINDS.includes(kind)) return [];
    return [{
      id: text(line.id) || cryptoSafeId("price"),
      kind,
      label: text(line.label),
      source: text(line.source) || "admin_manual",
      quantity: integer(line.quantity) ?? 1,
      unit: text(line.unit) || "pcs",
      unitPrice: integer(line.unit_price ?? line.unitPrice) ?? 0,
      serviceCode: text(line.service_code ?? line.serviceCode),
      placement: text(line.placement),
      printSize: text(line.print_size ?? line.printSize),
      reason: text(line.reason)
    }];
  });
}

function projectHasUpload(project: Record<string, unknown>) {
  return arrayRecords(project.items).some((item) => Array.isArray(item.uploads) && item.uploads.length > 0);
}

function personalizationLabel(value: unknown) {
  const personalization = record(value);
  if (!personalization || !text(personalization.ruleId)) return null;
  return text(personalization.mode) === "per_item" ? "Per item" : "Sama untuk semua";
}

function dedupeSummaries(summaries: ServiceSummary[]) {
  const seen = new Set<string>();
  return summaries.filter((summary) => {
    const key = [summary.name, summary.method, summary.printSize, summary.placement, summary.quantity].map(String).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeIdentity(value: string) {
  return value.trim().toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "none";
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function arrayRecords(value: unknown) {
  return Array.isArray(value) ? value.flatMap((candidate) => {
    const next = record(candidate);
    return next ? [next] : [];
  }) : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  return text(value) || null;
}

function integer(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function cryptoSafeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}:${crypto.randomUUID()}`;
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
