import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, fulfilmentEntries, purchaseOrderLines, purchaseOrders, awardDecisions, financeValidations } from "@/db/schema";

export type ReadinessCheck = { key: string; label: string; status: "pass" | "fail"; detail: string };

export type FulfilmentData = {
  project: { reference: string; name: string };
  fulfilment: { id: string; reference: string; status: string; deliveredQty: number; acceptedQty: number; rejectedQty: number; outstandingQty: number; unit: string };
  poLine: { description: string; orderedQty: number; unit: string; rate: number; currency: string };
  purchaseOrderReference: string;
  supplier: string;
  kpis: {
    ordered: number;
    deliveredToDate: number;
    acceptedNow: number;
    rejectedNow: number;
    outstandingAfterEntry: number;
    certifiableValue: { amount: number; currency: string };
  };
  readiness: ReadinessCheck[];
  readinessScore: number;
  canPost: boolean;
};

export async function getFulfilmentData(projectReference: string, fulfilmentReference: string): Promise<FulfilmentData | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const fulfilment = await db.query.fulfilmentEntries.findFirst({ where: eq(fulfilmentEntries.reference, fulfilmentReference) });
  if (!fulfilment) return null;

  const line = await db.query.purchaseOrderLines.findFirst({ where: eq(purchaseOrderLines.id, fulfilment.purchaseOrderLineId) });
  if (!line) return null;
  const po = await db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.id, fulfilment.purchaseOrderId) });
  if (!po) return null;
  const fv = await db.query.financeValidations.findFirst({ where: eq(financeValidations.id, po.financeValidationId) });
  const award = fv ? await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.id, fv.awardId) }) : null;

  const orderedQty = Number(line.quantity);
  const accepted = Number(fulfilment.acceptedQty);
  const rejected = Number(fulfilment.rejectedQty);
  const delivered = Number(fulfilment.deliveredQty);
  const outstanding = Number(fulfilment.outstandingQty);
  const rate = Number(line.rate);
  const certifiableValue = Math.round(accepted * rate * 100) / 100;

  const readiness: ReadinessCheck[] = [
    { key: "po-balance", label: "PO balance", status: accepted + outstanding <= orderedQty + 0.001 ? "pass" : "fail", detail: `Accepted (${accepted}) + outstanding (${outstanding}) vs ordered (${orderedQty})` },
    { key: "delivery-evidence", label: "Delivery/service evidence", status: "fail", detail: "Delivery note/photo/weighbridge evidence capture not implemented yet (deferred)" },
    { key: "inspection", label: "Inspection/technical certification", status: fulfilment.status === "POSTED" ? "pass" : "fail", detail: fulfilment.status === "POSTED" ? "Posted — inspection recorded implicitly by acceptance" : "Not yet posted" },
    { key: "quantity-tolerance", label: "Quantity tolerance", status: Math.abs(delivered - (accepted + rejected)) < 0.001 ? "pass" : "fail", detail: "delivered = accepted + rejected" },
    { key: "finance-consequence", label: "Finance consequence", status: fulfilment.status === "POSTED" ? "pass" : "fail", detail: fulfilment.status === "POSTED" ? "Accepted portion is certifiable for a Payment Voucher" : "Not yet posted — no certifiable value transferred" },
    { key: "evidence-completeness", label: "Evidence completeness", status: "fail", detail: "Evidence register / audit engine not implemented yet (deferred)" },
  ];
  const readinessScore = Math.round((readiness.filter((c) => c.status === "pass").length / readiness.length) * 100);

  return {
    project: { reference: project.reference, name: project.name },
    fulfilment: {
      id: fulfilment.id,
      reference: fulfilment.reference,
      status: fulfilment.status,
      deliveredQty: delivered,
      acceptedQty: accepted,
      rejectedQty: rejected,
      outstandingQty: outstanding,
      unit: fulfilment.unit,
    },
    poLine: { description: line.description, orderedQty, unit: line.unit, rate, currency: line.currency },
    purchaseOrderReference: po.reference,
    supplier: award?.supplier ?? "—",
    kpis: {
      ordered: orderedQty,
      deliveredToDate: delivered,
      acceptedNow: accepted,
      rejectedNow: rejected,
      outstandingAfterEntry: outstanding,
      certifiableValue: { amount: certifiableValue, currency: line.currency },
    },
    readiness,
    readinessScore,
    canPost: fulfilment.status === "DRAFT",
  };
}
