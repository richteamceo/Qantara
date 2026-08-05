import { notFound } from "next/navigation";
import { getFinanceValidationData } from "@/server/finance-validation";
import { MetricCell } from "@/components/control-room/MetricCell";
import { RouteSelector } from "@/components/finance/RouteSelector";
import { formatMoney } from "@/lib/format";

const TABS = ["Decision Pack", "Line Validation", "Tax & Deductions", "Route & Sequence", "Documents", "Workflow & Audit"] as const;
const REAL_TABS: (typeof TABS)[number][] = ["Decision Pack", "Line Validation", "Tax & Deductions", "Route & Sequence"];

export default async function FinanceValidationPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; validationId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId, validationId } = await params;
  const { tab: tabParam } = await searchParams;
  const data = await getFinanceValidationData(projectId, validationId);
  if (!data) notFound();

  const defaultTab = data.fv.status === "PENDING" ? "Route & Sequence" : "Decision Pack";
  const activeTab = TABS.includes((tabParam ?? "") as (typeof TABS)[number]) ? (tabParam as (typeof TABS)[number]) : defaultTab;
  const lockedRoute = data.routeOptions.find((r) => r.route === data.fv.route);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Finance Validation / {data.fv.reference}
        </nav>
        <div className="mt-1 text-[11px] text-c1x-muted-2">
          Source:{" "}
          <a href={`/app/projects/${data.project.reference}/awards/${data.award.reference}`} className="text-c1x-blue">
            {data.award.reference}
          </a>{" "}
          ·{" "}
          <a href={`/app/projects/${data.project.reference}/procurement-packages/${data.packageReference}`} className="text-c1x-blue">
            {data.packageReference}
          </a>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.fv.reference}</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">{data.fv.status}</span>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-c1x-muted-2">
              <div>
                <dt className="inline font-medium text-c1x-muted">Supplier </dt>
                <dd className="inline">{data.award.supplier}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Assignee </dt>
                <dd className="inline">not modelled (Checkpoint 5+)</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">SLA </dt>
                <dd className="inline">not modelled (Checkpoint 5+)</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span
                aria-disabled="true"
                title="Return for Correction — not wired yet (Checkpoint 5+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Return for Correction
              </span>
              <span
                aria-disabled="true"
                title="Export Evidence — not wired yet (Checkpoint 5+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Export Evidence
              </span>
              {data.purchaseOrderReference && (
                <a
                  href={`/app/projects/${data.project.reference}/purchase-orders/${data.purchaseOrderReference}`}
                  className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white"
                >
                  Open {data.purchaseOrderReference}
                </a>
              )}
            </div>
            <span
              aria-disabled="true"
              title="Full Lineage drawer not built yet (Checkpoint 5+)"
              className="c1x-focusable cursor-not-allowed text-xs text-c1x-muted-2"
            >
              Full Lineage
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCell label="Gross order/transaction value" metric={data.kpis.grossValue} />
        <MetricCell label="Commercial variance" metric={data.kpis.commercialVariance} />
        <MetricCell label="Budget headroom" metric={data.kpis.budgetHeadroom} />
        <MetricCell label="Immediate payment exposure" metric={data.kpis.immediatePaymentExposure} />
      </div>

      {/* Tabs */}
      <div className="border-b border-c1x-line">
        <nav className="flex flex-wrap gap-1" aria-label="Finance validation tabs">
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

      {activeTab === "Decision Pack" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_var(--c1x-sidecar-w)]">
          <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Decision pack</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Field label="Award" value={`${data.award.reference} — ${data.award.supplier}`} />
              <Field label="Award net" value={formatMoney(data.award.net, data.award.currency)} />
              <Field label="Gross order value" value={formatMoney(data.fv.grossOrderValue, data.fv.currency)} />
              <Field label="Indicative net payable" value={formatMoney(data.fv.netPayable, data.fv.currency)} />
              <Field label="Route" value={`${data.fv.route}${data.fv.status === "VALIDATED" ? " (locked)" : " (recommended, pending lock)"}`} />
              <Field label="Deviation" value={data.award.deviationCode ?? "None"} />
            </dl>
          </div>
          <ReadinessCard score={data.readinessScore} checks={data.readiness} />
        </div>
      )}

      {activeTab === "Line Validation" && (
        <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Net</th>
                <th className="px-3 py-2 font-medium">Finance control result</th>
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
                  <td className="c1x-tabular px-3 py-2 font-medium">{formatMoney(l.net, l.currency)}</td>
                  <td className="px-3 py-2 text-c1x-green">Validated</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Tax & Deductions" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Formula bridge</h2>
          <div className="space-y-1 text-sm">
            <BridgeLine label="Validated net award" value={formatMoney(data.award.net, data.fv.currency)} />
            <BridgeLine label="VAT 15%" value={`+ ${formatMoney(data.fv.vatAmount, data.fv.currency)}`} />
            <BridgeLine label="NHIL 2.5%" value={`+ ${formatMoney(data.fv.nhilAmount, data.fv.currency)}`} />
            <BridgeLine label="GETFund 2.5%" value={`+ ${formatMoney(data.fv.getfundAmount, data.fv.currency)}`} />
            <BridgeLine label="Gross order value" value={formatMoney(data.fv.grossOrderValue, data.fv.currency)} bold />
            <BridgeLine label="Indicative WHT 2% of net at payable event" value={`− ${formatMoney(data.fv.whtAmount, data.fv.currency)}`} />
            <BridgeLine label="Indicative total net payable" value={formatMoney(data.fv.netPayable, data.fv.currency)} bold />
          </div>
          <p className="mt-3 text-[11px] text-c1x-amber">
            Rates are real (VAT/NHIL/GETFund from the workbook&apos;s ⚙ SETTINGS sheet; WHT 2% from this page&apos;s
            own fixture — corrected from a 5% approximation used in Checkpoint 3, see CHECKPOINT_4_REPORT.md). Not
            yet implemented: per-line clickable formula ID/jurisdiction/effective-date drill-down, tax-profile
            versioning.
          </p>
        </div>
      )}

      {activeTab === "Route & Sequence" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">
            Finance-owned route decision
          </h2>
          <RouteSelector
            projectReference={data.project.reference}
            fvReference={data.fv.reference}
            routeOptions={data.routeOptions}
            currentRoute={data.fv.route}
            locked={data.fv.status !== "PENDING"}
          />
          {lockedRoute && (
            <div className="mt-4 border-t border-c1x-line pt-3 text-sm">
              <div className="text-xs font-medium text-c1x-muted">Release sequence — {data.fv.route}</div>
              <div className="mt-1 text-c1x-ink">{lockedRoute.sequence}</div>
            </div>
          )}
        </div>
      )}

      {!REAL_TABS.includes(activeTab) && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-6 text-sm text-c1x-muted">
          <strong className="text-c1x-ink">{activeTab}</strong> is part of the approved page contract but is not
          implemented in Checkpoint 4 — disclosed gap, not a broken control.
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

function BridgeLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-c1x-line py-1.5 ${bold ? "font-semibold" : ""}`}>
      <span className="text-c1x-muted">{label}</span>
      <span className="c1x-tabular text-c1x-ink">{value}</span>
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
