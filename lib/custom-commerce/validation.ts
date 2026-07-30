import type { CustomerUploadRef } from "@/lib/types";
import type {
  CustomCheckoutProject,
  CustomDesignPackage,
  CustomDesignService,
  CustomPersonalization,
  CustomProject,
  CustomProjectItem,
  CustomVariantAllocation
} from "@/lib/custom-commerce/types";
import { isCompleteCustomDesignPair } from "@/lib/custom-commerce/design-pairs";
import { z } from "zod";

export const MAX_CUSTOM_PROJECTS = 5;
export const MAX_CUSTOM_PROJECT_ITEMS = 12;
export const MAX_CUSTOM_ALLOCATIONS = 60;
export const MAX_CUSTOM_DESIGN_PACKAGES = 20;
export const MAX_CUSTOM_SERVICES_PER_PACKAGE = 8;
export const MAX_CUSTOM_TOTAL_QUANTITY = 2000;
export const MAX_CUSTOM_UPLOADS = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_ID = /^[a-zA-Z0-9_-]{8,100}$/;
const SESSION_TOKEN = /^[a-zA-Z0-9_-]{32,160}$/;

const customDesignServiceDraftSchema = z.object({
  id: z.string().trim().regex(LOCAL_ID),
  serviceId: z.string().trim().regex(UUID),
  placementId: z.string().trim().regex(UUID).nullable(),
  printSizeId: z.string().trim().regex(UUID).nullable(),
  note: z.string().transform((value) => cleanText(value, 1000)),
  uploadIds: z.array(z.string().trim().regex(UUID)).max(MAX_CUSTOM_UPLOADS)
});

export const customDesignServiceCanonicalSchema = customDesignServiceDraftSchema.superRefine((value, context) => {
  if (!isCompleteCustomDesignPair(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Posisi Desain dan Size Desain harus dipilih sebagai satu pasangan."
    });
  }
});

export function parseCustomCheckoutProjects(value: unknown): CustomCheckoutProject[] | null {
  if (!Array.isArray(value) || value.length > MAX_CUSTOM_PROJECTS) return null;

  const projects: CustomCheckoutProject[] = [];
  const projectIds = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const project = parseCustomProject(candidate.project);
    if (!project || projectIds.has(project.id)) return null;
    projectIds.add(project.id);
    projects.push({ project });
  }
  return projects;
}

export function customCheckoutDesignPairIssue(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const project = parseCustomProjectDraft(candidate.project);
    if (!project) return null;
    const issue = canonicalCustomDesignPairIssues(project)[0];
    if (issue) return issue;
  }
  return null;
}

export function parseCustomProject(value: unknown): CustomProject | null {
  return parseCustomProjectInternal(value, true);
}

export function parseCustomProjectDraft(value: unknown): CustomProject | null {
  return parseCustomProjectInternal(value, false);
}

export function canonicalCustomDesignPairIssues(project: CustomProject): string[] {
  const issues: string[] = [];
  const selectionIds = new Set<string>();
  let completePairCount = 0;
  for (const item of project.items) {
    const placementIds = new Set<string>();
    for (const selection of item.designPackages.flatMap((designPackage) => designPackage.services)) {
      if (selectionIds.has(selection.id)) {
        issues.push(`Identitas pasangan desain ${selection.id} terduplikasi dalam Custom Project.`);
      }
      selectionIds.add(selection.id);
      if (!isCompleteCustomDesignPair(selection)) {
        issues.push(`Posisi Desain dan Size Desain pada ${item.productName} belum lengkap.`);
        continue;
      }
      completePairCount += 1;
      if (placementIds.has(selection.placementId)) {
        issues.push(`Posisi Desain pada ${item.productName} terduplikasi.`);
      }
      placementIds.add(selection.placementId);
    }
  }
  if (completePairCount === 0) {
    issues.push("Pilih minimal satu Posisi Desain dan Size Desain.");
  }
  return Array.from(new Set(issues));
}

