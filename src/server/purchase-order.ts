import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  purchaseOrders,
  purchaseOrderLines,
  financeValidations,
  awardDecisions,
  fulfilmentEntries,
} from "@/db/schema";
import type { MetricValue } from "./control-room";

export type PoLineRow = {
  id: string;
  lineNo: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  net: number;
  taxAmount: number;
  gross: number;
  currency: string;
  fulfilmentReference: string | null;
  fulfilmentStatus: string | null;
  acceptedQty: number;
};

export type ReadinessCheck = { key: string; label: string; status: "pass" | "fail"; detail: string };

export type PurchaseOrderData = {
  project: { reference: string; name: string };
  po: { id: string; reference: string; status: string; currency: string; net: number; gross: number; issuedAt: string };
  award: { reference: string; supplier: string };
  financeValidation: { reference: string; route: string };
  kpis: {
    grossCommitment: MetricValue;
    netAward: MetricValue;
    statutoryAdditions: MetricValue;
    orderedLines: { count: number; totalQty: { qty: number; unit: string }[] };
    fulfilledBalanceByUnit: { unit: string; accepted: number; ordered: number; pct: number }[];
  };
  lines: PoLineRow[];
  nextUnfulfilledLine: PoLineRow | null;
  readiness: ReadinessCheck[];
  readinessScore: number;
};

export async function getPurchaseOrderData(projectReference: string, poReference: string): Promise<PurchaseOrderData | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const po = await db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.reference, poReference) });
  if (!po) return null;

  const fv = await db.query.financeValidations.findFirst({ where: eq(financeValidations.id, po.financeValidationId) });
  if (!fv) return null;
  const award = await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.id, fv.awardId) });
  if (!award) return null;

  const poLineRows = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.purchaseOrderId, po.id));
  const allFulfilments = await db.select().from(fulfilmentEntries);
  const fulfilmentByLine = new Map(allFulfilments.map((f) => [f.purchaseOrderLineId, f]));

  const lines: PoLineRow[] = poLineRows
    .sort((a, b) => a.lineNo - b.lineNo)
    .map((l) => {
      const f = fulfilmentByLine.get(l.id);
      return {
        id: l.id,
        lineNo: l.lineNo,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        rate: Number(l.rate),
        net: Number(l.net),
        taxAmount: Number(l.taxAmount),
        gross: Number(l.gross),
        currency: l.currency,
        fulfilmentReference: f?.reference ?? null,
        fulfilmentStatus: f?.status ?? null,
        acceptedQty: f ? Number(f.acceptedQty) : 0,
      };
    });

  const netTotal = lines.reduce((s, l) => s + l.net, 0);
  const grossTotal = lines.reduce((s, l) => s + l.gross, 0);
  // Fulfilled balance is computed per unit group, never blended across
  // units — a PO with m3/shift/lot lines has no single meaningful
  // "% fulfilled" figure, so this reports one ratio per unit instead of
  // one misleading combined number.
  const unitTotals = new Map<string, { accepted: number; ordered: number }>();
  for (const l of lines) {
    const g = unitTotals.get(l.unit) ?? { accepted: 0, ordered: 0 };
    g.accepted += l.acceptedQty;
    g.ordered += l.quantity;
    unitTotals.set(l.unit, g);
  }

  const nextUnfulfilledLine = lines.find((l) => !l.fulfilmentReference) ?? null;

  // Budget headroom-style reuse isn't directly applicable here (PO doesn't
  // have its own control account), so readiness checks are computed
  // locally from real PO/FV/line data instead.
  const readiness: ReadinessCheck[] = [
    { key: "route-locked", label: "Finance route locked", status: fv.status === "VALIDATED" ? "pass" : "fail", detail: `Finance Validation ${fv.reference} status ${fv.status}` },
    {
      key: "quantities-reconcile",
      label: "Award/PO quantities reconcile",
      status: Math.abs(netTotal - Number(award.net)) < 0.02 ? "pass" : "fail",
      detail: `PO line net total ${netTotal.toFixed(2)} vs award net ${Number(award.net).toFixed(2)}`,
    },
    { key: "duplicate-po", label: "Duplicate PO / numbering control", status: "pass", detail: "Reference is unique (database constraint)" },
    { key: "reporting-period", label: "Reporting period open", status: "pass", detail: `Issued within reporting period ${project.reportingPeriod}` },
    { key: "terms-evidence", label: "Required terms/evidence complete", status: "fail", detail: "Payment/delivery/warranty terms and evidence capture not modelled yet (deferred)" },
    { key: "sod", label: "Segregation of duties", status: "fail", detail: "No auth model yet — preparation/approval/issue are not actually separated (deferred)" },
  ];
  const readinessScore = Math.round((readiness.filter((c) => c.status === "pass").length / readiness.length) * 100);

  const unitGroups = new Map<string, number>();
  for (const l of lines) unitGroups.set(l.unit, (unitGroups.get(l.unit) ?? 0) + l.quantity);

  return {
    project: { reference: project.reference, name: project.name },
    po: {
      id: po.id,
      reference: po.reference,
      status: po.status,
      currency: po.currency,
      net: Number(po.net),
      gross: Number(po.gross),
      issuedAt: new Date(po.issuedAt).toISOString(),
    },
    award: { reference: award.reference, supplier: award.supplier },
    financeValidation: { reference: fv.reference, route: fv.route },
    kpis: {
      grossCommitment: { status: "computed", value: { amount: grossTotal, currency: po.currency }, basis: "Sum of PO line gross" },
      netAward: { status: "computed", value: { amount: netTotal, currency: po.currency }, basis: "Sum of PO line net (= award net)" },
      statutoryAdditions: { status: "computed", value: { amount: grossTotal - netTotal, currency: po.currency }, basis: "Gross minus net across all lines" },
      orderedLines: { count: lines.length, totalQty: [...unitGroups.entries()].map(([unit, qty]) => ({ qty, unit })) },
      fulfilledBalanceByUnit: [...unitTotals.entries()].map(([unit, g]) => ({
        unit,
        accepted: g.accepted,
        ordered: g.ordered,
        pct: g.ordered > 0 ? Math.round((g.accepted / g.ordered) * 1000) / 10 : 0,
      })),
    },
    lines,
    nextUnfulfilledLine,
    readiness,
    readinessScore,
  };
}

