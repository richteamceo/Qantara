import { notFound } from "next/navigation";
import { getRequestDossierData } from "@/server/request-dossier";
import { MetricCell } from "@/components/control-room/MetricCell";
import { ApprovePrepareButton } from "@/components/requests/ApprovePrepareButton";

const TABS = ["Overview", "Lines & Allocations", "Commercial Controls", "Documents", "Workflow", "Audit Trail"] as const;

export default async function RequestDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; requestId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId, requestId } = await params;
  const { tab: tabParam } = await searchParams;
  const data = await getRequestDossierData(projectId, requestId);
  if (!data) notFound();

  const activeTab = TABS.includes((tabParam ?? "") as (typeof TABS)[number])
    ? (tabParam as (typeof TABS)[number])
    : "Overview";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Requests / {data.request.reference}
        </nav>
        <div
          title="Golden-transaction rail not built yet (Checkpoint 3+) — this request's real lifecycle is shown in Page 01's spine instead"
          className="mt-1 text-[11px] text-c1x-muted-2"
        >
          Golden-transaction rail: deferred
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.request.reference}</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">
                {data.request.status}
              </span>
              {data.request.isDemoData && (
                <span
                  className="rounded bg-c1x-indigo/10 px-1.5 py-0.5 text-[10px] font-medium text-c1x-indigo"
                  title={data.request.demoNote ?? undefined}
                >
                  DEMO
                </span>
              )}
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-c1x-muted-2">
              <div>
                <dt className="inline font-medium text-c1x-muted">Priority </dt>
                <dd className="inline">{data.request.priority ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Cost types </dt>
                <dd className="inline">{[...new Set(data.lines.map((l) => l.costType))].join(", ")}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Lines </dt>
                <dd className="inline">{data.lines.length}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Need-by </dt>
                <dd className="inline">{data.request.needByDate?.slice(0, 10) ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Owner </dt>
                <dd className="inline">{data.request.requestedBy}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">SLA </dt>
                <dd className="inline">not modelled (Checkpoint 3+)</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span
                aria-disabled="true"
                title="Return for Correction — not wired yet (Checkpoint 3+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Return for Correction
              </span>
              <ApprovePrepareButton
                projectReference={data.project.reference}
                requestReference={data.request.reference}
                disabled={!data.canApprovePrepare}
                disabledReason={data.approveBlockedReason}
              />
            </div>
            <span
              aria-disabled="true"
              title="Full Lineage drawer not built yet (Checkpoint 3+)"
              className="c1x-focusable cursor-not-allowed text-xs text-c1x-muted-2"
            >
              Full Lineage
            </span>
          </div>
        </div>
        {!data.reconciliation.ok && (
          <p className="mt-2 text-[11px] text-c1x-red">
            Reconciliation failure: line total ({data.reconciliation.lineTotal}) does not equal request total (
            {data.reconciliation.requestTotal}).
          </p>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCell label="Requested value" metric={data.kpis.requestedValue} />
        <MetricCell label="Budget headroom" metric={data.kpis.budgetHeadroom} />
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Governed quantity</div>
          {data.kpis.governedQuantity.map((q, i) => (
            <div key={i} className="c1x-tabular text-sm font-semibold text-c1x-ink">
              {q.requestedQty} {q.requestedUnit}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Need-by / time remaining</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">
            {data.kpis.needByTimeRemainingDays === null ? "—" : `${data.kpis.needByTimeRemainingDays}d`}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-c1x-line">
        <nav className="flex flex-wrap gap-1" aria-label="Request dossier tabs">
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
                {!["Overview", "Lines & Allocations", "Commercial Controls"].includes(tab) && (
                  <span className="ml-1.5 rounded-full bg-c1x-surface-soft px-1.5 py-0.5 text-[10px] text-c1x-muted-2">
                    soon
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_var(--c1x-sidecar-w)]">
          <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">
              Operational need and source
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Field label="Project" value={data.project.name} />
              <Field label="Work area" value={data.request.workArea ?? "—"} />
              <Field label="Control account" value={`${data.controlAccount.name} (${data.controlAccount.code})`} />
              <Field label="Requested by" value={data.request.requestedBy} />
              <Field label="Priority" value={data.request.priority ?? "—"} />
              <Field label="Created" value={data.request.createdAt.slice(0, 10)} />
              <Field label="Need-by date" value={data.request.needByDate?.slice(0, 10) ?? "—"} />
              <Field label="Requested currency" value={data.kpis.requestedValue.status === "computed" ? data.kpis.requestedValue.value.currency : "—"} />
              <div>
                <dt className="text-xs font-medium text-c1x-muted">Package</dt>
                <dd className="text-c1x-ink">
                  {data.packageReference ? (
                    <a href={`/app/projects/${data.project.reference}/procurement-packages/${data.packageReference}`} className="text-c1x-blue">
                      {data.packageReference}
                    </a>
                  ) : (
                    "Not yet allocated"
                  )}
                </dd>
              </div>
              <Field label="Measure/QTO revision, drawing reference" value="Not modelled (Checkpoint 3+)" />
            </dl>
          </div>
          <ReadinessCard score={data.readinessScore} checks={data.readiness} />
        </div>
      )}

      {activeTab === "Lines & Allocations" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_var(--c1x-sidecar-w)]">
          <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Item / specification</th>
                  <th className="px-3 py-2 font-medium">Cost type</th>
                  <th className="px-3 py-2 font-medium">BOQ/exception authority</th>
                  <th className="px-3 py-2 font-medium">Requested</th>
                  <th className="px-3 py-2 font-medium">Available BOQ qty</th>
                  <th className="px-3 py-2 font-medium">Exposure</th>
                  <th className="px-3 py-2 font-medium">Control result</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l) => (
                  <tr key={l.lineNo} className="border-b border-c1x-line last:border-0">
                    <td className="px-3 py-2 text-c1x-muted">{l.lineNo}</td>
                    <td className="px-3 py-2">{l.description}</td>
                    <td className="px-3 py-2 text-c1x-muted">{l.costType}</td>
                    <td className="px-3 py-2">
                      <div>
                        {l.authorityType} · {l.authorityReference}
                      </div>
                      <div className={`text-[11px] ${l.authorityOk ? "text-c1x-muted-2" : "text-c1x-red"}`} title={l.boqSourceNote}>
                        {l.authorityOk ? "verified" : "not found in source"}
                      </div>
                    </td>
                    <td className="c1x-tabular px-3 py-2">
                      {l.requestedQty} {l.requestedUnit}
                    </td>
                    <td className="c1x-tabular px-3 py-2 text-c1x-muted">
                      {l.boqAvailableQty === null ? "n/a" : `${l.boqAvailableQty} ${l.requestedUnit}`}
                    </td>
                    <td className="c1x-tabular px-3 py-2 font-medium text-c1x-ink">
                      {l.exposureCurrency} {l.exposureAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {l.authorityOk ? (
                        <span className="text-c1x-green">OK</span>
                      ) : (
                        <span className="text-c1x-red">Blocked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-c1x-line-strong bg-c1x-surface-soft font-semibold">
                  <td colSpan={6} className="px-3 py-2 text-right">
                    Line total
                  </td>
                  <td className="c1x-tabular px-3 py-2">{data.reconciliation.lineTotal.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <ReadinessCard score={data.readinessScore} checks={data.readiness} />
        </div>
      )}

      {activeTab === "Commercial Controls" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Commercial controls</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <strong>BOQ code existence/status:</strong>{" "}
              {data.lines.filter((l) => !l.authorityOk).length === 0
                ? "all lines verified against BOQ MASTER"
                : `${data.lines.filter((l) => !l.authorityOk).length} line(s) failed verification — see Lines & Allocations`}
            </li>
            <li>
              <strong>Budget headroom by control account:</strong>{" "}
              {data.kpis.budgetHeadroom.status === "computed"
                ? `${data.kpis.budgetHeadroom.value.currency} ${data.kpis.budgetHeadroom.value.amount.toLocaleString()}`
                : data.kpis.budgetHeadroom.reason}
            </li>
            <li className="text-c1x-muted-2">
              Not implemented this checkpoint: approved-exception reason/expiry, quantity provenance drill-through,
              duplicate/similar open request detection, procurement compatibility grouping, supplier
              conflict/restriction, approval threshold/segregation, need-by feasibility, evidence completeness.
            </li>
          </ul>
        </div>
      )}

      {!["Overview", "Lines & Allocations", "Commercial Controls"].includes(activeTab) && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-6 text-sm text-c1x-muted">
          <strong className="text-c1x-ink">{activeTab}</strong> is part of the approved page contract but is not
          implemented in Checkpoint 2 — disclosed gap, not a broken control.
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

function ReadinessCard({
  score,
  checks,
}: {
  score: number;
  checks: { key: string; label: string; status: "pass" | "fail"; detail: string }[];
}) {
  return (
    <aside className="h-fit rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Readiness</h2>
        <span className="c1x-tabular text-lg font-semibold text-c1x-ink">{score}%</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${c.status === "pass" ? "bg-c1x-green" : "bg-c1x-amber"}`}
              aria-hidden
            />
            <div>
              <div className="font-medium text-c1x-ink">{c.label}</div>
              <div className="text-c1x-muted-2">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
