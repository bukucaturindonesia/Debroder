const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "setcookie",
  "password",
  "passwd",
  "secret",
  "servicerolekey",
  "anonkey",
  "apikey",
  "token",
  "accesstoken",
  "refreshtoken",
  "idempotencykey",
  "phone",
  "customerphone",
  "email",
  "customeremail",
  "address",
  "shippingaddress",
  "note",
  "notes",
  "customernotes",
  "proof",
  "evidence",
  "proofpath",
  "filepath",
  "storagepath",
  "privateurl",
  "signedurl",
  "message",
  "content",
  "design",
  "designcontent",
  "artwork",
  "configuration",
  "payload",
  "body",
  "accountnumber",
  "sendername",
  "customername"
]);

const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function redactObservabilityValue(value: unknown): unknown {
  return redact(value, "", 0, new WeakSet<object>());
}

function redact(
  value: unknown,
  key: string,
  depth: number,
  visited: WeakSet<object>
): unknown {
  if (isSensitiveKey(key)) return "[REDACTED]";
  if (value === null || value === undefined || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return `[${typeof value}]`;
  if (depth >= 5) return "[REDACTED_DEPTH]";

  if (value instanceof Error) {
    return {
      name: value.name || "Error",
      code: readErrorCode(value)
    };
  }
  if (visited.has(value)) return "[REDACTED_CIRCULAR]";
  visited.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => redact(entry, key, depth + 1, visited));
  }

  const output: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(value).slice(0, 50)) {
    output[entryKey] = redact(entryValue, entryKey, depth + 1, visited);
  }
  return output;
}

function isSensitiveKey(key: string) {
  if (!key) return false;
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_KEYS.has(normalized)
    || normalized.endsWith("token")
    || normalized.endsWith("secret")
    || normalized.endsWith("password")
    || normalized.endsWith("cookie")
    || normalized.endsWith("url")
    || normalized.endsWith("path");
}

function redactString(value: string) {
  return value
    .slice(0, 500)
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]");
}

function readErrorCode(error: Error) {
  const value = Object.fromEntries(Object.entries(error)).code;
  return typeof value === "string" || typeof value === "number"
    ? String(value).slice(0, 80)
    : null;
}
