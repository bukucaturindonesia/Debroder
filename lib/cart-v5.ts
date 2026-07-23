import type {
  CartLine,
  CartLineDisplaySnapshot,
  CartLineValidationState,
  ConfiguredProductCartLine,
  ConfiguredProductSnapshot,
  ContractWarning,
  CustomProjectCartLine,
  LegacyUnsupportedCartLine,
  ReadyStockCartLine
} from "@/lib/contracts";
import { CONTRACT_VERSIONS } from "@/lib/contracts";
import {
  readLegacyCartStorage,
  type LegacyCartStorageVersion
} from "@/lib/compatibility/cart";
import { parseCustomProject } from "@/lib/custom-commerce/validation";
import type {
  CustomPriceStatus,
  CustomPricingLine,
  CustomProjectPricing,
  CustomProjectSnapshot
} from "@/lib/custom-commerce/types";

export const CART_V5_STORAGE_KEY = "debroder-cart-v5";
export const CART_V5_VERSION = 5 as const;
export const MAX_CART_LINES = 50;
export const MAX_CART_LINE_QUANTITY = 100;
export const MAX_CART_TOTAL_QUANTITY = 500;

export const LEGACY_CART_STORAGE_KEYS = [
  { key: "debroder-cart-v4", version: "v4" },
  { key: "debroder-cart-v3", version: "v3" },
  { key: "debroder-cart-v2", version: "v2" },
  { key: "debroder-cart-v1", version: "v1" },
  { key: "debroder_cart_v1", version: "v1" }
] as const satisfies readonly {
  key: string;
  version: LegacyCartStorageVersion;
}[];

export type CartItemRole = "primary" | "additional";

export type CartItemUiSnapshot = {
  role: CartItemRole;
  name: string;
  category?: string;
  priceLabel?: string;
  priceValue?: number;
  href?: string;
  imageUrl?: string;
  imageAlt?: string;
  color: string;
  colorHex?: string;
  size: string;
  variantName?: string;
  stockLabel?: string;
  stockAvailable?: number;
  variantSnapshot?: Record<string, unknown>;
  customProject?: CustomProjectSnapshot;
};

export type CartItem = CartLine & CartItemUiSnapshot;

export type PersistedCartV5 = {
  version: typeof CART_V5_VERSION;
  contractVersion: typeof CONTRACT_VERSIONS.cartLine;
  lines: readonly CartItem[];
  updatedAt: string;
};

export type CartV5Issue = ContractWarning & {
  lineId?: string;
};

export type CartRestoreResult = {
  cart: PersistedCartV5;
  issues: readonly CartV5Issue[];
  migratedFrom: LegacyCartStorageVersion | null;
};

export type CartLimitResult =
  | { ok: true }
  | { ok: false; issue: CartV5Issue };

export type CartCheckoutDecision =
  | {
      allowed: true;
      mode: "ready_stock" | "configured_product" | "custom_project";
    }
  | {
      allowed: false;
      code:
        | "CART_EMPTY"
        | "CART_LEGACY_UNSUPPORTED"
        | "CART_MIXED_CHECKOUT_MODE"
        | "CART_REVALIDATION_REQUIRED";
      message: string;
    };

export type ReadyStockRevalidationResult = {
  product_variant_size_id: string;
  status:
    | "ok"
    | "unavailable"
    | "stock_changed"
    | "price_changed"
    | "quotation_required";
  error_code: string | null;
  latest_unit_price: number | null;
  stock_available: number;
  message: string | null;
};

export type AppliedRevalidation = {
  lines: CartItem[];
  issues: CartV5Issue[];
  readyStockValid: boolean;
};

const RESTORE_STALE_WARNING: ContractWarning = {
  code: "CART_REVALIDATION_REQUIRED",
  message: "Harga dan stok perlu divalidasi ulang sebelum checkout."
};

export function createEmptyCartV5(updatedAt = new Date().toISOString()): PersistedCartV5 {
  return {
    version: CART_V5_VERSION,
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lines: [],
    updatedAt
  };
}

export function serializeCartV5(
  lines: readonly CartItem[],
  updatedAt = new Date().toISOString()
): string {
  return JSON.stringify({
    version: CART_V5_VERSION,
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lines,
    updatedAt
  } satisfies PersistedCartV5);
}

