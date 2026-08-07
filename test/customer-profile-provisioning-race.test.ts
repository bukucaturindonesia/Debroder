import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const server = readFileSync("lib/customer-auth/server.ts", "utf8");

function provisioningBlock() {
  const start = server.indexOf("if (!existing) {");
  const end = server.indexOf("} else if (existing.email !== normalizedEmail)", start);
  if (start < 0 || end < 0) throw new Error("Customer profile provisioning block not found.");
  return server.slice(start, end);
}

describe("Customer profile provisioning race hotfix", () => {
  it("uses atomic idempotent provisioning keyed by auth user id", () => {
    const block = provisioningBlock();
    expect(block).toContain('.from("customer_profiles").upsert({');
    expect(block).toContain('onConflict: "id"');
    expect(block).toContain("ignoreDuplicates: true");
    expect(block).not.toContain('.from("customer_profiles").insert({');
  });

  it("does not overwrite an existing profile in a racing request", () => {
    const block = provisioningBlock();
    expect(block).not.toMatch(/\.update\s*\(/);
    expect(block).not.toMatch(/ignoreDuplicates:\s*false/);
    expect(server).toContain("existing.email !== normalizedEmail");
  });

  it("re-reads the canonical profile before claiming historical orders", () => {
    const provisionEnd = server.indexOf("} else if (existing.email !== normalizedEmail)");
    const canonicalRead = server.indexOf('.from("customer_profiles")', provisionEnd);
    const singleRead = server.indexOf(".single();", canonicalRead);
    const claim = server.indexOf('client.rpc("claim_verified_customer_orders_v1"', singleRead);
    expect(provisionEnd).toBeGreaterThan(-1);
    expect(canonicalRead).toBeGreaterThan(provisionEnd);
    expect(singleRead).toBeGreaterThan(canonicalRead);
    expect(claim).toBeGreaterThan(singleRead);
  });
});
