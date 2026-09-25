export type Wave0aEnv = {
  baseUrl: string;
  targetEnv: "staging" | "test" | "preview";
  supabaseProjectRef: string;
  fixturePrefix: string;
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
export type Wave0cRuntimeEnv = Record<string, string | undefined>;

export const WAVE_0C_SAFE_IDENTITY = "DEBRODER-WAVE-0C-STAGING";
export const PRODUCTION_SUPABASE_PROJECT_REF = "lzennundwqqtyvvcnzbg";

const REQUIRED_RUNTIME_ENV_NAMES = [
  "E2E_CUSTOMER_A_EMAIL",
  "E2E_CUSTOMER_A_PASSWORD",
  "E2E_CUSTOMER_B_EMAIL",
  "E2E_CUSTOMER_B_PASSWORD",
  "E2E_READY_STOCK_PRODUCT_SLUG",
  "E2E_READY_STOCK_VARIANT_LABEL",
  "E2E_READY_STOCK_SIZE_LABEL",
  "E2E_READY_STOCK_PICKUP_LOCATION_ID",
  "E2E_PAYMENT_PROOF_PATH",
  "E2E_FULL_ADMIN_EMAIL",
  "E2E_FULL_ADMIN_PASSWORD",
  "E2E_ADMIN_GUEST_EMAIL",
  "E2E_ADMIN_GUEST_PASSWORD",
  "E2E_SCOPED_ADMIN_EMAIL",
  "E2E_SCOPED_ADMIN_PASSWORD",
  "E2E_OUT_OF_SCOPE_ORDER_ID"
] as const;

export function stagingContractBlocker(
  input: Wave0cRuntimeEnv = process.env
): string | null {
  const environment = input.DEBRODER_ENV?.trim().toLowerCase();
  const targetEnv = input.E2E_TARGET_ENV?.trim().toLowerCase();
  const baseUrl = input.E2E_BASE_URL?.trim();
  const projectRef = input.E2E_SUPABASE_PROJECT_REF?.trim();
  const expectedProjectRef = input.E2E_EXPECTED_SUPABASE_PROJECT_REF?.trim();
  const fixturePrefix = input.E2E_FIXTURE_PREFIX?.trim();
  const namespaceConfirmed = input.E2E_FIXTURE_NAMESPACE_CONFIRMED?.trim();
  const safeIdentity = input.E2E_SAFE_STAGING_IDENTITY?.trim();
  const allowedTarget = targetEnv === "staging" || targetEnv === "test" || targetEnv === "preview";
  const missingRuntimeField = REQUIRED_RUNTIME_ENV_NAMES.some((name) => !input[name]?.trim());

  if (
    !baseUrl
    || environment !== targetEnv
    || !allowedTarget
    || safeIdentity !== WAVE_0C_SAFE_IDENTITY
    || !projectRef
    || !expectedProjectRef
    || projectRef !== expectedProjectRef
    || projectRef === PRODUCTION_SUPABASE_PROJECT_REF
    || !/^[a-z0-9]{20}$/.test(projectRef)
    || !fixturePrefix
    || !/^debroder_e2e(?:[-_][a-z0-9_-]+)?$/i.test(fixturePrefix)
    || namespaceConfirmed !== "1"
    || missingRuntimeField
  ) {
    return "BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED";
  }

  return null;
}

export function wave0cRuntimeBlocker(
  input: Wave0cRuntimeEnv = process.env
): string | null {
  const identityBlocker = stagingContractBlocker(input);
  if (identityBlocker) return identityBlocker;
  if (input.E2E_ALLOW_MUTATIONS !== "1") {
    return "BLOCKED — EXTERNAL RUNTIME EVIDENCE REQUIRED: set E2E_ALLOW_MUTATIONS=1 only for an isolated test/staging runtime.";
  }
  return null;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`BLOCKED — EXTERNAL RUNTIME EVIDENCE REQUIRED: missing ${name}.`);
  return value;
}

export function requireWave0aEnv(): Wave0aEnv {
  const runtimeBlocker = wave0cRuntimeBlocker(process.env);
  if (runtimeBlocker) throw new Error(runtimeBlocker);

  const targetEnv = process.env.E2E_TARGET_ENV?.trim().toLowerCase();
  const verifiedTargetEnv = targetEnv as "staging" | "test" | "preview";

  return {
    baseUrl: process.env.E2E_BASE_URL!.trim(),
    targetEnv: verifiedTargetEnv,
    supabaseProjectRef: process.env.E2E_SUPABASE_PROJECT_REF!.trim(),
    fixturePrefix: process.env.E2E_FIXTURE_PREFIX!.trim(),
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
