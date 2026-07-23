export const CANONICAL_PANEL_ROLES = ["superadmin", "admin", "admin_guest"] as const;

export type CanonicalPanelRole = (typeof CANONICAL_PANEL_ROLES)[number];

export type PanelRoleNormalization =
  | {
      supported: true;
      canonicalRole: CanonicalPanelRole;
      sourceRole: string;
      usedLegacyAlias: boolean;
    }
  | {
      supported: false;
      canonicalRole: null;
      sourceRole: string | null;
      usedLegacyAlias: false;
      reason: "missing_role" | "unsupported_role";
    };

export function normalizePanelRole(value: unknown): PanelRoleNormalization {
  if (typeof value !== "string" || !value.trim()) {
    return {
      supported: false,
      canonicalRole: null,
      sourceRole: null,
      usedLegacyAlias: false,
      reason: "missing_role"
    };
  }

  const sourceRole = value.trim().toLowerCase();
  if (sourceRole === "super_admin") {
    return {
      supported: true,
      canonicalRole: "superadmin",
      sourceRole,
      usedLegacyAlias: true
    };
  }

  if (CANONICAL_PANEL_ROLES.includes(sourceRole as CanonicalPanelRole)) {
    return {
      supported: true,
      canonicalRole: sourceRole as CanonicalPanelRole,
      sourceRole,
      usedLegacyAlias: false
    };
  }

  return {
    supported: false,
    canonicalRole: null,
    sourceRole,
    usedLegacyAlias: false,
    reason: "unsupported_role"
  };
}