export function restoreCartV5(
  rawV5: string | null,
  legacySources: readonly {
    version: LegacyCartStorageVersion;
    raw: string | null;
  }[],
  now = new Date().toISOString()
): CartRestoreResult {
  if (rawV5) {
    const restored = readPersistedCartV5(rawV5, now);
    if (restored) return restored;
  }

  const issues: CartV5Issue[] = rawV5
    ? [{
        code: "CART_V5_INVALID_STORAGE",
        message: "Data Cart v5 rusak dan tidak dipakai."
      }]
    : [];

  for (const source of legacySources) {
    if (!source.raw) continue;
    const migrated = migrateLegacyCart(source.raw, source.version, now);
    return {
      cart: migrated.cart,
      issues: [...issues, ...migrated.issues],
      migratedFrom: source.version
    };
  }

  return { cart: createEmptyCartV5(now), issues, migratedFrom: null };
}

export function readPersistedCartV5(
  raw: string,
  now = new Date().toISOString()
): CartRestoreResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (
    parsed.version !== CART_V5_VERSION
    || parsed.contractVersion !== CONTRACT_VERSIONS.cartLine
    || !Array.isArray(parsed.lines)
  ) {
    return null;
  }

  const issues: CartV5Issue[] = [];
  const lines = parsed.lines.map((value, index) => {
    if (isCartItem(value)) return staleReadyStockLine(value);
    issues.push({
      code: "CART_V5_UNSUPPORTED_LINE",
      message: `Baris cart tersimpan ke-${index + 1} tidak dapat dibaca dengan aman.`
    });
    return unsupportedFromRaw(
      isRecord(value) ? value : {},
      "v5",
      "cart_v5.invalid_line",
      `legacy:v5:${index}`,
      1
    );
  });

  const limit = validateCartLimits(lines);
  if (!limit.ok) {
    return {
      cart: {
        ...createEmptyCartV5(now),
        lines: [
          unsupportedFromRaw(
            { storedLines: parsed.lines },
            "v5",
            "cart_v5.persisted_limits_exceeded",
            "legacy:v5:cart",
            1
          )
        ]
      },
      issues: [...issues, limit.issue],
      migratedFrom: null
    };
  }

  return {
    cart: {
      version: CART_V5_VERSION,
      contractVersion: CONTRACT_VERSIONS.cartLine,
      lines: ensureCartRoles(lines),
      updatedAt: isIsoDate(parsed.updatedAt) ? parsed.updatedAt : now
    },
    issues,
    migratedFrom: null
  };
}

export function migrateLegacyCart(
  raw: string,
  storageVersion: LegacyCartStorageVersion,
  now = new Date().toISOString()
): CartRestoreResult {
  const legacyRoot = unwrapLegacyRoot(raw);
  const result = readLegacyCartStorage(legacyRoot, storageVersion);
  const issues: CartV5Issue[] = [];

  if (result.storageIssue) {
    issues.push({
      code: `CART_LEGACY_${result.storageIssue.toUpperCase()}`,
      message: "Cart lama tidak dapat dibaca dan tidak dikonversi."
    });
    return {
      cart: createEmptyCartV5(now),
      issues,
      migratedFrom: storageVersion
    };
  }

  if (Array.isArray(legacyRoot)) {
    const legacyLimit = validateRawLegacyLimits(legacyRoot);
    if (!legacyLimit.ok) {
      return {
        cart: {
          ...createEmptyCartV5(now),
          lines: [
            unsupportedFromRaw(
              { storedLines: legacyRoot },
              storageVersion,
              legacyLimit.issue.code,
              `legacy:${storageVersion}:cart`,
              1
            )
          ]
        },
        issues: [legacyLimit.issue],
        migratedFrom: storageVersion
      };
    }
  }

  const lines = result.entries.map((entry) => {
    if (entry.classification === "legacy_unsupported") {
      const rawLine = entry.rawLine;
      const reasonCode = entry.reasonCode;
      issues.push({
        code: reasonCode,
        message: "Data cart lama dipertahankan sebagai item yang tidak dapat checkout.",
        ...(entry.sourceLineId ? { lineId: entry.sourceLineId } : {})
      });
      return unsupportedFromRaw(
        rawLine,
        storageVersion,
        reasonCode,
        entry.sourceLineId ?? `legacy:${storageVersion}:${entry.sourceIndex}`,
        readBoundedQuantity(rawLine.quantity)
      );
    }

    const rawValue = Array.isArray(legacyRoot)
      ? legacyRoot[entry.sourceIndex]
      : null;
    const rawLine = isRecord(rawValue) ? rawValue : {};
    if (entry.line.lineType === "ready_stock") {
      return legacyReadyStockItem(entry.line, rawLine);
    }

    if (entry.line.lineType === "custom_project") {
      const customProject = readCustomProjectSnapshot(rawLine.customProject);
      if (customProject) {
        return legacyCustomProjectItem(entry.line, rawLine, customProject);
      }
      const reasonCode = "legacy_cart.incomplete_custom_project_snapshot";
      issues.push({
        code: reasonCode,
        message: "Snapshot Custom Project lama tidak lengkap dan tidak boleh ditebak.",
        lineId: entry.line.lineId
      });
      return unsupportedFromRaw(
        rawLine,
        storageVersion,
        reasonCode,
        entry.line.lineId,
        readBoundedQuantity(rawLine.quantity)
      );
    }

    return unsupportedFromRaw(
      rawLine,
      storageVersion,
      "legacy_cart.unsupported_discriminant",
      entry.line.lineId,
      readBoundedQuantity(rawLine.quantity)
    );
  });

  return {
    cart: {
      version: CART_V5_VERSION,
      contractVersion: CONTRACT_VERSIONS.cartLine,
      lines: ensureCartRoles(lines),
      updatedAt: now
    },
    issues,
    migratedFrom: storageVersion
  };
}

