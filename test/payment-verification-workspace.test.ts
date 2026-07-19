import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parsePaymentReviewInput,
  paymentSettlementLabel
} from "@/lib/payments";

const migration = readFileSync(
  "supabase/migrations/20260719140000_payment_verification_and_fulfillment.sql",
  "utf8"
).toLowerCase();
const publicRoute = readFileSync("app/api/public/payments/[token]/route.ts", "utf8");
const reviewRoute = readFileSync("app/api/admin/payments/[id]/verification/route.ts", "utf8");
const publicForm = readFileSync("components/payments/PublicPaymentForm.tsx", "utf8");
const adminWorkspace = readFileSync("components/admin/PaymentTrackingManager.tsx", "utf8");
const settingsWorkspace = readFileSync("components/admin/PaymentSettingsAdmin.tsx", "utf8");

const validReview = {
  action: "verify",
  destinationMethodId: "11111111-1111-4111-8111-111111111111",
  checks: {
    fundsReceived: true,
    destinationAccount: true,
    amount: true,
    transactionTime: true,
    referenceUnique: true
  },
  verifiedAmount: 150_000,
  verifiedDestinationAccount: "1234567890",
  verifiedTransactionAt: "2026-07-19T02:00:00.000Z",
  verifiedReference: "MUT-001",
  adminNotes: "Cocok pada mutasi",
  reason: "",
  expectedUpdatedAt: "2026-07-19T02:05:00.000Z"
};

describe("Payment verification and mutation workspace", () => {
  it("parses a complete server review contract and rejects malformed identity data", () => {
    expect(parsePaymentReviewInput(validReview)?.checks.referenceUnique).toBe(true);
    expect(parsePaymentReviewInput({ ...validReview, destinationMethodId: "invalid" })).toBeNull();
    expect(parsePaymentReviewInput({ ...validReview, action: "approve-proof" })).toBeNull();
  });

  it("uses bank settlement values and distinguishes partial/overpayment outcomes", () => {
    expect(paymentSettlementLabel("partial")).toBe("Pembayaran sebagian");
    expect(paymentSettlementLabel("overpayment")).toBe("Kelebihan pembayaran");
    expect(migration).toContain("coalesce(verified_amount,amount)");
    expect(migration).toContain("settlement_classification");
    expect(migration).toContain("under_reported");
    expect(migration).toContain("overpayment");
  });

  it("server-gates verification with row locks, stale checks, account match, and duplicate references", () => {
    expect(migration).toContain("for update of p,o");
    expect(migration).toContain("stale_payment_review");
    expect(migration).toContain("seluruh checklist mutasi bank wajib dikonfirmasi");
    expect(migration).toContain("rekening tujuan tidak sesuai pengaturan pembayaran");
    expect(migration).toContain("duplicate_bank_reference");
    expect(migration).toContain("order_payments_verified_reference_unique_idx");
    expect(reviewRoute).toContain('actor.client.rpc("review_order_payment"');
    expect(reviewRoute).not.toContain('actor.client.rpc("verify_order_payment"');
  });

  it("keeps proof upload a customer report and idempotently reuses the same order payment", () => {
    expect(publicRoute).toContain("submission_idempotency_key");
    expect(publicRoute).toContain("idempotent: true");
    expect(publicRoute).toContain('rpc("submit_customer_order_payment_v2"');
    expect(migration).toContain("laporan pembayaran pelanggan menunggu pemeriksaan mutasi bank");
    expect(publicForm).toContain("Bukti transfer bukan konfirmasi pembayaran final");
    expect(publicForm).toContain("Kirim Laporan Pembayaran");
    expect(publicForm).toContain("Riwayat laporan pembayaran");
    expect(publicForm).toContain("Admin meminta koreksi laporan pembayaran");
  });

  it("provides centrally managed methods and all four review outcomes", () => {
    expect(migration).toContain("create table if not exists public.payment_method_settings");
    expect(migration).toContain("upsert_payment_method_setting");
    expect(settingsWorkspace).toContain("Pengaturan Metode Pembayaran");
    expect(adminWorkspace).toContain('submitReview("verify")');
    expect(adminWorkspace).toContain('submitReview("funds_not_found")');
    expect(adminWorkspace).toContain('submitReview("request_correction")');
    expect(adminWorkspace).toContain('submitReview("reject")');
  });

  it("keeps proof storage private and removes authenticated legacy verification bypasses", () => {
    expect(migration).toContain("revoke all on public.payment_method_settings from public, anon, authenticated");
    expect(migration).toContain("revoke all on function public.verify_order_payment(uuid,text)");
    expect(migration).toContain("grant execute on function public.verify_order_payment(uuid,text) to service_role");
    expect(publicRoute).toContain('.storage.from("payment-proofs").upload');
    expect(publicRoute).toContain("MAX_BYTES");
    expect(publicRoute).toContain("hasValidFileSignature");
  });
});
