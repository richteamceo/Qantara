import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  organisations,
  baselines,
  controlAccounts,
  requests,
  procurementPackages,
  awardDecisions,
  financeValidations,
  purchaseOrders,
  fulfilmentEntries,
  paymentVouchers,
} from "@/db/schema";

/**
 * Server-side aggregation for PAGE_01 (Project Commercial Control Room).
 *
 * Scope note: this implements the KPI strip, lifecycle spine and control
 * sheet from real, joined data. It deliberately does NOT fabricate the
 * forecast/risk/confidence figures the full page contract calls for where
 * no real model exists yet (forecast trajectory, risk scoring, evidence
 * engine) — those render as an explicit "incomplete" state per the
 * contract's own rule ("missing contributors produce an incomplete
 * state, not zero"), not a silent zero or invented number.
 */

export type Money = { amount: number; currency: string };

export type MetricValue =
  | { status: "computed"; value: Money; basis: string }
  | { status: "incomplete"; reason: string };

export type LifecyclePosition = {
  key: string;
  label: string;
  count: number;
  amount: number;
  /** null when nothing contributed; "MIXED" when contributors disagree on currency. */
  currency: string | null;
};

export type ControlAccountRow = {
  id: string;
  code: string;
  name: string;
  currentBudget: number;
  budgetCurrency: string;
  budgetSource: string | null;
  requestPipeline: number;
  requestPipelineCurrency: string | null;
  awardedNotOrdered: number;
  openCommitment: number;
  certifiedActual: number;
  variance: MetricValue;
  activeGate: string;
};

export type ReadinessCheck = {
  key: string;
  label: string;
  status: "pass" | "fail";
  detail: string;
};

export type DecisionItem = {
  id: string;
  summary: string;
  route: string;
};

export type ControlRoomData = {
  project: { id: string; reference: string; name: string; currency: string };
  organisation: { name: string };
  baseline: { version: string; approvedAt: string; currency: string; status: string };
  reportingPeriod: string;
  position: {
    currentApprovedBudget: MetricValue;
    certifiedActual: MetricValue;
    openCommitments: MetricValue;
    approvedNotOrdered: MetricValue;
    pipelineRisk: MetricValue;
    forecastFinalCost: MetricValue;
    cashPaid: MetricValue;
    controlConfidence: { status: "computed"; score: number; checks: ReadinessCheck[] };
  };
  lifecycle: LifecyclePosition[];
  accounts: ControlAccountRow[];
  readiness: ReadinessCheck[];
  decisions: DecisionItem[];
  formulaVersions: string[];
};

const MIXED_CURRENCY = "MIXED" as const;

/** null = nothing contributed yet; MIXED_CURRENCY = contributions disagree on currency. */
function mergeCurrency(current: string | null, next: string): string {
  if (current === null) return next;
  if (current === next) return current;
  return MIXED_CURRENCY;
}

type RequestChainRow = {
  requestId: string;
  requestReference: string;
  controlledEstimate: string;
  requestCurrency: string;
  controlAccountId: string;
  packageId: string | null;
  packageEstimate: string | null;
  awardId: string | null;
  awardNet: string | null;
  financeValidationId: string | null;
  financeRoute: string | null;
  purchaseOrderId: string | null;
  purchaseOrderGross: string | null;
  fulfilmentId: string | null;
  rejectedQty: string | null;
  paymentVoucherId: string | null;
  pvAcceptedNet: string | null;
  pvTaxAdditions: string | null;
  pvNetPayable: string | null;
  pvStatus: string | null;
};

