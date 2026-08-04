import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, requests, requestLines, procurementPackages } from "@/db/schema";

/**
 * Server-side aggregation for PAGE_02 (Requests Register).
 *
 * Scope note: computes real KPIs and grid rows from the seeded requests
 * (the golden transaction's MR-SWTBK-2026-0035 plus the disclosed demo
 * request MR-DEMO-0001 — see src/db/seed.ts). Deliberately does NOT blend
 * amounts across currencies into one misleading total; where a KPI would
 * require that, it's reported per-currency instead (see CurrencyAmount[]).
 * Saved views, export, and bulk operations are not implemented — see
 * CHECKPOINT_2_REPORT.md.
 */

export type CurrencyAmount = { currency: string; amount: number; count: number };

export type MultiCurrencyMetric =
  | { status: "computed"; amounts: CurrencyAmount[]; basis: string }
  | { status: "incomplete"; reason: string };

export type AuthorityStatus = "OK" | "MISSING" | "MIXED";

export type RequestRow = {
  id: string;
  reference: string;
  workArea: string | null;
  descriptionSummary: string;
  needByDate: string | null;
  ageingDays: number;
  requestedBy: string;
  authorityStatus: AuthorityStatus;
  authoritySummary: string;
  costTypes: string[];
  lineCount: number;
  quantitySummary: string;
  exposureAmount: number;
  exposureCurrency: string;
  allocationPosition: "Unallocated" | "Fully allocated";
  status: string;
  riskFlags: string[];
  currentOwner: string;
  nextControl: string;
  isDemoData: boolean;
  demoNote: string | null;
};

export type RequestsRegisterData = {
  project: { id: string; reference: string; name: string };
  kpis: {
    openDemand: { count: number; value: MultiCurrencyMetric };
    needsAction: { count: number; overdueCount: number };
    boqCoverage: { status: "computed"; groups: { currency: string; coveredPct: number }[] } | { status: "incomplete"; reason: string };
    medianCycleDays: { status: "computed"; days: number; basis: string } | { status: "incomplete"; reason: string };
    unallocatedExposure: MultiCurrencyMetric;
  };
  rows: RequestRow[];
  reconciliation: { requestId: string; reference: string; ok: boolean; requestTotal: number; lineTotal: number }[];
};