export function validateCartLimits(lines: readonly Pick<CartItem, "lineId" | "quantity">[]): CartLimitResult {
  if (lines.length > MAX_CART_LINES) {
    return {
      ok: false,
      issue: {
        code: "CART_MAX_LINES_EXCEEDED",
        message: `Keranjang maksimal ${MAX_CART_LINES} baris.`
      }
    };
  }

  let total = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      return {
        ok: false,
        issue: {
          code: "CART_INVALID_QUANTITY",
          message: "Jumlah item harus berupa bilangan bulat minimal 1.",
          lineId: line.lineId
        }
      };
    }
    if (line.quantity > MAX_CART_LINE_QUANTITY) {
      return {
        ok: false,
        issue: {
          code: "CART_MAX_LINE_QUANTITY_EXCEEDED",
          message: `Maksimal ${MAX_CART_LINE_QUANTITY} unit per baris.`,
          lineId: line.lineId
        }
      };
    }
    total += line.quantity;
    if (total > MAX_CART_TOTAL_QUANTITY) {
      return {
        ok: false,
        issue: {
          code: "CART_MAX_TOTAL_QUANTITY_EXCEEDED",
          message: `Total keranjang maksimal ${MAX_CART_TOTAL_QUANTITY} unit.`
        }
      };
    }
  }
  return { ok: true };
}

export function getCartCheckoutDecision(lines: readonly CartItem[]): CartCheckoutDecision {
  if (lines.length === 0) {
    return {
      allowed: false,
      code: "CART_EMPTY",
      message: "Keranjang masih kosong."
    };
  }

  if (lines.some((line) => line.lineType === "legacy_unsupported")) {
    return {
      allowed: false,
      code: "CART_LEGACY_UNSUPPORTED",
      message: "Ada item lama yang tidak dapat dikonversi dengan aman."
    };
  }

  const modes = new Set(lines.map((line) => line.lineType));
  if (modes.size !== 1) {
    return {
      allowed: false,
      code: "CART_MIXED_CHECKOUT_MODE",
      message: "Setiap checkout hanya boleh memuat satu mode pesanan."
    };
  }

  const mode = lines[0].lineType;
  if (mode === "legacy_unsupported") {
    return {
      allowed: false,
      code: "CART_LEGACY_UNSUPPORTED",
      message: "Ada item lama yang tidak dapat dikonversi dengan aman."
    };
  }
  if (mode === "ready_stock" && lines.some((line) => line.validation.status !== "valid")) {
    return {
      allowed: false,
      code: "CART_REVALIDATION_REQUIRED",
      message: "Validasi harga dan stok terbaru diperlukan sebelum checkout."
    };
  }

  return { allowed: true, mode };
}

