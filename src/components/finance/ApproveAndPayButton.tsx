"use client";

import { useState, useTransition } from "react";
import { approveAndReleasePayment, type ApproveAndPayResult } from "@/server/actions/payment-voucher-actions";

export function ApproveAndPayButton({
  projectReference,
  voucherReference,
}: {
  projectReference: string;
  voucherReference: string;
}) {
  const [result, setResult] = useState<ApproveAndPayResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await approveAndReleasePayment(projectReference, voucherReference);
            setResult(r);
          })
        }
        className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
      >
        {isPending ? "Releasing…" : "Approve Voucher & Release Payment"}
      </button>
      {result && (
        <div className={`text-[11px] ${result.status === "paid" ? "text-c1x-green" : "text-c1x-red"}`}>
          {result.status === "paid" && `Paid ${result.netPayable.toLocaleString()} ${result.currency}.`}
          {result.status === "already_paid" && "Already paid — immutable, no reversal flow yet."}
          {result.status === "not_found" && "Not found."}
        </div>
      )}
    </div>
  );
}
