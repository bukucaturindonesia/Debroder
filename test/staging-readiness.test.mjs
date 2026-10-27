import assert from "node:assert/strict";
import { mkdtempSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { evaluateStagingReadiness, REQUIRED_STAGING_EVIDENCE } from "../tools/staging-readiness.mjs";

const cli = fileURLToPath(new URL("../tools/staging-readiness.mjs", import.meta.url));
const completeDeclarations = () => ({
  ...Object.fromEntries(REQUIRED_STAGING_EVIDENCE.map((field) => [field, true])),
  applicationOrigin: "https://staging.example.test",
  webhookUrl: "https://staging.example.test/api/payments/midtrans/notification",
  midtransEnvironment: "sandbox",
  actualSourceSha: "ab".repeat(20),
  expectedSourceSha: "ab".repeat(20),
});
const gate = (result, id) => result.gates.find((entry) => entry.id === id);
function withFixture(text, callback) {
  const directory = mkdtempSync(join(tmpdir(), "debroder-preflight-"));
  try {
    const path = join(directory, "metadata.json");
    writeFileSync(path, text);
    callback(path);
  } finally {
    rmSync(directory + "/metadata.json");
    rmdirSync(directory);
  }
}
function invoke(path) {
  return spawnSync(process.execPath, [cli, path], { encoding: "utf8", timeout: 5000 });
}

test("no declarations fail closed without inferring readiness from a staging name", () => {
  const result = evaluateStagingReadiness({ name: "Debroder Staging", projectHealthy: true });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.runtimeVerified, false);
  assert.equal(result.assessment, "metadata_preflight_only");
  assert.ok(result.gates.every((entry) => entry.status === "BLOCKED"));
  assert.ok(result.missingEvidence.includes("STAGING_IDENTITY_UNVERIFIED"));
});

test("false, missing, null, numeric and string truthy values are never accepted", () => {
  for (const value of [false, undefined, null, 1, "true"]) {
    const metadata = completeDeclarations();
    metadata.canonicalSchemaReady = value;
    const result = evaluateStagingReadiness(metadata);
    assert.equal(result.status, "BLOCKED");
    assert.ok(result.gates.every((entry) => entry.missingEvidence.includes("CANONICAL_SCHEMA_NOT_VERIFIED")));
  }
});

test("inherited claims are not evidence", () => {
  const result = evaluateStagingReadiness(Object.create(completeDeclarations()));
  assert.equal(result.status, "BLOCKED");
  assert.ok(result.missingEvidence.includes("STAGING_IDENTITY_UNVERIFIED"));
});

test("the current nonempty, unclassified staging snapshot stays blocked", () => {
  const metadata = { ...completeDeclarations(), stagingIdentityVerified: true, prodSeparated: true,
    canonicalSchemaReady: false, migrationReconciled: false, dataClassifiedSyntheticOnly: null,
    dataCounts: { authUsers: 7, orders: 15, payments: 1, storageObjects: 9 },
    publicTables: 124, publicRlsEnabled: 124, publicPolicies: 470 };
  const result = evaluateStagingReadiness(metadata);
  assert.equal(result.status, "BLOCKED");
  assert.ok(result.missingEvidence.includes("SYNTHETIC_DATA_CLASSIFICATION_MISSING"));
  assert.ok(result.missingEvidence.includes("CANONICAL_SCHEMA_NOT_VERIFIED"));
  assert.ok(result.missingEvidence.includes("MIGRATION_RECONCILIATION_MISSING"));
});

test("catalog-only RLS evidence cannot replace role-runtime evidence", () => {
  const metadata = { ...completeDeclarations(), rlsCatalogReady: true, roleRuntimeVerified: false };
  const result = evaluateStagingReadiness(metadata);
  assert.equal(result.status, "BLOCKED");
  assert.ok(result.missingEvidence.includes("ROLE_RUNTIME_NOT_VERIFIED"));
});

