import type {
  ProductImageRole,
  ProductLifecycle,
  ProductManagerCapabilities,
  ProductVariantStatus
} from "@/lib/product-manager";
import { PRODUCT_IMAGE_ROLES } from "@/lib/product-manager";
import type { ProductColorSwatchValue } from "@/lib/product-variants";

export const PRODUCT_MEDIA_SAVE_STATES = [
  "clean",
  "dirty",
  "saving",
  "saved",
  "conflict",
  "error"
] as const;

export type ProductMediaSaveState =
  (typeof PRODUCT_MEDIA_SAVE_STATES)[number];

export type ProductMediaVariant = ProductColorSwatchValue & {
  id: string;
  name: string;
  slug: string;
  status: ProductVariantStatus;
  sortOrder: number;
  imageCount: number;
  hasFrontImage: boolean;
  updatedAt: string;
};

export type ProductMediaSlot = {
  id: string | null;
  role: ProductImageRole;
  imageUrl: string | null;
  altText: string;
  objectFit: "cover" | "contain";
  objectPosition: string;
  focalX: number;
  focalY: number;
  focalZoom: number;
  targetRatio: "4:5";
  isCover: boolean;
  sortOrder: number;
  updatedAt: string | null;
};

export type ProductMediaAsset = {
  id: string;
  name: string;
  publicUrl: string;
  altText: string;
  folder: string;
  width: number | null;
  height: number | null;
  updatedAt: string;
};

export type ProductMediaPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  product: {
    id: string;
    name: string;
    sku: string | null;
    status: ProductLifecycle;
  };
  variants: ProductMediaVariant[];
  selectedVariantId: string | null;
  slots: ProductMediaSlot[];
  mediaAssets: ProductMediaAsset[];
  library: {
    included: boolean;
    query: string;
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

export type ProductMediaQuery = {
  variantId: string;
  includeLibrary: boolean;
  q: string;
  page: number;
  pageSize: number;
};

export type ProductMediaSlotDraft = ProductMediaSlot & {
  mediaAssetId: string | null;
};

export type ProductMediaSaveChange = {
  role: ProductImageRole;
  mediaAssetId: string | null;
  imageUrl: string | null;
  altText: string;
  objectFit: "cover" | "contain";
  objectPosition: string;
  focalX: number;
  focalY: number;
  focalZoom: number;
  expectedImageUpdatedAt: string | null;
};

export type ProductMediaMutationResult = {
  ok: true;
  message: string;
  payload: ProductMediaPayload;
};

export function parseProductMediaQuery(
  searchParams: URLSearchParams
): ProductMediaQuery {
  return {
    variantId: safeUuid(searchParams.get("variantId")),
    includeLibrary: searchParams.get("includeLibrary") === "1",
    q: safeProductMediaSearch(searchParams.get("q")),
    page: positiveInteger(searchParams.get("page"), 1),
    pageSize: mediaPageSize(searchParams.get("pageSize"))
  };
}

export function productMediaQueryString(query: ProductMediaQuery) {
  const params = new URLSearchParams();
  if (query.variantId) params.set("variantId", query.variantId);
  if (query.includeLibrary) params.set("includeLibrary", "1");
  if (query.q) params.set("q", query.q);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  return params.toString();
}

export function safeProductMediaSearch(value: string | null | undefined) {
  return String(value || "")
    .replace(/[,().:%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function canManageProductMedia(
  capabilities: ProductManagerCapabilities
) {
  return capabilities.canManageDependencies;
}

export function completeProductMediaSlots(
  slots: ProductMediaSlot[]
): ProductMediaSlotDraft[] {
  const byRole = new Map(slots.map((slot) => [slot.role, slot]));
  return PRODUCT_IMAGE_ROLES.map((role, index) => {
    const slot = byRole.get(role);
    return slot
      ? { ...slot, mediaAssetId: null }
      : {
        id: null,
        role,
        imageUrl: null,
        altText: "",
        objectFit: "cover" as const,
        objectPosition: "center center",
        focalX: 50,
        focalY: 50,
        focalZoom: 1,
        targetRatio: "4:5" as const,
        isCover: role === "front",
        sortOrder: index,
        updatedAt: null,
        mediaAssetId: null
      };
  });
}

export function sameProductMediaDraft(
  left: ProductMediaSlotDraft,
  right: ProductMediaSlotDraft
) {
  return left.role === right.role &&
    nullable(left.imageUrl) === nullable(right.imageUrl) &&
    left.altText.trim() === right.altText.trim() &&
    left.objectFit === right.objectFit &&
    left.objectPosition.trim() === right.objectPosition.trim() &&
    Number(left.focalX) === Number(right.focalX) &&
    Number(left.focalY) === Number(right.focalY) &&
    Number(left.focalZoom) === Number(right.focalZoom);
}

export function changedProductMediaSlots(
  drafts: ProductMediaSlotDraft[],
  baseline: ProductMediaSlotDraft[]
): ProductMediaSaveChange[] {
  const baselineByRole = new Map(
    baseline.map((slot) => [slot.role, slot])
  );
  return drafts.flatMap((slot) => {
    const previous = baselineByRole.get(slot.role);
    if (previous && sameProductMediaDraft(slot, previous)) return [];
    return [{
      role: slot.role,
      mediaAssetId: slot.mediaAssetId,
      imageUrl: nullable(slot.imageUrl),
      altText: slot.altText.trim(),
      objectFit: slot.objectFit,
      objectPosition: slot.objectPosition.trim() || "center center",
      focalX: clampNumber(slot.focalX, 0, 100, 50),
      focalY: clampNumber(slot.focalY, 0, 100, 50),
      focalZoom: clampNumber(slot.focalZoom, 1, 3, 1),
      expectedImageUpdatedAt: previous?.updatedAt || null
    }];
  });
}

export function productMediaCompleteness(slots: ProductMediaSlotDraft[]) {
  const complete = slots.filter((slot) => Boolean(slot.imageUrl)).length;
  const frontReady = Boolean(
    slots.find((slot) => slot.role === "front")?.imageUrl
  );
  return { complete, frontReady };
}

export function productMediaRoleLabel(role: ProductImageRole) {
  if (role === "front") return "Front";
  if (role === "back") return "Back";
  if (role === "detail") return "Detail";
  return "Lifestyle";
}

export function productMediaRoleDescription(role: ProductImageRole) {
  if (role === "front") return "Wajib untuk Publish per warna aktif.";
  if (role === "back") return "Tampak belakang, disarankan.";
  if (role === "detail") return "Kerah, jahitan, atau tekstur, disarankan.";
  return "Tampak samping atau penggunaan, disarankan.";
}

function safeUuid(value: string | null) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : "";
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function mediaPageSize(value: string | null) {
  return Number(value) === 48 ? 48 : 24;
}

function nullable(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function clampNumber(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number
) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}
