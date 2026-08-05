import { formatMoney } from "@/lib/format";
import type { ControlAccountRow } from "@/server/control-room";

/** Region G — Commercial lifecycle control sheet (PAGE_01 contract). */
export function ControlSheet({ rows, currency }: { rows: ControlAccountRow[]; currency: string }) {
  const totals = rows.reduce(
    (acc, r) => ({
      pipeline: acc.pipeline + r.requestPipeline,
      awarded: acc.awarded + r.awardedNotOrdered,
      committed: acc.committed + r.openCommitment,
      certified: acc.certified + r.certifiedActual,
    }),
    { pipeline: 0, awarded: 0, committed: 0, certified: 0 }
  );
  const pipelineCurrencies = new Set(
    rows.filter((r) => r.requestPipeline !== 0).map((r) => r.requestPipelineCurrency ?? currency)
  );
  const pipelineTotalCurrency = pipelineCurrencies.size <= 1 ? ([...pipelineCurrencies][0] ?? currency) : null;
  const awardedCurrencies = new Set(
    rows.filter((r) => r.awardedNotOrdered !== 0).map((r) => r.awardedNotOrderedCurrency ?? currency)
  );
  const awardedTotalCurrency = awardedCurrencies.size <= 1 ? ([...awardedCurrencies][0] ?? currency) : null;
  const committedCurrencies = new Set(
    rows.filter((r) => r.openCommitment !== 0).map((r) => r.openCommitmentCurrency ?? currency)
  );
  const committedTotalCurrency = committedCurrencies.size <= 1 ? ([...committedCurrencies][0] ?? currency) : null;
  const certifiedCurrencies = new Set(
    rows.filter((r) => r.certifiedActual !== 0).map((r) => r.certifiedActualCurrency ?? currency)
  );
  const certifiedTotalCurrency = certifiedCurrencies.size <= 1 ? ([...certifiedCurrencies][0] ?? currency) : null;

  return (
    <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
            <th className="px-3 py-2 font-medium">Control account</th>
            <th className="px-3 py-2 font-medium">Current budget</th>
            <th className="px-3 py-2 font-medium">Request/pipeline</th>
            <th className="px-3 py-2 font-medium">Awarded not ordered</th>
            <th className="px-3 py-2 font-medium">Open order commitment</th>
            <th className="px-3 py-2 font-medium">Certified actual</th>
            <th className="px-3 py-2 font-medium">Forecast final</th>
            <th className="px-3 py-2 font-medium">Variance</th>
            <th className="px-3 py-2 font-medium">Active gate/next control</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              tabIndex={0}
              className="c1x-focusable cursor-pointer border-b border-c1x-line last:border-0 hover:bg-c1x-blue-soft/40"
            >
              <td className="px-3 py-2">
                <div className="font-medium text-c1x-ink">{r.name}</div>
                <div className="text-[11px] text-c1x-muted-2">{r.code}</div>
              </td>
              <td className="px-3 py-2">
                <div className="c1x-tabular">{formatMoney(r.currentBudget, r.budgetCurrency)}</div>
                {r.budgetCurrency !== currency && (
                  <div className="text-[11px] text-c1x-amber" title={r.budgetSource ?? undefined}>
                    native {r.budgetCurrency}, not {currency}
                  </div>
                )}
              </td>
              <td className="c1x-tabular px-3 py-2">{formatMoney(r.requestPipeline, r.requestPipelineCurrency ?? currency)}</td>
              <td className="c1x-tabular px-3 py-2">{formatMoney(r.awardedNotOrdered, r.awardedNotOrderedCurrency ?? currency)}</td>
              <td className="c1x-tabular px-3 py-2">{formatMoney(r.openCommitment, r.openCommitmentCurrency ?? currency)}</td>
              <td className="c1x-tabular px-3 py-2 font-medium text-c1x-teal">
                {formatMoney(r.certifiedActual, r.certifiedActualCurrency ?? currency)}
              </td>
              <td className="px-3 py-2 text-c1x-muted-2">Incomplete</td>
              {r.variance.status === "computed" ? (
                <td
                  className={`c1x-tabular px-3 py-2 font-medium ${r.variance.value.amount < 0 ? "text-c1x-red" : "text-c1x-green"}`}
                >
                  {formatMoney(r.variance.value.amount, r.variance.value.currency)}
                </td>
              ) : (
                <td className="px-3 py-2 text-xs text-c1x-amber" title={r.variance.reason}>
                  Incomplete — cross-currency
                </td>
              )}
              <td className="px-3 py-2 text-c1x-muted">{r.activeGate}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-c1x-line-strong bg-c1x-surface-soft font-semibold">
            <td className="px-3 py-2">Project total</td>
            <td className="px-3 py-2 text-c1x-muted-2">mixed/see rows</td>
            <td className="c1x-tabular px-3 py-2">
              {pipelineTotalCurrency ? formatMoney(totals.pipeline, pipelineTotalCurrency) : "mixed/see rows"}
            </td>
            <td className="c1x-tabular px-3 py-2">
              {awardedTotalCurrency ? formatMoney(totals.awarded, awardedTotalCurrency) : "mixed/see rows"}
            </td>
            <td className="c1x-tabular px-3 py-2">
              {committedTotalCurrency ? formatMoney(totals.committed, committedTotalCurrency) : "mixed/see rows"}
            </td>
            <td className="c1x-tabular px-3 py-2">
              {certifiedTotalCurrency ? formatMoney(totals.certified, certifiedTotalCurrency) : "mixed/see rows"}
            </td>
            <td className="px-3 py-2 text-c1x-muted-2">—</td>
            <td className="px-3 py-2 text-c1x-muted-2">see rows</td>
            <td className="px-3 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
