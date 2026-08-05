import { ROLE_LABELS, type Role } from "@/lib/roles";

/** Shared rendering for the {status:"forbidden"} result every role-gated action returns. */
export function ForbiddenNotice({ requiredRole, actorRole }: { requiredRole: Role; actorRole: Role }) {
  return (
    <span>
      Blocked — requires <strong>{ROLE_LABELS[requiredRole]}</strong>, you are acting as{" "}
      <strong>{ROLE_LABELS[actorRole]}</strong>. Switch role in the top bar to test this transition.
    </span>
  );
}
