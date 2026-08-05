import { formatMoney } from "@/lib/format";
import type { ComparisonRow } from "@/server/procurement-package";

/** Region — Normalized comparison (PAGE_04 contract). */
export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
            <th className="px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">Supplier</th>
            <th className="px-3 py-2 font-medium">Raw / evaluated bid</th>
            <th className="px-3 py-2 font-medium">Variance to estimate</th>
            <th className="px-3 py-2 font-medium">Technical status</th>
            <th className="px-3 py-2 font-medium">Validity</th>
            <th className="px-3 py-2 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.supplier} className="border-b border-c1x-line last:border-0">
              <td className="px-3 py-2 font-medium text-c1x-ink">{r.rank ?? "—"}</td>
              <td className="px-3 py-2">
                {r.supplier}
                {r.isSoleSource && (
                  <span className="ml-1.5 rounded bg-c1x-amber/10 px-1 py-0.5 text-[10px] font-medium text-c1x-amber">
                    SOLE SOURCE
                  </span>
                )}
              </td>
              <td className="c1x-tabular px-3 py-2 font-medium text-c1x-ink">{formatMoney(r.netAmount, r.currency)}</td>
              <td className="c1x-tabular px-3 py-2">
                {r.variancePct === null ? (
                  <span className="text-c1x-muted-2">n/a (currency)</span>
                ) : (
                  <span className={r.variancePct <= 0 ? "text-c1x-green" : "text-c1x-red"}>
                    {r.variancePct > 0 ? "+" : ""}
                    {r.variancePct}%
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {r.technicallyCompliant ? (
                  <span className="text-c1x-green">Compliant</span>
                ) : (
                  <span className="text-c1x-red">Noncompliant</span>
                )}
              </td>
              <td className="px-3 py-2 text-c1x-muted">{r.validUntil ? r.validUntil.slice(0, 10) : "—"}</td>
              <td className="px-3 py-2 text-c1x-muted">{r.isSoleSource ? "Sole source" : "None"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
