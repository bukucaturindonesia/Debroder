import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  classifyPaymentReviewResult,
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
const completionWorkspace = readFileSync("components/admin/PaymentCompletionPanel.tsx", "utf8");
const settingsWorkspace = readFileSync("components/admin/PaymentSettingsAdmin.tsx", "utf8");
const supabaseFactory = readFileSync("lib/supabase.ts", "utf8");

function auditNativeFormControls(source: string, fileName: string) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const labelTargets = new Set<string>();
  const controls: Array<{ tag: string; id: string; name: string }> = [];
  const literalIds: string[] = [];

  function attributeValue(attribute: ts.JsxAttribute) {
    return attribute.initializer?.getText(sourceFile) ?? "";
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const byName = new Map(attributes.map((attribute) => [attribute.name.getText(sourceFile), attributeValue(attribute)]));
      const idValue = byName.get("id") ?? "";
      if (idValue.startsWith('"') && idValue.endsWith('"')) literalIds.push(idValue);
      if (tag === "label" && byName.get("htmlFor")) labelTargets.add(byName.get("htmlFor")!);
      if (["input", "select", "textarea"].includes(tag)) {
        controls.push({ tag, id: byName.get("id") ?? "", name: byName.get("name") ?? "" });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  expect(controls.length).toBeGreaterThan(0);
  expect(new Set(literalIds).size, `${fileName}: literal ids must be unique`).toBe(literalIds.length);
  for (const control of controls) {
    expect(control.id, `${fileName}: <${control.tag}> must have id`).not.toBe("");
    expect(control.name, `${fileName}: <${control.tag}> must have name`).not.toBe("");
    expect(labelTargets, `${fileName}: ${control.id} must have label htmlFor`).toContain(control.id);
  }
}

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
    expect(publicForm).toContain("Kirim Bukti Pembayaran");
    expect(publicForm).toContain("Riwayat laporan pembayaran");
    expect(publicForm).toContain("Admin meminta perbaikan laporan pembayaran");
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

  it("classifies retry, stale state, duplicate reference, and inactive-order conflicts", () => {
    expect(classifyPaymentReviewResult({ action: "verify", currentStatus: "verified" })).toMatchObject({
      code: "PAYMENT_ALREADY_VERIFIED",
      status: 200,
      idempotent: true
    });
    expect(classifyPaymentReviewResult({ action: "verify", currentStatus: "pending", errorMessage: "STALE_PAYMENT_REVIEW" }).code).toBe("STALE_PAYMENT_REVIEW");
    expect(classifyPaymentReviewResult({ action: "verify", currentStatus: "pending", errorMessage: "DUPLICATE_BANK_REFERENCE" }).code).toBe("DUPLICATE_BANK_REFERENCE");
    expect(classifyPaymentReviewResult({ action: "verify", currentStatus: "pending", errorMessage: "Payment cannot be reviewed for inactive order" }).code).toBe("WRONG_ORDER_STATE");
    expect(reviewRoute).toContain("getCanonicalPayment");
    expect(reviewRoute).toContain('code: "PAYMENT_REVIEW_APPLIED"');
    expect(adminWorkspace).toContain("if (serverResponded) await loadData()");
  });

  it("uses one browser auth client while keeping server access non-persistent", () => {
    expect(supabaseFactory).toContain("__debroderSupabaseBrowserClient");
    expect(supabaseFactory).toContain('typeof window === "undefined"');
    expect(supabaseFactory).toContain("return createSupabaseServerClient()");
    expect(supabaseFactory).toContain("persistSession: false");
  });

  it("gives every native payment control a stable id, name, and associated label", () => {
    auditNativeFormControls(adminWorkspace, "PaymentTrackingManager.tsx");
    auditNativeFormControls(completionWorkspace, "PaymentCompletionPanel.tsx");
    auditNativeFormControls(settingsWorkspace, "PaymentSettingsAdmin.tsx");
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
