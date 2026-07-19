export const PAYMENT_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "sales_admin",
  "admin",
  "finance"
] as const;

export const PAYMENT_VERIFY_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "admin",
  "finance"
] as const;

export type PaymentRequirementType = "full" | "percentage" | "fixed" | "deposit";

export const PAYMENT_REVIEW_ACTIONS = [
  "verify",
  "funds_not_found",
  "request_correction",
  "reject"
] as const;

export type PaymentReviewAction = (typeof PAYMENT_REVIEW_ACTIONS)[number];

export type PaymentReviewInput = {
  action: PaymentReviewAction;
  destinationMethodId: string;
  checks: {
    fundsReceived: boolean;
    destinationAccount: boolean;
    amount: boolean;
    transactionTime: boolean;
    referenceUnique: boolean;
  };
  verifiedAmount: number | null;
  verifiedDestinationAccount: string;
  verifiedTransactionAt: string | null;
  verifiedReference: string;
  adminNotes: string;
  reason: string;
  expectedUpdatedAt: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePaymentReviewInput(value: unknown): PaymentReviewInput | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const action = typeof source.action === "string" ? source.action : "";
  const destinationMethodId = typeof source.destinationMethodId === "string"
    ? source.destinationMethodId.trim()
    : "";
  const checks = source.checks && typeof source.checks === "object"
    ? source.checks as Record<string, unknown>
    : {};
  const expectedUpdatedAt = typeof source.expectedUpdatedAt === "string"
    ? source.expectedUpdatedAt
    : "";
  const verifiedAmountValue = Number(source.verifiedAmount);
  const verifiedTransactionAt = typeof source.verifiedTransactionAt === "string"
    && source.verifiedTransactionAt.trim()
    ? source.verifiedTransactionAt
    : null;

  if (!PAYMENT_REVIEW_ACTIONS.includes(action as PaymentReviewAction)) return null;
  if (destinationMethodId && !UUID_PATTERN.test(destinationMethodId)) return null;
  if (action === "verify" && !destinationMethodId) return null;
  if (!expectedUpdatedAt || Number.isNaN(new Date(expectedUpdatedAt).getTime())) return null;
  if (verifiedTransactionAt && Number.isNaN(new Date(verifiedTransactionAt).getTime())) return null;

  return {
    action: action as PaymentReviewAction,
    destinationMethodId,
    checks: {
      fundsReceived: checks.fundsReceived === true,
      destinationAccount: checks.destinationAccount === true,
      amount: checks.amount === true,
      transactionTime: checks.transactionTime === true,
      referenceUnique: checks.referenceUnique === true
    },
    verifiedAmount: Number.isSafeInteger(verifiedAmountValue) && verifiedAmountValue > 0
      ? verifiedAmountValue
      : null,
    verifiedDestinationAccount: typeof source.verifiedDestinationAccount === "string"
      ? source.verifiedDestinationAccount.trim()
      : "",
    verifiedTransactionAt,
    verifiedReference: typeof source.verifiedReference === "string"
      ? source.verifiedReference.trim()
      : "",
    adminNotes: typeof source.adminNotes === "string" ? source.adminNotes.trim() : "",
    reason: typeof source.reason === "string" ? source.reason.trim() : "",
    expectedUpdatedAt
  };
}

export function paymentSettlementLabel(value: string | null | undefined) {
  return ({
    partial: "Pembayaran sebagian",
    exact: "Nominal tepat",
    overpayment: "Kelebihan pembayaran",
    under_reported: "Mutasi lebih kecil dari laporan",
    over_reported: "Mutasi lebih besar dari laporan"
  } as Record<string, string>)[value ?? ""] ?? "Belum diklasifikasikan";
}

export function calculateRequiredPayment(
  total: number,
  type: PaymentRequirementType,
  percentage = 100,
  amount: number | null = null
): number {
  const safeTotal = Math.max(0, Math.round(total));
  if (type === "percentage") {
    return Math.min(safeTotal, Math.ceil((safeTotal * Math.max(0, Math.min(100, percentage))) / 100));
  }
  if (type === "fixed" || type === "deposit") {
    return Math.min(safeTotal, Math.max(0, Math.round(amount ?? 0)));
  }
  return safeTotal;
}

export function effectivePaidTotal(verified: number, effects: number[]): number {
  return Math.max(0, Math.round(verified) + effects.reduce((sum, value) => sum + Math.round(value), 0));
}

export function isPaymentRole(role: string | null | undefined): boolean {
  return PAYMENT_ROLES.includes(role as (typeof PAYMENT_ROLES)[number]);
}

export function isPaymentVerifier(role: string | null | undefined): boolean {
  return PAYMENT_VERIFY_ROLES.includes(role as (typeof PAYMENT_VERIFY_ROLES)[number]);
}
