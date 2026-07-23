export type CarrierTrackingTarget = {
  carrierLabel: string;
  trackingNumber: string;
  href: string;
};

const OFFICIAL_TRACKING_PAGES = [
  { aliases: ["j&t", "jnt", "j&t express", "jet express", "jet"], label: "J&T Express", href: "https://www.jet.co.id/track" },
  { aliases: ["jne", "jne express"], label: "JNE", href: "https://www.jne.co.id/tracking-package" },
  { aliases: ["sicepat", "si cepat", "sicepat ekspres"], label: "SiCepat", href: "https://www.sicepat.com/" },
  { aliases: ["anteraja", "anter aja"], label: "AnterAja", href: "https://anteraja.id/tracking" },
  { aliases: ["ninja", "ninja xpress", "ninjaxpress"], label: "Ninja Xpress", href: "https://www.ninjaxpress.co/id-id/tracking" },
  { aliases: ["pos", "pos indonesia", "kantor pos"], label: "Pos Indonesia", href: "https://www.posindonesia.co.id/id/tracking" }
] as const;

export function resolveCarrierTrackingTarget(
  courier: string | null | undefined,
  trackingNumber: string | null | undefined
): CarrierTrackingTarget | null {
  const normalizedCourier = normalize(courier);
  const normalizedTracking = typeof trackingNumber === "string" ? trackingNumber.trim() : "";
  if (!normalizedCourier || !normalizedTracking) return null;

  const match = OFFICIAL_TRACKING_PAGES.find((entry) =>
    entry.aliases.some((alias) => normalizedCourier.includes(alias))
  );
  if (!match) return null;

  return {
    carrierLabel: match.label,
    trackingNumber: normalizedTracking,
    href: match.href
  };
}

function normalize(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9&]+/g, " ").replace(/\s+/g, " ")
    : "";
}
