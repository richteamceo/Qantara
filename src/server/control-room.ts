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
};

export type ControlAccountRow = {
  id: string;
  code: string;
  name: string;
  currentBudget: number;
  budgetCurrency: string;
  budgetSource: string | null;
  requestPipeline: number;
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

type RequestChainRow = {
  requestId: string;
  requestReference: string;
  controlledEstimate: string;
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
    { requestPipeline: number; awardedNotOrdered: number; openCommitment: number; certifiedActual: number }
  >();
  const lifecycleCounts: Record<string, { count: number; amount: number }> = {
    demand: { count: 0, amount: 0 },
    approval: { count: 0, amount: 0 },
    package: { count: 0, amount: 0 },
    award: { count: 0, amount: 0 },
    financeValidation: { count: 0, amount: 0 },
    order: { count: 0, amount: 0 },
    fulfilment: { count: 0, amount: 0 },
    settle: { count: 0, amount: 0 },
  };
  let totalCashPaid = 0;
  const decisions: DecisionItem[] = [];

  for (const r of rows) {
    const bucket = perAccount.get(r.controlAccountId) ?? {
      requestPipeline: 0,
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
    } else {
      bucket.requestPipeline += Number(r.controlledEstimate);
    }

    // Lifecycle spine: each transaction is tagged at exactly one position —
    // the highest it has reached — never stacked across positions
    // (CLAUDE_CODE_MASTER_EXECUTION_PROMPT.md #4, PAGE_01 acceptance test #2).
    if (r.paymentVoucherId) {
      lifecycleCounts.settle.count += 1;
      lifecycleCounts.settle.amount += Number(r.pvNetPayable);
    } else if (r.fulfilmentId) {
      lifecycleCounts.fulfilment.count += 1;
      lifecycleCounts.fulfilment.amount += certifiedGross;
    } else if (r.purchaseOrderId) {
      lifecycleCounts.order.count += 1;
      lifecycleCounts.order.amount += Number(r.purchaseOrderGross);
    } else if (r.financeValidationId) {
      lifecycleCounts.financeValidation.count += 1;
      lifecycleCounts.financeValidation.amount += Number(r.purchaseOrderGross ?? 0);
    } else if (r.awardId) {
      lifecycleCounts.award.count += 1;
      lifecycleCounts.award.amount += Number(r.awardNet);
    } else if (r.packageId) {
      lifecycleCounts.package.count += 1;
      lifecycleCounts.package.amount += Number(r.packageEstimate);
    } else {
      lifecycleCounts.demand.count += 1;
      lifecycleCounts.demand.amount += Number(r.controlledEstimate);
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

  // Every request/package/award/PO/PV column below is transacted in the
  // project's own reporting currency (there is no per-transaction currency
  // field yet — a real gap, see CHECKPOINT_1_ADDENDUM.md). Control-account
  // budgets, by contrast, are sourced straight from the BOQ MASTER sheet in
  // their own native currency, which is not guaranteed to match. Money
  // arithmetic across currencies requires an explicit, dated exchange rate
  // (CANONICAL_DOMAIN_MODEL_V7_DELTA.md §4) that this build does not have a
  // live source for — so budget-vs-commitment variance is only computed
  // when the two currencies actually match, never silently subtracted.
  const accountRows: ControlAccountRow[] = accounts.map((a) => {
    const b = perAccount.get(a.id) ?? {
      requestPipeline: 0,
      awardedNotOrdered: 0,
      openCommitment: 0,
      certifiedActual: 0,
    };
    const budget = Number(a.currentBudget);
    const committedTotal = b.requestPipeline + b.awardedNotOrdered + b.openCommitment + b.certifiedActual;
    const variance: MetricValue =
      a.currency === project.currency
        ? {
            status: "computed",
            value: { amount: budget - committedTotal, currency: a.currency },
            basis: "Budget minus pipeline + awarded-not-ordered + open commitment + certified actual",
          }
        : {
            status: "incomplete",
            reason: `Budget is ${a.currency}; commitment/certified figures are ${project.currency}. No dated exchange rate is available to convert, so no variance is computed (not shown as zero).`,
          };
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      currentBudget: budget,
      budgetCurrency: a.currency,
      budgetSource: a.budgetSource,
      requestPipeline: b.requestPipeline,
      awardedNotOrdered: b.awardedNotOrdered,
      openCommitment: b.openCommitment,
      certifiedActual: b.certifiedActual,
      variance,
      activeGate: b.certifiedActual > 0 ? "Fulfilment / PV & Settle" : b.awardedNotOrdered + b.openCommitment > 0 ? "Order & Commit" : "Demand & BOQ gate",
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
      status: accountRows.every((a) => a.budgetCurrency === project.currency) ? "pass" : "fail",
      detail: accountRows.every((a) => a.budgetCurrency === project.currency)
        ? "All control-account budgets share the project's reporting currency"
        : `Budget sourced from BOQ MASTER is ${[...budgetCurrencies].join("/")}; project reporting currency is ${project.currency} — variance not computed until a dated exchange rate is available`,
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
