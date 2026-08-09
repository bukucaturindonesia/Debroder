import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationName = "20260806214500_customer_account_email_verification_v1.sql";
const migrationPath = join("supabase", "migrations", migrationName);
const migration = readFileSync(migrationPath, "utf8");
const activationMigrationPath = join("supabase", "migrations", "20260806234500_customer_checkout_activation_integrity_v2.sql");
const activationMigration = readFileSync(activationMigrationPath, "utf8");
const compactMigration = migration.replace(/\s+/g, " ").toLowerCase();
let assertions = 0;

function source(path) {
  return readFileSync(path, "utf8");
}

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

ok(existsSync(migrationPath), "Customer migration must exist.");
ok(
  readdirSync("supabase/migrations").filter((name) =>
    name.endsWith("_customer_account_email_verification_v1.sql")
  ).length === 1,
  "Customer migration must be unique."
);
includes(compactMigration, "begin;");
includes(compactMigration, "commit;");
excludes(compactMigration, /\b(drop table|truncate table|delete from auth\.users)\b/);

for (const fragment of [
  "create table if not exists public.customer_profiles",
  "create table if not exists public.customer_addresses",
  "terms_accepted_at timestamptz not null",
  "add column if not exists customer_user_id uuid references auth.users(id)",
  "create or replace function public.customer_email_is_internal_v1",
  "create or replace function public.activate_public_checkout_order_v1",
  "create or replace function public.claim_verified_customer_orders_v1",
  "confirmation_sent_at is not null",
  "email_confirmed_at >= confirmation_sent_at",
  "raw_app_meta_data ->> 'account_type' = 'customer'",
  "raw_app_meta_data ->> 'signup_channel' = 'debroder_public_v1'",
  "raw_app_meta_data ->> 'terms_accepted_at'",
  "create policy \"Customer reads own profile\"",
  "create policy \"Customer reads own addresses\"",
  "create policy \"Customer reads own orders\"",
  "drop policy if exists \"global dashboard store scope orders\"",
  "drop policy if exists \"rbac store scope orders\""
]) includes(migration, fragment);

includes(compactMigration, "grant select on public.customer_profiles to authenticated;");
includes(compactMigration, "grant select on public.customer_addresses to authenticated;");
excludes(compactMigration, /grant select, insert, update, delete on public\.customer_addresses to authenticated/);
includes(compactMigration, "revoke all on function public.customer_email_is_internal_v1(text) from public, anon, authenticated;");
includes(compactMigration, "grant execute on function public.customer_email_is_internal_v1(text) to service_role;");

const claimStart = migration.indexOf("create or replace function public.claim_verified_customer_orders_v1");
const claimEnd = migration.indexOf("alter table public.customer_profiles enable row level security", claimStart);
const claim = migration.slice(claimStart, claimEnd);
includes(claim, "lower(btrim(coalesce(customer_email, ''))) = verified_email");
includes(claim, "customer_user_id is null");
excludes(claim, /customer_phone\s*=|whatsapp/i);

const customerPages = [
  "app/login/page.tsx",
  "app/register/page.tsx",
  "app/verify-email/page.tsx",
  "app/forgot-password/page.tsx",
  "app/reset-password/page.tsx",
  "app/auth/callback/page.tsx",
  "app/account/page.tsx",
  "app/account/orders/page.tsx",
  "app/account/orders/[id]/page.tsx",
  "app/account/profile/page.tsx",
  "app/account/addresses/page.tsx"
];
const customerApiRoutes = [
  "app/api/customer/session/route.ts",
  "app/api/customer/orders/route.ts",
  "app/api/customer/orders/[id]/route.ts",
  "app/api/customer/addresses/route.ts",
  "app/api/customer/addresses/[id]/route.ts",
  "app/api/customer/auth/register/route.ts",
  "app/api/customer/auth/resend/route.ts",
  "app/api/customer/auth/recovery/route.ts"
];
for (const path of [...customerPages, ...customerApiRoutes]) ok(existsSync(path), `Missing ${path}`);

const register = source("app/api/customer/auth/register/route.ts");
for (const fragment of [
  "customer_email_is_internal_v1",
  "signUpData.session",
  "CUSTOMER_EMAIL_CONFIRMATION_REQUIRED",
  "admin.auth.admin.updateUserById",
  'account_type: "customer"',
  'signup_channel: "debroder_public_v1"',
  "terms_accepted_at: termsAcceptedAt"
]) includes(register, fragment);