export async function getRequestsRegisterData(projectReference: string): Promise<RequestsRegisterData | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const reqRows = await db.select().from(requests).where(eq(requests.projectId, project.id));

  const allLines = await db.select().from(requestLines);
  const linesByRequest = new Map<string, typeof allLines>();
  for (const l of allLines) {
    const arr = linesByRequest.get(l.requestId) ?? [];
    arr.push(l);
    linesByRequest.set(l.requestId, arr);
  }

  const packages = await db.select().from(procurementPackages);
  const packageByRequest = new Map(packages.map((p) => [p.requestId, p]));

  const now = new Date();
  const reconciliation: RequestsRegisterData["reconciliation"] = [];
  const rows: RequestRow[] = [];

  for (const r of reqRows) {
    const lines = linesByRequest.get(r.id) ?? [];
    const lineTotal = lines.reduce((s, l) => s + Number(l.exposureAmount), 0);
    reconciliation.push({
      requestId: r.id,
      reference: r.reference,
      ok: Math.abs(lineTotal - Number(r.controlledEstimate)) < 0.01,
      requestTotal: Number(r.controlledEstimate),
      lineTotal,
    });

    const missingCount = lines.filter((l) => l.authorityType === "BOQ" && l.boqAvailableQty === null).length;
    const authorityStatus: AuthorityStatus =
      missingCount === 0 ? "OK" : missingCount === lines.length ? "MISSING" : "MIXED";
    const authoritySummary =
      authorityStatus === "OK"
        ? `${lines.length}/${lines.length} lines have valid BOQ/exception authority`
        : `${lines.length - missingCount}/${lines.length} lines have valid authority — ${missingCount} line(s) cite a BOQ code not found in the source workbook`;

    const pkg = packageByRequest.get(r.id);
    const ageingDays = Math.floor((now.getTime() - new Date(r.createdAt).getTime()) / 86400000);
    const isOverdue = r.needByDate ? new Date(r.needByDate).getTime() < now.getTime() && !pkg : false;

    const costTypes = [...new Set(lines.map((l) => l.costType))];
    const quantitySummary =
      lines.length === 1
        ? `${lines[0].requestedQty} ${lines[0].requestedUnit}`
        : `${lines.length} lines (${[...new Set(lines.map((l) => l.requestedUnit))].join(", ")})`;

    const riskFlags: string[] = [];
    if (authorityStatus !== "OK") riskFlags.push("Missing BOQ authority");
    if (isOverdue) riskFlags.push("Overdue");

    rows.push({
      id: r.id,
      reference: r.reference,
      workArea: r.workArea,
      descriptionSummary:
        lines.length > 0
          ? lines.length === 1
            ? lines[0].description
            : `${lines[0].description} +${lines.length - 1} more line${lines.length - 1 === 1 ? "" : "s"}`
          : "No lines recorded",
      needByDate: r.needByDate ? new Date(r.needByDate).toISOString() : null,
      ageingDays,
      requestedBy: r.requestedBy,
      authorityStatus,
      authoritySummary,
      costTypes,
      lineCount: lines.length,
      quantitySummary,
      exposureAmount: Number(r.controlledEstimate),
      exposureCurrency: r.currency,
      allocationPosition: pkg ? "Fully allocated" : "Unallocated",
      status: r.status,
      riskFlags,
      currentOwner: pkg ? "Procurement" : r.requestedBy,
      nextControl: pkg
        ? "In procurement package"
        : r.status === "SUBMITTED"
          ? "Awaiting approval — Approve & Prepare Package"
          : r.status === "APPROVED"
            ? "Awaiting package allocation"
            : "Draft — not yet submitted",
      isDemoData: r.isDemoData,
      demoNote: r.demoNote,
    });
  }

  // Open demand: every non-rejected request, value grouped by currency
  // rather than blended (CHECKPOINT_1_ADDENDUM.md's currency-guard pattern).
  const openRows = rows.filter((r) => r.status !== "REJECTED");
  const openDemandByCurrency = new Map<string, CurrencyAmount>();
  for (const r of openRows) {
    const cur = openDemandByCurrency.get(r.exposureCurrency) ?? { currency: r.exposureCurrency, amount: 0, count: 0 };
    cur.amount += r.exposureAmount;
    cur.count += 1;
    openDemandByCurrency.set(r.exposureCurrency, cur);
  }

  const unallocatedByCurrency = new Map<string, CurrencyAmount>();
  for (const r of rows.filter((r) => r.allocationPosition === "Unallocated")) {
    const cur = unallocatedByCurrency.get(r.exposureCurrency) ?? { currency: r.exposureCurrency, amount: 0, count: 0 };
    cur.amount += r.exposureAmount;
    cur.count += 1;
    unallocatedByCurrency.set(r.exposureCurrency, cur);
  }

  const needsActionRows = rows.filter((r) => r.status === "SUBMITTED");
  const overdueCount = needsActionRows.filter((r) => r.needByDate && new Date(r.needByDate) < now).length;

  const boqGroups = new Map<string, { covered: number; total: number }>();
  for (const r of rows) {
    for (const l of linesByRequest.get(r.id) ?? []) {
      const g = boqGroups.get(l.exposureCurrency) ?? { covered: 0, total: 0 };
      g.total += Number(l.exposureAmount);
      if (!(l.authorityType === "BOQ" && l.boqAvailableQty === null)) g.covered += Number(l.exposureAmount);
      boqGroups.set(l.exposureCurrency, g);
    }
  }

  return {
    project: { id: project.id, reference: project.reference, name: project.name },
    kpis: {
      openDemand: {
        count: openRows.length,
        value: {
          status: "computed",
          amounts: [...openDemandByCurrency.values()],
          basis: "Requests with status != REJECTED, grouped by request currency (not blended across currencies)",
        },
      },
      needsAction: { count: needsActionRows.length, overdueCount },
      boqCoverage:
        boqGroups.size > 0
          ? {
              status: "computed",
              groups: [...boqGroups.entries()].map(([currency, g]) => ({
                currency,
                coveredPct: g.total > 0 ? Math.round((g.covered / g.total) * 1000) / 10 : 100,
              })),
            }
          : { status: "incomplete", reason: "No request lines seeded" },
      medianCycleDays: {
        status: "incomplete",
        reason:
          "No workflow state-transition timestamps are modelled yet (only createdAt) — a real median needs approval/submission event times, not just current age. Not fabricated from a single data point.",
      },
      unallocatedExposure: {
        status: "computed",
        amounts: [...unallocatedByCurrency.values()],
        basis: "Sum of controlledEstimate for requests without a procurement package, grouped by currency",
      },
    },
    rows,
    reconciliation,
  };
}
