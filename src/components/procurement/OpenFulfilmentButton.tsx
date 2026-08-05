"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openFulfilment } from "@/server/actions/purchase-order-actions";

export function OpenFulfilmentButton({
  projectReference,
  poReference,
}: {
  projectReference: string;
  poReference: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await openFulfilment(projectReference, poReference);
            if (result.status === "opened") {
              router.push(`/app/projects/${projectReference}/fulfilment/${result.fulfilmentReference}`);
            } else if (result.status === "no_lines_available") {
              setError("Every line already has a fulfilment record.");
            } else {
              setError("Purchase order not found.");
            }
          })
        }
        className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
      >
        {isPending ? "Opening…" : "Issue PO & Open Fulfilment"}
      </button>
      {error && <div className="text-[11px] text-c1x-amber">{error}</div>}
    </div>
  );
}
