import { formatMoney } from "@/lib/format";
import type { MetricValue } from "@/server/control-room";

export function MetricCell({ label, metric }: { label: string; metric: MetricValue }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
      <div className="text-xs font-medium text-c1x-muted">{label}</div>
      {metric.status === "computed" ? (
        <>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">
            {formatMoney(metric.value.amount, metric.value.currency)}
          </div>
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
