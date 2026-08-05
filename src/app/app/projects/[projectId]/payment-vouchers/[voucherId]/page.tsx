import { notFound } from "next/navigation";
import { getPaymentVoucherData } from "@/server/payment-voucher";
import { ApproveAndPayButton } from "@/components/finance/ApproveAndPayButton";
import { formatMoney } from "@/lib/format";

const TABS = ["Voucher Summary", "Three-Way Match", "Tax & Deductions", "Approval & Payment", "Documents", "Accounting/Posting", "Workflow", "Audit Trail"] as const;
const REAL_TABS: (typeof TABS)[number][] = ["Voucher Summary", "Three-Way Match", "Tax & Deductions", "Approval & Payment"];

export default async function PaymentVoucherPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; voucherId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId, voucherId } = await params;
  const { tab: tabParam } = await searchParams;
  const data = await getPaymentVoucherData(projectId, voucherId);
  if (!data) notFound();

  const activeTab = TABS.includes((tabParam ?? "") as (typeof TABS)[number]) ? (tabParam as (typeof TABS)[number]) : "Voucher Summary";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
        <nav aria-label="Breadcrumb" className="text-xs text-c1x-muted-2">
          Projects / {data.project.name} / Payment Vouchers / {data.voucher.reference}
        </nav>
        <div className="mt-1 text-[11px] text-c1x-muted-2">
          Source:{" "}
          <a href={`/app/projects/${data.project.reference}/fulfilment/${data.fulfilmentReference}`} className="text-c1x-blue underline underline-offset-2">
            {data.fulfilmentReference}
          </a>{" "}
          ·{" "}
          <a href={`/app/projects/${data.project.reference}/purchase-orders/${data.purchaseOrderReference}`} className="text-c1x-blue underline underline-offset-2">
            {data.purchaseOrderReference}
          </a>{" "}
          · Supplier {data.supplier}
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-c1x-ink">{data.voucher.reference}</h1>
              <span className="rounded-full bg-c1x-blue-soft px-2 py-0.5 text-[11px] font-semibold text-c1x-blue">{data.voucher.status}</span>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-c1x-muted-2">
              <div>
                <dt className="inline font-medium text-c1x-muted">Route </dt>
                <dd className="inline">{data.route ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-c1x-muted">Reporting period </dt>
                <dd className="inline">{data.project.reportingPeriod}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span
                aria-disabled="true"
                title="Return to Fulfilment/Correction — not wired yet (Checkpoint 7+)"
                className="c1x-focusable cursor-not-allowed rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-3 py-1.5 text-xs text-c1x-muted"
              >
                Return to Fulfilment
              </span>
              {data.canApprove ? (
                <ApproveAndPayButton projectReference={data.project.reference} voucherReference={data.voucher.reference} />
              ) : (
                <span className="rounded-[var(--c1x-radius-control)] bg-c1x-green/10 px-3 py-1.5 text-xs font-medium text-c1x-green">
                  Paid {data.voucher.paidAt?.slice(0, 10)}
                </span>
              )}
            </div>
            <span
              aria-disabled="true"
              title="Full Lineage and Evidence not built yet (Checkpoint 7+)"
              className="c1x-focusable cursor-not-allowed text-xs text-c1x-muted-2"
            >
              Full Lineage and Evidence
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Accepted/source net" value={formatMoney(data.kpis.acceptedSourceNet.amount, data.kpis.acceptedSourceNet.currency)} />
        <Kpi label="Tax additions" value={formatMoney(data.kpis.taxAdditions.amount, data.kpis.taxAdditions.currency)} />
        <Kpi label="WHT/other deductions" value={formatMoney(data.kpis.whtDeductions.amount, data.kpis.whtDeductions.currency)} />
        <Kpi label="Net payable" value={formatMoney(data.kpis.netPayable.amount, data.kpis.netPayable.currency)} />
        <Kpi label="Order/advance balance" value={`${data.kpis.orderBalance.qty} ${data.kpis.orderBalance.unit}`} />
        <Kpi label="Payment status" value={data.kpis.paymentStatus} />
      </div>

      {/* Tabs */}
      <div className="border-b border-c1x-line">
        <nav className="flex flex-wrap gap-1" aria-label="Payment voucher tabs">
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

      {activeTab === "Voucher Summary" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_var(--c1x-sidecar-w)]">
          <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Voucher identity</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Field label="Project" value={data.project.name} />
              <Field label="Supplier/payee" value={data.supplier} />
              <Field label="Route" value={data.route ?? "—"} />
              <Field label="Source PO" value={data.purchaseOrderReference} />
              <Field label="Source GRN/SE" value={data.fulfilmentReference} />
              <Field label="Currency" value={data.voucher.currency} />
              <Field label="Reporting period" value={data.project.reportingPeriod} />
              <Field label="Bank account verification" value="Not modelled (Checkpoint 7+)" />
              <Field label="Prepared by/current owner" value="Not modelled (Checkpoint 7+)" />
              <Field label="Control account/cost type" value="Not modelled here (see source PO)" />
            </dl>
          </div>
          <ReadinessCard score={data.readinessScore} checks={data.readiness} />
        </div>
      )}

      {activeTab === "Three-Way Match" && (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-c1x-line bg-c1x-surface-soft text-left text-xs text-c1x-muted">
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="px-3 py-2 font-medium">Item/service</th>
                  <th className="px-3 py-2 font-medium">PO qty</th>
                  <th className="px-3 py-2 font-medium">GRN accepted qty</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Net</th>
                  <th className="px-3 py-2 font-medium">Tax</th>
                  <th className="px-3 py-2 font-medium">Gross</th>
                  <th className="px-3 py-2 font-medium">Duplicate check</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2">{data.threeWayMatch.supplier}</td>
                  <td className="px-3 py-2">{data.threeWayMatch.item}</td>
                  <td className="c1x-tabular px-3 py-2">{data.threeWayMatch.poQty} {data.threeWayMatch.unit}</td>
                  <td className="c1x-tabular px-3 py-2">{data.threeWayMatch.grnAcceptedQty} {data.threeWayMatch.unit}</td>
                  <td className="c1x-tabular px-3 py-2">{formatMoney(data.threeWayMatch.poRate, data.threeWayMatch.currency)}</td>
                  <td className="c1x-tabular px-3 py-2">{formatMoney(data.threeWayMatch.poNet, data.threeWayMatch.currency)}</td>
                  <td className="c1x-tabular px-3 py-2 text-c1x-muted">{formatMoney(data.threeWayMatch.poTax, data.threeWayMatch.currency)}</td>
                  <td className="c1x-tabular px-3 py-2 font-medium">{formatMoney(data.threeWayMatch.poGross, data.threeWayMatch.currency)}</td>
                  <td className="px-3 py-2 text-c1x-green">Reference unique (database constraint)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm text-c1x-muted">
            This is a real PO-vs-GRN two-way match (line quantity/rate/tax-profile reconciled with zero variance).
            No supplier invoice/certificate entity is modelled yet, so the contract&apos;s full three-way match
            (PO/GRN/invoice) is not implemented — disclosed gap, deferred to a later checkpoint.
          </div>
        </div>
      )}

      {activeTab === "Tax & Deductions" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Amount bridge</h2>
          <div className="space-y-1 text-sm">
            <BridgeLine label="Accepted quantity x PO rate = net accepted amount" value={formatMoney(data.voucher.acceptedNet, data.voucher.currency)} />
            <BridgeLine label="VAT+NHIL+GETFund 20% (prorated to accepted fraction of PO line)" value={`+ ${formatMoney(data.voucher.taxAdditions, data.voucher.currency)}`} />
            <BridgeLine label="Gross payable" value={formatMoney(data.voucher.acceptedNet + data.voucher.taxAdditions, data.voucher.currency)} bold />
            <BridgeLine label="Indicative WHT 2% of net at payable event" value={`− ${formatMoney(data.voucher.wht, data.voucher.currency)}`} />
            <BridgeLine label="Net payable" value={formatMoney(data.voucher.netPayable, data.voucher.currency)} bold />
          </div>
          <p className="mt-3 text-[11px] text-c1x-amber">
            Same real VAT/NHIL/GETFund 20% combined and WHT 2% rates as PAGE_06/PAGE_07 (see CHECKPOINT_4_REPORT.md
            for the WHT correction). Tax additions are prorated to the accepted fraction of the ordered quantity,
            not re-sourced from an independent supplier invoice (none modelled). No recoveries/advances/credits
            exist in this build. Per-component formula ID, effective tax profile and rounding drill-down not
            implemented yet (deferred).
          </p>
        </div>
      )}

      {activeTab === "Approval & Payment" && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4 text-sm">
          {data.canApprove ? (
            <>
              <p className="mb-3 text-c1x-muted">
                This build collapses the contract&apos;s multi-actor chain (prepared, site/QS certification, Finance
                approval, management authority, payment instruction, bank/treasury execution, reconciliation,
                posting) into the single header action below, server-verified for state and re-payment prevention.
              </p>
              <ApproveAndPayButton projectReference={data.project.reference} voucherReference={data.voucher.reference} />
            </>
          ) : (
            <p className="text-c1x-muted">
              Approved and paid {data.voucher.paidAt?.slice(0, 10)} — net {formatMoney(data.voucher.netPayable, data.voucher.currency)}.
              Payment is immutable in this build (no reversal/part-paid flow yet).
            </p>
          )}
        </div>
      )}

      {!REAL_TABS.includes(activeTab) && (
        <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-6 text-sm text-c1x-muted">
          <strong className="text-c1x-ink">{activeTab}</strong> is part of the approved page contract but is not
          implemented in Checkpoint 6 — disclosed gap, not a broken control.
        </div>
      )}
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
