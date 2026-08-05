import { notFound } from "next/navigation";
import { getProcurementPackageData } from "@/server/procurement-package";
import { MetricCell } from "@/components/control-room/MetricCell";
import { ComparisonTable } from "@/components/procurement/ComparisonTable";
import { OpenAwardButton } from "@/components/procurement/OpenAwardButton";

const TABS = [
  "Overview",
  "Lines",
  "Source Requests",
  "Suppliers",
  "Invitations/RFQ",
  "Quotations",
  "Comparison",
  "Clarifications",
  "Award",
  "Documents",
  "Workflow",
  "Activity",
] as const;
const REAL_TABS: (typeof TABS)[number][] = ["Overview", "Lines", "Source Requests", "Suppliers", "Quotations", "Comparison"];

export default async function ProcurementPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; packageId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId, packageId } = await params;
  const { tab: tabParam } = await searchParams;
  const data = await getProcurementPackageData(projectId, packageId);
  if (!data) notFound();

  const defaultTab = data.package.status === "COMPARED" ? "Comparison" : "Overview";
  const activeTab = TABS.includes((tabParam ?? "") as (typeof TABS)[number]) ? (tabParam as (typeof TABS)[number]) : defaultTab;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Procurement Packages / {data.package.reference}
        </nav>
        <div title="Golden-transaction rail not built yet (Checkpoint 4+)" className="mt-1 text-[11px] text-c1x-muted-2">
          Golden-transaction rail: deferred
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.package.reference}</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">
                {data.package.status}
              </span>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-c1x-muted-2">
              <div>
                <dt className="inline font-medium text-c1x-muted">Source request </dt>
                <dd className="inline">
                  <a href={`/app/projects/${data.project.reference}/requests/${data.sourceRequest.reference}`} className="text-c1x-blue">
                    {data.sourceRequest.reference}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Sourcing method </dt>
                <dd className="inline">{data.package.sourcingMethod ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Invited suppliers </dt>
                <dd className="inline">{data.package.invitedSuppliers}</dd>
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
                title="Issue Clarification — not wired yet (Checkpoint 4+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Issue Clarification
              </span>
              {data.awardReference ? (
                <a
                  href={`/app/projects/${data.project.reference}/awards/${data.awardReference}`}
                  className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white"
                >
                  Open Award Decision ({data.awardReference})
                </a>
              ) : (
                <OpenAwardButton
                  projectReference={data.project.reference}
                  packageReference={data.package.reference}
                  disabled={!data.canOpenAward}
                  disabledReason={data.openAwardBlockedReason}
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCell label="Package estimate" metric={data.kpis.packageEstimate} />
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Bids received/expected</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">
            {data.kpis.bidsReceived.received}/{data.kpis.bidsReceived.expected}
          </div>
        </div>
        <MetricCell label="Evaluated spread" metric={data.kpis.evaluatedSpread} />
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Commercial exceptions</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">{data.kpis.commercialExceptions.count}</div>
          <div className="text-[11px] text-c1x-muted-2">{data.kpis.commercialExceptions.details.join("; ") || "None"}</div>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Earliest bid validity</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">
            {data.kpis.earliestBidValidity ? data.kpis.earliestBidValidity.slice(0, 10) : "—"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-c1x-line">
        <nav className="flex flex-wrap gap-1" aria-label="Package tabs">
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

      {activeTab === "Overview" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Package overview</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Field label="Project" value={data.project.name} />
            <Field label="Work area" value={data.sourceRequest.workArea ?? "—"} />
            <Field label="Sourcing method" value={data.package.sourcingMethod ?? "—"} />
            <Field label="Package estimate" value={`${data.package.currency} ${data.package.estimate.toLocaleString()}`} />
            <Field label="Status" value={data.package.status} />
            <Field label="Currency/tax normalization basis" value="Not modelled (Checkpoint 4+)" />
          </dl>
        </div>
      )}

      {activeTab === "Lines" && (
        <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Specification</th>
                <th className="px-3 py-2 font-medium">BOQ/exception</th>
                <th className="px-3 py-2 font-medium">Requested</th>
                <th className="px-3 py-2 font-medium">Allocated</th>
                <th className="px-3 py-2 font-medium">Package estimate</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.lineNo} className="border-b border-c1x-line last:border-0">
                  <td className="px-3 py-2 text-c1x-muted">{l.lineNo}</td>
                  <td className="px-3 py-2">{l.description}</td>
                  <td className="px-3 py-2 text-c1x-muted">{l.boqReference}</td>
                  <td className="c1x-tabular px-3 py-2">
                    {l.requestedQty} {l.unit}
                  </td>
                  <td className="c1x-tabular px-3 py-2 text-c1x-green">
                    {l.allocatedQty} {l.unit}
                  </td>
                  <td className="c1x-tabular px-3 py-2 font-medium">
                    {l.currency} {l.estimate.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Source Requests" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm">
          <a href={`/app/projects/${data.project.reference}/requests/${data.sourceRequest.reference}`} className="text-c1x-blue">
            {data.sourceRequest.reference}
          </a>
          <span className="ml-2 text-c1x-muted-2">
            — this package allocates the whole request (partial multi-package allocation not modelled yet).
          </span>
        </div>
      )}

      {activeTab === "Suppliers" && (
        <ul className="space-y-2">
          {data.comparison.map((c) => (
            <li key={c.supplier} className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3 text-sm">
              <span className="font-medium text-c1x-ink">{c.supplier}</span>
              {c.isSoleSource && <span className="ml-2 text-xs text-c1x-amber">sole source</span>}
              <span className="ml-2 text-xs text-c1x-muted-2">
                {c.technicallyCompliant ? "compliant" : "noncompliant"} · full master-data (category approval,
                compliance/expiry, conflicts) not modelled (Checkpoint 4+)
              </span>
            </li>
          ))}
        </ul>
      )}

      {activeTab === "Quotations" && (
        <ul className="space-y-2">
          {data.comparison.map((c) => (
            <li key={c.supplier} className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-c1x-ink">{c.supplier}</span>
                <span className="c1x-tabular font-medium">
                  {c.currency} {c.netAmount.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 text-xs text-c1x-muted-2">
                Received {c.receivedAt.slice(0, 10)} · valid until {c.validUntil?.slice(0, 10) ?? "—"} · raw value, not
                yet decomposed into lines (Checkpoint 4+)
              </div>
            </li>
          ))}
        </ul>
      )}

      {activeTab === "Comparison" && <ComparisonTable rows={data.comparison} />}

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
