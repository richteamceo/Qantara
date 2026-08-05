import { notFound } from "next/navigation";
import { getAwardDecisionData } from "@/server/award-decision";
import { MetricCell } from "@/components/control-room/MetricCell";
import { ApproveSendToFinanceButton } from "@/components/procurement/ApproveSendToFinanceButton";
import { formatMoney } from "@/lib/format";

const TABS = ["Decision Summary", "Line Decisions", "Comparison Basis", "Exceptions", "Approval", "Documents", "Workflow", "Audit"] as const;
const REAL_TABS: (typeof TABS)[number][] = ["Decision Summary", "Line Decisions", "Comparison Basis", "Exceptions"];

export default async function AwardDecisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; awardId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId, awardId } = await params;
  const { tab: tabParam } = await searchParams;
  const data = await getAwardDecisionData(projectId, awardId);
  if (!data) notFound();

  const activeTab = TABS.includes((tabParam ?? "") as (typeof TABS)[number]) ? (tabParam as (typeof TABS)[number]) : "Decision Summary";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Awards / {data.award.reference}
        </nav>
        <div title="Golden-transaction rail not built yet (Checkpoint 4+)" className="mt-1 text-[11px] text-c1x-muted-2">
          Package source: {" "}
          <a href={`/app/projects/${data.project.reference}/procurement-packages/${data.packageReference}`} className="text-c1x-blue">
            {data.packageReference}
          </a>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.award.reference}</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">{data.award.status}</span>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-c1x-muted-2">
              <div>
                <dt className="inline font-medium text-c1x-muted">Supplier </dt>
                <dd className="inline">{data.award.supplier}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Competition </dt>
                <dd className="inline">{data.award.competitionResult ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Owner </dt>
                <dd className="inline">not modelled (Checkpoint 4+)</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span
                aria-disabled="true"
                title="Return to Evaluation — not wired yet (Checkpoint 4+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Return to Evaluation
              </span>
              {data.financeReference ? (
                <a
                  href="#"
                  aria-disabled="true"
                  title="Finance Validation page not built yet (Checkpoint 4+)"
                  className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] bg-c1x-line px-3 py-1.5 text-xs text-c1x-muted-2"
                >
                  {data.financeReference} (view — soon)
                </a>
              ) : (
                <ApproveSendToFinanceButton
                  projectReference={data.project.reference}
                  awardReference={data.award.reference}
                  disabled={!data.canApproveSendToFinance}
                  disabledReason={data.approveBlockedReason}
                />
              )}
            </div>
            <span
              aria-disabled="true"
              title="Full Lineage drawer not built yet (Checkpoint 4+)"
              className="c1x-focusable cursor-not-allowed text-xs text-c1x-muted-2"
            >
              Full Lineage
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCell label="Recommended award net" metric={data.kpis.recommendedAwardNet} />
        <MetricCell label="Variance to estimate" metric={data.kpis.varianceToEstimate} />
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Lines/suppliers</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">
            {data.kpis.lineCount} / 1
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Controlled commercial exceptions</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">{data.kpis.commercialExceptions}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-c1x-line">
        <nav className="flex flex-wrap gap-1" aria-label="Award tabs">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <a
                key={tab}
                href={`?tab=${encodeURIComponent(tab)}`}
                aria-current={isActive ? "page" : undefined}
                className={`c1x-focusable rounded-t-[var(--c1x-radius-control)] border-b-2 px-3 py-2 text-sm ${
                  isActive ? "border-c1x-blue font-medium text-c1x-blue" : "border-transparent text-c1x-muted hover:text-c1x-ink"
                }`}
              >
                {tab}
                {!REAL_TABS.includes(tab) && (
                  <span className="ml-1.5 rounded-full bg-c1x-surface-soft px-1.5 py-0.5 text-[10px] text-c1x-muted-2">soon</span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {activeTab === "Decision Summary" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Decision summary</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Field label="Sourcing / competition result" value={data.award.competitionResult ?? "—"} />
            <Field label="Recommended supplier" value={data.award.supplier} />
            <Field label="Net" value={formatMoney(data.award.net, data.award.currency)} />
            <Field label="Saving vs. estimate" value={formatMoney(data.award.saving, data.award.currency)} />
            <Field label="Tax basis" value="Not shown separately yet (Checkpoint 4+) — see Finance Validation once created" />
            <Field label="Procurement recommendation" value="Non-binding — Finance owns the binding commercial route" />
          </dl>
        </div>
      )}

      {activeTab === "Line Decisions" && (
        <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.lineNo} className="border-b border-c1x-line last:border-0">
                  <td className="px-3 py-2 text-c1x-muted">{l.lineNo}</td>
                  <td className="px-3 py-2">{l.description}</td>
                  <td className="c1x-tabular px-3 py-2">
                    {l.quantity} {l.unit}
                  </td>
                  <td className="c1x-tabular px-3 py-2">{formatMoney(l.rate, l.currency)}</td>
                  <td className="c1x-tabular px-3 py-2 font-medium">{formatMoney(l.netAmount, l.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-c1x-line-strong bg-c1x-surface-soft font-semibold">
                <td colSpan={4} className="px-3 py-2 text-right">
                  Award net
                </td>
                <td className="c1x-tabular px-3 py-2">{formatMoney(data.award.net, data.award.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === "Comparison Basis" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm">
          <a href={`/app/projects/${data.project.reference}/procurement-packages/${data.packageReference}`} className="text-c1x-blue">
            View full comparison on {data.packageReference} →
          </a>
        </div>
      )}

      {activeTab === "Exceptions" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm">
          {data.award.deviationCode ? (
            <>
              <div className="font-medium text-c1x-amber">{data.award.deviationCode}</div>
              <p className="mt-1 text-c1x-muted">{data.award.deviationReason}</p>
            </>
          ) : (
            <p className="text-c1x-muted">No deviation — clean lowest-compliant-bid award, no coded exception required.</p>
          )}
        </div>
      )}

      {!REAL_TABS.includes(activeTab) && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-6 text-sm text-c1x-muted">
          <strong className="text-c1x-ink">{activeTab}</strong> is part of the approved page contract but is not
          implemented in Checkpoint 3 — disclosed gap, not a broken control.
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-c1x-muted">{label}</dt>
      <dd className="text-c1x-ink">{value}</dd>
    </div>
  );
}