test("cashier, expiry and one-time pickup gaps block the relevant paths", () => {
  const metadata = { ...completeDeclarations(), fastPayAtStoreImplemented: false,
    pickupSingleUseImplemented: false, expiryRuntimeVerified: false, cashierScopeVerified: false };
  const result = evaluateStagingReadiness(metadata);
  assert.equal(gate(result, "checkout").status, "READY_FOR_REVIEW");
  assert.equal(gate(result, "automatic_tasks").status, "READY_FOR_REVIEW");
  assert.equal(gate(result, "pickup").status, "BLOCKED");
  assert.equal(gate(result, "pay_at_store").status, "BLOCKED");
  assert.ok(gate(result, "pay_at_store").missingEvidence.includes("CASHIER_SCOPE_NOT_VERIFIED"));
});

test("all positive assertions mean review readiness only, never a verified UAT PASS", () => {
  const result = evaluateStagingReadiness(completeDeclarations());
  assert.equal(result.status, "READY_FOR_REVIEW");
  assert.equal(result.runtimeVerified, false);
  assert.equal(result.assessment, "metadata_preflight_only");
  assert.deepEqual(result.missingEvidence, []);
  assert.ok(!JSON.stringify(result).includes("PASS"));
});

test("unknown input fields are not echoed or used as readiness evidence", () => {
  const clean = evaluateStagingReadiness({});
  assert.deepEqual(evaluateStagingReadiness({ serverKey: "PRIVATE-CANARY-NEVER-ECHO", approveEverything: true }), clean);
});

test("non-object JSON shapes are rejected without serializing their values", () => {
  for (const value of [null, true, "PRIVATE-CANARY-NEVER-ECHO", [], 15]) {
    const result = evaluateStagingReadiness(value);
    assert.equal(result.status, "INVALID_INPUT");
    assert.deepEqual(result.missingEvidence, ["METADATA_OBJECT_REQUIRED"]);
    assert.ok(!JSON.stringify(result).includes("PRIVATE-CANARY"));
  }
});

test("CLI exits one for blocked assertions and emits only sanitized output", () => {
  withFixture(JSON.stringify({ serverKey: "PRIVATE-CANARY-NEVER-ECHO", dataClassifiedSyntheticOnly: false }), (path) => {
    const result = invoke(path);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).status, "BLOCKED");
    assert.ok(!result.stdout.includes("PRIVATE-CANARY"));
    assert.ok(!result.stdout.includes(path));
  });
});

test("CLI exits zero for complete declarations but retains metadata-only label", () => {
  withFixture(JSON.stringify(completeDeclarations()), (path) => {
    const result = invoke(path);
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).assessment, "metadata_preflight_only");
    assert.equal(JSON.parse(result.stdout).runtimeVerified, false);
  });
});

test("malformed JSON uses a generic error and never prints input or file path", () => {
  withFixture('{"PRIVATE-CANARY-NEVER-ECHO":', (path) => {
    const result = invoke(path);
    assert.equal(result.status, 2);
    assert.deepEqual(JSON.parse(result.stdout).missingEvidence, ["METADATA_JSON_INVALID"]);
    assert.equal(result.stderr, "");
    assert.ok(!result.stdout.includes("PRIVATE-CANARY"));
    assert.ok(!result.stdout.includes(path));
  });
});

test("missing and extra CLI arguments reject generically", () => {
  for (const args of [[], ["--apply"], ["first.json", "PRIVATE-CANARY-NEVER-ECHO"]]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", timeout: 5000 });
    assert.equal(result.status, 2);
    assert.deepEqual(JSON.parse(result.stdout).missingEvidence, ["METADATA_FILE_ARGUMENT_REQUIRED"]);
    assert.ok(!result.stdout.includes("PRIVATE-CANARY"));
  }
});

test("unreadable metadata does not reveal a filename or native error", () => {
  const path = join(tmpdir(), "nonexistent-private-canary-directory", "PRIVATE-CANARY-NEVER-ECHO.json");
  const result = invoke(path);
  assert.equal(result.status, 2);
  assert.deepEqual(JSON.parse(result.stdout).missingEvidence, ["METADATA_FILE_UNREADABLE"]);
  assert.equal(result.stderr, "");
  assert.ok(!result.stdout.includes("PRIVATE-CANARY"));
});

