import { notFound } from "next/navigation";
import { getPurchaseOrderData } from "@/server/purchase-order";
import { MetricCell } from "@/components/control-room/MetricCell";
import { OpenFulfilmentButton } from "@/components/procurement/OpenFulfilmentButton";
import { formatMoney } from "@/lib/format";

const TABS = ["Order Summary", "Lines", "Commercial Terms", "Delivery Schedule", "Fulfilment", "Commitments", "Documents", "Workflow", "Audit"] as const;
const REAL_TABS: (typeof TABS)[number][] = ["Order Summary", "Lines", "Commercial Terms", "Fulfilment"];

export default async function PurchaseOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; purchaseOrderId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId, purchaseOrderId } = await params;
  const { tab: tabParam } = await searchParams;
  const data = await getPurchaseOrderData(projectId, purchaseOrderId);
  if (!data) notFound();

  const activeTab = TABS.includes((tabParam ?? "") as (typeof TABS)[number]) ? (tabParam as (typeof TABS)[number]) : "Order Summary";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Purchase Orders / {data.po.reference}
        </nav>
        <div className="mt-1 text-[11px] text-c1x-muted-2">
          Source:{" "}
          <a href={`/app/projects/${data.project.reference}/finance-validations/${data.financeValidation.reference}`} className="text-c1x-blue underline underline-offset-2">
            {data.financeValidation.reference}
          </a>{" "}
          ·{" "}
          <a href={`/app/projects/${data.project.reference}/awards/${data.award.reference}`} className="text-c1x-blue underline underline-offset-2">
            {data.award.reference}
          </a>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.po.reference}</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">{data.po.status}</span>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-c1x-muted-2">
              <div>
                <dt className="inline font-medium text-c1x-muted">Supplier </dt>
                <dd className="inline">{data.award.supplier}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Route </dt>
                <dd className="inline">{data.financeValidation.route}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Issued </dt>
                <dd className="inline">{data.po.issuedAt.slice(0, 10)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span
                aria-disabled="true"
                title="Preview Order PDF — not wired yet (Checkpoint 6+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Preview Order PDF
              </span>
              <span
                aria-disabled="true"
                title="Amend/Cancel — not wired yet (Checkpoint 6+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Amend/Cancel
              </span>
              {data.nextUnfulfilledLine ? (
                <OpenFulfilmentButton projectReference={data.project.reference} poReference={data.po.reference} />
              ) : (
                <span className="rounded-[var(--c1x-radius-control)] bg-c1x-green/10 px-3 py-1.5 text-xs font-medium text-c1x-green">
                  All lines fulfilled or in fulfilment
                </span>
              )}
            </div>
            <span
              aria-disabled="true"
              title="Full Lineage drawer not built yet (Checkpoint 6+)"
              className="c1x-focusable cursor-not-allowed text-xs text-c1x-muted-2"
            >
              Full Lineage
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCell label="Gross commitment" metric={data.kpis.grossCommitment} />
        <MetricCell label="Net award" metric={data.kpis.netAward} />
        <MetricCell label="Statutory additions" metric={data.kpis.statutoryAdditions} />
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Ordered quantity/lines</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">{data.kpis.orderedLines.count} lines</div>
          <div className="text-[11px] text-c1x-muted-2">
            {data.kpis.orderedLines.totalQty.map((q) => `${q.qty} ${q.unit}`).join(" · ")}
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Fulfilled/certified balance</div>
          {data.kpis.fulfilledBalanceByUnit.map((u) => (
            <div key={u.unit} className="c1x-tabular text-sm font-semibold text-c1x-ink">
              {u.pct}% <span className="text-xs font-normal text-c1x-muted-2">({u.accepted}/{u.ordered} {u.unit})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-c1x-line">
        <nav className="flex flex-wrap gap-1" aria-label="Purchase order tabs">
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

      {activeTab === "Order Summary" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_var(--c1x-sidecar-w)]">
          <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Order identity and source</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Field label="Project" value={data.project.name} />
              <Field label="Supplier" value={data.award.supplier} />
              <Field label="Source award" value={data.award.reference} />
              <Field label="Source Finance Validation" value={data.financeValidation.reference} />
              <Field label="Route" value={data.financeValidation.route} />
              <Field label="Currency" value={data.po.currency} />
              <Field label="Gross" value={formatMoney(data.po.gross, data.po.currency)} />
              <Field label="Net" value={formatMoney(data.po.net, data.po.currency)} />
              <Field label="Payment/delivery/warranty/retention terms" value="Not modelled (Checkpoint 6+)" />
              <Field label="Document template/version" value="Not modelled (Checkpoint 6+)" />
            </dl>
          </div>
          <ReadinessCard score={data.readinessScore} checks={data.readiness} />
        </div>
      )}

      {activeTab === "Lines" && (
        <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Net</th>
                <th className="px-3 py-2 font-medium">Tax</th>
                <th className="px-3 py-2 font-medium">Gross</th>
                <th className="px-3 py-2 font-medium">Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.id} className="border-b border-c1x-line last:border-0">
                  <td className="px-3 py-2 text-c1x-muted">{l.lineNo}</td>
                  <td className="px-3 py-2">{l.description}</td>
                  <td className="c1x-tabular px-3 py-2">
                    {l.quantity} {l.unit}
                  </td>
                  <td className="c1x-tabular px-3 py-2">{formatMoney(l.rate, l.currency)}</td>
                  <td className="c1x-tabular px-3 py-2">{formatMoney(l.net, l.currency)}</td>
                  <td className="c1x-tabular px-3 py-2 text-c1x-muted">{formatMoney(l.taxAmount, l.currency)}</td>
                  <td className="c1x-tabular px-3 py-2 font-medium">{formatMoney(l.gross, l.currency)}</td>
                  <td className="px-3 py-2">
                    {l.fulfilmentReference ? (
                      <a href={`/app/projects/${data.project.reference}/fulfilment/${l.fulfilmentReference}`} className="text-c1x-blue underline underline-offset-2">
                        {l.fulfilmentReference} ({l.fulfilmentStatus})
                      </a>
                    ) : (
                      <span className="text-c1x-muted-2">Not yet opened</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Commercial Terms" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm text-c1x-muted">
          Route {data.financeValidation.route} governs the release sequence (see the Finance Validation page). Payment,
          delivery, warranty, retention and insurance terms are not modelled yet (deferred to a later checkpoint).
        </div>
      )}

      {activeTab === "Fulfilment" && (
        <ul className="space-y-2">
          {data.lines.map((l) => (
            <li key={l.id} className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-c1x-ink">
                  Line {l.lineNo} — {l.description}
                </span>
                {l.fulfilmentReference ? (
                  <a href={`/app/projects/${data.project.reference}/fulfilment/${l.fulfilmentReference}`} className="text-c1x-blue underline underline-offset-2">
                    {l.fulfilmentReference}
                  </a>
                ) : (
                  <span className="text-c1x-muted-2">Not yet opened</span>
                )}
              </div>
              <div className="mt-1 text-xs text-c1x-muted-2">
                Accepted {l.acceptedQty} / Ordered {l.quantity} {l.unit}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!REAL_TABS.includes(activeTab) && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-6 text-sm text-c1x-muted">
          <strong className="text-c1x-ink">{activeTab}</strong> is part of the approved page contract but is not
          implemented in Checkpoint 5 — disclosed gap, not a broken control.
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

function ReadinessCard({ score, checks }: { score: number; checks: { key: string; label: string; status: "pass" | "fail"; detail: string }[] }) {
  return (
    <aside className="h-fit rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Readiness</h2>
        <span className="c1x-tabular text-lg font-semibold text-c1x-ink">{score}%</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${c.status === "pass" ? "bg-c1x-green" : "bg-c1x-amber"}`} aria-hidden />
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