export function markReadyStockLinesStale(
  lines: readonly CartItem[],
  warning: ContractWarning,
  lastValidatedAt?: string
): CartItem[] {
  return lines.map((line) => {
    if (line.lineType !== "ready_stock") return line;
    const previousValidatedAt = line.validation.status === "valid"
      ? line.validation.validatedAt
      : line.validation.status === "stale"
        ? line.validation.lastValidatedAt
        : lastValidatedAt;
    return {
      ...line,
      validation: {
        status: "stale",
        ...(previousValidatedAt ? { lastValidatedAt: previousValidatedAt } : {}),
        retryable: true,
        warning
      }
    };
  });
}

export function applyReadyStockRevalidation(
  lines: readonly CartItem[],
  results: readonly ReadyStockRevalidationResult[],
  validatedAt = new Date().toISOString()
): AppliedRevalidation {
  const byVariantSize = new Map(
    results.map((result) => [result.product_variant_size_id, result])
  );
  const issues: CartV5Issue[] = [];

  const nextLines: CartItem[] = lines.map((line): CartItem => {
    if (line.lineType !== "ready_stock") return line;
    const result = byVariantSize.get(line.variantSizeId);
    if (!result) {
      const warning = {
        code: "CART_REVALIDATION_RESULT_MISSING",
        message: "Server tidak mengembalikan hasil validasi untuk item ini."
      };
      issues.push({ ...warning, lineId: line.lineId });
      return staleReadyStockLine(line, warning);
    }

    if (result.status === "ok" && result.latest_unit_price !== null) {
      return {
        ...line,
        priceValue: result.latest_unit_price,
        priceLabel: `Rp${result.latest_unit_price.toLocaleString("id-ID")}`,
        stockAvailable: result.stock_available,
        stockLabel: `Stok ${result.stock_available}`,
        validation: { status: "valid", validatedAt }
      };
    }

    const code = result.error_code ?? `CART_${result.status.toUpperCase()}`;
    const message = result.message ?? "Data produk berubah.";
    issues.push({ code, message, lineId: line.lineId });
    return {
      ...line,
      ...(result.latest_unit_price !== null
        ? {
            priceValue: result.latest_unit_price,
            priceLabel: `Rp${result.latest_unit_price.toLocaleString("id-ID")}`
          }
        : {}),
      stockAvailable: Math.max(0, result.stock_available),
      stockLabel: `Stok ${Math.max(0, result.stock_available)}`,
      validation: {
        status: "invalid",
        retryable: result.status === "price_changed" || result.status === "stock_changed",
        code,
        message
      }
    };
  });

  return {
    lines: nextLines,
    issues,
    readyStockValid: nextLines
      .filter((line) => line.lineType === "ready_stock")
      .every((line) => line.validation.status === "valid")
  };
}

export function ensureCartRoles(lines: readonly CartItem[]): CartItem[] {
  let hasPrimary = false;
  return lines.map((line, index) => {
    const role: CartItemRole = !hasPrimary && (line.role === "primary" || index === 0)
      ? "primary"
      : "additional";
    if (role === "primary") hasPrimary = true;
    return { ...line, role };
  });
}

export function createReadyStockCartItem(input: {
  lineId: string;
  quantity: number;
  productId: string;
  variantId: string;
  variantSizeId: string;
  sku: string;
  display: CartLineDisplaySnapshot;
  ui: Omit<CartItemUiSnapshot, "role" | "name" | "color" | "size"> & {
    role?: CartItemRole;
    name?: string;
    color?: string;
    size?: string;
  };
  notes?: string;
}): CartItem {
  const line: ReadyStockCartLine = {
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lineId: input.lineId,
    lineType: "ready_stock",
    quantity: input.quantity,
    display: input.display,
    displayPricing: null,
    validation: { status: "unvalidated" },
    ...(input.notes ? { notes: input.notes } : {}),
    productId: input.productId,
    variantId: input.variantId,
    variantSizeId: input.variantSizeId,
    sku: input.sku
  };
  return {
    ...line,
    ...input.ui,
    role: input.ui.role ?? "additional",
    name: input.ui.name ?? input.display.title,
    color: input.ui.color ?? "",
    size: input.ui.size ?? ""
  };
}