for (const path of [
  "app/api/customer/auth/resend/route.ts",
  "app/api/customer/auth/recovery/route.ts"
]) includes(source(path), "customer_email_is_internal_v1", path);

const server = source("lib/customer-auth/server.ts");
for (const fragment of [
  "user.confirmation_sent_at",
  'user.app_metadata?.account_type !== "customer"',
  'user.app_metadata?.signup_channel !== "debroder_public_v1"',
  "verifiedTimestamp(user.app_metadata?.terms_accepted_at)",
  "CUSTOMER_INTERNAL_ACCOUNT",
  "CUSTOMER_ACCOUNT_NOT_PROVISIONED"
]) includes(server, fragment);

const client = source("lib/customer-auth/client.ts");
includes(client, 'CUSTOMER_AUTH_STORAGE_KEY = "debroder-customer-auth-v1"');
includes(client, 'flowType: "implicit"');
includes(client, 'value.startsWith("/admin")');

const provider = source("components/customer-auth/CustomerAuthProvider.tsx");
includes(provider, '!pathname.startsWith("/admin")');
includes(provider, "CUSTOMER_EMAIL_NOT_VERIFIED");
includes(provider, "CUSTOMER_ACCOUNT_NOT_PROVISIONED");

const forms = source("components/customer-auth/CustomerAuthForms.tsx");
for (const fragment of [
  "onAuthStateChange",
  "validateRecoverySession",
  'fetch("/api/customer/session"',
  "requiresRecaptcha && !siteKey",
  "Periksa koneksi lalu coba lagi"
]) includes(forms, fragment);

const recaptchaServer = source("lib/recaptcha-server.ts");
includes(recaptchaServer, "Layanan verifikasi keamanan belum tersedia.");
includes(recaptchaServer, "result.action === action");

const header = source("components/header/SiteHeaderClient.tsx");
includes(header, 'accountLabel = customerAuth.profile ? "Akun Saya" : "Masuk"');
includes(header, "PUBLIC_ROUTES.login");
excludes(header, /\/admin\/login|Admin Login/);

const routes = source("lib/public-routes.ts");
for (const key of [
  "login", "register", "verifyEmail", "forgotPassword", "resetPassword",
  "account", "accountOrders", "accountProfile", "accountAddresses", "accountOrder"
]) ok(new RegExp(`\\b${key}:`).test(routes), `Missing route key ${key}`);
const sitemapSection = routes.slice(routes.indexOf("PUBLIC_SITEMAP_ROUTES"));
for (const fragment of [
  "PUBLIC_ROUTES.accountOrders",
  "PUBLIC_ROUTES.accountProfile",
  "PUBLIC_ROUTES.accountAddresses"
]) ok(!sitemapSection.includes(fragment), `Private route leaked into sitemap: ${fragment}`);

const checkout = source("app/api/checkout/route.ts");
for (const fragment of [
  "optionalVerifiedCustomer(request)",
  "CHECKOUT_CUSTOMER_EMAIL_REQUIRED",
  "activate_public_checkout_order_v2",
  "p_customer_user_id: customerAccount?.user.id ?? null"
]) includes(checkout, fragment);
includes(activationMigration, "Checkout web diaktifkan otomatis.");
includes(activationMigration, "checkout_activated_at");
includes(migration, "p_customer_user_id uuid default null");

const confirmation = source("components/checkout/OrderConfirmationClient.tsx");
const checkoutClient = source("components/checkout/CheckoutClient.tsx");
const checkoutParser = source("lib/commerce-checkout.ts");
const adminOperations = source("components/admin/CommerceOrderOperations.tsx");
excludes(confirmation, /confirmationCode|verify_public_order_whatsapp/);
excludes(checkoutClient, /confirmationCode/);
excludes(checkoutParser, /confirmationCode/);
excludes(adminOperations, /verify_public_order_whatsapp/);
includes(adminOperations, "Aktifkan Pesanan");

const roots = ["app", "components", "lib"];
const allSources = roots.flatMap(collectSource).join("\n");
excludes(allSources, /\.rpc\(["']verify_public_order_whatsapp["']/);
excludes(allSources, /\.rpc\(["']activate_public_checkout_order_v1["']/);
excludes(allSources, /whatsapp_confirmed_at|verify_whatsapp/);

console.log(JSON.stringify({
  status: "PASS",
  assertions,
  migration: migrationName,
  customerSessionStorage: "debroder-customer-auth-v1",
  adminRouteExcluded: true,
  guestCheckoutPreserved: true,
  manualWhatsappVerificationRemoved: true
}, null, 2));

function collectSource(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return collectSource(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}
