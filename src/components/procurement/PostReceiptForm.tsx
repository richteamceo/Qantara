"use client";

import { useState, useTransition } from "react";
import { postAcceptedReceipt, type PostReceiptResult } from "@/server/actions/fulfilment-actions";

export function PostReceiptForm({
  projectReference,
  fulfilmentReference,
  orderedQty,
  unit,
}: {
  projectReference: string;
  fulfilmentReference: string;
  orderedQty: number;
  unit: string;
}) {
  const [accepted, setAccepted] = useState(String(orderedQty));
  const [rejected, setRejected] = useState("0");
  const [result, setResult] = useState<PostReceiptResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Receive &amp; inspect</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-c1x-muted">
          Accepted ({unit})
          <input
            type="number"
            min={0}
            max={orderedQty}
            step="0.001"
            value={accepted}
            onChange={(e) => setAccepted(e.target.value)}
            className="c1x-focusable c1x-tabular w-32 rounded-[var(--c1x-radius-control)] border border-c1x-line px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-c1x-muted">
          Rejected ({unit})
          <input
            type="number"
            min={0}
            step="0.001"
            value={rejected}
            onChange={(e) => setRejected(e.target.value)}
            className="c1x-focusable c1x-tabular w-32 rounded-[var(--c1x-radius-control)] border border-c1x-line px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const r = await postAcceptedReceipt(projectReference, fulfilmentReference, Number(accepted), Number(rejected));
              setResult(r);
            })
          }
          className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
        >
          {isPending ? "Posting…" : "Post Accepted Receipt"}
        </button>
      </div>
      {result && (
        <div className={`mt-2 text-xs ${result.status === "posted" ? "text-c1x-green" : "text-c1x-red"}`}>
          {result.status === "posted" && `Posted — accepted ${result.accepted} ${unit}, rejected ${result.rejected} ${unit}, outstanding ${result.outstanding} ${unit}.`}
          {result.status === "already_posted" && "Already posted — immutable, use a reversal (not implemented) to correct."}
          {result.status === "invalid" && result.reason}
          {result.status === "not_found" && "Not found."}
        </div>
      )}
    </div>
  );
}
