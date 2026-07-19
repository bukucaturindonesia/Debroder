import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getCmsStatusLabel,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  getPricingStatusLabel,
  uiLanguageMaps
} from "@/lib/ui-language";

const read = (path: string) => readFileSync(path, "utf8");

describe("standardisasi bahasa UI", () => {
  it("menyediakan label admin dan pelanggan untuk setiap status pesanan", () => {
    expect(Object.keys(uiLanguageMaps.adminOrderStatus).sort()).toEqual(
      Object.keys(uiLanguageMaps.customerOrderStatus).sort()
    );

    for (const status of Object.keys(uiLanguageMaps.adminOrderStatus)) {
      expect(getOrderStatusLabel(status, "admin")).toBeTruthy();
      expect(getOrderStatusLabel(status, "customer")).toBeTruthy();
      expect(getOrderStatusLabel(status, "admin")).not.toBe(status);
      expect(getOrderStatusLabel(status, "customer")).not.toBe(status);
    }
  });

  it("menyediakan label admin dan pelanggan untuk setiap status pembayaran", () => {
    expect(Object.keys(uiLanguageMaps.adminPaymentStatus).sort()).toEqual(
      Object.keys(uiLanguageMaps.customerPaymentStatus).sort()
    );

    for (const status of Object.keys(uiLanguageMaps.adminPaymentStatus)) {
      expect(getPaymentStatusLabel(status, "admin")).toBeTruthy();
      expect(getPaymentStatusLabel(status, "customer")).toBeTruthy();
      expect(getPaymentStatusLabel(status, "admin")).not.toBe(status);
      expect(getPaymentStatusLabel(status, "customer")).not.toBe(status);
    }
  });

  it("menggunakan fallback aman dan tidak membocorkan nilai mentah", () => {
    const unknown = "future_status_with_underscore";
    expect(getOrderStatusLabel(unknown, "admin")).toBe("Status pesanan belum dikenali");
    expect(getOrderStatusLabel(unknown, "customer")).toBe("Status pesanan sedang diperbarui");
    expect(getPaymentStatusLabel(unknown, "admin")).toBe("Status pembayaran belum dikenali");
    expect(getPaymentStatusLabel(unknown, "customer")).toBe("Status pembayaran sedang diperbarui");
    expect(getPricingStatusLabel(unknown)).toBe("Status harga belum dikenali");
    expect(getCmsStatusLabel(unknown)).toBe("Status belum dikenali");

    for (const label of [
      getOrderStatusLabel(unknown),
      getOrderStatusLabel(unknown, "customer"),
      getPaymentStatusLabel(unknown),
      getPaymentStatusLabel(unknown, "customer")
    ]) {
      expect(label).not.toContain(unknown);
      expect(label).not.toContain("_");
    }
  });

  it("tidak mengembalikan undefined untuk input kosong atau tidak valid", () => {
    for (const value of [undefined, null, "", 0, false, {}, []]) {
      expect(typeof getOrderStatusLabel(value)).toBe("string");
      expect(typeof getOrderStatusLabel(value, "customer")).toBe("string");
      expect(typeof getPaymentStatusLabel(value)).toBe("string");
      expect(typeof getPaymentStatusLabel(value, "customer")).toBe("string");
    }
  });

  it("menjaga alur utama bebas dari copy teknis yang telah dilarang", () => {
    const criticalSources = [
      "components/checkout/CheckoutClient.tsx",
      "components/checkout/CheckoutClientV2.tsx",
      "components/tracking/GuestOrderTracking.tsx",
      "components/admin/OrderDetailAdmin.tsx",
      "components/admin/CustomOrderOperationalWorkspace.tsx",
      "components/admin/PaymentInboxAdmin.tsx",
      "components/admin/AccessControlAdmin.tsx"
    ].map(read).join("\n");

    for (const forbiddenCopy of [
      "Status canonical",
      "state canonical server",
      "Guest Order Tracking",
      "Order dibuat sebagai unpaid",
      "kunci idempotensi",
      "Role & Permission",
      "workspace order canonical"
    ]) {
      expect(criticalSources).not.toContain(forbiddenCopy);
    }
  });
});
