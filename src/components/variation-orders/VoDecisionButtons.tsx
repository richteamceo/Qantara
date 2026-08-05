"use client";

import { useState, useTransition } from "react";
import { decideVariationOrder, type DecideVoResult } from "@/server/actions/variation-order-actions";
import { ForbiddenNotice } from "@/components/shell/ForbiddenNotice";

export function VoDecisionButtons({ projectReference, voNumber }: { projectReference: string; voNumber: string }) {
  const [result, setResult] = useState<DecideVoResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const r = await decideVariationOrder(projectReference, voNumber, decision);
      setResult(r);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("APPROVED")}
          className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-green px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("REJECTED")}
          className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-red px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "…" : "Reject"}
        </button>
      </div>
      {result && result.status === "forbidden" && (
        <div className="text-[11px] text-c1x-red">
          <ForbiddenNotice requiredRole={result.requiredRole} actorRole={result.actorRole} />
        </div>
      )}
      {result && result.status === "already_decided" && (
        <div className="text-[11px] text-c1x-amber">Already {result.decision}.</div>
      )}
      {result && result.status === "not_found" && <div className="text-[11px] text-c1x-red">Not found.</div>}
    </div>
  );
}
