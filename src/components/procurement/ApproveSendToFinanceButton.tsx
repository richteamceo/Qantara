"use client";

import { useActionState } from "react";
import { approveSendToFinance, type ApproveSendToFinanceResult } from "@/server/actions/procurement-actions";

async function runAction(
  projectReference: string,
  awardReference: string
): Promise<ApproveSendToFinanceResult> {
  return approveSendToFinance(projectReference, awardReference);
}

export function ApproveSendToFinanceButton({
  projectReference,
  awardReference,
  disabled,
  disabledReason,
}: {
  projectReference: string;
  awardReference: string;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const [result, formAction, isPending] = useActionState(
    runAction.bind(null, projectReference, awardReference),
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
          {isPending ? "Working…" : "Approve & Send to Finance"}
        </button>
      </form>
      {result && (
        <div className={`max-w-xs text-right text-[11px] ${result.status === "created" ? "text-c1x-green" : "text-c1x-muted"}`}>
          {result.status === "created" && `Created ${result.financeReference} (route pending Page 06 lock).`}
          {result.status === "already_exists" && `Already sent — ${result.financeReference} (no duplicate created).`}
          {result.status === "not_found" && "Award not found."}
        </div>
      )}
    </div>
  );
}