function parseCustomProjectInternal(value: unknown, canonical: boolean): CustomProject | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.items)) return null;
  const id = localId(value.id);
  const categoryId = uuid(value.categoryId);
  const categoryName = text(value.categoryName, 120);
  const categorySlug = slug(value.categorySlug);
  const sessionToken = rawText(value.sessionToken);
  const mode = value.mode;
  const presetId = value.presetId === null ? null : uuid(value.presetId);
  const createdAt = isoDate(value.createdAt);
  const updatedAt = isoDate(value.updatedAt);
  if (
    !id || !categoryId || !categoryName || !categorySlug || !SESSION_TOKEN.test(sessionToken)
    || (mode !== "preset" && mode !== "free") || (mode === "preset" && !presetId)
    || !createdAt || !updatedAt || value.items.length < 1 || value.items.length > MAX_CUSTOM_PROJECT_ITEMS
  ) return null;

  const items: CustomProjectItem[] = [];
  const itemIds = new Set<string>();
  const selectionIds = new Set<string>();
  let allocationCount = 0;
  let uploadCount = 0;
  let totalQuantity = 0;
  for (const candidate of value.items) {
    const item = parseProjectItem(candidate, canonical);
    if (!item || itemIds.has(item.id)) return null;
    itemIds.add(item.id);
    for (const selection of item.designPackages.flatMap((designPackage) => designPackage.services)) {
      if (selectionIds.has(selection.id)) return null;
      selectionIds.add(selection.id);
    }
    allocationCount += item.allocations.length;
    uploadCount += item.uploads.length;
    totalQuantity += item.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
    if (
      allocationCount > MAX_CUSTOM_ALLOCATIONS
      || uploadCount > MAX_CUSTOM_UPLOADS
      || totalQuantity > MAX_CUSTOM_TOTAL_QUANTITY
    ) return null;
    items.push(item);
  }

  const project: CustomProject = {
    version: 1,
    id,
    mode,
    presetId,
    categoryId,
    categoryName,
    categorySlug,
    sessionToken,
    items,
    note: text(value.note, 2000),
    createdAt,
    updatedAt
  };
  if (canonical && canonicalCustomDesignPairIssues(project).length > 0) return null;
  return project;
}

function parseProjectItem(value: unknown, canonical: boolean): CustomProjectItem | null {
  if (!isRecord(value) || !Array.isArray(value.allocations) || !Array.isArray(value.designPackages) || !Array.isArray(value.uploads)) return null;
  const id = localId(value.id);
  const categoryId = uuid(value.categoryId);
  const categoryName = text(value.categoryName, 120);
  const categorySlug = slug(value.categorySlug);
  const productId = uuid(value.productId);
  const productName = text(value.productName, 160);
  const productSlug = slug(value.productSlug);
  const leadTime = text(value.leadTime, 200);
  if (!id || !categoryId || !categoryName || !categorySlug || !productId || !productName || !productSlug || !leadTime) return null;
  if (value.allocations.length < 1 || value.allocations.length > MAX_CUSTOM_ALLOCATIONS || value.designPackages.length > MAX_CUSTOM_DESIGN_PACKAGES || value.uploads.length > MAX_CUSTOM_UPLOADS) return null;

  const allocations: CustomVariantAllocation[] = [];
  const allocationIds = new Set<string>();
  for (const candidate of value.allocations) {
    const allocation = parseAllocation(candidate);
    if (!allocation || allocationIds.has(allocation.id)) return null;
    allocationIds.add(allocation.id);
    allocations.push(allocation);
  }

  const designPackages: CustomDesignPackage[] = [];
  const designPackageIds = new Set<string>();
  const selectionIds = new Set<string>();
  const placementIds = new Set<string>();
  for (const candidate of value.designPackages) {
    const designPackage = parseDesignPackage(candidate, canonical);
    if (!designPackage || designPackageIds.has(designPackage.id)) return null;
    designPackageIds.add(designPackage.id);
    for (const selection of designPackage.services) {
      if (selectionIds.has(selection.id)) return null;
      selectionIds.add(selection.id);
      if (canonical && selection.placementId) {
        if (placementIds.has(selection.placementId)) return null;
        placementIds.add(selection.placementId);
      }
    }
    designPackages.push(designPackage);
  }
  if (allocations.some((allocation) => allocation.designPackageId && !designPackageIds.has(allocation.designPackageId))) return null;

  const personalization = parsePersonalization(value.personalization);
  const uploads = value.uploads.map(parseUpload);
  if (!personalization || uploads.some((upload) => !upload)) return null;

  return {
    id,
    categoryId,
    categoryName,
    categorySlug,
    productId,
    productName,
    productSlug,
    allocations,
    designPackages,
    personalization,
    uploads: uploads as CustomerUploadRef[],
    note: text(value.note, 2000),
    leadTime
  };
}

