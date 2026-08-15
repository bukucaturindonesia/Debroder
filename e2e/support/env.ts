export type Wave0aEnv = {
  baseUrl: string;
  customerA: Credentials;
  customerB: Credentials;
  readyStock: {
    slug: string;
    variant: string;
    size: string;
    pickupLocationId: string;
  };
  paymentProofPath: string;
  fullAdmin: Credentials;
  adminGuest: Credentials;
  scopedAdmin: Credentials;
  outOfScopeOrderId: string;
};

export type Credentials = { email: string; password: string };

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`BLOCKED — EXTERNAL RUNTIME EVIDENCE REQUIRED: missing ${name}.`);
  return value;
}

export function requireWave0aEnv(): Wave0aEnv {
  if (process.env.E2E_ALLOW_MUTATIONS !== "1") {
    throw new Error("BLOCKED — EXTERNAL RUNTIME EVIDENCE REQUIRED: set E2E_ALLOW_MUTATIONS=1 only for an isolated test/staging runtime.");
  }

  return {
    baseUrl: process.env.E2E_BASE_URL?.trim() || "http://127.0.0.1:3100",
    customerA: {
      email: required("E2E_CUSTOMER_A_EMAIL"),
      password: required("E2E_CUSTOMER_A_PASSWORD")
    },
    customerB: {
      email: required("E2E_CUSTOMER_B_EMAIL"),
      password: required("E2E_CUSTOMER_B_PASSWORD")
    },
    readyStock: {
      slug: required("E2E_READY_STOCK_PRODUCT_SLUG"),
      variant: required("E2E_READY_STOCK_VARIANT_LABEL"),
      size: required("E2E_READY_STOCK_SIZE_LABEL"),
      pickupLocationId: required("E2E_READY_STOCK_PICKUP_LOCATION_ID")
    },
    paymentProofPath: required("E2E_PAYMENT_PROOF_PATH"),
    fullAdmin: {
      email: required("E2E_FULL_ADMIN_EMAIL"),
      password: required("E2E_FULL_ADMIN_PASSWORD")
    },
    adminGuest: {
      email: required("E2E_ADMIN_GUEST_EMAIL"),
      password: required("E2E_ADMIN_GUEST_PASSWORD")
    },
    scopedAdmin: {
      email: required("E2E_SCOPED_ADMIN_EMAIL"),
      password: required("E2E_SCOPED_ADMIN_PASSWORD")
    },
    outOfScopeOrderId: required("E2E_OUT_OF_SCOPE_ORDER_ID")
  };
}
