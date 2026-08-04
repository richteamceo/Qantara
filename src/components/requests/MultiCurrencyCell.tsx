import { formatMoney } from "@/lib/format";
import type { MultiCurrencyMetric } from "@/server/requests-register";

export function MultiCurrencyCell({ label, metric, count }: { label: string; metric: MultiCurrencyMetric; count?: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
      <div className="text-xs font-medium text-c1x-muted">{label}</div>
      {metric.status === "computed" ? (
        <>
          {metric.amounts.length === 0 ? (
            <div className="c1x-tabular text-lg font-semibold text-c1x-ink">{count ?? 0}</div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {metric.amounts.map((a) => (
                <div key={a.currency} className="c1x-tabular text-base font-semibold text-c1x-ink">
                  {formatMoney(a.amount, a.currency)}{" "}
                  <span className="text-xs font-normal text-c1x-muted-2">({a.count})</span>
                </div>
              ))}
            </div>
          )}
          <div className="text-[11px] text-c1x-muted-2">{metric.basis}</div>
        </>
      ) : (
        <>
          <div className="text-lg font-semibold text-c1x-muted-2">Incomplete</div>
          <div className="text-[11px] text-c1x-amber">{metric.reason}</div>
        </>
      )}
    </div>
  );
}
