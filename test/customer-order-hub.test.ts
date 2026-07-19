import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";

const read = (path: string) => readFileSync(path, "utf8");

describe("Customer Order Hub", () => {
  it("shows one clear responsibility and active action for critical customer states", () => {
    expect(resolveCustomerOrderPresentation({
      status: "awaiting_payment",
      paymentStatus: "unpaid",
      fulfillmentMethod: "pickup",
      paymentMethod: "bank_transfer",
      hasPaymentUrl: true
    })).toMatchObject({ responsibility: "customer", action: "pay", title: "Selesaikan pembayaran" });

    expect(resolveCustomerOrderPresentation({
      status: "awaiting_payment",
      paymentStatus: "pending_verification",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      isCustom: true
    })).toMatchObject({ responsibility: "debroder", action: "track_only", title: "Pembayaran sedang diperiksa" });

    expect(resolveCustomerOrderPresentation({
      status: "ready_for_pickup",
      paymentStatus: "unpaid",
      fulfillmentMethod: "pickup",
      paymentMethod: "pay_at_store"
    })).toMatchObject({ responsibility: "customer", action: "pickup", title: "Barang siap diambil dan dibayar di toko" });
  });

  it("keeps tracking persistent on confirmation and payment screens", () => {
    const confirmation = read("components/checkout/OrderConfirmationClient.tsx");
    const payment = read("components/payments/PublicPaymentForm.tsx");
    const persistent = read("components/customer-order/PersistentTrackingButton.tsx");
    expect(confirmation).toContain("<PersistentTrackingButton href={trackingPath}");
    expect(payment).toContain("<PersistentTrackingButton href={trackingHref}");
    expect(persistent).toContain("fixed inset-x-0 bottom-0");
    expect(persistent).toContain("Lacak Pesanan");
  });

  it("uses progressive disclosure instead of exposing all order processes", () => {
    const confirmation = read("components/checkout/OrderConfirmationClient.tsx");
    const payment = read("components/payments/PublicPaymentForm.tsx");
    const tracking = read("components/tracking/GuestOrderTracking.tsx");
    for (const source of [confirmation, payment, tracking]) {
      expect(source).toContain("<details");
      expect(source).toContain("CustomerOrderStatusCard");
    }
    expect(confirmation).toContain("Ringkasan pesanan");
    expect(payment).toContain("Ringkasan tagihan");
    expect(tracking).toContain("Informasi pengambilan");
  });

  it("hides the payment form while mutation review is pending", () => {
    const payment = read("components/payments/PublicPaymentForm.tsx");
    const presentation = read("lib/customer-order-presentation.ts");
    expect(payment).toContain("const showPaymentWorkspace = !order.requirementMet && !awaitingReview");
    expect(payment).toContain("Anda tidak perlu mengirim bukti lagi selama pemeriksaan berlangsung");
    expect(presentation).toContain("Pembayaran sedang diperiksa");
  });

  it("preserves Custom quote payment gates and never creates transfer links for pay-at-store", () => {
    const confirmationRoute = read("app/api/public/orders/[token]/route.ts");
    const trackingRoute = read("app/api/public/order-tracking/route.ts");
    expect(confirmationRoute).toContain("automatic-payment-link-v2");
    expect(trackingRoute).toContain("automatic-payment-link-v2");
    expect(trackingRoute).toContain('order.payment_method === "bank_transfer" && order.status === "awaiting_payment"');
    expect(trackingRoute).toContain("relativePaymentPath");
  });
});
