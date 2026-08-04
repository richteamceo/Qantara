import { notFound } from "next/navigation";
import { getRequestsRegisterData, type RequestRow } from "@/server/requests-register";
import { MultiCurrencyCell } from "@/components/requests/MultiCurrencyCell";

const VIEWS = [
  { key: "all", label: "All" },
  { key: "open", label: "My Open" },
  { key: "needs-action", label: "Needs Action" },
  { key: "boq-exceptions", label: "BOQ Exceptions" },
  { key: "awaiting-procurement", label: "Awaiting Procurement" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

function applyView(rows: RequestRow[], view: ViewKey): RequestRow[] {
  switch (view) {
    case "open":
      return rows.filter((r) => r.status !== "REJECTED");
    case "needs-action":
      return rows.filter((r) => r.status === "SUBMITTED");
    case "boq-exceptions":
      return rows.filter((r) => r.authorityStatus !== "OK");
    case "awaiting-procurement":
      return rows.filter((r) => r.allocationPosition === "Unallocated" && r.status === "APPROVED");
    default:
      return rows;
  }
}

export default async function RequestsRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { projectId } = await params;
  const { view: viewParam } = await searchParams;
  const data = await getRequestsRegisterData(projectId);
  if (!data) notFound();

  const view = (VIEWS.some((v) => v.key === viewParam) ? viewParam : "all") as ViewKey;
  const visibleRows = applyView(data.rows, view);

  const reconciliationFailures = data.reconciliation.filter((r) => !r.ok);

  return (
    <div className="flex flex-col gap-4">
      {/* Header and actions */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">
          Commercial / Demand Control
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-c1x-ink">Requests Register</h1>
            <p className="mt-1 text-sm text-c1x-muted">
              Every project demand line — need, timing, source authority, quantity, exposure, owner, ageing and next
              required action.
            </p>
          </div>
          <div className="flex gap-2">
            <span
              aria-disabled="true"
              title="Export Governed View — not wired yet (Checkpoint 3+)"
              className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
            >
              Export Governed View
            </span>
            <span
              aria-disabled="true"
              title="New Controlled Request — server-permission-gated creation flow not built yet (Checkpoint 3+)"
              className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] bg-c1x-line px-3 py-1.5 text-xs text-c1x-muted-2"
            >
              New Controlled Request
            </span>
          </div>
        </div>
      </div>

      {reconciliationFailures.length > 0 && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-red bg-red-50 p-3 text-sm text-c1x-red">
          Reconciliation failure: {reconciliationFailures.map((f) => f.reference).join(", ")} — line total does not
          match request total.
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MultiCurrencyCell label="Open demand" metric={data.kpis.openDemand.value} count={data.kpis.openDemand.count} />
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Needs action</div>
          <div className="c1x-tabular text-lg font-semibold text-c1x-ink">{data.kpis.needsAction.count}</div>
          <div className="text-[11px] text-c1x-muted-2">{data.kpis.needsAction.overdueCount} overdue</div>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">BOQ coverage</div>
          {data.kpis.boqCoverage.status === "computed" ? (
            <div className="flex flex-col gap-0.5">
              {data.kpis.boqCoverage.groups.map((g) => (
                <div key={g.currency} className="c1x-tabular text-base font-semibold text-c1x-ink">
                  {g.coveredPct}% <span className="text-xs font-normal text-c1x-muted-2">({g.currency} lines)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-lg font-semibold text-c1x-muted-2">Incomplete</div>
          )}
          <div className="text-[11px] text-c1x-muted-2">Value-weighted, per line currency</div>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="text-xs font-medium text-c1x-muted">Median cycle</div>
          <div className="text-lg font-semibold text-c1x-muted-2">Incomplete</div>
          <div className="text-[11px] text-c1x-amber">
            {data.kpis.medianCycleDays.status === "incomplete" ? data.kpis.medianCycleDays.reason : ""}
          </div>
        </div>
        <MultiCurrencyCell label="Unallocated exposure" metric={data.kpis.unallocatedExposure} />
      </div>

      {/* Saved views */}
      <div className="flex flex-wrap items-center gap-1 border-b border-c1x-line pb-2">
        {VIEWS.map((v) => (
          <a
            key={v.key}
            href={`?view=${v.key}`}
            aria-current={view === v.key ? "page" : undefined}
            className={`c1x-focusable rounded-[var(--c1x-radius-control)] px-3 py-1.5 text-xs ${
              view === v.key ? "bg-c1x-blue text-white" : "bg-c1x-surface-soft text-c1x-muted hover:text-c1x-ink"
            }`}
          >
            {v.label}
          </a>
        ))}
        <span className="ml-auto text-xs text-c1x-muted-2">
          {visibleRows.length} of {data.rows.length} requests
        </span>
      </div>

      {/* Grid */}
      {visibleRows.length === 0 ? (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-8 text-center text-sm text-c1x-muted">
          No requests match this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
          <table className="w-full min-w-[1400px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                <th className="px-3 py-2 font-medium">Request / work area</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Need-by / ageing</th>
                <th className="px-3 py-2 font-medium">Requester</th>
                <th className="px-3 py-2 font-medium">BOQ/exception authority</th>
                <th className="px-3 py-2 font-medium">Cost type</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Exposure</th>
                <th className="px-3 py-2 font-medium">Allocation</th>
                <th className="px-3 py-2 font-medium">Approval</th>
                <th className="px-3 py-2 font-medium">Risk/exception</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Next control</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-b border-c1x-line last:border-0 hover:bg-c1x-blue-soft/40">
                  <td className="px-3 py-2">
                    <a
                      href={`/app/projects/${data.project.reference}/requests/${r.reference}`}
                      className="c1x-focusable block font-medium text-c1x-blue"
                    >
                      {r.reference}
                    </a>
                    <div className="text-[11px] text-c1x-muted-2">{r.workArea}</div>
                    {r.isDemoData && (
                      <span
                        className="mt-0.5 inline-block rounded bg-c1x-indigo/10 px-1.5 py-0.5 text-[10px] font-medium text-c1x-indigo"
                        title={r.demoNote ?? undefined}
                      >
                        DEMO
                      </span>
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-c1x-muted">{r.descriptionSummary}</td>
                  <td className="px-3 py-2">
                    <div>{r.needByDate ? r.needByDate.slice(0, 10) : "—"}</div>
                    <div className="text-[11px] text-c1x-muted-2">{r.ageingDays}d old</div>
                  </td>
                  <td className="px-3 py-2 text-c1x-muted">{r.requestedBy}</td>
                  <td className="px-3 py-2">
                    <span
                      title={r.authoritySummary}
                      className={
                        r.authorityStatus === "OK"
                          ? "text-c1x-green"
                          : r.authorityStatus === "MISSING"
                            ? "text-c1x-red"
                            : "text-c1x-amber"
                      }
                    >
                      {r.authorityStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-c1x-muted">{r.costTypes.join(", ")}</td>
                  <td className="px-3 py-2 text-c1x-muted">{r.quantitySummary}</td>
                  <td className="c1x-tabular px-3 py-2 font-medium text-c1x-ink">
                    {r.exposureCurrency} {r.exposureAmount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-c1x-muted">{r.allocationPosition}</td>
                  <td className="px-3 py-2 text-c1x-muted">{r.status}</td>
                  <td className="px-3 py-2">
                    {r.riskFlags.length > 0 ? (
                      <span className="text-c1x-red">{r.riskFlags.join(", ")}</span>
                    ) : (
                      <span className="text-c1x-muted-2">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-c1x-muted">{r.currentOwner}</td>
                  <td className="px-3 py-2 text-c1x-muted">{r.nextControl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-c1x-muted-2">
        Deferred this checkpoint: column visibility/group-by, server-side pagination (dataset is 2 rows), CSV export
        with evidence metadata, bulk operations, and 3 of the 8 contract saved views (High Value, Urgent, Awaiting
        Finance, Overdue) — omitted rather than faked. See CHECKPOINT_2_REPORT.md.
      </p>
    </div>
  );
}
