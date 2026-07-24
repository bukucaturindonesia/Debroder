export type CompatibilityIssueSeverity = "warning" | "error";

export type CompatibilityIssue = {
  code: string;
  message: string;
  severity: CompatibilityIssueSeverity;
  field?: string;
};

export type CompatibilitySuccess<TValue> = {
  compatible: true;
  value: TValue;
  issues: readonly CompatibilityIssue[];
};

export type CompatibilityFailure = {
  compatible: false;
  value: null;
  issues: readonly CompatibilityIssue[];
};

export type CompatibilityResult<TValue> = CompatibilitySuccess<TValue> | CompatibilityFailure;

export function compatibilitySuccess<TValue>(
  value: TValue,
  issues: readonly CompatibilityIssue[] = []
): CompatibilitySuccess<TValue> {
  return { compatible: true, value, issues };
}

export function compatibilityFailure(
  code: string,
  message: string,
  field?: string,
  additionalIssues: readonly CompatibilityIssue[] = []
): CompatibilityFailure {
  return {
    compatible: false,
    value: null,
    issues: [
      { code, message, severity: "error", ...(field ? { field } : {}) },
      ...additionalIssues
    ]
  };
}

export function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

export function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function readPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

export function readNonNegativeMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