test("oversized metadata is rejected before JSON processing", () => {
  withFixture("PRIVATE-CANARY-NEVER-ECHO".repeat(4000), (path) => {
    const result = invoke(path);
    assert.equal(result.status, 2);
    assert.deepEqual(JSON.parse(result.stdout).missingEvidence, ["METADATA_INPUT_TOO_LARGE"]);
    assert.ok(!result.stdout.includes("PRIVATE-CANARY"));
  });
});

test("HTTPS application origin must be root-only and contain no credentials or query", () => {
  for (const applicationOrigin of [null, "http://staging.example.test", "https://user:PRIVATE-CANARY@example.test", "https://staging.example.test/path", "https://staging.example.test/?x=PRIVATE-CANARY", "https://staging.example.test/#PRIVATE-CANARY", "https://@staging.example.test"]) {
    const result = evaluateStagingReadiness({ ...completeDeclarations(), applicationOrigin });
    assert.equal(result.status, "BLOCKED");
    assert.ok(result.missingEvidence.includes("APPLICATION_HTTPS_ORIGIN_INVALID"));
    assert.ok(!JSON.stringify(result).includes("PRIVATE-CANARY"));
  }
});

test("callback must use the same HTTPS origin and exact notification route", () => {
  for (const webhookUrl of [null, "http://staging.example.test/api/payments/midtrans/notification", "https://other.example.test/api/payments/midtrans/notification", "https://staging.example.test/api/payments/midtrans/status", "https://staging.example.test/api/payments/midtrans/notification/", "https://staging.example.test/api/payments/midtrans/notification?secret=PRIVATE-CANARY", "https://staging.example.test/api/payments/midtrans/notification#PRIVATE-CANARY"]) {
    const result = evaluateStagingReadiness({ ...completeDeclarations(), webhookUrl });
    assert.equal(result.status, "BLOCKED");
    assert.ok(result.missingEvidence.includes("WEBHOOK_ORIGIN_OR_PATH_INVALID"));
    assert.ok(!JSON.stringify(result).includes("PRIVATE-CANARY"));
  }
});

test("production or unknown Midtrans declaration cannot satisfy sandbox readiness", () => {
  for (const midtransEnvironment of [null, "production", "SANDBOX", true]) {
    const result = evaluateStagingReadiness({ ...completeDeclarations(), midtransEnvironment });
    assert.equal(result.status, "BLOCKED");
    assert.ok(result.missingEvidence.includes("MIDTRANS_ENVIRONMENT_NOT_SANDBOX"));
  }
});

test("application binding requires two complete matching source SHAs", () => {
  for (const fields of [{ actualSourceSha: null }, { expectedSourceSha: "ab1234" }, { actualSourceSha: "cd".repeat(20) }, { actualSourceSha: "zz".repeat(20) }]) {
    const result = evaluateStagingReadiness({ ...completeDeclarations(), ...fields });
    assert.equal(result.status, "BLOCKED");
    assert.ok(result.missingEvidence.includes("SOURCE_SHA_BINDING_INVALID"));
  }
  assert.equal(evaluateStagingReadiness({ ...completeDeclarations(), actualSourceSha: "AB".repeat(20) }).status, "READY_FOR_REVIEW");
});

test("CLI does not echo secret-shaped URL fields or source values", () => {
  withFixture(JSON.stringify({ ...completeDeclarations(), applicationOrigin: "https://user:PRIVATE-CANARY-NEVER-ECHO@example.test", webhookUrl: "https://other.example.test/PRIVATE-CANARY-NEVER-ECHO", actualSourceSha: "PRIVATE-CANARY-NEVER-ECHO", serverKey: "PRIVATE-CANARY-NEVER-ECHO" }), (path) => {
    const result = invoke(path);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.ok(!result.stdout.includes("PRIVATE-CANARY"));
    assert.ok(!result.stdout.includes("example.test"));
    assert.ok(!result.stdout.includes(path));
  });
});
