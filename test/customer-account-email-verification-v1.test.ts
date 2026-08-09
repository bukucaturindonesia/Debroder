import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationName = "20260806214500_customer_account_email_verification_v1.sql";
const migrationPath = join("supabase", "migrations", migrationName);
const activationMigrationPath = join("supabase", "migrations", "20260806234500_customer_checkout_activation_integrity_v2.sql");
const activationMigration = readFileSync(activationMigrationPath, "utf8");
const migration = readFileSync(migrationPath, "utf8");
const compactMigration = migration.replace(/\s+/g, " ").toLowerCase();

function source(path: string) {
  return readFileSync(path, "utf8");
}

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
] as const;

const customerApiRoutes = [
  "app/api/customer/session/route.ts",
  "app/api/customer/orders/route.ts",
  "app/api/customer/orders/[id]/route.ts",
  "app/api/customer/addresses/route.ts",
  "app/api/customer/addresses/[id]/route.ts",
  "app/api/customer/auth/register/route.ts",
  "app/api/customer/auth/resend/route.ts",
  "app/api/customer/auth/recovery/route.ts"
] as const;

describe("Customer Account & Email Verification V1", () => {
  it("adds exactly one additive customer-account migration", () => {
    expect(existsSync(migrationPath)).toBe(true);
    expect(
      readdirSync("supabase/migrations").filter((name) =>
        name.endsWith("_customer_account_email_verification_v1.sql")
      )
    ).toEqual([migrationName]);
    expect(compactMigration).toContain("begin;");
    expect(compactMigration).toContain("commit;");
    expect(compactMigration).not.toMatch(/\b(drop table|truncate table|delete from auth\.users)\b/);
  });

  it("keeps customer identity separate from the internal admin profile", () => {
    expect(migration).toContain("create table if not exists public.customer_profiles");
    expect(migration).toContain("create table if not exists public.customer_addresses");
    expect(migration).toContain("add column if not exists customer_user_id uuid references auth.users(id)");
    expect(migration).toContain("exists(select 1 from public.profiles where id = p_customer_user_id)");
    expect(source("lib/customer-auth/server.ts")).toContain("CUSTOMER_INTERNAL_ACCOUNT");
    expect(source("components/header/SiteHeaderClient.tsx")).not.toContain("/admin/login");
  });

  it("requires a real email-confirmation event and server-provisioned customer account", () => {
    expect(migration).toContain("confirmation_sent_at is not null");
    expect(migration).toContain("email_confirmed_at >= confirmation_sent_at");
    expect(migration).toContain("raw_app_meta_data ->> 'account_type' = 'customer'");
    expect(migration).toContain("raw_app_meta_data ->> 'signup_channel' = 'debroder_public_v1'");
    expect(migration).toContain("terms_accepted_at timestamptz not null");
    expect(migration).toContain("raw_app_meta_data ->> 'terms_accepted_at'");
    expect(migration).toContain("create or replace function public.customer_email_is_internal_v1");

    const register = source("app/api/customer/auth/register/route.ts");
    expect(register).toContain("signUpData.session");
    expect(register).toContain("CUSTOMER_EMAIL_CONFIRMATION_REQUIRED");
    expect(register).toContain("admin.rpc");
    expect(register).toContain("customer_email_is_internal_v1");
    expect(register).toContain("admin.auth.admin.updateUserById");
    expect(register).toContain('account_type: "customer"');
    expect(register).toContain('signup_channel: "debroder_public_v1"');
    expect(register).toContain("terms_accepted_at: termsAcceptedAt");

    const resend = source("app/api/customer/auth/resend/route.ts");
    const recovery = source("app/api/customer/auth/recovery/route.ts");
    expect(resend).toContain("customer_email_is_internal_v1");
    expect(recovery).toContain("customer_email_is_internal_v1");

    const server = source("lib/customer-auth/server.ts");
    expect(server).toContain("user.confirmation_sent_at");
    expect(server).toContain('user.app_metadata?.account_type !== "customer"');
    expect(server).toContain('user.app_metadata?.signup_channel !== "debroder_public_v1"');
    expect(server).toContain("verifiedTimestamp(user.app_metadata?.terms_accepted_at)");
  });

  it("ships the full public customer route surface without publishing private account pages in the sitemap", () => {
    expect(customerPages.filter((path) => !existsSync(path))).toEqual([]);
    expect(customerApiRoutes.filter((path) => !existsSync(path))).toEqual([]);
    const routes = source("lib/public-routes.ts");
    for (const key of [
      "login", "register", "verifyEmail", "forgotPassword", "resetPassword",
      "account", "accountOrders", "accountProfile", "accountAddresses", "accountOrder"
    ]) {
      expect(routes).toMatch(new RegExp(`\\b${key}:`));
    }
    const sitemapSection = routes.slice(routes.indexOf("PUBLIC_SITEMAP_ROUTES"));
    expect(sitemapSection).not.toContain("PUBLIC_ROUTES.accountOrders");
    expect(sitemapSection).not.toContain("PUBLIC_ROUTES.accountProfile");
    expect(sitemapSection).not.toContain("PUBLIC_ROUTES.accountAddresses");
  });

  it("isolates the public customer session from the admin session", () => {
    const client = source("lib/customer-auth/client.ts");
    expect(client).toContain('CUSTOMER_AUTH_STORAGE_KEY = "debroder-customer-auth-v1"');
    expect(client).toContain('flowType: "implicit"');
    expect(client).toContain('value.startsWith("/admin")');
    const provider = source("components/customer-auth/CustomerAuthProvider.tsx");
    expect(provider).toContain('!pathname.startsWith("/admin")');
    const authForms = source("components/customer-auth/CustomerAuthForms.tsx");
    expect(authForms).toContain("requiresRecaptcha && !siteKey");
    expect(authForms).toContain("validateRecoverySession");
    expect(authForms).toContain('fetch("/api/customer/session"');
    const recaptchaServer = source("lib/recaptcha-server.ts");
    expect(recaptchaServer).toContain("Layanan verifikasi keamanan belum tersedia.");

    const header = source("components/header/SiteHeaderClient.tsx");
    expect(header).toContain('accountLabel = customerAuth.profile ? "Akun Saya" : "Masuk"');
    expect(header).toContain("PUBLIC_ROUTES.login");
    expect(header).not.toContain("Admin Login");
  });

  it("allows only the verified customer to read owned profiles, addresses, and orders", () => {
    expect(migration).toContain('create policy "Customer reads own profile"');
    expect(migration).toContain("using (id = auth.uid())");
    expect(migration).toContain('create policy "Customer reads own addresses"');
    expect(migration).toContain("using (customer_id = auth.uid())");
    expect(migration).toContain('create policy "Customer reads own orders"');
    expect(migration).toContain("customer_user_id = auth.uid() and archived_at is null");

    expect(migration).toContain('drop policy if exists "global dashboard store scope orders"');
    expect(migration).toContain('drop policy if exists "rbac store scope orders"');
    expect(compactMigration).toContain("grant select on public.customer_profiles to authenticated;");
    expect(compactMigration).toContain("grant select on public.customer_addresses to authenticated;");
    expect(compactMigration).not.toContain("grant select, insert, update, delete on public.customer_addresses to authenticated");
  });

  it("claims historical orders by exact verified email and never by phone or WhatsApp", () => {
    const claimStart = migration.indexOf("create or replace function public.claim_verified_customer_orders_v1");
    const claimEnd = migration.indexOf("alter table public.customer_profiles enable row level security", claimStart);
    const claim = migration.slice(claimStart, claimEnd);
    expect(claim).toContain("lower(btrim(coalesce(customer_email, ''))) = verified_email");
    expect(claim).not.toMatch(/customer_phone\s*=|whatsapp/i);
    expect(claim).toContain("customer_user_id is null");
  });

  it("activates web checkout automatically while keeping guest checkout available", () => {
    const checkout = source("app/api/checkout/route.ts");
    expect(checkout).toContain("optionalVerifiedCustomer(request)");
    expect(checkout).toContain("CHECKOUT_CUSTOMER_EMAIL_REQUIRED");
    expect(checkout).toContain("activate_public_checkout_order_v2");
    expect(checkout).toContain('p_activation_source: "public_checkout_auto"');
    expect(checkout).toContain("p_customer_user_id: customerAccount?.user.id ?? null");
    expect(activationMigration).toContain("Checkout web diaktifkan otomatis.");
    expect(activationMigration).toContain("checkout_activated_at");
    expect(migration).toContain("p_customer_user_id uuid default null");
  });

  it("removes customer-facing and admin manual WhatsApp verification actions", () => {
    const confirmation = source("components/checkout/OrderConfirmationClient.tsx");
    const checkoutClient = source("components/checkout/CheckoutClient.tsx");
    const checkoutParser = source("lib/commerce-checkout.ts");
    const adminOperations = source("components/admin/CommerceOrderOperations.tsx");
    const appSources = ["app", "components", "lib"].flatMap((root) => collectSource(root)).join("\n");

    expect(confirmation).not.toContain("confirmationCode");
    expect(checkoutClient).not.toContain("confirmationCode");
    expect(checkoutParser).not.toContain("confirmationCode");
    expect(confirmation).not.toContain("verify_public_order_whatsapp");
    expect(adminOperations).not.toContain("verify_public_order_whatsapp");
    expect(appSources).not.toMatch(/\.rpc\(["']verify_public_order_whatsapp["']/);
    expect(adminOperations).toContain("Aktifkan Pesanan");
  });
});

function collectSource(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return collectSource(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}
