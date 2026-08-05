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
  store.set(ACTOR_ROLE_COOKIE, role as Role, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true };
}
