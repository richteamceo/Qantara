"use client";

import { useActionState } from "react";
import { openAwardDecision, type OpenAwardResult } from "@/server/actions/procurement-actions";

async function runAction(
  projectReference: string,
  packageReference: string
): Promise<OpenAwardResult> {
  return openAwardDecision(projectReference, packageReference);
}

export function OpenAwardButton({
  projectReference,
  packageReference,
  disabled,
  disabledReason,
}: {
  projectReference: string;
  packageReference: string;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const [result, formAction, isPending] = useActionState(
    runAction.bind(null, projectReference, packageReference),
    null
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <button
          type="submit"
          disabled={disabled || isPending}
          title={disabled ? (disabledReason ?? undefined) : undefined}
          className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line disabled:text-c1x-muted-2"
        >
          {isPending ? "Working…" : "Open / Prepare Award Decision"}
        </button>
      </form>
      {result && (
        <div className={`max-w-xs text-right text-[11px] ${result.status === "created" ? "text-c1x-green" : result.status === "blocked" ? "text-c1x-red" : "text-c1x-muted"}`}>
          {result.status === "created" && `Created ${result.awardReference}.`}
          {result.status === "already_exists" && `Already has ${result.awardReference} (no duplicate created).`}
          {result.status === "blocked" && `Blocked: ${result.reason}`}
          {result.status === "not_found" && "Package not found."}
        </div>
      )}
    </div>
  );
}