function parseAllocation(value: unknown): CustomVariantAllocation | null {
  if (!isRecord(value)) return null;
  const id = localId(value.id);
  const variantId = uuid(value.variantId);
  const variantSizeId = uuid(value.variantSizeId);
  const quantity = integer(value.quantity, 1, 1000);
  const designPackageId = value.designPackageId === null ? null : localId(value.designPackageId);
  if (!id || !variantId || !variantSizeId || !quantity || (value.designPackageId !== null && !designPackageId)) return null;
  return {
    id,
    variantId,
    variantSizeId,
    variantName: text(value.variantName, 120),
    colorHex: /^#[0-9a-f]{6}$/i.test(rawText(value.colorHex)) ? rawText(value.colorHex) : "",
    sizeName: text(value.sizeName, 80),
    sku: text(value.sku, 120),
    quantity,
    designPackageId
  };
}

function parseDesignPackage(value: unknown, canonical: boolean): CustomDesignPackage | null {
  if (!isRecord(value) || !Array.isArray(value.services) || value.services.length > MAX_CUSTOM_SERVICES_PER_PACKAGE) return null;
  const id = localId(value.id);
  const name = text(value.name, 120);
  if (!id || !name) return null;
  const services: CustomDesignService[] = [];
  const serviceSelectionIds = new Set<string>();
  for (const candidate of value.services) {
    const service = parseDesignService(candidate, canonical);
    if (!service || serviceSelectionIds.has(service.id)) return null;
    serviceSelectionIds.add(service.id);
    services.push(service);
  }
  return { id, name, services };
}

function parseDesignService(value: unknown, canonical: boolean): CustomDesignService | null {
  const parsed = (canonical ? customDesignServiceCanonicalSchema : customDesignServiceDraftSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parsePersonalization(value: unknown): CustomPersonalization | null {
  if (!isRecord(value) || !Array.isArray(value.entries) || value.entries.length > MAX_CUSTOM_TOTAL_QUANTITY) return null;
  const ruleId = value.ruleId === null ? null : uuid(value.ruleId);
  const mode = value.mode;
  const entries = value.entries.map((entry) => text(entry, 120));
  if ((value.ruleId !== null && !ruleId) || (mode !== "same_for_all" && mode !== "per_item")) return null;
  return { ruleId, mode, sharedValue: text(value.sharedValue, 120), entries };
}

function parseUpload(value: unknown): CustomerUploadRef | null {
  if (!isRecord(value)) return null;
  const id = uuid(value.id);
  const status = value.status;
  const fileSize = integer(value.file_size, 1, 20 * 1024 * 1024);
  if (!id || !fileSize || (status !== "uploaded" && status !== "linked")) return null;
  return {
    id,
    file_name: text(value.file_name, 180),
    storage_path: text(value.storage_path, 500),
    mime_type: text(value.mime_type, 120),
    file_size: fileSize,
    status,
    design_version: integer(value.design_version, 1, 10000) ?? 1,
    design_stage: value.design_stage === "revised_upload" || value.design_stage === "approved_design" || value.design_stage === "final_production_file" || value.design_stage === "revision_requested" ? value.design_stage : "customer_upload",
    replaces_upload_id: value.replaces_upload_id === null || value.replaces_upload_id === undefined ? null : uuid(value.replaces_upload_id),
    version_note: text(value.version_note, 500) || null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanText(value: string, maxLength: number) {
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength);
}

function text(value: unknown, maxLength: number) {
  return cleanText(rawText(value), maxLength);
}

function uuid(value: unknown) {
  const candidate = rawText(value);
  return UUID.test(candidate) ? candidate : null;
}

function localId(value: unknown) {
  const candidate = rawText(value);
  return LOCAL_ID.test(candidate) ? candidate : null;
}

function slug(value: unknown) {
  const candidate = rawText(value);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate) && candidate.length <= 120 ? candidate : null;
}

function integer(value: unknown, minimum: number, maximum: number) {
  const candidate = Number(value);
  return Number.isSafeInteger(candidate) && candidate >= minimum && candidate <= maximum ? candidate : null;
}

function isoDate(value: unknown) {
  const candidate = rawText(value);
  const timestamp = Date.parse(candidate);
  return candidate.length <= 40 && Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
