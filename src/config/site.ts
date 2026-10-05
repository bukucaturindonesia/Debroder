import { contactLinks } from "@/lib/contact";
import { whatsappLinkWithMessage } from "@/lib/url";

export const brochureSite = {
  name: "DEBRODER",
  domain: "https://debroder.id",
  email: "hello@debroder.id",
  whatsappUrl: contactLinks.apparelWhatsapp,
  instagramUrl: null as string | null,
  address: null as string | null
} as const;

export function brochureWhatsappHref(subject = "Custom apparel", needs: { size?: string; color?: string; quantity?: string; notes?: string } = {}) {
  const message = [
    "Halo DEBRODER,",
    "saya ingin menanyakan/pesan:",
    "",
    `Produk/Layanan: ${subject}`,
    `Ukuran: ${needs.size?.trim() || "Belum ditentukan"}`,
    `Warna: ${needs.color?.trim() || "Belum ditentukan"}`,
    `Jumlah: ${needs.quantity?.trim() || "Belum ditentukan"}`,
    `Catatan: ${needs.notes?.trim() || "—"}`
  ].join("\n");
  return whatsappLinkWithMessage(brochureSite.whatsappUrl, message);
}
