"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openPaymentVoucher, type OpenPaymentVoucherResult } from "@/server/actions/payment-voucher-actions";
import { ForbiddenNotice } from "@/components/shell/ForbiddenNotice";

export function OpenPaymentVoucherButton({
  projectReference,
  fulfilmentReference,
}: {
  projectReference: string;
  fulfilmentReference: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OpenPaymentVoucherResult | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await openPaymentVoucher(projectReference, fulfilmentReference);
            if (r.status === "opened" || r.status === "already_open") {
              router.push(`/app/projects/${projectReference}/payment-vouchers/${r.voucherReference}`);
            } else {
              setResult(r);
            }
          })
        }
        className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
      >
        {isPending ? "Opening…" : "Certify & Open Payment Voucher"}
      </button>
      {result && result.status === "not_posted" && (
        <div className="text-[11px] text-c1x-amber">Receipt must be posted before a voucher can be opened.</div>
      )}
      {result && result.status === "not_found" && <div className="text-[11px] text-c1x-amber">Fulfilment not found.</div>}
      {result && result.status === "forbidden" && (
        <div className="text-[11px] text-c1x-red">
          <ForbiddenNotice requiredRole={result.requiredRole} actorRole={result.actorRole} />
        </div>
      )}
    </div>
  );
}
