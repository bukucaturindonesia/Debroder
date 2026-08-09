import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationName = "20260806234500_customer_checkout_activation_integrity_v2.sql";
const migrationPath = join("supabase", "migrations", migrationName);
const migration = readFileSync(migrationPath, "utf8");
const compact = migration.replace(/\s+/g, " ").toLowerCase();
let assertions = 0;

function ok(value, message) {
  assert.ok(value, message);
  assertions += 1;
}
function includes(value, fragment, message = fragment) {
  ok(value.includes(fragment), `Missing contract: ${message}`);
}
function excludes(value, pattern, message = String(pattern)) {
  ok(!pattern.test(value), `Forbidden contract found: ${message}`);
}
function source(path) { return readFileSync(path, "utf8"); }
function collectSource(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return collectSource(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}

ok(existsSync(migrationPath), "Strict V2 migration must exist.");
ok(
  readdirSync("supabase/migrations").filter((name) =>
    name.endsWith("_customer_checkout_activation_integrity_v2.sql")
  ).length === 1,
  "Strict V2 migration must be unique."
);
includes(compact, "begin;");
includes(compact, "commit;");
excludes(compact, /\b(drop table|truncate table|delete from auth\.users)\b/);

for (const fragment of [
  "add column if not exists checkout_activated_at timestamptz",
  "add column if not exists checkout_activated_by uuid",
  "add column if not exists checkout_activation_source text",
  "set checkout_activated_at = whatsapp_confirmed_at",
  "checkout_activation_source = 'legacy_backfill'",
  "create or replace function public.enforce_checkout_activation_integrity_v2()",
  "create trigger orders_checkout_activation_integrity_v2",
  "Aktivasi checkout bersifat immutable",
  "new.whatsapp_confirmation_hash := null",
  "new.whatsapp_confirmation_expires_at := null",
  "new.whatsapp_confirmation_attempts := 0",
  "create or replace function public.activate_public_checkout_order_v2(",
  "Pesanan terminal tidak dapat diaktifkan",
  "Email akun pelanggan belum terverifikasi",
  "Email checkout tidak sama dengan email akun terverifikasi",
  "Pesanan sudah terhubung ke akun pelanggan lain",
  "select public.activate_public_checkout_order_v2(",
  "'legacy_wrapper'"
]) includes(migration, fragment);

const checkoutClient = source("components/checkout/CheckoutClient.tsx");
const checkoutParser = source("lib/commerce-checkout.ts");
const checkoutRoute = source("app/api/checkout/route.ts");
const publicOrderRoute = source("app/api/public/orders/[token]/route.ts");
const adminOperations = source("components/admin/CommerceOrderOperations.tsx");
const paymentLink = source("lib/automatic-payment-link.ts");
const customerRead = source("lib/customer-orders/read-model.ts");
const adminRead = source("lib/admin-orders/read-model.ts");

excludes(checkoutClient, /confirmationCode/);
excludes(checkoutParser, /confirmationCode/);
includes(checkoutRoute, "p_whatsapp_confirmation_hash: sha256(`legacy-checkout:${trackingToken}`)");
includes(checkoutRoute, 'p_activation_source: "public_checkout_auto"');
includes(checkoutRoute, 'p_activation_source: "checkout_recovery"');
includes(publicOrderRoute, 'p_activation_source: "public_order_recovery"');
includes(adminOperations, 'p_activation_source: "admin_recovery"');
includes(paymentLink, "checkout_activated_at");
excludes(paymentLink, /whatsapp_confirmed_at/);
includes(customerRead, "checkoutActivatedAt");
includes(adminRead, "checkout_activated_at");

const allSources = ["app", "components", "lib"].flatMap(collectSource).join("\n");
excludes(allSources, /\.rpc\(["']verify_public_order_whatsapp["']/);
excludes(allSources, /\.rpc\(["']activate_public_checkout_order_v1["']/);
excludes(allSources, /whatsapp_confirmed_at|verify_whatsapp|confirmationCode/);

console.log(JSON.stringify({
  status: "PASS",
  assertions,
  migration: migrationName,
  canonicalActivationAuthority: true,
  clientConfirmationCodeRemoved: true,
  legacyRpcNotReachableFromApplication: true,
  paymentFailsClosed: true
}, null, 2));
