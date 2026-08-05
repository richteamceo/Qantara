"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActorRole } from "@/server/actions/actor-actions";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

export function RoleSwitcher({ actorRole }: { actorRole: Role }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-c1x-blue-soft text-[11px] font-semibold text-c1x-blue">
        RC
      </div>
      <div className="text-xs leading-tight">
        <div className="font-medium text-c1x-ink">Rich C.</div>
        <label className="flex items-center gap-1 text-c1x-muted-2">
          Acting as
          <select
            value={actorRole}
            disabled={isPending}
            onChange={(e) =>
              startTransition(async () => {
                await setActorRole(e.target.value);
                router.refresh();
              })
            }
            title="Simulated identity switcher — not real authentication (Checkpoint 7 disclosed gap)"
            className="c1x-focusable rounded border border-c1x-line bg-c1x-surface px-1 py-0.5 text-c1x-ink"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
