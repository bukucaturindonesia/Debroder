import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureAutomaticPaymentLink } from "@/lib/automatic-payment-link-v2";
import type { CustomerOrderPaymentLinkReadModel } from "@/lib/customer-orders/contracts";
import {
  selectCustomerOrderGraphByOrderNumber,
  selectCustomerOrderGraphByTokenHash
} from "@/lib/customer-orders/data-access";
import {
  projectCustomerOrderServerReadModel,
  toCustomerOrderConfirmationReadModel,
  toCustomerOrderTrackingReadModel,
  type CustomerOrderServerProjection
} from "@/lib/customer-orders/read-model";

export async function loadCustomerOrderConfirmationProjection(
  client: SupabaseClient,
  accessTokenHash: string
) {
  return projectCustomerOrderServerReadModel(
    await selectCustomerOrderGraphByTokenHash(client, accessTokenHash)
  );
}

export async function completeCustomerOrderConfirmationPage(
  client: SupabaseClient,
  projection: CustomerOrderServerProjection
) {
  const payment = await resolveCustomerOrderPaymentLink(client, projection);
  return toCustomerOrderConfirmationReadModel(projection, payment);
}

export async function loadCustomerOrderTrackingProjection(
  client: SupabaseClient,
  orderNumber: string
) {
  return projectCustomerOrderServerReadModel(
    await selectCustomerOrderGraphByOrderNumber(client, orderNumber)
  );
}

export async function completeCustomerOrderTrackingPage(
  client: SupabaseClient,
  projection: CustomerOrderServerProjection
) {
  const payment = await resolveCustomerOrderPaymentLink(client, projection);
  return toCustomerOrderTrackingReadModel(projection, payment);
}

async function resolveCustomerOrderPaymentLink(
  client: SupabaseClient,
  projection: CustomerOrderServerProjection
): Promise<CustomerOrderPaymentLinkReadModel> {
  const order = projection.paymentLinkOrder;
  if (order.payment_method !== "bank_transfer" || order.status !== "awaiting_payment") {
    return { url: null, expiresAt: null, unavailableReason: null };
  }

  try {
    const result = await ensureAutomaticPaymentLink(client, order);
    return {
      url: relativePaymentPath(result.publicUrl),
      expiresAt: result.link?.expires_at ?? null,
      unavailableReason: result.blocker
    };
  } catch (error) {
    console.error("Customer order payment link unavailable", {
      orderId: order.id,
      error: error instanceof Error ? error.name : "unknown"
    });
    return {
      url: null,
      expiresAt: null,
      unavailableReason: "Instruksi pembayaran belum tersedia."
    };
  }
}

function relativePaymentPath(publicUrl: string | null) {
  if (!publicUrl) return null;
  if (publicUrl.startsWith("/")) return publicUrl;
  try {
    const url = new URL(publicUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
