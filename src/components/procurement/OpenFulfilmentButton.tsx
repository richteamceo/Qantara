"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openFulfilment, type OpenFulfilmentResult } from "@/server/actions/purchase-order-actions";
import { ForbiddenNotice } from "@/components/shell/ForbiddenNotice";

export function OpenFulfilmentButton({
  projectReference,
  poReference,
}: {
  projectReference: string;
  poReference: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OpenFulfilmentResult | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await openFulfilment(projectReference, poReference);
            if (r.status === "opened") {
              router.push(`/app/projects/${projectReference}/fulfilment/${r.fulfilmentReference}`);
            } else {
              setResult(r);
            }
          })
        }
        className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
      >
        {isPending ? "Opening…" : "Issue PO & Open Fulfilment"}
      </button>
      {result && result.status === "no_lines_available" && (
        <div className="text-[11px] text-c1x-amber">Every line already has a fulfilment record.</div>
      )}
      {result && result.status === "not_found" && <div className="text-[11px] text-c1x-amber">Purchase order not found.</div>}
      {result && result.status === "forbidden" && (
        <div className="text-[11px] text-c1x-red">
          <ForbiddenNotice requiredRole={result.requiredRole} actorRole={result.actorRole} />
        </div>
      )}
    </div>
  );
}
