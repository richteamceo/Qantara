import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  financeValidations,
  awardDecisions,
  awardLines,
  procurementPackages,
  requests,
  purchaseOrders,
} from "@/db/schema";
import { getControlRoomData, type MetricValue } from "./control-room";
import { getActorRole, ROLE_LABELS } from "@/lib/auth";
import { getChainStatus, type ChainStatus } from "./approvals";

export type RouteOption = {
  route: "CREDIT" | "CASH" | "ADVANCE" | "URGENT" | "DIRECT" | "REVIEW";
  eligible: boolean;
  reason: string;
  sequence: string;
  isPrimaryCard: boolean;
};

export type ReadinessCheck = { key: string; label: string; status: "pass" | "fail"; detail: string };

export type FinanceValidationData = {
  project: { reference: string; name: string };
  fv: {
    id: string;
    reference: string;
    route: string;
    status: string;
    currency: string;
    grossOrderValue: number;
    vatAmount: number;
    nhilAmount: number;
    getfundAmount: number;
    whtAmount: number;
    netPayable: number;
    validatedAt: string | null;
  };
  award: { reference: string; net: number; currency: string; supplier: string; deviationCode: string | null };
  packageReference: string;
  purchaseOrderReference: string | null;
  kpis: {
    grossValue: MetricValue;
    commercialVariance: MetricValue;
    budgetHeadroom: MetricValue;
    immediatePaymentExposure: MetricValue;
  };
  routeOptions: RouteOption[];
  lines: { lineNo: number; description: string; quantity: number; unit: string; rate: number; net: number; currency: string }[];
  readiness: ReadinessCheck[];
  readinessScore: number;
  canValidateLock: boolean;
  validateBlockedReason: string | null;
  /** Added Checkpoint 12 — Accountant -> MD chain, source workbook FINANCE VALIDATION sheet. Gates Payment Voucher creation on P08. */
  paymentAuthorizationChain: ChainStatus;
};

const CREDIT_SEQUENCE = "Issue PO → Accept GRN/SE → Generate PV → Pay";

