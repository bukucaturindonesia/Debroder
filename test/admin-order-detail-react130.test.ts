import { readFileSync } from "node:fs";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { CustomOrderOperationalWorkspace } from "@/components/admin/CustomOrderOperationalWorkspace";
import { OrderOperationalWorkspace } from "@/components/admin/OrderOperationalWorkspace";
import {
  adminOrderCompatibilityWarning,
  formatAdminOrderDate,
  formatAdminOrderDateTime,
  formatAdminOrderDateTimeInput,
  resolveAdminOrderWorkspaceKind
} from "@/lib/admin-order-detail";

const read = (path: string) => readFileSync(path, "utf8");

const operationalProps = {
  order: {
    id: "11111111-1111-1111-1111-111111111111",
    status: "baru",
    pricing_status: "final",
    payment_balance: 0,
    payment_effective_total: 150_000,
    payment_production_eligible: true,
    checkout_source: null,
    whatsapp_confirmed_at: null
  },
  jobOrder: null,
  qualityControl: null,
  fulfillment: null
};

describe("Admin Order Detail React #130 regression", () => {
  it("resolves both workspace named exports to real React element types", () => {
    expect(typeof OrderOperationalWorkspace).toBe("function");
    expect(typeof CustomOrderOperationalWorkspace).toBe("function");
    expect(createElement(OrderOperationalWorkspace, operationalProps).type).toBe(OrderOperationalWorkspace);
    expect(createElement(CustomOrderOperationalWorkspace, operationalProps).type).toBe(CustomOrderOperationalWorkspace);
  });

  it("removes the exact alias that previously redirected the standard export to the Custom module", () => {
    const tsconfig = JSON.parse(read("tsconfig.json")) as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    expect(tsconfig.compilerOptions.paths["@/components/admin/OrderOperationalWorkspace"]).toBeUndefined();

    const detail = read("components/admin/OrderDetailAdmin.tsx");
    expect(detail).toContain('import { OrderOperationalWorkspace } from "@/components/admin/OrderOperationalWorkspace"');
    expect(detail).toContain('import { CustomOrderOperationalWorkspace } from "@/components/admin/CustomOrderOperationalWorkspace"');
    expect(detail).toContain('workspaceKind === "custom"');
    expect(detail).not.toMatch(/(?:component|icon)Map\s*\[/i);
  });

  it("blocks this module-integrity regression before production build despite unrelated baseline findings", () => {
    const config = read("next.config.ts");
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(config).toContain("ignoreBuildErrors");
    expect(config).toContain("ignoreDuringBuilds");
    expect(packageJson.scripts.prebuild).toBe("vitest run test/admin-order-detail-react130.test.ts");
  });

  it("selects a stable workspace for Ready Stock, Custom, Jersey, payment-less, and historical orders", () => {
    const fixtures = [
      { name: "Ready Stock", snapshot: null, expected: "standard" },
      { name: "Custom", snapshot: [{ id: "custom-project" }], expected: "custom" },
      { name: "Jersey Ready Stock", snapshot: null, expected: "standard" },
      { name: "Jersey Custom", snapshot: [{ id: "jersey-custom-project" }], expected: "custom" },
      { name: "order tanpa payment", snapshot: undefined, expected: "standard" },
      { name: "historical order", snapshot: { legacy: true }, expected: "standard" }
    ] as const;

    for (const fixture of fixtures) {
      expect(resolveAdminOrderWorkspaceKind(fixture.snapshot), fixture.name).toBe(fixture.expected);
    }
  });

  it("renders invalid or missing timestamps with a safe fallback", () => {
    for (const value of [null, undefined, "", "not-a-timestamp", Number.NaN]) {
      expect(formatAdminOrderDate(value)).toBe("—");
      expect(formatAdminOrderDateTime(value)).toBe("—");
      expect(formatAdminOrderDateTimeInput(value)).toBe("");
    }
    expect(formatAdminOrderDate("2026-07-19T00:00:00.000Z")).not.toBe("—");
    expect(formatAdminOrderDateTime("2026-07-19T00:00:00.000Z")).not.toBe("—");
  });

  it("shows a compatibility warning for unknown historical states without selecting an undefined renderer", () => {
    expect(adminOrderCompatibilityWarning("baru")).toBeNull();
    expect(adminOrderCompatibilityWarning("legacy_unknown_state")).toContain("tidak dikenali");
    expect(resolveAdminOrderWorkspaceKind(undefined)).toBe("standard");
  });
});
