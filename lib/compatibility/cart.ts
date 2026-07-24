import type {
  CartLine,
  CartLineDisplaySnapshot,
  CustomProjectCartLine,
  LegacyUnsupportedCartLine,
  ReadyStockCartLine
} from "../contracts/cart-line";
import { CONTRACT_VERSIONS } from "../contracts/version";
import { asRecord, readNonEmptyString, readPositiveInteger } from "./core";

export const LEGACY_CART_STORAGE_VERSIONS = ["v1", "v2", "v3", "v4"] as const;
export type LegacyCartStorageVersion = (typeof LEGACY_CART_STORAGE_VERSIONS)[number];

export type LegacyCartReadEntry =
  | {
      classification: "adapted";
      sourceIndex: number;
      line: CartLine;
    }
  | {
      classification: "legacy_unsupported";
      sourceIndex: number;
      storageVersion: LegacyCartStorageVersion;
      reasonCode: string;
      sourceLineId: string | null;
      rawLine: Readonly<Record<string, unknown>>;
      line: LegacyUnsupportedCartLine | null;
    };

export type LegacyCartStorageIssue = "invalid_json" | "non_array_root";

export type LegacyCartReadResult = {
  storageVersion: LegacyCartStorageVersion;
  storageIssue: LegacyCartStorageIssue | null;
  entries: readonly LegacyCartReadEntry[];
  adaptedLines: readonly CartLine[];
  unsupportedCount: number;
};

function displaySnapshot(record: Readonly<Record<string, unknown>>): CartLineDisplaySnapshot {
  return {
    title: readNonEmptyString(record.name) ?? "Legacy cart item",
    ...(readNonEmptyString(record.category) ? { subtitle: readNonEmptyString(record.category) as string } : {}),
    ...(readNonEmptyString(record.imageUrl) ? { imageUrl: readNonEmptyString(record.imageUrl) as string } : {}),
    ...(readNonEmptyString(record.imageAlt) ? { imageAlt: readNonEmptyString(record.imageAlt) as string } : {}),
    ...(readNonEmptyString(record.href) ? { href: readNonEmptyString(record.href) as string } : {})
  };
}

function isLegacyJerseySyntheticLine(record: Readonly<Record<string, unknown>>) {
  const snapshot = asRecord(record.variantSnapshot);
  return snapshot?.configurator_type === "jersey" || readNonEmptyString(record.variantSku) === "JERSEY-CONFIG";
}

function createUnsupportedLine(
  record: Readonly<Record<string, unknown>>,
  storageVersion: LegacyCartStorageVersion,
  reasonCode: string
): LegacyUnsupportedCartLine | null {
  const lineId = readNonEmptyString(record.cartId);
  const quantity = readPositiveInteger(record.quantity);
  if (!lineId || quantity === null) return null;

  return {
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lineId,
    lineType: "legacy_unsupported",
    quantity,
    display: displaySnapshot(record),
    displayPricing: null,
    validation: { status: "unvalidated" },
    ...(readNonEmptyString(record.notes) ? { notes: readNonEmptyString(record.notes) as string } : {}),
    checkoutEligible: false,
    legacyStorageVersion: storageVersion,
    reasonCode,
    rawLine: record
  };
}

function adaptReadyStockLine(record: Readonly<Record<string, unknown>>): ReadyStockCartLine | null {
  const lineId = readNonEmptyString(record.cartId);
  const productId = readNonEmptyString(record.id);
  const variantId = readNonEmptyString(record.variantId);
  const variantSizeId = readNonEmptyString(record.variantSizeId);
  const sku = readNonEmptyString(record.variantSku) ?? readNonEmptyString(record.sku);
  const quantity = readPositiveInteger(record.quantity);
  if (!lineId || !productId || !variantId || !variantSizeId || !sku || quantity === null) return null;

  return {
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lineId,
    lineType: "ready_stock",
    quantity,
    display: displaySnapshot(record),
    displayPricing: null,
    validation: { status: "unvalidated" },
    ...(readNonEmptyString(record.notes) ? { notes: readNonEmptyString(record.notes) as string } : {}),
    productId,
    variantId,
    variantSizeId,
    sku
  };
}

function adaptCustomProjectLine(record: Readonly<Record<string, unknown>>): CustomProjectCartLine | null {
  const lineId = readNonEmptyString(record.cartId);
  const quantity = readPositiveInteger(record.quantity);
  const project = asRecord(record.customProject);
  const projectId = readNonEmptyString(project?.id);
  const projectVersion = typeof project?.version === "number" || typeof project?.version === "string"
    ? String(project.version)
    : null;
  if (!lineId || quantity === null || !projectId || !projectVersion) return null;

  return {
    contractVersion: CONTRACT_VERSIONS.cartLine,
    lineId,
    lineType: "custom_project",
    quantity,
    display: displaySnapshot(record),
    displayPricing: null,
    validation: { status: "unvalidated" },
    ...(readNonEmptyString(record.notes) ? { notes: readNonEmptyString(record.notes) as string } : {}),
    projectId,
    projectVersion,
    projectSnapshotReference: projectId
  };
}

function unsupportedEntry(
  record: Readonly<Record<string, unknown>>,
  storageVersion: LegacyCartStorageVersion,
  sourceIndex: number,
  reasonCode: string
): LegacyCartReadEntry {
  return {
    classification: "legacy_unsupported",
    sourceIndex,
    storageVersion,
    reasonCode,
    sourceLineId: readNonEmptyString(record.cartId),
    rawLine: record,
    line: createUnsupportedLine(record, storageVersion, reasonCode)
  };
}

export function readLegacyCartStorage(
  raw: unknown,
  storageVersion: LegacyCartStorageVersion
): LegacyCartReadResult {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return {
        storageVersion,
        storageIssue: "invalid_json",
        entries: [],
        adaptedLines: [],
        unsupportedCount: 0
      };
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      storageVersion,
      storageIssue: "non_array_root",
      entries: [],
      adaptedLines: [],
      unsupportedCount: 0
    };
  }

  const entries: LegacyCartReadEntry[] = parsed.map((value, sourceIndex) => {
    const record = asRecord(value);
    if (!record) {
      return {
        classification: "legacy_unsupported",
        sourceIndex,
        storageVersion,
        reasonCode: "legacy_cart.non_object_line",
        sourceLineId: null,
        rawLine: {},
        line: null
      };
    }

    if (isLegacyJerseySyntheticLine(record)) {
      return unsupportedEntry(record, storageVersion, sourceIndex, "legacy_cart.jersey_synthetic_line");
    }

    if (asRecord(record.customProject)) {
      const line = adaptCustomProjectLine(record);
      return line
        ? { classification: "adapted", sourceIndex, line }
        : unsupportedEntry(record, storageVersion, sourceIndex, "legacy_cart.incomplete_custom_project");
    }

    const readyStockLine = adaptReadyStockLine(record);
    return readyStockLine
      ? { classification: "adapted", sourceIndex, line: readyStockLine }
      : unsupportedEntry(record, storageVersion, sourceIndex, "legacy_cart.incomplete_ready_stock_identity");
  });

  const adaptedLines = entries.flatMap((entry) => {
    if (entry.classification === "adapted") return [entry.line];
    return entry.line ? [entry.line] : [];
  });

  return {
    storageVersion,
    storageIssue: null,
    entries,
    adaptedLines,
    unsupportedCount: entries.filter((entry) => entry.classification === "legacy_unsupported").length
  };
}