export function createConfiguredProductCartItem(input: {
  lineId: string;
  quantity: number;
  display: CartLineDisplaySnapshot;
  configurationSnapshot: ConfiguredProductSnapshot;
  ui?: Partial<CartItemUiSnapshot>;
  notes?: string;
}): CartItem {
  const snapshot = input.configurationSnapshot;
  const line: ConfiguredProductCartLine = {
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lineId: input.lineId,
    lineType: "configured_product",
    quantity: input.quantity,
    display: input.display,
    displayPricing: snapshot.pricing,
    validation: snapshot.validation.valid
      ? { status: "valid", validatedAt: snapshot.validation.validatedAt }
      : {
          status: "invalid",
          retryable: true,
          code: snapshot.validation.issues[0]?.code ?? "CONFIGURED_PRODUCT_INVALID",
          message: snapshot.validation.issues[0]?.message ?? "Konfigurasi belum valid."
        },
    ...(input.notes ? { notes: input.notes } : {}),
    definitionId: snapshot.definition.id,
    definitionVersion: snapshot.definition.version,
    configurationId: snapshot.draft.id,
    configurationSnapshot: snapshot
  };
  return {
    ...line,
    role: input.ui?.role ?? "additional",
    name: input.ui?.name ?? input.display.title,
    category: input.ui?.category,
    priceLabel: input.ui?.priceLabel,
    priceValue: input.ui?.priceValue,
    href: input.ui?.href,
    imageUrl: input.ui?.imageUrl,
    imageAlt: input.ui?.imageAlt,
    color: input.ui?.color ?? "",
    colorHex: input.ui?.colorHex,
    size: input.ui?.size ?? "",
    variantName: input.ui?.variantName,
    stockLabel: input.ui?.stockLabel,
    stockAvailable: input.ui?.stockAvailable,
    variantSnapshot: input.ui?.variantSnapshot
  };
}

export function createCustomProjectCartItem(input: {
  lineId: string;
  project: CustomProjectSnapshot;
  display: CartLineDisplaySnapshot;
  ui?: Partial<CartItemUiSnapshot>;
}): CartItem {
  const line: CustomProjectCartLine = {
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lineId: input.lineId,
    lineType: "custom_project",
    quantity: input.project.pricing.totalQuantity,
    display: input.display,
    displayPricing: null,
    validation: input.project.pricing.issues.length
      ? {
          status: "invalid",
          retryable: true,
          code: "CUSTOM_PROJECT_PRICING_INVALID",
          message: input.project.pricing.issues[0]
        }
      : { status: "valid", validatedAt: input.project.pricing.pricedAt },
    ...(input.project.note ? { notes: input.project.note } : {}),
    projectId: input.project.id,
    projectVersion: String(input.project.version),
    projectSnapshotReference: input.project.id
  };
  return {
    ...line,
    role: input.ui?.role ?? "additional",
    name: input.ui?.name ?? input.display.title,
    category: input.ui?.category,
    priceLabel: input.ui?.priceLabel,
    priceValue: input.ui?.priceValue,
    href: input.ui?.href,
    imageUrl: input.ui?.imageUrl,
    imageAlt: input.ui?.imageAlt,
    color: input.ui?.color ?? "",
    colorHex: input.ui?.colorHex,
    size: input.ui?.size ?? "",
    variantName: input.ui?.variantName,
    stockLabel: input.ui?.stockLabel,
    stockAvailable: input.ui?.stockAvailable,
    variantSnapshot: input.ui?.variantSnapshot,
    customProject: input.project
  };
}

export function createLegacyUnsupportedCartItem(input: {
  lineId: string;
  quantity?: number;
  legacyStorageVersion: string;
  reasonCode: string;
  rawLine: Readonly<Record<string, unknown>>;
  display: CartLineDisplaySnapshot;
  ui?: Partial<CartItemUiSnapshot>;
}): CartItem {
  return unsupportedFromRaw(
    input.rawLine,
    input.legacyStorageVersion,
    input.reasonCode,
    input.lineId,
    readBoundedQuantity(input.quantity),
    input.display,
    input.ui
  );
}