export async function getFinanceValidationData(
  projectReference: string,
  fvReference: string
): Promise<FinanceValidationData | null> {
  const actorRole = await getActorRole();
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const fv = await db.query.financeValidations.findFirst({ where: eq(financeValidations.reference, fvReference) });
  if (!fv) return null;

  const award = await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.id, fv.awardId) });
  if (!award) return null;

  const pkg = await db.query.procurementPackages.findFirst({ where: eq(procurementPackages.id, award.packageId) });
  if (!pkg) return null;

  const request = await db.query.requests.findFirst({ where: eq(requests.id, pkg.requestId) });
  const lineRows = await db.select().from(awardLines).where(eq(awardLines.awardId, award.id));
  const existingPO = await db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.financeValidationId, fv.id) });

  const gross = Number(fv.grossOrderValue);
  const netPayable = Number(fv.netPayable);
  const awardNet = Number(award.net);

  // Route eligibility — a deliberately simple, real, disclosed
  // simplification of the full COST_TYPE_ROUTE_COMPATIBILITY engine
  // (⚙ SETTINGS sheet), not a claim of full policy-driven eligibility.
  const isSoleSource = award.deviationCode === "SOLE_SOURCE";
  const isUrgentPriority = request?.priority === "URGENT";
  const routeOptions: RouteOption[] = [
    { route: "CREDIT", eligible: true, reason: "Standard route, eligible for any validated award.", sequence: CREDIT_SEQUENCE, isPrimaryCard: true },
    { route: "CASH", eligible: true, reason: "Cash route available; pays before receipt confirmation.", sequence: "Generate PV → Pay → Confirm/Receipt → Post-validate", isPrimaryCard: true },
    { route: "ADVANCE", eligible: true, reason: "Advance route available; exposure precedes delivery.", sequence: "Advance PV → Pay / Exposure → Delivery → Recover", isPrimaryCard: true },
    {
      route: "URGENT",
      eligible: isUrgentPriority,
      reason: isUrgentPriority ? "Source request priority is URGENT." : "Only eligible when the source request's priority is URGENT.",
      sequence: "Accelerated PO → Expedited GRN/SE → Generate PV → Pay",
      isPrimaryCard: false,
    },
    {
      route: "DIRECT",
      eligible: isSoleSource,
      reason: isSoleSource ? "Sole-source award qualifies for Finance-direct initiation." : "Only eligible for sole-source awards.",
      sequence: "Finance-Direct Initiation → Generate PV → Pay",
      isPrimaryCard: false,
    },
    { route: "REVIEW", eligible: true, reason: "Always available — blocks and returns for correction.", sequence: "Block → Return for Correction", isPrimaryCard: true },
  ];

  // Budget headroom reuses Page 01's own per-account variance computation
  // (same currency-guarded logic — see CHECKPOINT_1_ADDENDUM.md) rather than
  // re-deriving it here.
  let budgetHeadroom: MetricValue = { status: "incomplete", reason: "Control account not resolved" };
  if (request) {
    const controlRoom = await getControlRoomData(projectReference);
    const accountRow = controlRoom?.accounts.find((a) => a.id === request.controlAccountId);
    if (accountRow) budgetHeadroom = accountRow.variance;
  }

  const immediatePaymentExposure: MetricValue =
    fv.route === "CASH" || fv.route === "ADVANCE" || fv.route === "DIRECT"
      ? { status: "computed", value: { amount: netPayable, currency: fv.currency }, basis: "Route pays before/without a prior receipt confirmation gate" }
      : { status: "computed", value: { amount: 0, currency: fv.currency }, basis: "CREDIT/URGENT/REVIEW route pays only after GRN/SE or is blocked" };

  const readiness: ReadinessCheck[] = [
    { key: "source-lineage", label: "Source lineage", status: "pass", detail: `Traces to ${award.reference} / ${pkg.reference}` },
    { key: "award-reconciliation", label: "Award reconciliation", status: "pass", detail: "Gross derived directly from award net — no independent re-entry drift" },
    {
      key: "tax-determination",
      label: "Tax determination",
      status: Math.abs(Number(fv.vatAmount) + Number(fv.nhilAmount) + Number(fv.getfundAmount) + awardNet - gross) < 0.02 ? "pass" : "fail",
      detail: "VAT 15% + NHIL 2.5% + GETFund 2.5% + net reconciles to gross",
    },
    {
      key: "sod-authority",
      label: "SoD / authority",
      status: actorRole === "FINANCE" ? "pass" : "fail",
      detail:
        actorRole === "FINANCE"
          ? "Current actor (Finance Reviewer) holds the FINANCE role required to lock this route — server-enforced (Checkpoint 7)"
          : `Current actor (${ROLE_LABELS[actorRole]}) lacks the Finance role required to lock this route — Validate & Lock is server-blocked, not just hidden`,
    },
    { key: "route-sequencing", label: "Route sequencing", status: routeOptions.find((r) => r.route === fv.route)?.eligible ? "pass" : "fail", detail: `Current route ${fv.route} eligibility checked against real rules above` },
    { key: "evidence-completeness", label: "Evidence completeness", status: "fail", detail: "Evidence register / audit engine not implemented yet (deferred)" },
  ];
  const readinessScore = Math.round((readiness.filter((c) => c.status === "pass").length / readiness.length) * 100);

  let paymentAuthorizationChain = await getChainStatus("FINANCE_PAYMENT_AUTHORIZATION", fv.id, fv.reference);
  if (fv.status !== "VALIDATED") {
    // The Accountant approves the FINAL validated payable amount (BR-FIN-002/003) — not
    // startable before Finance locks the route, even though ensureChainInitialized
    // already created PENDING rows for display.
    paymentAuthorizationChain = {
      ...paymentAuthorizationChain,
      steps: paymentAuthorizationChain.steps.map((s) => ({
        ...s,
        actionable: false,
        blockedReason: "Route must be validated and locked (Validate & Lock Route) before payment authorization can start",
      })),
    };
  }

  return {
    project: { reference: project.reference, name: project.name },
    fv: {
      id: fv.id,
      reference: fv.reference,
      route: fv.route,
      status: fv.status,
      currency: fv.currency,
      grossOrderValue: gross,
      vatAmount: Number(fv.vatAmount),
      nhilAmount: Number(fv.nhilAmount),
      getfundAmount: Number(fv.getfundAmount),
      whtAmount: Number(fv.whtAmount),
      netPayable,
      validatedAt: fv.validatedAt ? new Date(fv.validatedAt).toISOString() : null,
    },
    award: { reference: award.reference, net: awardNet, currency: award.currency, supplier: award.supplier, deviationCode: award.deviationCode },
    packageReference: pkg.reference,
    purchaseOrderReference: existingPO?.reference ?? null,
    kpis: {
      grossValue: { status: "computed", value: { amount: gross, currency: fv.currency }, basis: "Net award + VAT + NHIL + GETFund" },
      commercialVariance: { status: "computed", value: { amount: 0, currency: fv.currency }, basis: "Finance gross is derived directly from the award's own net — no independent scope/rate re-entry to drift" },
      budgetHeadroom,
      immediatePaymentExposure,
    },
    routeOptions,
    lines: lineRows
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((l) => ({ lineNo: l.lineNo, description: l.description, quantity: Number(l.quantity), unit: l.unit, rate: Number(l.rate), net: Number(l.netAmount), currency: l.currency })),
    readiness,
    readinessScore,
    canValidateLock: fv.status === "PENDING",
    validateBlockedReason: fv.status !== "PENDING" ? `Already ${fv.status}` : null,
    paymentAuthorizationChain,
  };
}
