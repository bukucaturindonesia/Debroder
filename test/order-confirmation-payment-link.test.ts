import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Order confirmation payment link and pickup clarity", () => {
  it("returns an existing or newly ensured payment URL from the public order route", () => {
    const route = read("app/api/public/orders/[token]/route.ts");
    expect(route).toContain("ensureAutomaticPaymentLink");
    expect(route).toContain("automatic-payment-link-v2");
    expect(route).toContain("resolvePublicPaymentLink(client, row)");
    expect(route).toMatch(/customQuote: customQuote \?\? null,\s*payment,\s*activeStage\s*\}/);
    expect(route).toContain("relativePaymentPath");
  });

  it("renders one active payment CTA without hardcoding bank account data", () => {
    const component = read("components/checkout/OrderConfirmationClient.tsx");
    expect(component).toContain("Lihat Rekening & Bayar");
    expect(component).toContain("resolveCustomerOrderPresentation");
    expect(component).toContain("CustomerOrderStatusCard");
    expect(component).not.toContain("123456789");
  });

  it("does not show shipping cost as waiting admin for pickup orders", () => {
    const component = read("components/checkout/OrderConfirmationClient.tsx");
    expect(component).toContain('{!isPickup ? <Summary label="Ongkir"');
    expect(component).toContain('value={isPickup ? "Ambil di Toko" : "Kurir Eksternal"}');
  });

  it("shows the mandatory contact-admin warning before store pickup", () => {
    const component = read("components/checkout/OrderConfirmationClient.tsx");
    expect(component).toContain("Penting sebelum datang ke toko");
    expect(component).toContain("Jangan datang sebelum menerima konfirmasi dari Admin");
    expect(component).toContain("Hubungi Admin via WhatsApp");
  });
});