function readPersistedValidation(value: unknown): value is CartLineValidationState {
  if (!isRecord(value) || typeof value.status !== "string") return false;
  if (value.status === "unvalidated") return true;
  if (value.status === "valid") return isIsoDate(value.validatedAt);
  if (value.status === "stale") {
    return value.retryable === true && isWarning(value.warning)
      && (value.lastValidatedAt === undefined || isIsoDate(value.lastValidatedAt));
  }
  return value.status === "invalid"
    && typeof value.retryable === "boolean"
    && isNonEmptyString(value.code)
    && isNonEmptyString(value.message);
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;
  if (
    value.contractVersion !== CONTRACT_VERSIONS.cartLine
    || !isNonEmptyString(value.lineId)
    || !Number.isSafeInteger(value.quantity)
    || Number(value.quantity) < 1
    || Number(value.quantity) > MAX_CART_LINE_QUANTITY
    || !isRecord(value.display)
    || !isNonEmptyString(value.display.title)
    || !readPersistedValidation(value.validation)
    || (value.role !== "primary" && value.role !== "additional")
    || !isNonEmptyString(value.name)
    || typeof value.color !== "string"
    || typeof value.size !== "string"
  ) {
    return false;
  }

  if (value.lineType === "ready_stock") {
    return isNonEmptyString(value.productId)
      && isNonEmptyString(value.variantId)
      && isNonEmptyString(value.variantSizeId)
      && isNonEmptyString(value.sku);
  }

  if (value.lineType === "configured_product") {
    return isNonEmptyString(value.definitionId)
      && isNonEmptyString(value.definitionVersion)
      && isNonEmptyString(value.configurationId)
      && isConfiguredProductSnapshot(value.configurationSnapshot);
  }

  if (value.lineType === "custom_project") {
    const project = readCustomProjectSnapshot(value.customProject);
    return isNonEmptyString(value.projectId)
      && isNonEmptyString(value.projectVersion)
      && isNonEmptyString(value.projectSnapshotReference)
      && Boolean(project)
      && project?.id === value.projectId;
  }

  return value.lineType === "legacy_unsupported"
    && value.checkoutEligible === false
    && isNonEmptyString(value.legacyStorageVersion)
    && isNonEmptyString(value.reasonCode)
    && isRecord(value.rawLine);
}

function isConfiguredProductSnapshot(value: unknown): value is ConfiguredProductSnapshot {
  if (!isRecord(value) || value.contractVersion !== CONTRACT_VERSIONS.configuredProduct) return false;
  if (
    !isNonEmptyString(value.snapshotId)
    || value.immutable !== true
    || !isIsoDate(value.capturedAt)
    || !isRecord(value.definition)
    || !isRecord(value.draft)
    || !isRecord(value.validation)
  ) {
    return false;
  }
  return value.definition.contractVersion === CONTRACT_VERSIONS.configuredProduct
    && value.draft.contractVersion === CONTRACT_VERSIONS.configuredProduct
    && isNonEmptyString(value.definition.id)
    && isNonEmptyString(value.definition.version)
    && isNonEmptyString(value.draft.id)
    && value.draft.definitionId === value.definition.id
    && value.draft.definitionVersion === value.definition.version
    && typeof value.validation.valid === "boolean"
    && isIsoDate(value.validation.validatedAt);
}

function migrateUiSnapshot(
  record: Readonly<Record<string, unknown>>,
  display: CartLineDisplaySnapshot
): CartItemUiSnapshot {
  return {
    role: record.role === "primary" ? "primary" : "additional",
    name: readString(record.name) ?? display.title,
    ...(readString(record.category) ? { category: readString(record.category) as string } : {}),
    ...(readString(record.priceLabel) ? { priceLabel: readString(record.priceLabel) as string } : {}),
    ...(readNonNegativeInteger(record.priceValue) !== null
      ? { priceValue: readNonNegativeInteger(record.priceValue) as number }
      : {}),
    ...(readString(record.href) ? { href: readString(record.href) as string } : {}),
    ...(readString(record.imageUrl) ? { imageUrl: readString(record.imageUrl) as string } : {}),
    ...(readString(record.imageAlt) ? { imageAlt: readString(record.imageAlt) as string } : {}),
    color: readString(record.color) ?? readString(record.defaultColor) ?? "",
    ...(readString(record.colorHex) || readString(record.defaultColorHex)
      ? { colorHex: (readString(record.colorHex) ?? readString(record.defaultColorHex)) as string }
      : {}),
    size: readString(record.size) ?? readString(record.defaultSize) ?? "",
    ...(readString(record.variantName) ? { variantName: readString(record.variantName) as string } : {}),
    ...(readString(record.stockLabel) ? { stockLabel: readString(record.stockLabel) as string } : {}),
    ...(readNonNegativeInteger(record.stockAvailable) !== null
      ? { stockAvailable: readNonNegativeInteger(record.stockAvailable) as number }
      : {}),
    ...(isRecord(record.variantSnapshot)
      ? { variantSnapshot: { ...record.variantSnapshot } }
      : {})
  };
}

