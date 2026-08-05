import { notFound } from "next/navigation";
import { getVariationOrdersData } from "@/server/variation-orders";
import { formatMoney } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { RaiseVoForm } from "@/components/variation-orders/RaiseVoForm";
import { VoDecisionButtons } from "@/components/variation-orders/VoDecisionButtons";

/**
 * Variation Order Register — added Checkpoint 13, self-scoped (no
 * PAGE_XX contract exists for this in the pack; grounded instead in
 * `CHANGE_VARIATIONS_CLAIMS_AND_FINAL_ACCOUNT_STANDARD.md` and the
 * workbook's own `📋 VO REGISTER` sheet — see CHECKPOINT_13_REPORT.md).
 * Deliberately minimal: one register page (raise + decide inline), not a
 * separate dossier, and no time-impact/dispute/rate-build-up machinery
 * from the standard's fuller Change Event lifecycle.
 */
export default async function VariationOrdersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const data = await getVariationOrdersData(projectId);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Cost Control</div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-c1x-ink">Variation Order Register</h1>
            <p className="mt-1 text-sm text-c1x-muted">
              Every scope change raised against the contract/BOQ baseline — value, control account, approval status.
            </p>
          </div>
          <RaiseVoForm projectReference={data.project.reference} projectId={data.project.id} controlAccounts={data.controlAccounts} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Pending value</div>
          {data.kpis.pendingValue.length === 0 ? (
            <div className="c1x-tabular text-lg font-semibold text-c1x-ink">0</div>
          ) : (
            data.kpis.pendingValue.map((a) => (
              <div key={a.currency} className="c1x-tabular text-base font-semibold text-c1x-ink">
                {formatMoney(a.amount, a.currency)} <span className="text-xs font-normal text-c1x-muted-2">({a.count})</span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Approved value</div>
          {data.kpis.approvedValue.length === 0 ? (
            <div className="c1x-tabular text-lg font-semibold text-c1x-ink">0</div>
          ) : (
            data.kpis.approvedValue.map((a) => (
              <div key={a.currency} className="c1x-tabular text-base font-semibold text-c1x-ink">
                {formatMoney(a.amount, a.currency)} <span className="text-xs font-normal text-c1x-muted-2">({a.count})</span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Awaiting decision</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">{data.kpis.pendingCount}</div>
        </div>
      </div>

      {data.rows.length === 0 ? (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-8 text-center text-sm text-c1x-muted">
          No variation orders raised yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                <th className="px-3 py-2 font-medium">VO / raised</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Control account</th>
                <th className="px-3 py-2 font-medium">BOQ ref / trade</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">VO value</th>
                <th className="px-3 py-2 font-medium">Contract impact</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((v) => (
                <tr key={v.id} className="border-b border-c1x-line last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-c1x-ink">{v.voNumber}</div>
                    <div className="text-[11px] text-c1x-muted-2">{v.dateRaised.slice(0, 10)}</div>
                    {v.isDemoData && (
                      <span
                        className="mt-0.5 inline-block rounded bg-c1x-indigo/10 px-1.5 py-0.5 text-[10px] font-medium text-c1x-indigo"
                        title={v.demoNote ?? undefined}
                      >
                        DEMO
                      </span>
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-c1x-muted">{v.description}</td>
                  <td className="px-3 py-2 text-c1x-muted">
                    {v.controlAccountCode}
                    <div className="text-[11px] text-c1x-muted-2">{v.controlAccountName}</div>
                  </td>
                  <td className="px-3 py-2 text-c1x-muted">
                    {v.boqItemRef}
                    <div className="text-[11px] text-c1x-muted-2">{v.tradeCode}</div>
                  </td>
                  <td className="c1x-tabular px-3 py-2">
                    {v.quantity} {v.unit}
                  </td>
                  <td className="c1x-tabular px-3 py-2 font-medium text-c1x-ink">{formatMoney(v.voValue, v.currency)}</td>
                  <td className="max-w-[200px] px-3 py-2 text-[11px] text-c1x-muted">{v.contractImpact ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        v.status === "APPROVED" ? "text-c1x-green" : v.status === "REJECTED" ? "text-c1x-red" : "text-c1x-amber"
                      }
                    >
                      {v.status}
                    </span>
                    {v.approvedByRole && (
                      <div className="text-[11px] text-c1x-muted-2">
                        {ROLE_LABELS[v.approvedByRole as keyof typeof ROLE_LABELS] ?? v.approvedByRole}
                        {v.approvalDate ? ` · ${v.approvalDate.slice(0, 10)}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {v.status === "PENDING" ? (
                      <VoDecisionButtons projectReference={data.project.reference} voNumber={v.voNumber} />
                    ) : (
                      <span className="text-[11px] text-c1x-muted-2">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-c1x-muted-2">
        Added Checkpoint 13, self-scoped — the workbook&apos;s own VO REGISTER sheet has zero real data rows, so
        both seeded rows here are disclosed demo data (real BOQ rates, synthetic scenario). Not implemented: time
        impact, disputes, rate build-up components, PS/PC reconciliation (all named in
        CHANGE_VARIATIONS_CLAIMS_AND_FINAL_ACCOUNT_STANDARD.md&apos;s fuller Change Event lifecycle), and no
        propagation yet to Control Room budget/commitment figures — see CHECKPOINT_13_REPORT.md.
      </p>
    </div>
  );
}
