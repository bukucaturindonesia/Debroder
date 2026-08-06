import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";
import { automaticPaymentBlocker } from "@/lib/automatic-payment-link";
import { automaticPaymentBlocker as automaticCustomPaymentBlocker } from "@/lib/automatic-payment-link-v2";

const migrationName = "20260806234500_customer_checkout_activation_integrity_v2.sql";
const migrationPath = join("supabase", "migrations", migrationName);
const migration = readFileSync(migrationPath, "utf8");
const compactMigration = migration.replace(/\s+/g, " ").toLowerCase();

const activeApplicationSources = ["app", "components", "lib"]
  .flatMap(collectSource)
  .join("\n");

function activeOrder() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    order_number: "ORD-DEB-2026-0001",
    status: "awaiting_payment",
    payment_status: "unpaid",
    pricing_status: "final",
    total_amount: 150_000,
    checkout_activated_at: "2026-08-06T15:00:00.000Z",
    archived_at: null
  };
}

describe("Customer Checkout Activation Integrity V2", () => {
  it("ships one additive V2 migration without destructive table operations", () => {
    expect(existsSync(migrationPath)).toBe(true);
    expect(
      readdirSync("supabase/migrations").filter((name) =>
        name.endsWith("_customer_checkout_activation_integrity_v2.sql")
      )
    ).toEqual([migrationName]);
    expect(compactMigration).toContain("begin;");
    expect(compactMigration).toContain("commit;");
    expect(compactMigration).not.toMatch(/\b(drop table|truncate table|delete from auth\.users)\b/);
  });

  it("establishes canonical immutable checkout activation fields and backfills legacy rows", () => {
    expect(migration).toContain("add column if not exists checkout_activated_at timestamptz");
    expect(migration).toContain("add column if not exists checkout_activated_by uuid");
    expect(migration).toContain("add column if not exists checkout_activation_source text");
    expect(migration).toContain("set checkout_activated_at = whatsapp_confirmed_at");
    expect(migration).toContain("checkout_activation_source = 'legacy_backfill'");
    expect(migration).toContain("create trigger orders_checkout_activation_integrity_v2");
    expect(migration).toContain("Aktivasi checkout bersifat immutable");
    expect(migration).toContain("new.whatsapp_confirmation_hash := null");
    expect(migration).toContain("new.whatsapp_confirmation_expires_at := null");
    expect(migration).toContain("new.whatsapp_confirmation_attempts := 0");
  });

  it("makes V2 the only implementation authority while preserving a narrow V1 wrapper", () => {
    expect(migration).toContain("create or replace function public.activate_public_checkout_order_v2");
    expect(migration).toContain("select public.activate_public_checkout_order_v2(");
    expect(migration).toContain("'legacy_wrapper'");
    expect(migration).toContain("Email akun pelanggan belum terverifikasi");
    expect(migration).toContain("Email checkout tidak sama dengan email akun terverifikasi");
    expect(migration).toContain("Pesanan sudah terhubung ke akun pelanggan lain");
    expect(migration).toContain("Pesanan terminal tidak dapat diaktifkan");
  });

  it("removes the client confirmation code and generates compatibility data only on the server", () => {
    const checkoutClient = readFileSync("components/checkout/CheckoutClient.tsx", "utf8");
    const parser = readFileSync("lib/commerce-checkout.ts", "utf8");
    const route = readFileSync("app/api/checkout/route.ts", "utf8");

    expect(checkoutClient).not.toContain("confirmationCode");
    expect(parser).not.toContain("confirmationCode");
    expect(route).toContain("p_whatsapp_confirmation_hash: sha256(`legacy-checkout:${trackingToken}`)");
    expect(route).toContain('p_activation_source: "public_checkout_auto"');
    expect(route).toContain('p_activation_source: "checkout_recovery"');

    const parsed = parsePublicCheckoutRequest({
      idempotencyKey: "checkout_key_1234567890",
      accessToken: "a".repeat(64),
      customer: { name: "Pelanggan Test", phone: "081234567890" },
      fulfillment: {
        method: "pickup",
        pickupLocationId: "22222222-2222-4222-8222-222222222222",
        paymentMethod: "pay_at_store"
      },
      items: [{
        variantSizeId: "33333333-3333-4333-8333-333333333333",
        quantity: 1
      }]
    });
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("confirmationCode");
  });

  it("fails payment closed for inactive, non-final, zero, paid, archived, and terminal orders", () => {
    const order = activeOrder();
    expect(automaticPaymentBlocker({ ...order, checkout_activated_at: null })).toBe("Menunggu aktivasi checkout.");
    expect(automaticPaymentBlocker({ ...order, pricing_status: "estimated" })).toBe("Menunggu penetapan harga final.");
    expect(automaticPaymentBlocker({ ...order, total_amount: 0 })).toBe("Menunggu penetapan harga final.");
    expect(automaticPaymentBlocker({ ...order, payment_status: "paid" })).toBe("Pembayaran pesanan sudah selesai.");
    expect(automaticPaymentBlocker({ ...order, status: "cancelled" })).toBe("Pesanan tidak aktif.");
    expect(automaticPaymentBlocker({ ...order, archived_at: "2026-08-06T15:01:00.000Z" })).toBe("Pesanan tidak aktif.");
    expect(automaticPaymentBlocker(order)).toBeNull();
  });

  it("keeps Custom payment blocked until the exact locked quote matches the canonical total", () => {
    const order = {
      ...activeOrder(),
      custom_project_snapshot: [{ id: "project-1" }],
      custom_quote_status: "sent",
      custom_quote_locked_at: null,
      custom_quote_locked_total: null
    };
    expect(automaticCustomPaymentBlocker(order)).toBe("Menunggu persetujuan penawaran Custom dan penguncian harga.");
    expect(automaticCustomPaymentBlocker({
      ...order,
      custom_quote_status: "locked",
      custom_quote_locked_at: "2026-08-06T15:02:00.000Z",
      custom_quote_locked_total: 140_000
    })).toBe("Menunggu persetujuan penawaran Custom dan penguncian harga.");
    expect(automaticCustomPaymentBlocker({
      ...order,
      custom_quote_status: "locked",
      custom_quote_locked_at: "2026-08-06T15:02:00.000Z",
      custom_quote_locked_total: 150_000
    })).toBeNull();
  });

  it("removes legacy verification authority from active application code", () => {
    expect(activeApplicationSources).not.toMatch(/\.rpc\(["']verify_public_order_whatsapp["']/);
    expect(activeApplicationSources).not.toMatch(/\.rpc\(["']activate_public_checkout_order_v1["']/);
    expect(activeApplicationSources).not.toContain("whatsapp_confirmed_at");
    expect(activeApplicationSources).not.toContain("verify_whatsapp");
  });
});

function collectSource(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return collectSource(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}
