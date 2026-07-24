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
import {
  createServerRequestContext,
  logServerError,
  logServerEvent,
  type ServerRequestContext
} from "@/lib/observability/server";

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
  projection: CustomerOrderServerProjection,
  requestContext?: ServerRequestContext
) {
  const payment = await resolveCustomerOrderPaymentLink(
    client,
    projection,
    requestContext
  );
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
  projection: CustomerOrderServerProjection,
  requestContext?: ServerRequestContext
) {
  const payment = await resolveCustomerOrderPaymentLink(
    client,
    projection,
    requestContext
  );
  return toCustomerOrderTrackingReadModel(projection, payment);
}

async function resolveCustomerOrderPaymentLink(
  client: SupabaseClient,
  projection: CustomerOrderServerProjection,
  requestContext?: ServerRequestContext
): Promise<CustomerOrderPaymentLinkReadModel> {
  const observability = requestContext
    ?? createServerRequestContext(null, "customer order payment link");
  const order = projection.paymentLinkOrder;
  if (order.payment_method !== "bank_transfer" || order.status !== "awaiting_payment") {
    return { url: null, expiresAt: null, unavailableReason: null };
  }

  try {
    const result = await ensureAutomaticPaymentLink(client, order);
    return {
      url: relativePaymentPath(result.publicUrl, observability),
      expiresAt: result.link?.expires_at ?? null,
      unavailableReason: result.blocker
    };
  } catch (error) {
    logServerError(observability, error, {
      event: "customer_order.payment_link_unavailable",
      entityType: "order",
      entityId: order.id
    });
    return {
      url: null,
      expiresAt: null,
      unavailableReason: "Instruksi pembayaran belum tersedia."
    };
  }
}

function relativePaymentPath(
  publicUrl: string | null,
  context: ServerRequestContext
) {
  if (!publicUrl) return null;
  if (publicUrl.startsWith("/")) return publicUrl;
  try {
    const url = new URL(publicUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    logServerEvent("warn", context, "customer_order.payment_link_url_invalid");
    return null;
  }
}
