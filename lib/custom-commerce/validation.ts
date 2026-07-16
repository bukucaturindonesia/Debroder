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

export function parseCustomProject(value: unknown): CustomProject | null {
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
  let allocationCount = 0;
  let uploadCount = 0;
  let totalQuantity = 0;
  for (const candidate of value.items) {
    const item = parseProjectItem(candidate);
    if (!item || itemIds.has(item.id)) return null;
    itemIds.add(item.id);
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

  return {
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
}

function parseProjectItem(value: unknown): CustomProjectItem | null {
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
  for (const candidate of value.designPackages) {
    const designPackage = parseDesignPackage(candidate);
    if (!designPackage || designPackageIds.has(designPackage.id)) return null;
    designPackageIds.add(designPackage.id);
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

function parseDesignPackage(value: unknown): CustomDesignPackage | null {
  if (!isRecord(value) || !Array.isArray(value.services) || value.services.length > MAX_CUSTOM_SERVICES_PER_PACKAGE) return null;
  const id = localId(value.id);
  const name = text(value.name, 120);
  if (!id || !name) return null;
  const services: CustomDesignService[] = [];
  const serviceIds = new Set<string>();
  for (const candidate of value.services) {
    const service = parseDesignService(candidate);
    if (!service || serviceIds.has(service.id)) return null;
    serviceIds.add(service.id);
    services.push(service);
  }
  return { id, name, services };
}

function parseDesignService(value: unknown): CustomDesignService | null {
  if (!isRecord(value) || !Array.isArray(value.uploadIds) || value.uploadIds.length > MAX_CUSTOM_UPLOADS) return null;
  const id = localId(value.id);
  const serviceId = uuid(value.serviceId);
  const placementId = value.placementId === null ? null : uuid(value.placementId);
  const printSizeId = value.printSizeId === null ? null : uuid(value.printSizeId);
  const uploadIds = value.uploadIds.map(uuid);
  if (!id || !serviceId || (value.placementId !== null && !placementId) || (value.printSizeId !== null && !printSizeId) || uploadIds.some((candidate) => !candidate)) return null;
  return { id, serviceId, placementId, printSizeId, note: text(value.note, 1000), uploadIds: uploadIds as string[] };
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
    status
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function text(value: unknown, maxLength: number) {
  return rawText(value).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength);
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
