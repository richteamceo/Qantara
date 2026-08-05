"use client";

import { useActionState } from "react";
import { approvePrepareRequestPackage, type ApprovePrepareResult } from "@/server/actions/request-actions";
import { ForbiddenNotice } from "@/components/shell/ForbiddenNotice";

async function runAction(
  projectReference: string,
  requestReference: string
): Promise<ApprovePrepareResult> {
  return approvePrepareRequestPackage(projectReference, requestReference);
}

export function ApprovePrepareButton({
  projectReference,
  requestReference,
  disabled,
  disabledReason,
}: {
  projectReference: string;
  requestReference: string;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const [result, formAction, isPending] = useActionState(
    runAction.bind(null, projectReference, requestReference),
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
          {isPending ? "Working…" : "Approve & Prepare Package"}
        </button>
      </form>
      {result && (
        <div
          className={`max-w-xs text-right text-[11px] ${
            result.status === "created"
              ? "text-c1x-green"
              : result.status === "blocked" || result.status === "forbidden"
                ? "text-c1x-red"
                : "text-c1x-muted"
          }`}
        >
          {result.status === "created" && `Created ${result.packageReference}. Package page (P04) isn't built yet (Checkpoint 3) — request status is now APPROVED.`}
          {result.status === "already_allocated" && `Already allocated to ${result.packageReference} (no duplicate created).`}
          {result.status === "blocked" && (
            <>
              Blocked: {result.reason}
              <ul className="list-disc pl-4">
                {result.blockedLines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </>
          )}
          {result.status === "not_found" && "Request not found."}
          {result.status === "forbidden" && <ForbiddenNotice requiredRole={result.requiredRole} actorRole={result.actorRole} />}
        </div>
      )}
    </div>
  );
}
