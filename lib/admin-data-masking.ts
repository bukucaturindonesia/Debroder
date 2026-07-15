const PHONE_DIGITS = /\D/g;

export function maskPhone(value: string | null | undefined) {
  const raw = value?.trim() || "";
  const digits = raw.replace(PHONE_DIGITS, "");
  if (digits.length < 8) return digits ? "••••" : "";
  return `${digits.slice(0, 4)}••••${digits.slice(-4)}`;
}

export function maskEmail(value: string | null | undefined) {
  const raw = value?.trim() || "";
  const at = raw.indexOf("@");
  if (at <= 0) return raw ? "•••" : "";
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}•••@${domain}`;
}

export function maskAddress(value: string | null | undefined) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const first = raw.split(/[\s,]+/).filter(Boolean).slice(0, 2).join(" ");
  return first ? `${first} ••••` : "••••";
}

const PHONE_KEYS = new Set([
  "phone",
  "whatsapp",
  "customer_phone",
  "phone_number",
  "contact_phone",
  "recipient_phone"
]);
const EMAIL_KEYS = new Set([
  "email",
  "customer_email",
  "contact_email",
  "recipient_email"
]);
const ADDRESS_KEYS = new Set([
  "address",
  "shipping_address",
  "customer_address",
  "pickup_address",
  "delivery_address"
]);
const HIDDEN_KEY_PARTS = [
  "password",
  "secret",
  "token",
  "credential",
  "service_role",
  "private_key",
  "access_key",
  "proof_path",
  "proof_bucket",
  "payment_proof",
  "tracking_token",
  "public_access_token_hash",
  "private_design",
  "design_file",
  "auth_metadata",
  "metadata",
  "raw_user_meta",
  "raw_app_meta",
  "audit_snapshot",
  "old_value",
  "new_value",
  "request_headers",
  "internal_notes",
  "admin_notes"
];

export function isSensitiveAdminKey(key: string) {
  const normalized = key.toLowerCase();
  return HIDDEN_KEY_PARTS.some((part) => normalized.includes(part));
}

export function sanitizeAdminGuestValue(key: string, value: unknown): unknown {
  const normalized = key.toLowerCase();
  if (isSensitiveAdminKey(normalized)) return null;
  if (PHONE_KEYS.has(normalized)) return maskPhone(String(value || ""));
  if (EMAIL_KEYS.has(normalized)) return maskEmail(String(value || ""));
  if (ADDRESS_KEYS.has(normalized)) return maskAddress(String(value || ""));
  if (typeof value === "string") return maskSensitiveText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeNestedValue(item));
  if (value && typeof value === "object") return sanitizeNestedValue(value);
  return value;
}

function maskSensitiveText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => maskEmail(email))
    .replace(/(?:\+?62|0)[\d\s-]{8,16}\d/g, (phone) => maskPhone(phone));
}

function sanitizeNestedValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeNestedValue(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sanitizeAdminGuestValue(key, item)
    ])
  );
}

export function sanitizeAdminGuestRecord<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, sanitizeAdminGuestValue(key, value)])
  ) as T;
}
