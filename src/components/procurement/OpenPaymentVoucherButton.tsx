"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openPaymentVoucher } from "@/server/actions/payment-voucher-actions";

export function OpenPaymentVoucherButton({
  projectReference,
  fulfilmentReference,
}: {
  projectReference: string;
  fulfilmentReference: string;
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
            const result = await openPaymentVoucher(projectReference, fulfilmentReference);
            if (result.status === "opened" || result.status === "already_open") {
              router.push(`/app/projects/${projectReference}/payment-vouchers/${result.voucherReference}`);
            } else if (result.status === "not_posted") {
              setError("Receipt must be posted before a voucher can be opened.");
            } else {
              setError("Fulfilment not found.");
            }
          })
        }
        className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
      >
        {isPending ? "Opening…" : "Certify & Open Payment Voucher"}
      </button>
      {error && <div className="text-[11px] text-c1x-amber">{error}</div>}
    </div>
  );
}
