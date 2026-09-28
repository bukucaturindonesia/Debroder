import { describe, expect, it } from "vitest";
import { brochureWhatsappHref, brochureSite } from "@/src/config/site";
import { contactLinks } from "@/lib/contact";

describe("brochure WhatsApp inquiry", () => {
  it("uses the existing official configuration and includes every required field", () => {
    const url = new URL(brochureWhatsappHref());
    expect(brochureSite.whatsappUrl).toBe(contactLinks.apparelWhatsapp);
    expect(`${url.origin}${url.pathname}`).toBe(contactLinks.apparelWhatsapp);
    expect(url.searchParams.get("text")).toBe("Halo DEBRODER,\nsaya ingin menanyakan/pesan:\n\nProduk/Layanan: Custom apparel\nUkuran: Belum ditentukan\nWarna: Belum ditentukan\nJumlah: Belum ditentukan\nCatatan: —");
  });

  it("encodes customer content without changing the destination or query fields", () => {
    const url = new URL(brochureWhatsappHref("NSA Premium", { size: " M & L ", color: "Hitam/putih", quantity: "24", notes: "Nama #1 + logo?\nAcara sekolah" }));
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.hash).toBe("");
    expect(url.searchParams.get("text")).toContain("Ukuran: M & L\nWarna: Hitam/putih\nJumlah: 24\nCatatan: Nama #1 + logo?\nAcara sekolah");
  });
});
