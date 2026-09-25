import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const accountFrame = readFileSync(
  resolve(process.cwd(), "components/customer-account/CustomerAccountFrame.tsx"),
  "utf8"
);

describe("customer account logout navigation (STATIC CONTRACT EVIDENCE)", () => {
  it("leaves the protected account route before auth state clears", () => {
    expect(accountFrame).toContain("const isSigningOut = useRef(false);");
    expect(accountFrame).toContain("!isSigningOut.current");
    expect(accountFrame).toContain('isSigningOut.current = true; await auth.signOut(); router.replace("/"); router.refresh();');
  });
});
