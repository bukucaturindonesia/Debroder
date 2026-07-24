import "server-only";

import {
  CONTRACT_VERSIONS,
  type ConfiguredAllocation,
  type ConfiguredProductDraft,
  type ConfiguredSelection,
  type ConfiguredServiceSelection
} from "@/lib/contracts";
import type { ResolveConfiguredProductInput } from "@/lib/configured-product/runtime";

const MAX_ARRAY_ITEMS = 500;

export function parseJerseyResolveRequest(
  value: unknown
): ResolveConfiguredProductInput | null {
  if (!isRecord(value) || hasUnknownKeys(value, [
    "productId",
    "draft",
    "requestId",
    "snapshotId",
    "requestedAt"
  ])) return null;
  if (
    !isString(value.productId)
    || !isString(value.requestId)
    || !isString(value.snapshotId)
    || !isIsoDate(value.requestedAt)
  ) return null;
  const draft = parseDraft(value.draft);
  if (!draft) return null;
  return {
    productId: value.productId,
    draft,
    requestId: value.requestId,
    snapshotId: value.snapshotId,
    requestedAt: value.requestedAt
  };
}

function parseDraft(value: unknown): ConfiguredProductDraft | null {
  if (!isRecord(value) || hasUnknownKeys(value, [
    "contractVersion",
    "id",
    "definitionId",
    "definitionVersion",
    "quantity",
    "selections",
    "allocations",
    "services",
    "uploads",
    "note",
    "createdAt",
    "updatedAt"
  ])) return null;
  if (
    value.contractVersion !== CONTRACT_VERSIONS.configuredProduct
    || !isString(value.id)
    || !isString(value.definitionId)
    || !isString(value.definitionVersion)
    || !isPositiveInteger(value.quantity)
    || !isIsoDate(value.createdAt)
    || !isIsoDate(value.updatedAt)
    || (value.note !== undefined && typeof value.note !== "string")
  ) return null;

  const selections = parseArray(value.selections, parseSelection);
  const allocations = parseArray(value.allocations, parseAllocation);
  const services = parseArray(value.services, parseService);
  if (
    !selections
    || !allocations
    || !services
    || !Array.isArray(value.uploads)
    || value.uploads.length !== 0
  ) return null;
  return {
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    id: value.id,
    definitionId: value.definitionId,
    definitionVersion: value.definitionVersion,
    quantity: value.quantity,
    selections,
    allocations,
    services,
    uploads: [],
    ...(typeof value.note === "string" ? { note: value.note } : {}),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

function parseSelection(value: unknown): ConfiguredSelection | null {
  if (!isRecord(value) || hasUnknownKeys(value, [
    "groupId",
    "optionIds",
    "textValue",
    "numberValue",
    "booleanValue"
  ])) return null;
  if (
    !isString(value.groupId)
    || !isStringArray(value.optionIds)
    || (value.textValue !== undefined && typeof value.textValue !== "string")
    || (value.numberValue !== undefined && typeof value.numberValue !== "number")
    || (value.booleanValue !== undefined && typeof value.booleanValue !== "boolean")
  ) return null;
  return {
    groupId: value.groupId,
    optionIds: value.optionIds,
    ...(typeof value.textValue === "string" ? { textValue: value.textValue } : {}),
    ...(typeof value.numberValue === "number" ? { numberValue: value.numberValue } : {}),
    ...(typeof value.booleanValue === "boolean" ? { booleanValue: value.booleanValue } : {})
  };
}

function parseAllocation(value: unknown): ConfiguredAllocation | null {
  if (!isRecord(value) || hasUnknownKeys(value, ["id", "dimensions", "quantity"])) {
    return null;
  }
  if (
    !isString(value.id)
    || !isPositiveInteger(value.quantity)
    || !isRecord(value.dimensions)
  ) return null;
  const dimensions: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value.dimensions)) {
    if (!isString(key) || !isString(entry)) return null;
    dimensions[key] = entry;
  }
  return { id: value.id, dimensions, quantity: value.quantity };
}

function parseService(value: unknown): ConfiguredServiceSelection | null {
  if (!isRecord(value) || hasUnknownKeys(value, [
    "requirementId",
    "serviceCode",
    "quantity",
    "note"
  ])) return null;
  if (
    !isString(value.requirementId)
    || !isString(value.serviceCode)
    || !isPositiveInteger(value.quantity)
    || (value.note !== undefined && typeof value.note !== "string")
  ) return null;
  return {
    requirementId: value.requirementId,
    serviceCode: value.serviceCode,
    quantity: value.quantity,
    ...(typeof value.note === "string" ? { note: value.note } : {})
  };
}

function parseArray<T>(
  value: unknown,
  parser: (entry: unknown) => T | null
): readonly T[] | null {
  if (!Array.isArray(value) || value.length > MAX_ARRAY_ITEMS) return null;
  const parsed = value.map(parser);
  return parsed.every((entry): entry is T => entry !== null) ? parsed : null;
}

function hasUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[]
) {
  const allowedSet = new Set(allowed);
  return Object.keys(value).some((key) => !allowedSet.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= MAX_ARRAY_ITEMS
    && value.every(isString);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isIsoDate(value: unknown): value is string {
  return isString(value) && Number.isFinite(Date.parse(value));
}
