import { cookies } from "next/headers";
import { ROLES, type Role } from "./roles";

export { ROLES, ROLE_LABELS, requireRole, type Role, type PermissionResult } from "./roles";

/**
 * Real, server-enforced RBAC/SoD gate — CHECKPOINT_7_REPORT.md, sourced
 * from 01_PRODUCT_AND_PROCESS_AUTHORITY/ROLE_PERMISSION_AND_SEGREGATION_
 * OF_DUTIES_MATRIX.md's "Minimum decision matrix" and "Segregation rules".
 *
 * Disclosed simplification: there is no login/identity system in this
 * build (no users table, no session, no credential check). "Acting as"
 * is a self-service switcher (see actor-actions.ts) that writes a plain
 * cookie the browser itself controls — so this demonstrates the SHAPE of
 * server-side SoD enforcement (every mutating action re-checks the actor's
 * role at transaction time, exactly per the matrix's §4 "Permission
 * enforcement" rule) but is NOT real security: anyone with browser access
 * can switch their own role. Real authentication/authorization is
 * deferred to a later checkpoint.
 */
const COOKIE_NAME = "c1x_actor_role";
const DEFAULT_ROLE: Role = "SITE_QS_COMMERCIAL";

export async function getActorRole(): Promise<Role> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return (ROLES as readonly string[]).includes(value ?? "") ? (value as Role) : DEFAULT_ROLE;
}

export { COOKIE_NAME as ACTOR_ROLE_COOKIE };
