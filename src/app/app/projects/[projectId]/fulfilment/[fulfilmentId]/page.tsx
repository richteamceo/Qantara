import { notFound } from "next/navigation";
import { getFulfilmentData } from "@/server/fulfilment";
import { PostReceiptForm } from "@/components/procurement/PostReceiptForm";
import { OpenPaymentVoucherButton } from "@/components/procurement/OpenPaymentVoucherButton";
import { formatMoney } from "@/lib/format";

export default async function FulfilmentPage({
  params,
}: {
  params: Promise<{ projectId: string; fulfilmentId: string }>;
}) {
  const { projectId, fulfilmentId } = await params;
  const data = await getFulfilmentData(projectId, fulfilmentId);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Fulfilment / {data.fulfilment.reference}
        </nav>
        <div className="mt-1 text-[11px] text-c1x-muted-2">
          Order:{" "}
          <a href={`/app/projects/${data.project.reference}/purchase-orders/${data.purchaseOrderReference}`} className="text-c1x-blue underline underline-offset-2">
            {data.purchaseOrderReference}
          </a>{" "}
          · Supplier {data.supplier}
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.fulfilment.reference}</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">{data.fulfilment.status}</span>
            </div>
            <p className="mt-1 text-sm text-c1x-muted">{data.poLine.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span
                aria-disabled="true"
                title="Save Draft — this build posts directly; a separate save-without-posting flow isn't implemented (Checkpoint 6+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Save Draft
              </span>
              {data.fulfilment.status === "POSTED" &&
                (data.paymentVoucherReference ? (
                  <a
                    href={`/app/projects/${data.project.reference}/payment-vouchers/${data.paymentVoucherReference}`}
                    className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Open {data.paymentVoucherReference}
                  </a>
                ) : (
                  <OpenPaymentVoucherButton
                    projectReference={data.project.reference}
                    fulfilmentReference={data.fulfilment.reference}
                  />
                ))}
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Ordered" value={`${data.kpis.ordered} ${data.poLine.unit}`} />
        <Kpi label="Delivered to date" value={`${data.kpis.deliveredToDate} ${data.poLine.unit}`} />
        <Kpi label="Accepted now" value={`${data.kpis.acceptedNow} ${data.poLine.unit}`} />
        <Kpi label="Rejected/short now" value={`${data.kpis.rejectedNow} ${data.poLine.unit}`} />
        <Kpi label="Outstanding after entry" value={`${data.kpis.outstandingAfterEntry} ${data.poLine.unit}`} />
        <Kpi label="Certifiable value" value={formatMoney(data.kpis.certifiableValue.amount, data.kpis.certifiableValue.currency)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_var(--c1x-sidecar-w)]">
        <div className="flex flex-col gap-4">
          {data.canPost ? (
            <PostReceiptForm
              projectReference={data.project.reference}
              fulfilmentReference={data.fulfilment.reference}
              orderedQty={data.poLine.orderedQty}
              unit={data.poLine.unit}
            />
          ) : (
            <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Posted receipt</h2>
              <p className="text-c1x-muted">
                Delivered {data.fulfilment.deliveredQty} · Accepted {data.fulfilment.acceptedQty} · Rejected{" "}
                {data.fulfilment.rejectedQty} · Outstanding {data.fulfilment.outstandingQty} {data.poLine.unit}. Posted
                receipts are immutable in this build (no reversal/version flow yet).
              </p>
            </div>
          )}

          <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm text-c1x-muted">
            Rate {formatMoney(data.poLine.rate, data.poLine.currency)}/{data.poLine.unit} × accepted{" "}
            {data.fulfilment.acceptedQty} {data.poLine.unit} = certifiable{" "}
            {formatMoney(data.kpis.certifiableValue.amount, data.kpis.certifiableValue.currency)}. Quality
            evidence/test readings, stock/allocation event and discrepancy reasons are not modelled yet (deferred to
            a later checkpoint).
          </div>
        </div>
        <aside className="h-fit rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Readiness</h2>
            <span className="c1x-tabular text-lg font-semibold text-c1x-ink">{data.readinessScore}%</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {data.readiness.map((c) => (
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
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-3">
      <div className="text-xs font-medium text-c1x-muted">{label}</div>
      <div className="c1x-tabular text-base font-semibold text-c1x-ink">{value}</div>
    </div>
  );
}