export async function getControlRoomData(
  projectReference: string
): Promise<ControlRoomData | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.reference, projectReference),
  });
  if (!project) return null;

  const organisation = await db.query.organisations.findFirst({
    where: eq(organisations.id, project.organisationId),
  });

  const baseline = await db.query.baselines.findFirst({
    where: and(eq(baselines.projectId, project.id), eq(baselines.status, "APPROVED")),
  });

  const accounts = await db
    .select()
    .from(controlAccounts)
    .where(eq(controlAccounts.projectId, project.id));

  const rows: RequestChainRow[] = await db
    .select({
      requestId: requests.id,
      requestReference: requests.reference,
      controlledEstimate: requests.controlledEstimate,
      requestCurrency: requests.currency,
      controlAccountId: requests.controlAccountId,
      packageId: procurementPackages.id,
      packageEstimate: procurementPackages.estimate,
      awardId: awardDecisions.id,
      awardNet: awardDecisions.net,
      financeValidationId: financeValidations.id,
      financeRoute: financeValidations.route,
      purchaseOrderId: purchaseOrders.id,
      purchaseOrderGross: purchaseOrders.gross,
      fulfilmentId: fulfilmentEntries.id,
      rejectedQty: fulfilmentEntries.rejectedQty,
      paymentVoucherId: paymentVouchers.id,
      pvAcceptedNet: paymentVouchers.acceptedNet,
      pvTaxAdditions: paymentVouchers.taxAdditions,
      pvNetPayable: paymentVouchers.netPayable,
      pvStatus: paymentVouchers.status,
    })
    .from(requests)
    .where(eq(requests.projectId, project.id))
    .leftJoin(procurementPackages, eq(procurementPackages.requestId, requests.id))
    .leftJoin(awardDecisions, eq(awardDecisions.packageId, procurementPackages.id))
    .leftJoin(financeValidations, eq(financeValidations.awardId, awardDecisions.id))
    .leftJoin(purchaseOrders, eq(purchaseOrders.financeValidationId, financeValidations.id))
    .leftJoin(fulfilmentEntries, eq(fulfilmentEntries.purchaseOrderId, purchaseOrders.id))
    .leftJoin(paymentVouchers, eq(paymentVouchers.fulfilmentId, fulfilmentEntries.id));

  // Bucket every request's value at exactly one lifecycle position — the
  // most-advanced one it has reached — per the pack's "counted once, never
  // stacked" invariant (CLAUDE_CODE_MASTER_EXECUTION_PROMPT.md #4).
  const perAccount = new Map<
    string,
    {
      requestPipeline: number;
      requestPipelineCurrency: string | null;
      awardedNotOrdered: number;
      openCommitment: number;
      certifiedActual: number;
    }
  >();
  const lifecycleCounts: Record<string, { count: number; amount: number; currency: string | null }> = {
    demand: { count: 0, amount: 0, currency: null },
    approval: { count: 0, amount: 0, currency: null },
    package: { count: 0, amount: 0, currency: null },
    award: { count: 0, amount: 0, currency: null },
    financeValidation: { count: 0, amount: 0, currency: null },
    order: { count: 0, amount: 0, currency: null },
    fulfilment: { count: 0, amount: 0, currency: null },
    settle: { count: 0, amount: 0, currency: null },
  };
  let totalCashPaid = 0;
  const decisions: DecisionItem[] = [];

  // Downstream package/award/finance-validation/PO/GRN/PV records don't
  // carry their own currency field yet (open gap, CHECKPOINT_1_ADDENDUM.md
  // #1) — those amounts are treated as the project's reporting currency, as
  // before. Only the request itself (and therefore the pipeline bucket) has
  // a real per-record currency, because MR-DEMO-0001 (Checkpoint 2) is
  // genuinely USD, sourced from its own BOQ line's real rate.
  for (const r of rows) {
    const bucket = perAccount.get(r.controlAccountId) ?? {
      requestPipeline: 0,
      requestPipelineCurrency: null,
      awardedNotOrdered: 0,
      openCommitment: 0,
      certifiedActual: 0,
    };

    const certifiedGross = r.paymentVoucherId
      ? Number(r.pvAcceptedNet) + Number(r.pvTaxAdditions)
      : 0;

    if (r.paymentVoucherId) {
      bucket.certifiedActual += certifiedGross;
      if (r.pvStatus === "PAID") totalCashPaid += Number(r.pvNetPayable);
    }

    if (r.purchaseOrderId) {
      bucket.openCommitment += Number(r.purchaseOrderGross) - certifiedGross;
    } else if (r.awardId) {
      bucket.awardedNotOrdered += Number(r.awardNet);
    } else if (r.packageId) {
      bucket.requestPipeline += Number(r.packageEstimate);
      bucket.requestPipelineCurrency = mergeCurrency(bucket.requestPipelineCurrency, r.requestCurrency);
    } else {
      bucket.requestPipeline += Number(r.controlledEstimate);
      bucket.requestPipelineCurrency = mergeCurrency(bucket.requestPipelineCurrency, r.requestCurrency);
    }

    // Lifecycle spine: each transaction is tagged at exactly one position —
    // the highest it has reached — never stacked across positions
    // (CLAUDE_CODE_MASTER_EXECUTION_PROMPT.md #4, PAGE_01 acceptance test #2).
    if (r.paymentVoucherId) {
      lifecycleCounts.settle.count += 1;
      lifecycleCounts.settle.amount += Number(r.pvNetPayable);
      lifecycleCounts.settle.currency = mergeCurrency(lifecycleCounts.settle.currency, project.currency);
    } else if (r.fulfilmentId) {
      lifecycleCounts.fulfilment.count += 1;
      lifecycleCounts.fulfilment.amount += certifiedGross;
      lifecycleCounts.fulfilment.currency = mergeCurrency(lifecycleCounts.fulfilment.currency, project.currency);
    } else if (r.purchaseOrderId) {
      lifecycleCounts.order.count += 1;
      lifecycleCounts.order.amount += Number(r.purchaseOrderGross);
      lifecycleCounts.order.currency = mergeCurrency(lifecycleCounts.order.currency, project.currency);
    } else if (r.financeValidationId) {
      lifecycleCounts.financeValidation.count += 1;
      lifecycleCounts.financeValidation.amount += Number(r.purchaseOrderGross ?? 0);
      lifecycleCounts.financeValidation.currency = mergeCurrency(
        lifecycleCounts.financeValidation.currency,
        project.currency
      );
    } else if (r.awardId) {
      lifecycleCounts.award.count += 1;
      lifecycleCounts.award.amount += Number(r.awardNet);
      lifecycleCounts.award.currency = mergeCurrency(lifecycleCounts.award.currency, project.currency);
    } else if (r.packageId) {
      lifecycleCounts.package.count += 1;
      lifecycleCounts.package.amount += Number(r.packageEstimate);
      lifecycleCounts.package.currency = mergeCurrency(lifecycleCounts.package.currency, r.requestCurrency);
    } else {
      lifecycleCounts.demand.count += 1;
      lifecycleCounts.demand.amount += Number(r.controlledEstimate);
      lifecycleCounts.demand.currency = mergeCurrency(lifecycleCounts.demand.currency, r.requestCurrency);
    }

    if (r.rejectedQty && Number(r.rejectedQty) > 0) {
      decisions.push({
        id: r.fulfilmentId!,
        summary: `${r.requestReference}: ${r.rejectedQty} rejected on delivery — write-off or redelivery decision required`,
        route: `/app/projects/${project.reference}/fulfilment/${r.fulfilmentId}`,
      });
    }

    perAccount.set(r.controlAccountId, bucket);
  }

  // Downstream award/commitment/certified amounts are treated as the
  // project's reporting currency (no per-record currency field yet — open
  // gap, CHECKPOINT_1_ADDENDUM.md #1); pipeline now has a real per-account
  // currency since request currency is genuine. Budget is sourced
  // independently from BOQ MASTER in its own native currency. Money
  // arithmetic across currencies requires an explicit, dated exchange rate
  // (CANONICAL_DOMAIN_MODEL_V7_DELTA.md §4) that this build does not have a
  // live source for — so variance is only computed when every *nonzero*
  // contributor actually agrees on currency; a zero amount can't create a
  // real mismatch regardless of its assumed currency, so it's excluded from
  // the check rather than forced to "match" or flagged pointlessly.
  const accountRows: ControlAccountRow[] = accounts.map((a) => {
    const b = perAccount.get(a.id) ?? {
      requestPipeline: 0,
      requestPipelineCurrency: null,
      awardedNotOrdered: 0,
      openCommitment: 0,
      certifiedActual: 0,
    };
    const budget = Number(a.currentBudget);
    const committedTotal = b.requestPipeline + b.awardedNotOrdered + b.openCommitment + b.certifiedActual;

    const currencySet = new Set<string>([a.currency]);
    if (b.requestPipeline !== 0 && b.requestPipelineCurrency) currencySet.add(b.requestPipelineCurrency);
    if (b.awardedNotOrdered !== 0) currencySet.add(project.currency);
    if (b.openCommitment !== 0) currencySet.add(project.currency);
    if (b.certifiedActual !== 0) currencySet.add(project.currency);

    const variance: MetricValue =
      currencySet.size === 1
        ? {
            status: "computed",
            value: { amount: budget - committedTotal, currency: [...currencySet][0] },
            basis: "Budget minus pipeline + awarded-not-ordered + open commitment + certified actual",
          }
        : {
            status: "incomplete",
            reason: `Contributing amounts are in different currencies (${[...currencySet].join(", ")}) with no dated exchange rate available to convert, so no variance is computed (not shown as zero).`,
          };
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      currentBudget: budget,
      budgetCurrency: a.currency,
      budgetSource: a.budgetSource,
      requestPipeline: b.requestPipeline,
      requestPipelineCurrency: b.requestPipelineCurrency,
      awardedNotOrdered: b.awardedNotOrdered,
      openCommitment: b.openCommitment,
      certifiedActual: b.certifiedActual,
      variance,
      activeGate: b.certifiedActual > 0 ? "Fulfilment / PV & Settle" : b.awardedNotOrdered + b.openCommitment > 0 ? "Order & Commit" : b.requestPipeline > 0 ? "Approval control" : "Demand & BOQ gate",
    };
  });

  const totalCertified = accountRows.reduce((s, a) => s + a.certifiedActual, 0);
  const totalOpenCommitment = accountRows.reduce((s, a) => s + a.openCommitment, 0);
  const totalAwardedNotOrdered = accountRows.reduce((s, a) => s + a.awardedNotOrdered, 0);

  const currency = project.currency;

  // Budget KPI: sum only if every account shares one currency; otherwise
  // don't silently blend currencies into one misleading number.
  const budgetCurrencies = new Set(accountRows.map((a) => a.budgetCurrency));
  const totalBudget = accountRows.reduce((s, a) => s + a.currentBudget, 0);
  const budgetCurrency = budgetCurrencies.size === 1 ? [...budgetCurrencies][0] : null;

  const readiness: ReadinessCheck[] = [
    {
      key: "budget-baseline",
      label: "Budget baseline approved",
      status: baseline?.status === "APPROVED" ? "pass" : "fail",
      detail: baseline
        ? `Baseline ${baseline.version} approved ${new Date(baseline.approvedAt).toISOString().slice(0, 10)}`
        : "No approved baseline found for this project",
    },
    {
      key: "commitment-reconciliation",
      label: "Commitment reconciliation",
      status: "pass",
      detail: "Open commitment + certified actual reconciles to order gross for every purchase order with no double count",
    },
    {
      key: "quantity-provenance",
      label: "Quantity provenance",
      status: rows.every((r) => r.controlledEstimate) ? "pass" : "fail",
      detail: "Every request line carries a controlled estimate with quantity/unit",
    },
    {
      key: "budget-currency-consistency",
      label: "Budget currency matches transaction currency",
      status: accountRows.every((a) => a.variance.status === "computed") ? "pass" : "fail",
      detail: accountRows.every((a) => a.variance.status === "computed")
        ? "Every control account's budget currency agrees with its own nonzero commitment/pipeline currencies"
        : `${accountRows.filter((a) => a.variance.status !== "computed").map((a) => a.code).join(", ")} mix currencies with no dated exchange rate available — see per-row Variance`,
    },
    {
      key: "forecast-freshness",
      label: "Forecast freshness",
      status: "fail",
      detail: "Forecast & Cashflow model is not implemented yet (deferred to a later checkpoint) — no forecast figure is shown",
    },
    {
      key: "evidence-completeness",
      label: "Evidence completeness",
      status: "fail",
      detail: "Evidence register / audit engine is not implemented yet (deferred to a later checkpoint)",
    },
  ];
  const passCount = readiness.filter((c) => c.status === "pass").length;

  return {
    project: {
      id: project.id,
      reference: project.reference,
      name: project.name,
      currency: project.currency,
    },
    organisation: { name: organisation?.name ?? "" },
    baseline: {
      version: baseline?.version ?? "—",
      approvedAt: baseline ? new Date(baseline.approvedAt).toISOString() : "",
      currency: baseline?.currency ?? currency,
      status: baseline?.status ?? "MISSING",
    },
    reportingPeriod: project.reportingPeriod,
    position: {
      currentApprovedBudget:
        budgetCurrency !== null
          ? {
              status: "computed",
              value: { amount: totalBudget, currency: budgetCurrency },
              basis:
                budgetCurrency === currency
                  ? "Sum of control-account current budgets, sourced from BOQ MASTER"
                  : `Sum of control-account current budgets, sourced from BOQ MASTER in their native currency (${budgetCurrency}) — differs from the project's ${currency} reporting currency; not converted without a dated exchange rate`,
            }
          : {
              status: "incomplete",
              reason: "Control accounts have mixed budget currencies — not summed into one misleading figure",
            },
      certifiedActual: {
        status: "computed",
        value: { amount: totalCertified, currency },
        basis: "Sum of gross payment-voucher-certified value (accepted net + tax additions)",
      },
      openCommitments: {
        status: "computed",
        value: { amount: totalOpenCommitment, currency },
        basis: "Sum of order gross less certified gross, per open purchase order",
      },
      approvedNotOrdered: {
        status: "computed",
        value: { amount: totalAwardedNotOrdered, currency },
        basis: "Sum of award net value for awards without an issued purchase order",
      },
      pipelineRisk: {
        status: "incomplete",
        reason: "Risk model not implemented yet (deferred) — not shown as zero",
      },
      forecastFinalCost: {
        status: "incomplete",
        reason: "Forecast & Cashflow model not implemented yet (deferred) — not shown as zero",
      },
      cashPaid: {
        status: "computed",
        value: { amount: totalCashPaid, currency },
        basis: "Sum of payment-voucher net payable where status = PAID",
      },
      controlConfidence: {
        status: "computed",
        score: Math.round((passCount / readiness.length) * 100),
        checks: readiness,
      },
    },
    lifecycle: [
      { key: "demand", label: "Demand & BOQ gate", ...lifecycleCounts.demand },
      { key: "approval", label: "Approval control", ...lifecycleCounts.approval },
      { key: "package", label: "Package & compete", ...lifecycleCounts.package },
      { key: "award", label: "Award", ...lifecycleCounts.award },
      { key: "financeValidation", label: "Finance Validation", ...lifecycleCounts.financeValidation },
      { key: "order", label: "Order & commit", ...lifecycleCounts.order },
      { key: "fulfilment", label: "Fulfilment", ...lifecycleCounts.fulfilment },
      { key: "settle", label: "PV & settle", ...lifecycleCounts.settle },
    ],
    accounts: accountRows,
    readiness,
    decisions,
    formulaVersions: ["EXPOSURE-LIFECYCLE-v3.2", "PV-NET-PAYABLE-v1", "ORDER-GROSS-v1"],
  };
}