function legacyReadyStockItem(
  line: ReadyStockCartLine,
  rawLine: Readonly<Record<string, unknown>>
): CartItem {
  return {
    ...line,
    validation: { status: "stale", retryable: true, warning: RESTORE_STALE_WARNING },
    ...migrateUiSnapshot(rawLine, line.display)
  };
}

function legacyCustomProjectItem(
  line: CustomProjectCartLine,
  rawLine: Readonly<Record<string, unknown>>,
  customProject: CustomProjectSnapshot
): CartItem {
  return {
    ...line,
    quantity: customProject.pricing.totalQuantity,
    validation: customProject.pricing.issues.length
      ? {
          status: "invalid",
          retryable: true,
          code: "CUSTOM_PROJECT_PRICING_INVALID",
          message: customProject.pricing.issues[0]
        }
      : { status: "valid", validatedAt: customProject.pricing.pricedAt },
    ...migrateUiSnapshot(rawLine, line.display),
    customProject
  };
}

function unsupportedFromRaw(
  rawLine: Readonly<Record<string, unknown>>,
  storageVersion: string,
  reasonCode: string,
  lineId: string,
  quantity: number,
  display = legacyDisplay(rawLine),
  ui?: Partial<CartItemUiSnapshot>
): CartItem {
  const line: LegacyUnsupportedCartLine = {
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lineId,
    lineType: "legacy_unsupported",
    quantity,
    display,
    displayPricing: null,
    validation: {
      status: "invalid",
      retryable: false,
      code: reasonCode,
      message: "Item ini tidak dapat dikonversi dengan aman."
    },
    checkoutEligible: false,
    legacyStorageVersion: storageVersion,
    reasonCode,
    rawLine
  };
  const migratedUi = migrateUiSnapshot(rawLine, display);
  return {
    ...line,
    ...migratedUi,
    ...ui,
    role: ui?.role ?? migratedUi.role,
    name: ui?.name ?? migratedUi.name,
    color: ui?.color ?? migratedUi.color,
    size: ui?.size ?? migratedUi.size
  };
}

function staleReadyStockLine(
  line: CartItem,
  warning = RESTORE_STALE_WARNING
): CartItem {
  if (line.lineType !== "ready_stock") return line;
  const lastValidatedAt = line.validation.status === "valid"
    ? line.validation.validatedAt
    : line.validation.status === "stale"
      ? line.validation.lastValidatedAt
      : undefined;
  return {
    ...line,
    validation: {
      status: "stale",
      ...(lastValidatedAt ? { lastValidatedAt } : {}),
      retryable: true,
      warning
    }
  };
}

function validateRawLegacyLimits(rawLines: readonly unknown[]): CartLimitResult {
  if (rawLines.length > MAX_CART_LINES) {
    return {
      ok: false,
      issue: {
        code: "CART_LEGACY_MAX_LINES_EXCEEDED",
        message: `Cart lama melebihi batas ${MAX_CART_LINES} baris dan dipertahankan sebagai satu issue eksplisit.`
      }
    };
  }
  let total = 0;
  for (const value of rawLines) {
    const record = isRecord(value) ? value : {};
    const quantity = readPositiveInteger(record.quantity);
    if (quantity === null || quantity > MAX_CART_LINE_QUANTITY) {
      return {
        ok: false,
        issue: {
          code: "CART_LEGACY_LINE_QUANTITY_UNSAFE",
          message: "Quantity cart lama tidak dapat dikonversi tanpa mengubah data."
        }
      };
    }
    total += quantity;
    if (total > MAX_CART_TOTAL_QUANTITY) {
      return {
        ok: false,
        issue: {
          code: "CART_LEGACY_TOTAL_QUANTITY_UNSAFE",
          message: "Total quantity cart lama melebihi batas canonical dan tidak diubah diam-diam."
        }
      };
    }
  }
  return { ok: true };
}

function unwrapLegacyRoot(raw: string): unknown {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      isRecord(parsed)
      && parsed.version === 1
      && Array.isArray(parsed.items)
    ) {
      return parsed.items;
    }
    return parsed;
  } catch {
    return raw;
  }
}

