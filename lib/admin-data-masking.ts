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

export function sanitizeAdminGuestRecord<T extends Record<string, unknown>>(record: T) {
  const sanitized: Record<string, unknown> = { ...record };
  const phoneKeys = ["phone", "whatsapp", "customer_phone", "phone_number"];
  const emailKeys = ["email", "customer_email"];
  const addressKeys = ["address", "shipping_address", "customer_address"];
  const hiddenKeys = [
    "payment_proof",
    "payment_proof_url",
    "tracking_token",
    "public_access_token_hash",
    "private_design_file",
    "internal_notes",
    "auth_metadata",
    "audit_snapshot",
    "credential",
    "secret"
  ];

  for (const key of phoneKeys) if (key in sanitized) sanitized[key] = maskPhone(String(sanitized[key] || ""));
  for (const key of emailKeys) if (key in sanitized) sanitized[key] = maskEmail(String(sanitized[key] || ""));
  for (const key of addressKeys) if (key in sanitized) sanitized[key] = maskAddress(String(sanitized[key] || ""));
  for (const key of hiddenKeys) if (key in sanitized) sanitized[key] = null;

  return sanitized as T;
}
