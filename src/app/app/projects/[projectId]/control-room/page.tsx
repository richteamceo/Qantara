import { notFound } from "next/navigation";
import { getControlRoomData } from "@/server/control-room";
import { MetricCell } from "@/components/control-room/MetricCell";
import { LifecycleSpine } from "@/components/control-room/LifecycleSpine";
import { ControlSheet } from "@/components/control-room/ControlSheet";
import { ReadinessSidecar } from "@/components/control-room/ReadinessSidecar";
import { ExposureDonut } from "@/components/control-room/ExposureDonut";

const TABS = [
  "Overview",
  "BOQ & Budget",
  "Commitments",
  "Actual Cost",
  "Forecast & Cashflow",
  "Risks & Exceptions",
  "Workflow & Audit",
] as const;

export default async function ControlRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ basis?: string; tab?: string }>;
}) {
  const { projectId } = await params;
  const { basis: basisParam, tab: tabParam } = await searchParams;
  const data = await getControlRoomData(projectId);
  if (!data) notFound();

  const basis = basisParam === "CERTIFIED" ? "CERTIFIED" : "LIVE";
  const activeTab = TABS.includes((tabParam ?? "") as (typeof TABS)[number])
    ? (tabParam as (typeof TABS)[number])
    : "Overview";

  const { position } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* A. Project header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Commercial Control
        </nav>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.project.name} — Commercial Control Room</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">
                {basis === "LIVE" ? "LIVE POSITION" : "CERTIFIED POSITION"}
              </span>
            </div>
            <p className="mt-1 text-sm text-c1x-muted">
              What is approved, exposed, committed, certified, paid and forecast for {data.project.reference} — a
              control sheet with drill-through, not a decorative dashboard.
            </p>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-c1x-muted-2">
              <div>
                <dt className="inline font-medium text-c1x-muted">Baseline </dt>
                <dd className="inline">
                  {data.baseline.version} · approved {data.baseline.approvedAt.slice(0, 10)}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Data cut-off </dt>
                <dd className="inline">reporting period {data.reportingPeriod}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Commercial owner </dt>
                <dd className="inline">not yet modelled (Checkpoint 2+)</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex overflow-hidden rounded-[var(--c1x-radius-control)] border border-c1x-line text-xs">
              <a
                href="?basis=LIVE"
                className={`c1x-focusable px-3 py-1.5 ${basis === "LIVE" ? "bg-c1x-blue text-white" : "bg-c1x-surface text-c1x-muted hover:bg-c1x-surface-soft"}`}
              >
                Live
              </a>
              <a
                href="?basis=CERTIFIED"
                className={`c1x-focusable px-3 py-1.5 ${basis === "CERTIFIED" ? "bg-c1x-blue text-white" : "bg-c1x-surface text-c1x-muted hover:bg-c1x-surface-soft"}`}
              >
                Certified
              </a>
            </div>
            <span
              title="Decision Inbox page not built yet (Checkpoint 2+) — count is real"
              className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              aria-disabled="true"
            >
              Decision Inbox ({data.decisions.length})
            </span>
            <span
              title="Source-lineage / explain-calculation drawer not built yet (Checkpoint 2+)"
              className="c1x-focusable cursor-not-allowed text-xs text-c1x-muted-2"
              aria-disabled="true"
            >
              Explain calculation
            </span>
          </div>
        </div>
        {basis === "CERTIFIED" && (
          <p className="mt-2 text-[11px] text-c1x-amber">
            Certified basis is not yet computed separately from Live — no draft/unlocked postings exist in this
            checkpoint&apos;s seed data to differentiate. Deferred to a later checkpoint.
          </p>
        )}
      </div>

      {/* B. Commercial position strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCell label="Current approved budget" metric={position.currentApprovedBudget} />
        <MetricCell label="Certified actual" metric={position.certifiedActual} />
        <MetricCell label="Open commitments" metric={position.openCommitments} />
        <MetricCell label="Approved not ordered" metric={position.approvedNotOrdered} />
        <MetricCell label="Pipeline risk" metric={position.pipelineRisk} />
        <MetricCell label="Forecast final cost" metric={position.forecastFinalCost} />
        <MetricCell label="Cash paid" metric={position.cashPaid} />
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Control confidence</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">{position.controlConfidence.score}%</div>
          <div className="text-[11px] text-c1x-muted-2">
            {position.controlConfidence.checks.filter((c) => c.status === "pass").length}/
            {position.controlConfidence.checks.length} named checks pass — see Readiness
          </div>
        </div>
      </div>

      {/* C. Switchback demand-to-settlement control spine */}
      <LifecycleSpine positions={data.lifecycle} />

      {/* D. Workspace tabs */}
      <div className="border-b border-c1x-line">
        <nav className="flex gap-1" aria-label="Control room workspace tabs">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <a
                key={tab}
                href={`?basis=${basis}&tab=${encodeURIComponent(tab)}`}
                aria-current={isActive ? "page" : undefined}
                className={`c1x-focusable rounded-t-[var(--c1x-radius-control)] border-b-2 px-3 py-2 text-sm ${
                  isActive
                    ? "border-c1x-blue font-medium text-c1x-blue"
                    : "border-transparent text-c1x-muted hover:text-c1x-ink"
                }`}
              >
                {tab}
                {tab !== "Overview" && (
                  <span className="ml-1.5 rounded-full bg-c1x-surface-soft px-1.5 py-0.5 text-[10px] text-c1x-muted-2">
                    soon
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {activeTab !== "Overview" ? (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-6 text-sm text-c1x-muted">
          <strong className="text-c1x-ink">{activeTab}</strong> is part of the approved page contract but is not
          implemented in Checkpoint 1 — this is a disclosed gap, not a broken control. Deferred to its own
          owner-approved page contract and checkpoint.
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4">
            {/* E. Exposure composition */}
            <ExposureDonut
              certifiedActual={
                position.certifiedActual.status === "computed" ? position.certifiedActual.value.amount : 0
              }
              openCommitments={
                position.openCommitments.status === "computed" ? position.openCommitments.value.amount : 0
              }
              approvedNotOrdered={
                position.approvedNotOrdered.status === "computed" &&
                position.approvedNotOrdered.value.currency === data.project.currency
                  ? position.approvedNotOrdered.value.amount
                  : 0
              }
              currency={data.project.currency}
              excluded={
                position.approvedNotOrdered.status === "computed" &&
                position.approvedNotOrdered.value.currency !== data.project.currency
                  ? [
                      {
                        label: "Approved not ordered",
                        reason: `${position.approvedNotOrdered.value.currency} ${position.approvedNotOrdered.value.amount.toLocaleString()}`,
                      },
                    ]
                  : []
              }
            />

            {/* F. Forecast trajectory — deferred */}
            <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">
                Forecast trajectory
              </h2>
              <p className="text-sm text-c1x-muted-2">
                Incomplete — the Forecast &amp; Cashflow model (30-day movement, 12-month trend, scenario/rule
                version) is not implemented yet. No forecast number is shown in its place.
              </p>
            </div>

            {/* G. Commercial lifecycle control sheet */}
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">
                Commercial lifecycle control sheet
              </h2>
              <ControlSheet rows={data.accounts} currency={data.project.currency} />
              <p className="mt-1 text-[11px] text-c1x-amber">
                Known gap: Current budget is sourced from the real BOQ MASTER sheet (native currency USD); the
                request/award/PO/PV chain is transacted in GHS. Variance is intentionally not computed across that
                mismatch rather than guessed — see CHECKPOINT_1_ADDENDUM.md.
              </p>
            </div>
          </div>

          {/* H. Readiness sidecar */}
          <ReadinessSidecar
            score={position.controlConfidence.score}
            checks={position.controlConfidence.checks}
            decisions={data.decisions}
            formulaVersions={data.formulaVersions}
          />
        </div>
      )}
    </div>
  );
}
