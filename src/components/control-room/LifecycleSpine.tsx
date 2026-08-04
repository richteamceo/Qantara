import { formatMoney } from "@/lib/format";
import type { LifecyclePosition } from "@/server/control-room";

/** Region C — Switchback demand-to-settlement control spine (PAGE_01 contract). */
export function LifecycleSpine({ positions, currency }: { positions: LifecyclePosition[]; currency: string }) {
  return (
    <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">
        Demand &amp; BOQ gate → Approval control → Package &amp; compete → Award → Finance Validation → Order &amp;
        commit → Fulfilment → PV &amp; settle
      </div>
      <ol className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {positions.map((p, i) => (
          <li
            key={p.key}
            className="rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft p-2"
          >
            <div className="text-[10px] font-medium text-c1x-muted-2">
              {i + 1}. {p.label}
            </div>
            <div className="mt-1 c1x-tabular text-sm font-semibold text-c1x-ink">{p.count}</div>
            <div className="c1x-tabular text-[11px] text-c1x-muted">{formatMoney(p.amount, currency)}</div>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-c1x-muted-2">
        Finance owns the binding route. Every route passes Finance Validation and Payment Voucher. Each transaction
        counts once, at its highest reached position.
      </p>
    </div>
  );
}
