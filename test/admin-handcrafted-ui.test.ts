import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Admin handcrafted UI contract", () => {
  it("keeps the canonical shell on a local system font stack and muted surfaces", () => {
    const shell = read("app/admin/admin-shell.css");
    const sidebar = read("components/admin/layout/AdminSidebar.tsx");

    expect(shell).toContain('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto');
    expect(shell).toContain("--admin-bg: #fafafa;");
    expect(shell).toContain("--admin-surface: #ffffff;");
    expect(sidebar).toContain("admin-nav-link border-l-2");
    expect(sidebar).toContain("border-zinc-900 bg-zinc-100 text-zinc-950");
    expect(sidebar).not.toContain("bg-brand-charcoal text-white");
  });

  it("uses non-blocking skeletons and respects reduced motion", () => {
    const shell = read("app/admin/admin-shell.css");
    const feedback = read("components/admin/ui/AdminFeedback.tsx");
    const access = read("components/admin/layout/AdminShell.tsx");

    expect(feedback).toContain("admin-skeleton-block");
    expect(access).toContain('aria-busy="true"');
    expect(access).toContain("admin-access-skeleton");
    expect(shell).toContain("@media (prefers-reduced-motion: reduce)");
    expect(feedback).not.toContain("animate-spin");
    expect(access).not.toContain("animate-spin");
  });

  it("keeps native tables legible with tabular numerals and restrained row motion", () => {
    const shell = read("app/admin/admin-shell.css");
    const dashboard = read("app/admin/global-dashboard.css");

    expect(shell).toContain("font-variant-numeric: tabular-nums;");
    expect(shell).toContain("transition: background-color 150ms ease;");
    expect(dashboard).toContain("font-variant-numeric: tabular-nums;");
    expect(dashboard).toContain("text-transform: uppercase;");
  });

  it("removes the dashboard's decorative dark template treatment", () => {
    const dashboard = read("app/admin/global-dashboard.css");

    expect(dashboard).not.toContain("#080e16");
    expect(dashboard).not.toContain("radial-gradient");
    expect(dashboard).not.toContain("gad-sidebar");
    expect(dashboard).not.toContain('.admin-shell-main > header');
    expect(dashboard).toContain("box-shadow: none;");
  });
});
