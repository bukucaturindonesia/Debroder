"use client";

import type {
  CustomerOrderApiErrorCode,
  CustomerOrderConfirmationReadModel,
  CustomerOrderTrackingCredentials,
  CustomerOrderTrackingReadModel
} from "@/lib/customer-orders/contracts";

export class CustomerOrderApiError extends Error {
  constructor(
    message: string,
    readonly code: CustomerOrderApiErrorCode,
    readonly status: number
  ) {
    super(message);
  }
}

export async function fetchCustomerOrderConfirmation(
  token: string,
  signal?: AbortSignal
) {
  return customerOrderFetch<CustomerOrderConfirmationReadModel>(
    `/api/public/orders/${encodeURIComponent(token)}`,
    { cache: "no-store", signal }
  );
}

export async function fetchCustomerOrderTracking(
  credentials: CustomerOrderTrackingCredentials,
  signal?: AbortSignal
) {
  return customerOrderFetch<CustomerOrderTrackingReadModel>(
    "/api/public/order-tracking",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(credentials),
      signal
    }
  );
}

async function customerOrderFetch<T>(input: RequestInfo | URL, init: RequestInit) {
  const response = await fetch(input, init);
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = payload && typeof payload === "object" && !Array.isArray(payload)
      ? Object.fromEntries(Object.entries(payload))
      : {};
    const code = isCustomerOrderErrorCode(record.code)
      ? record.code
      : "CUSTOMER_ORDER_UNAVAILABLE";
    const message = typeof record.error === "string"
      ? record.error
      : "Status pesanan belum dapat dimuat.";
    throw new CustomerOrderApiError(message, code, response.status);
  }
  return payload as T;
}

function isCustomerOrderErrorCode(value: unknown): value is CustomerOrderApiErrorCode {
  return typeof value === "string" && new Set<CustomerOrderApiErrorCode>([
    "CUSTOMER_ORDER_INVALID_REQUEST",
    "CUSTOMER_ORDER_NOT_FOUND",
    "CUSTOMER_ORDER_ACCESS_EXPIRED",
    "CUSTOMER_ORDER_ACCESS_DENIED",
    "CUSTOMER_ORDER_RATE_LIMITED",
    "CUSTOMER_ORDER_UNAVAILABLE",
    "CUSTOMER_ORDER_ACTION_FAILED"
  ]).has(value as CustomerOrderApiErrorCode);
}