function legacyDisplay(record: Readonly<Record<string, unknown>>): CartLineDisplaySnapshot {
  return {
    title: readString(record.name) ?? "Legacy cart item",
    ...(readString(record.category) ? { subtitle: readString(record.category) as string } : {}),
    ...(readString(record.imageUrl) ? { imageUrl: readString(record.imageUrl) as string } : {}),
    ...(readString(record.imageAlt) ? { imageAlt: readString(record.imageAlt) as string } : {}),
    ...(readString(record.href) ? { href: readString(record.href) as string } : {})
  };
}

function readCustomProjectSnapshot(value: unknown): CustomProjectSnapshot | null {
  const project = parseCustomProject(value);
  const record = isRecord(value) ? value : null;
  const pricing = readCustomProjectPricing(record?.pricing);
  if (!project || !pricing || pricing.projectId !== project.id) return null;
  return { ...project, pricing };
}

function readCustomProjectPricing(value: unknown): CustomProjectPricing | null {
  if (!isRecord(value) || !Array.isArray(value.lines) || !Array.isArray(value.issues)) return null;
  const projectId = readString(value.projectId);
  const status = readCustomPriceStatus(value.status);
  const totalQuantity = readPositiveInteger(value.totalQuantity);
  const finalTotal = readNullableMoney(value.finalTotal);
  const estimatedMinTotal = readNullableMoney(value.estimatedMinTotal);
  const estimatedMaxTotal = readNullableMoney(value.estimatedMaxTotal);
  const pricedAt = isIsoDate(value.pricedAt) ? value.pricedAt : null;
  if (
    !projectId
    || !status
    || totalQuantity === null
    || !pricedAt
    || (value.finalTotal !== null && finalTotal === null)
    || (value.estimatedMinTotal !== null && estimatedMinTotal === null)
    || (value.estimatedMaxTotal !== null && estimatedMaxTotal === null)
    || !value.issues.every((issue) => typeof issue === "string")
    || !value.lines.every(isCustomPricingLine)
  ) {
    return null;
  }
  return {
    projectId,
    status,
    totalQuantity,
    finalTotal,
    estimatedMinTotal,
    estimatedMaxTotal,
    lines: value.lines,
    issues: value.issues,
    pricedAt
  };
}

function isCustomPricingLine(value: unknown): value is CustomPricingLine {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.key)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.displayLabel)
    && readPositiveInteger(value.quantity) !== null
    && (value.unitPrice === null || readNonNegativeInteger(value.unitPrice) !== null)
    && (value.subtotal === null || readNonNegativeInteger(value.subtotal) !== null)
    && (
      value.kind === "product"
      || value.kind === "service"
      || value.kind === "placement"
      || value.kind === "print_size"
      || value.kind === "personalization"
    )
    && (
      value.componentType === "product_base"
      || value.componentType === "method_fee"
      || value.componentType === "print_size"
      || value.componentType === "placement"
      || value.componentType === "personalization"
    )
    && isNonEmptyString(value.sourceRuleId)
    && (
      value.calculationBasis === "pim_tier"
      || value.calculationBasis === "per_item"
      || value.calculationBasis === "per_order"
      || value.calculationBasis === "estimated"
      || value.calculationBasis === "quotation"
    )
    && [
      "allocationId",
      "designPackageId",
      "productId",
      "variantId",
      "variantSizeId",
      "sku",
      "serviceId",
      "serviceSlug",
      "serviceName",
      "pricingRuleId",
      "placementId",
      "placementName",
      "printSizeId",
      "printSizeName"
    ].every((key) => value[key] === undefined || isNonEmptyString(value[key]));
}

function readCustomPriceStatus(value: unknown): CustomPriceStatus | null {
  return value === "final" || value === "estimated" || value === "quotation_required"
    ? value
    : null;
}

function readNullableMoney(value: unknown): number | null {
  return value === null ? null : readNonNegativeInteger(value);
}

function readBoundedQuantity(value: unknown): number {
  const quantity = readPositiveInteger(value);
  return quantity !== null && quantity <= MAX_CART_LINE_QUANTITY ? quantity : 1;
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isNonEmptyString(value: unknown): value is string {
  return readString(value) !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isWarning(value: unknown): value is ContractWarning {
  return isRecord(value)
    && isNonEmptyString(value.code)
    && isNonEmptyString(value.message)
    && (value.field === undefined || typeof value.field === "string");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
