import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("app/api/checkout/route.ts", "utf8");

describe("checkout idempotency HTTP status contract", () => {
  it("distinguishes a new order from an existing idempotent order", () => {
    expect(route).toContain("const existingOrderWasPresent = Boolean(existingOrder);");
    expect(route).toContain("}, existingOrderWasPresent ? 200 : 201);");
  });
});
