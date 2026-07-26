import { z } from "zod";

export const instantServiceInputFieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["text", "number", "select", "textarea"]),
  required: z.boolean().default(false),
  maxLength: z.number().int().min(1).max(500).optional(),
  options: z.array(z.string().trim().min(1).max(80)).max(30).optional()
});

export const instantServiceDefinitionSchema = z.object({
  id: z.string().uuid(),
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).nullable(),
  pricingType: z.enum(["fixed_per_item", "fixed_per_order", "tiered"]),
  basePrice: z.number().int().nonnegative(),
  minimumQuantity: z.number().int().positive(),
  maximumQuantity: z.number().int().positive().nullable(),
  requiresUpload: z.boolean(),
  requiresNotes: z.boolean(),
  inputSchema: z.array(instantServiceInputFieldSchema).max(20),
  sortOrder: z.number().int(),
  updatedAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "Timestamp layanan tidak valid."),
  pricingRules: z.array(z.object({
    id: z.string().uuid(),
    minQuantity: z.number().int().positive(),
    maxQuantity: z.number().int().positive().nullable(),
    unitPrice: z.number().int().nonnegative().nullable(),
    flatPrice: z.number().int().nonnegative().nullable(),
    quoteRequired: z.boolean()
  })).max(50)
});

export type InstantServiceDefinition = z.infer<typeof instantServiceDefinitionSchema>;

export const instantServiceSelectionSchema = z.object({
  serviceId: z.string().uuid(),
  inputs: z.record(z.string(), z.string().trim().max(500)).default({}),
  uploadIds: z.array(z.string().uuid()).max(10).default([]),
  uploadSessionToken: z.string().regex(/^[a-zA-Z0-9_-]{8,160}$/).optional(),
  note: z.string().trim().max(1000).optional()
});

export type InstantServiceSelection = z.infer<typeof instantServiceSelectionSchema>;

export type InstantServicePriceSnapshot = Readonly<{
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  pricingType: "fixed_per_item" | "fixed_per_order" | "tiered";
  calculationBasis: "per_item" | "per_order";
  sourceRuleId: string;
  unitPrice: number;
  chargedQuantity: number;
  total: number;
  inputs: Readonly<Record<string, string>>;
  uploadIds: readonly string[];
  note?: string;
  definitionVersion: string;
}>;

export type InstantCustomSnapshot = Readonly<{
  version: 1;
  requiresService: true;
  selections: readonly InstantServiceSelection[];
  pricing: readonly InstantServicePriceSnapshot[];
  serviceTotal: number;
  pricedAt: string;
}>;

