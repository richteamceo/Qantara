"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ROLES, ACTOR_ROLE_COOKIE, type Role } from "@/lib/auth";

/**
 * Self-service "Acting as" switcher — see src/lib/auth.ts for the full
 * disclosure. This is a simulated identity switch, not a login: it lets
 * the reviewer exercise every role-gated action's allow/deny paths from a
 * single browser session without a real auth system.
 */
export async function setActorRole(role: string): Promise<{ ok: boolean }> {
  if (!(ROLES as readonly string[]).includes(role)) return { ok: false };
  const store = await cookies();
  // httpOnly: nothing in this app reads document.cookie client-side (the
  // RoleSwitcher receives its value as a server-rendered prop) — no
  // functional reason for the cookie to be script-readable, so it isn't
  // (SECURITY_AND_ACCESS_CONTROL_STANDARD.md session-cookie posture,
  // applied here even though this cookie is a disclosed simulated-identity
  // switcher, not a real session token).
  store.set(ACTOR_ROLE_COOKIE, role as Role, { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
  return { ok: true };
}
