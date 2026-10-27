import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EVIDENCE = Object.freeze({
  stagingIdentityVerified: "STAGING_IDENTITY_UNVERIFIED",
  prodSeparated: "PRODUCTION_SEPARATION_UNVERIFIED",
  canonicalSchemaReady: "CANONICAL_SCHEMA_NOT_VERIFIED",
  migrationReconciled: "MIGRATION_RECONCILIATION_MISSING",
  dataClassifiedSyntheticOnly: "SYNTHETIC_DATA_CLASSIFICATION_MISSING",
  rlsCatalogReady: "RLS_CATALOG_NOT_VERIFIED",
  roleRuntimeVerified: "ROLE_RUNTIME_NOT_VERIFIED",
  sandboxConfigured: "MIDTRANS_SANDBOX_NOT_CONFIGURED",
  webhookHttpsVerified: "WEBHOOK_HTTPS_NOT_VERIFIED",
  appBindingVerified: "APP_TARGET_BINDING_NOT_VERIFIED",
  fullTriggerTested: "CANONICAL_TRIGGER_RUNTIME_NOT_VERIFIED",
  fastPayAtStoreImplemented: "FAST_PAY_AT_STORE_NOT_IMPLEMENTED",
  pickupSingleUseImplemented: "PICKUP_SINGLE_USE_NOT_IMPLEMENTED",
  expiryRuntimeVerified: "EXPIRY_RUNTIME_NOT_VERIFIED",
  cashierScopeVerified: "CASHIER_SCOPE_NOT_VERIFIED",
});
export const REQUIRED_STAGING_EVIDENCE = Object.freeze(Object.keys(EVIDENCE));
const BASE_EVIDENCE = Object.freeze(REQUIRED_STAGING_EVIDENCE.slice(0, 11));
const GATES = Object.freeze([
  ["checkout", BASE_EVIDENCE],
  ["pickup", [...BASE_EVIDENCE, "pickupSingleUseImplemented", "expiryRuntimeVerified"]],
  ["pay_at_store", [...BASE_EVIDENCE, "fastPayAtStoreImplemented", "pickupSingleUseImplemented", "expiryRuntimeVerified", "cashierScopeVerified"]],
  ["automatic_tasks", BASE_EVIDENCE],
]);
function invalidInput(code) {
  return { assessment: "metadata_preflight_only", runtimeVerified: false,
    status: "INVALID_INPUT", gates: [], missingEvidence: [code] };
}
function httpsUrl(value) {
  if (typeof value !== "string" || value.length > 4096 || value !== value.trim() || /[?#]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || /^https:\/\/[^/]*@/i.test(value)) return null;
    return url;
  } catch {
    return null;
  }
}
function declarationProblems(metadata) {
  const missing = [];
  const origin = httpsUrl(metadata.applicationOrigin);
  const callback = httpsUrl(metadata.webhookUrl);
  if (!origin || origin.pathname !== "/") missing.push("APPLICATION_HTTPS_ORIGIN_INVALID");
  if (!origin || origin.pathname !== "/" || !callback || callback.origin !== origin.origin || callback.pathname !== "/api/payments/midtrans/notification") {
    missing.push("WEBHOOK_ORIGIN_OR_PATH_INVALID");
  }
  if (metadata.midtransEnvironment !== "sandbox") missing.push("MIDTRANS_ENVIRONMENT_NOT_SANDBOX");
  const sha = /^[a-f0-9]{40}$/i;
  if (typeof metadata.actualSourceSha !== "string" || typeof metadata.expectedSourceSha !== "string" ||
    !sha.test(metadata.actualSourceSha) || !sha.test(metadata.expectedSourceSha) ||
    metadata.actualSourceSha.toLowerCase() !== metadata.expectedSourceSha.toLowerCase()) {
    missing.push("SOURCE_SHA_BINDING_INVALID");
  }
  return missing;
}
// Offline assertions never establish database, provider, authorization or UAT proof.
// Never echo metadata, unknown fields, URLs, file paths or raw exceptions.
export function evaluateStagingReadiness(metadata) {
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) return invalidInput("METADATA_OBJECT_REQUIRED");
  const declarationMissing = declarationProblems(metadata);
  const gates = GATES.map(([id, fields]) => {
    const missingEvidence = [...fields
      .filter((field) => !Object.hasOwn(metadata, field) || metadata[field] !== true)
      .map((field) => EVIDENCE[field]), ...declarationMissing];
    return { id, status: missingEvidence.length ? "BLOCKED" : "READY_FOR_REVIEW", missingEvidence };
  });
  return { assessment: "metadata_preflight_only", runtimeVerified: false,
    status: gates.every((gate) => gate.status === "READY_FOR_REVIEW") ? "READY_FOR_REVIEW" : "BLOCKED",
    gates, missingEvidence: [...new Set(gates.flatMap((gate) => gate.missingEvidence))] };
}
function readMetadata(path) {
  let descriptor;
  try {
    descriptor = openSync(path, "r");
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) return invalidInput("METADATA_FILE_REQUIRED");
    const maximum = 64 * 1024;
    if (stats.size > maximum) return invalidInput("METADATA_INPUT_TOO_LARGE");
    const buffer = Buffer.alloc(maximum + 1);
    const length = readSync(descriptor, buffer, 0, buffer.length, 0);
    if (length > maximum) return invalidInput("METADATA_INPUT_TOO_LARGE");
    let metadata;
    try { metadata = JSON.parse(buffer.subarray(0, length).toString("utf8")); }
    catch { return invalidInput("METADATA_JSON_INVALID"); }
    return evaluateStagingReadiness(metadata);
  } catch {
    return invalidInput("METADATA_FILE_UNREADABLE");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
export function runStagingPreflight(args) {
  const result = args.length === 1 && !args[0].startsWith("--")
    ? readMetadata(args[0]) : invalidInput("METADATA_FILE_ARGUMENT_REQUIRED");
  return { result, exitCode: result.status === "READY_FOR_REVIEW" ? 0 : result.status === "BLOCKED" ? 1 : 2 };
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { result, exitCode } = runStagingPreflight(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = exitCode;
}
