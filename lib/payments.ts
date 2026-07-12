import { createHash, randomBytes } from "node:crypto";

export const PAYMENT_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "sales_admin",
  "admin"
] as const;

export const PAYMENT_VERIFY_ROLES = [
  "owner",
  "superadmin",
  "super_admin",
  "admin"
] as const;

export type PaymentRequirementType = "full" | "percentage" | "fixed" | "deposit";

export function createPaymentToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashPaymentToken(token) };
}

export function hashPaymentToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
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