export type InstantServicePricingResult =
  | {
      ok: true;
      snapshots: InstantServicePriceSnapshot[];
      serviceTotal: number;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export function priceInstantServices(
  definitions: readonly InstantServiceDefinition[],
  rawSelections: unknown,
  quantity: number
): InstantServicePricingResult {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
    return { ok: false, code: "INSTANT_SERVICE_QUANTITY_INVALID", message: "Quantity layanan tidak valid." };
  }
  const parsed = z.array(instantServiceSelectionSchema).max(10).safeParse(rawSelections);
  if (!parsed.success) {
    return { ok: false, code: "INSTANT_SERVICE_SELECTION_INVALID", message: "Pilihan layanan tidak valid." };
  }
  const ids = new Set<string>();
  const snapshots: InstantServicePriceSnapshot[] = [];
  let serviceTotal = 0;

  for (const selection of parsed.data) {
    if (ids.has(selection.serviceId)) {
      return { ok: false, code: "INSTANT_SERVICE_DUPLICATE", message: "Layanan yang sama hanya boleh dipilih sekali." };
    }
    ids.add(selection.serviceId);
    const service = definitions.find((candidate) => candidate.id === selection.serviceId);
    if (!service) {
      return { ok: false, code: "INSTANT_SERVICE_UNAVAILABLE", message: "Layanan tidak lagi aktif atau tidak berlaku untuk produk ini." };
    }
    if (
      quantity < service.minimumQuantity
      || (service.maximumQuantity !== null && quantity > service.maximumQuantity)
    ) {
      return { ok: false, code: "INSTANT_SERVICE_QUANTITY_OUT_OF_RANGE", message: `Jumlah ${service.name} tidak memenuhi batas layanan.` };
    }
    for (const field of service.inputSchema) {
      const value = selection.inputs[field.key]?.trim() ?? "";
      if (field.required && !value) {
        return { ok: false, code: "INSTANT_SERVICE_INPUT_REQUIRED", message: `${field.label} wajib diisi.` };
      }
      if (field.maxLength && value.length > field.maxLength) {
        return { ok: false, code: "INSTANT_SERVICE_INPUT_TOO_LONG", message: `${field.label} terlalu panjang.` };
      }
      if (field.type === "number" && value && !/^[0-9]+$/.test(value)) {
        return { ok: false, code: "INSTANT_SERVICE_INPUT_INVALID", message: `${field.label} harus berupa angka.` };
      }
      if (field.type === "select" && value && !field.options?.includes(value)) {
        return { ok: false, code: "INSTANT_SERVICE_INPUT_INVALID", message: `${field.label} tidak valid.` };
      }
    }
    if (service.requiresNotes && !selection.note?.trim()) {
      return { ok: false, code: "INSTANT_SERVICE_NOTE_REQUIRED", message: `Catatan ${service.name} wajib diisi.` };
    }
    if (service.requiresUpload && (!selection.uploadSessionToken || selection.uploadIds.length === 0)) {
      return { ok: false, code: "INSTANT_SERVICE_UPLOAD_REQUIRED", message: `File untuk ${service.name} wajib diunggah.` };
    }

    const rule = service.pricingType === "tiered"
      ? [...service.pricingRules]
          .filter((candidate) => quantity >= candidate.minQuantity && (candidate.maxQuantity === null || quantity <= candidate.maxQuantity))
          .sort((left, right) => right.minQuantity - left.minQuantity)[0]
      : null;
    if (service.pricingType === "tiered" && (!rule || rule.quoteRequired)) {
      return { ok: false, code: "INSTANT_SERVICE_QUOTATION_REQUIRED", message: `${service.name} memerlukan penawaran dan tidak dapat masuk Ready Stock Checkout.` };
    }
    const calculationBasis = service.pricingType === "fixed_per_order" ? "per_order" : "per_item";
    const unitPrice = rule
      ? rule.unitPrice ?? rule.flatPrice ?? -1
      : service.basePrice;
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) {
      return { ok: false, code: "INSTANT_SERVICE_PRICE_INVALID", message: `Harga ${service.name} belum valid.` };
    }
    const chargedQuantity = calculationBasis === "per_order" || (rule?.flatPrice !== null && rule?.flatPrice !== undefined) ? 1 : quantity;
    const total = unitPrice * chargedQuantity;
    serviceTotal += total;
    snapshots.push({
      serviceId: service.id,
      serviceCode: service.code,
      serviceName: service.name,
      pricingType: service.pricingType,
      calculationBasis,
      sourceRuleId: rule?.id ?? `service:${service.id}`,
      unitPrice,
      chargedQuantity,
      total,
      inputs: { ...selection.inputs },
      uploadIds: [...selection.uploadIds],
      ...(selection.note ? { note: selection.note } : {}),
      definitionVersion: service.updatedAt
    });
  }

  return { ok: true, snapshots, serviceTotal };
}

export function createInstantCustomSnapshot(
  selections: readonly InstantServiceSelection[],
  pricing: Extract<InstantServicePricingResult, { ok: true }>,
  pricedAt = new Date().toISOString()
): InstantCustomSnapshot {
  return Object.freeze({
    version: 1 as const,
    requiresService: true as const,
    selections: selections.map((selection) => ({
      ...selection,
      inputs: { ...selection.inputs },
      uploadIds: [...selection.uploadIds]
    })),
    pricing: pricing.snapshots.map((snapshot) => Object.freeze({
      ...snapshot,
      inputs: Object.freeze({ ...snapshot.inputs }),
      uploadIds: Object.freeze([...snapshot.uploadIds])
    })),
    serviceTotal: pricing.serviceTotal,
    pricedAt
  });
}
