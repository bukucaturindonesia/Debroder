const officialWhatsappNumber = "6285355333364";
const legacyPlaceholderPattern = /^62000000000[0-2]$/;
const legacyPlaceholderLinkPattern = /62000000000[0-2]/g;
const rupiahFormatter = new Intl.NumberFormat("id-ID");

export function emailHref(email?: string): string {
  const value = email || "debroderapparel@gmail.com";
  return value.startsWith("mailto:") ? value : `mailto:${value}`;
}

export function whatsappHref(value: string, message?: string): string {
  if (value.startsWith("http")) {
    return whatsappLinkWithMessage(value, message);
  }

  const digits = value.replace(/\D/g, "");
  const raw = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits || officialWhatsappNumber;
  const normalized = legacyPlaceholderPattern.test(raw)
    ? officialWhatsappNumber
    : raw;
  const suffix = message ? `?text=${encodeURIComponent(message)}` : "";

  return `https://wa.me/${normalized}${suffix}`;
}

export function normalizeWhatsappLink(value: string): string {
  return value.replace(legacyPlaceholderLinkPattern, officialWhatsappNumber);
}

export function whatsappLinkWithMessage(value: string, message?: string): string {
  if (!message) return normalizeWhatsappLink(value);

  if (!value.startsWith("http")) {
    return whatsappHref(value, message);
  }

  const encodedMessage = encodeURIComponent(message);

  try {
    const url = new URL(normalizeWhatsappLink(value));
    const numberFromPath = url.pathname.replace(/\D/g, "");
    const number = numberFromPath || officialWhatsappNumber;

    if (url.hostname.includes("wa.me")) {
      return `https://wa.me/${number}?text=${encodedMessage}`;
    }

    url.searchParams.set("text", message);
    return url.toString();
  } catch {
    return `https://wa.me/${officialWhatsappNumber}?text=${encodedMessage}`;
  }
}

export function formatRupiah(value?: string | number | null): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    return value > 0 ? `Rp ${rupiahFormatter.format(value)}` : "";
  }

  const trimmed = value.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return trimmed;

  const numberValue = Number(digits);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return "";

  return `Rp ${rupiahFormatter.format(numberValue)}`;
}

export function instagramHref(value?: string): string {
  if (value?.startsWith("http")) {
    return value;
  }

  const handle = value?.replace("@", "").trim() || "de_broder";
  return `https://instagram.com/${handle}`;
}

export function facebookHref(value?: string): string {
  if (!value) {
    return "https://www.facebook.com/debroderapparel/";
  }

  if (value.startsWith("http")) {
    return value;
  }

  const handle = value.replace("@", "").replace(/^\/+/, "").trim();
  return `https://www.facebook.com/${handle || "debroderapparel"}/`;
}
