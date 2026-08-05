import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, variationOrders, controlAccounts } from "@/db/schema";

/**
 * Server-side aggregation for the Variation Order Register — added
 * Checkpoint 13, self-scoped (no PAGE_XX contract exists for this in the
 * pack). Same currency-guard discipline as every other register in this
 * build (CHECKPOINT_1_ADDENDUM.md): amounts are grouped by currency, never
 * blended into one misleading total.
 */

export type VoRow = {
  id: string;
  voNumber: string;
  dateRaised: string;
  tradeCode: string;
  description: string;
  originator: string;
  instructionRef: string | null;
  drawingRef: string | null;
  boqItemRef: string;
  controlAccountCode: string;
  controlAccountName: string;
  unit: string;
  quantity: number;
  rate: number;
  voValue: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedByRole: string | null;
  approvalDate: string | null;
  contractImpact: string | null;
  remarks: string | null;
  isDemoData: boolean;
  demoNote: string | null;
};

export type CurrencyAmount = { currency: string; amount: number; count: number };

export type VariationOrdersData = {
  project: { id: string; reference: string; name: string };
  rows: VoRow[];
  controlAccounts: { id: string; code: string; name: string; currency: string }[];
  kpis: {
    pendingValue: CurrencyAmount[];
    approvedValue: CurrencyAmount[];
    pendingCount: number;
  };
};

export async function getVariationOrdersData(projectReference: string): Promise<VariationOrdersData | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const voRows = await db.select().from(variationOrders).where(eq(variationOrders.projectId, project.id));
  const accounts = await db.select().from(controlAccounts).where(eq(controlAccounts.projectId, project.id));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const rows: VoRow[] = voRows
    .sort((a, b) => new Date(b.dateRaised).getTime() - new Date(a.dateRaised).getTime())
    .map((v) => {
      const account = accountById.get(v.controlAccountId);
      return {
        id: v.id,
        voNumber: v.voNumber,
        dateRaised: new Date(v.dateRaised).toISOString(),
        tradeCode: v.tradeCode,
        description: v.description,
        originator: v.originator,
        instructionRef: v.instructionRef,
        drawingRef: v.drawingRef,
        boqItemRef: v.boqItemRef,
        controlAccountCode: account?.code ?? "—",
        controlAccountName: account?.name ?? "Not found",
        unit: v.unit,
        quantity: Number(v.quantity),
        rate: Number(v.rate),
        voValue: Number(v.voValue),
        currency: v.currency,
        status: v.status,
        approvedByRole: v.approvedByRole,
        approvalDate: v.approvalDate ? new Date(v.approvalDate).toISOString() : null,
        contractImpact: v.contractImpact,
        remarks: v.remarks,
        isDemoData: v.isDemoData,
        demoNote: v.demoNote,
      };
    });

  function sumByCurrency(filtered: VoRow[]): CurrencyAmount[] {
    const map = new Map<string, CurrencyAmount>();
    for (const r of filtered) {
      const cur = map.get(r.currency) ?? { currency: r.currency, amount: 0, count: 0 };
      cur.amount += r.voValue;
      cur.count += 1;
      map.set(r.currency, cur);
    }
    return [...map.values()];
  }

  const pendingRows = rows.filter((r) => r.status === "PENDING");
  const approvedRows = rows.filter((r) => r.status === "APPROVED");

  return {
    project: { id: project.id, reference: project.reference, name: project.name },
    rows,
    controlAccounts: accounts.map((a) => ({ id: a.id, code: a.code, name: a.name, currency: a.currency })),
    kpis: {
      pendingValue: sumByCurrency(pendingRows),
      approvedValue: sumByCurrency(approvedRows),
      pendingCount: pendingRows.length,
    },
  };
}
