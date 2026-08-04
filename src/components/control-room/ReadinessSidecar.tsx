import type { ReadinessCheck, DecisionItem } from "@/server/control-room";

/** Region H — Readiness sidecar (PAGE_01 contract). */
export function ReadinessSidecar({
  score,
  checks,
  decisions,
  formulaVersions,
}: {
  score: number;
  checks: ReadinessCheck[];
  decisions: DecisionItem[];
  formulaVersions: string[];
}) {
  return (
    <aside
      className="flex flex-col gap-4 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3"
      style={{ width: "var(--c1x-sidecar-w)" }}
    >
      <div>
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
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">
          Decision queue ({decisions.length})
        </h2>
        {decisions.length === 0 ? (
          <p className="mt-2 text-xs text-c1x-muted-2">No open decisions.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {decisions.map((d) => (
              <li
                key={d.id}
                tabIndex={0}
                title="Fulfilment/GRN page not built yet (Checkpoint 2+) — this decision cannot be opened yet"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft p-2 text-xs text-c1x-ink"
              >
                {d.summary}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Formula versions</h2>
        <ul className="mt-2 space-y-1 text-[11px] text-c1x-muted">
          {formulaVersions.map((f) => (
            <li key={f} className="c1x-tabular">
              {f}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
