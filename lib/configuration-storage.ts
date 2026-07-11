import type { ProductConfigurationSnapshot } from "@/lib/types";

export const CONFIGURATION_STORAGE_KEY = "debroder_product_configuration_v1";

export function writeProductConfiguration(
  snapshot: ProductConfigurationSnapshot
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(CONFIGURATION_STORAGE_KEY, JSON.stringify(snapshot));
}

export function readProductConfiguration(): ProductConfigurationSnapshot | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(CONFIGURATION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isConfigurationSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearProductConfiguration(): void {
  if (canUseStorage()) {
    window.localStorage.removeItem(CONFIGURATION_STORAGE_KEY);
  }
}

export function encodeConfigurationForShare(
  snapshot: ProductConfigurationSnapshot
): string {
  const shareableSnapshot: ProductConfigurationSnapshot = {
    ...snapshot,
    items: snapshot.items.map((item) => ({ ...item, upload_refs: [] })),
    upload_refs: []
  };
  const json = JSON.stringify(shareableSnapshot);
  const encoded = window.btoa(unescape(encodeURIComponent(json)));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeConfigurationFromShare(
  token: string
): ProductConfigurationSnapshot | null {
  try {
    const padded = token.padEnd(token.length + ((4 - (token.length % 4)) % 4), "=");
    const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(window.atob(normalized)));
    const parsed: unknown = JSON.parse(json);
    return isConfigurationSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isConfigurationSnapshot(
  value: unknown
): value is ProductConfigurationSnapshot {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return false;
  }

  return (
    typeof value.product_id === "string" &&
    typeof value.product_slug === "string" &&
    typeof value.product_name === "string" &&
    typeof value.note === "string" &&
    typeof value.total_quantity === "number" &&
    typeof value.estimated_product_total === "number" &&
    typeof value.estimated_service_total === "number" &&
    typeof value.estimated_grand_total === "number" &&
    typeof value.requires_review === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
