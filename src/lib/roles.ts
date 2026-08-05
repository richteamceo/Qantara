/**
 * Client-safe half of the RBAC/SoD model — see src/lib/auth.ts for the
 * server-only half (getActorRole, which touches next/headers) and the
 * full disclosure of what this is and isn't. Split into its own file so
 * client components (the role switcher, the shared forbidden-result
 * notice) can import the Role type/labels without pulling `next/headers`
 * into a client bundle.
 */
export const ROLES = [
  "REQUESTER_SITE_ENGINEER",
  "SITE_QS_COMMERCIAL",
  "PROCUREMENT",
  "FINANCE",
  "PROJECT_DIRECTOR",
  "RECEIVER",
  "AP_TREASURY",
  "AUDITOR",
  "MANAGING_DIRECTOR",
  "ACCOUNTANT",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  REQUESTER_SITE_ENGINEER: "Requester / Site Engineer",
  SITE_QS_COMMERCIAL: "QS / Commercial Lead",
  PROCUREMENT: "Procurement Officer",
  FINANCE: "Finance Reviewer",
  PROJECT_DIRECTOR: "Project Director",
  RECEIVER: "Storekeeper / Receiver",
  AP_TREASURY: "AP / Treasury",
  AUDITOR: "Auditor",
  /**
   * Added Checkpoint 12 — sourced directly from the source workbook
   * (Cost Control System.xlsm), not invented. REQUESTER/PROCUREMENT
   * sheets name a "③ MANAGING DIRECTOR APPROVAL" step distinct from
   * PROJECT_DIRECTOR (which was a CORE1X SoD-matrix role for a different
   * transition, "Approve & Send to Finance"); FINANCE VALIDATION sheet
   * names a distinct "ACCOUNTANT APPROVAL" column, separate from the
   * FINANCE role's route-lock function. See CHECKPOINT_12_REPORT.md.
   */
  MANAGING_DIRECTOR: "Managing Director",
  ACCOUNTANT: "Accountant",
};

export type PermissionResult = { ok: true } | { ok: false; requiredRole: Role; actorRole: Role };

/** Server-side gate — call at the top of every mutating server action, before any DB access. */
export function requireRole(actorRole: Role, requiredRole: Role): PermissionResult {
  if (actorRole === requiredRole) return { ok: true };
  return { ok: false, requiredRole, actorRole };
}
