import { formatMoney } from "@/lib/format";

type Slice = { label: string; amount: number; color: string };

/** Region E — Exposure composition. Pipeline risk is excluded (incomplete, not zero — see readiness). */
export function ExposureDonut({
  certifiedActual,
  openCommitments,
  approvedNotOrdered,
  currency,
}: {
  certifiedActual: number;
  openCommitments: number;
  approvedNotOrdered: number;
  currency: string;
}) {
  const slices: Slice[] = [
    { label: "Certified actual", amount: certifiedActual, color: "var(--c1x-teal)" },
    { label: "Open commitments", amount: openCommitments, color: "var(--c1x-blue)" },
    { label: "Approved not ordered", amount: approvedNotOrdered, color: "var(--c1x-indigo)" },
  ];
  const total = slices.reduce((s, x) => s + x.amount, 0);

  let cumulative = 0;
  const stops = slices
    .map((s) => {
      const start = total > 0 ? (cumulative / total) * 360 : 0;
      cumulative += s.amount;
      const end = total > 0 ? (cumulative / total) * 360 : 0;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Exposure composition</h2>
      <div className="flex items-center gap-4">
        <div
          role="img"
          aria-label={`Governed exposure ${formatMoney(total, currency)}: ${slices
            .map((s) => `${s.label} ${formatMoney(s.amount, currency)}`)
            .join(", ")}. Pipeline risk excluded — not yet computed.`}
          className="h-28 w-28 shrink-0 rounded-full"
          style={{
            background: total > 0 ? `conic-gradient(${stops})` : "var(--c1x-line)",
          }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-c1x-surface text-center text-[10px] font-medium text-c1x-muted">
              Total
              <br />
              exposure
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5 text-xs">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="c1x-tabular font-medium text-c1x-ink">{formatMoney(s.amount, currency)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-2 border-t border-c1x-line pt-1.5 font-semibold">
            <span>Governed exposure total</span>
            <span className="c1x-tabular">{formatMoney(total, currency)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
