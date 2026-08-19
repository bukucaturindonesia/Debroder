import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260818020559_customer_auth_server_acl_v1.sql"),
  "utf8"
);
const sessionServer = readFileSync(resolve(process.cwd(), "lib/customer-auth/server.ts"), "utf8");
const addressRoute = readFileSync(resolve(process.cwd(), "app/api/customer/addresses/route.ts"), "utf8");

describe("customer-auth server ACL contract (STATIC CONTRACT EVIDENCE)", () => {
  it("grants only the server role the privileges required by customer-auth routes", () => {
    expect(migration).toContain("grant select, insert, update on table public.customer_profiles to service_role;");
    expect(migration).toContain("grant select, insert, update, delete on table public.customer_addresses to service_role;");
    expect(migration).not.toMatch(/grant .* to (public|anon|authenticated)\s*;/i);
  });

  it("keeps the customer-auth consumers on the server-only client", () => {
    expect(sessionServer).toContain("getAdminSupabaseClient");
    expect(sessionServer).toContain('from("customer_profiles")');
    expect(addressRoute).toContain("getAdminSupabaseClient");
    expect(addressRoute).toContain('from("customer_addresses")');
  });
});
