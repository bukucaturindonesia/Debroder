import type { CustomCheckoutProject } from "@/lib/custom-commerce/types";
import { parseCustomCheckoutProjects } from "@/lib/custom-commerce/validation";
import { parseStructuredIndonesiaAddress, type StructuredIndonesiaAddressInput } from "@/lib/indonesia-address";
import {
  MAX_CART_LINES,
  MAX_CART_LINE_QUANTITY,
  MAX_CART_TOTAL_QUANTITY
} from "@/lib/cart-v5";

export type CheckoutFulfillmentMethod = "pickup" | "shipping";
export type CheckoutPaymentMethod = "bank_transfer" | "pay_at_store";

export const MAX_CHECKOUT_ITEMS = MAX_CART_LINES;
export const MAX_CHECKOUT_LINE_QUANTITY = MAX_CART_LINE_QUANTITY;
export const MAX_CHECKOUT_TOTAL_QUANTITY = MAX_CART_TOTAL_QUANTITY;

export type PublicCheckoutRequest = {
  idempotencyKey: string;
  accessToken: string;
  confirmationCode: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
  fulfillment: {
    method: CheckoutFulfillmentMethod;
    address?: string;
    addressSnapshot?: StructuredIndonesiaAddressInput;
    pickupLocationId?: string;
    paymentMethod: CheckoutPaymentMethod;
  };
  items: Array<{
    variantSizeId: string;
    quantity: number;
    note?: string;
  }>;
  customProjects: CustomCheckoutProject[];
};

export function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function parsePublicCheckoutRequest(value: unknown): PublicCheckoutRequest | null {
  if (!isRecord(value) || !isRecord(value.customer) || !isRecord(value.fulfillment) || !Array.isArray(value.items)) return null;

  const idempotencyKey = text(value.idempotencyKey);
  const accessToken = text(value.accessToken);
  const confirmationCode = text(value.confirmationCode).toUpperCase();
  const name = text(value.customer.name);
  const phone = normalizeWhatsapp(text(value.customer.phone));
  const email = text(value.customer.email);
  const notes = text(value.customer.notes);
  const method = value.fulfillment.method;
  const address = text(value.fulfillment.address);
  const pickupLocationId = text(value.fulfillment.pickupLocationId);
  const paymentMethod = value.fulfillment.paymentMethod;
  const customProjects = parseCustomCheckoutProjects(value.customProjects ?? []);
  const addressSnapshot = parseStructuredIndonesiaAddress(value.fulfillment.addressSnapshot);

  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) return null;
  if (!/^[a-zA-Z0-9_-]{32,160}$/.test(accessToken)) return null;
  if (!/^[A-Z0-9]{8,12}$/.test(confirmationCode)) return null;
  if (name.length < 2 || name.length > 150 || phone.length < 9 || phone.length > 15) return null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  if (method !== "pickup" && method !== "shipping") return null;
  if (paymentMethod !== "bank_transfer" && paymentMethod !== "pay_at_store") return null;
  if (!customProjects) return null;
  if (method === "shipping" && paymentMethod !== "bank_transfer") return null;
  if (method === "shipping" && !addressSnapshot) return null;
  if (method === "pickup" && !/^[0-9a-fA-F-]{36}$/.test(pickupLocationId)) return null;
  if (value.items.length > MAX_CHECKOUT_ITEMS) return null;
  if (value.items.length < 1 && customProjects.length < 1) return null;
  if (value.items.length > 0 && customProjects.length > 0) return null;

  const items: PublicCheckoutRequest["items"] = [];
  const variantIds = new Set<string>();
  let totalQuantity = 0;
  for (const item of value.items) {
    if (!isRecord(item)) return null;
    const variantSizeId = text(item.variantSizeId);
    const quantity = Number(item.quantity);
    if (
      !/^[0-9a-fA-F-]{36}$/.test(variantSizeId)
      || !Number.isSafeInteger(quantity)
      || quantity < 1
      || quantity > MAX_CHECKOUT_LINE_QUANTITY
    ) return null;
    if (variantIds.has(variantSizeId)) return null;
    variantIds.add(variantSizeId);
    totalQuantity += quantity;
    if (totalQuantity > MAX_CHECKOUT_TOTAL_QUANTITY) return null;
    items.push({ variantSizeId, quantity, note: text(item.note).slice(0, 1000) || undefined });
  }

  return {
    idempotencyKey,
    accessToken,
    confirmationCode,
    customer: { name, phone, email: email || undefined, notes: notes.slice(0, 2000) || undefined },
    fulfillment: {
      method,
      address: method === "shipping" ? address || undefined : undefined,
      addressSnapshot: method === "shipping" ? addressSnapshot ?? undefined : undefined,
      pickupLocationId: method === "pickup" ? pickupLocationId : undefined,
      paymentMethod
    },
    items,
    customProjects
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
