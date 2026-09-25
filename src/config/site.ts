export const brochureSite = {
  name: "DEBRODER",
  domain: "https://debroder.id",
  email: "hello@debroder.id",
  // Existing public contact number in this repository; replace here after owner verification.
  whatsappNumber: "6285355333364",
  instagramUrl: null as string | null,
  address: null as string | null
} as const;

export function brochureWhatsappUrl(message = "Halo DEBRODER, saya ingin konsultasi.") {
  return `https://wa.me/${brochureSite.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
