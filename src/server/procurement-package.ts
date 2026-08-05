import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  procurementPackages,
  requests,
  requestLines,
  quotations,
  awardDecisions,
} from "@/db/schema";
import type { MetricValue } from "./control-room";

export type ComparisonRow = {
  supplier: string;
  netAmount: number;
  currency: string;
  variancePct: number | null;
  technicallyCompliant: boolean;
  isSoleSource: boolean;
  receivedAt: string;
  validUntil: string | null;
  rank: number | null;
};

export type ReadinessCheck = { key: string; label: string; status: "pass" | "fail"; detail: string };

export type ProcurementPackageData = {
  project: { reference: string; name: string };
  package: {
    id: string;
    reference: string;
    sourcingMethod: string | null;
    status: string;
    estimate: number;
    currency: string;
    invitedSuppliers: number;
  };
  sourceRequest: { reference: string; workArea: string | null };
  kpis: {
    packageEstimate: MetricValue;
    bidsReceived: { received: number; expected: number };
    evaluatedSpread: MetricValue;
    commercialExceptions: { count: number; details: string[] };
    earliestBidValidity: string | null;
  };
  comparison: ComparisonRow[];
  lines: {
    lineNo: number;
    description: string;
    boqReference: string;
    requestedQty: number;
    allocatedQty: number;
    unit: string;
    estimate: number;
    currency: string;
  }[];
  readiness: ReadinessCheck[];
  readinessScore: number;
  awardReference: string | null;
  canOpenAward: boolean;
  openAwardBlockedReason: string | null;
};

export async function getProcurementPackageData(
  projectReference: string,
  packageReference: string
): Promise<ProcurementPackageData | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const pkg = await db.query.procurementPackages.findFirst({ where: eq(procurementPackages.reference, packageReference) });
  if (!pkg) return null;

  const sourceRequest = await db.query.requests.findFirst({ where: eq(requests.id, pkg.requestId) });
  if (!sourceRequest || sourceRequest.projectId !== project.id) return null;

  const lines = await db.select().from(requestLines).where(eq(requestLines.requestId, sourceRequest.id));
  const quoteRows = await db.select().from(quotations).where(eq(quotations.packageId, pkg.id));
  const existingAward = await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.packageId, pkg.id) });

  const estimate = Number(pkg.estimate);
  const estimateCurrency = sourceRequest.currency;

  // Rank only among technically-compliant bids in the estimate's currency —
  // a noncompliant or cross-currency bid is shown but never disguised as
  // the recommendation (PAGE_04 §Normalized comparison).
  const rankable = quoteRows
    .filter((q) => q.technicallyCompliant && q.currency === estimateCurrency)
    .sort((a, b) => Number(a.netAmount) - Number(b.netAmount));
  const rankOf = new Map(rankable.map((q, i) => [q.id, i + 1]));

  const comparison: ComparisonRow[] = quoteRows
    .slice()
    .sort((a, b) => Number(a.netAmount) - Number(b.netAmount))
    .map((q) => ({
      supplier: q.supplier,
      netAmount: Number(q.netAmount),
      currency: q.currency,
      variancePct: q.currency === estimateCurrency && estimate > 0 ? Math.round(((Number(q.netAmount) - estimate) / estimate) * 1000) / 10 : null,
      technicallyCompliant: q.technicallyCompliant,
      isSoleSource: q.isSoleSource,
      receivedAt: new Date(q.receivedAt).toISOString(),
      validUntil: q.validUntil ? new Date(q.validUntil).toISOString() : null,
      rank: rankOf.get(q.id) ?? null,
    }));

  const netAmounts = quoteRows.filter((q) => q.currency === estimateCurrency).map((q) => Number(q.netAmount));
  const evaluatedSpread: MetricValue =
    netAmounts.length >= 2
      ? {
          status: "computed",
          value: { amount: Math.max(...netAmounts) - Math.min(...netAmounts), currency: estimateCurrency },
          basis: "Highest bid minus lowest bid, among same-currency bids",
        }
      : { status: "incomplete", reason: "Fewer than 2 same-currency bids received — no spread to compute" };

  const exceptionDetails: string[] = [];
  for (const q of quoteRows) {
    if (q.isSoleSource) exceptionDetails.push(`${q.supplier}: sole source`);
    if (!q.technicallyCompliant) exceptionDetails.push(`${q.supplier}: not technically compliant`);
  }

  const validUntilDates = quoteRows.filter((q) => q.validUntil).map((q) => new Date(q.validUntil!).getTime());
  const earliestBidValidity = validUntilDates.length > 0 ? new Date(Math.min(...validUntilDates)).toISOString() : null;

  const now = Date.now();
  const anyExpired = validUntilDates.some((t) => t < now);

  const readiness: ReadinessCheck[] = [
    {
      key: "competition",
      label: "Competition",
      status: quoteRows.length > 1 || (quoteRows.length === 1 && quoteRows[0].isSoleSource) ? "pass" : "fail",
      detail:
        quoteRows.length > 1
          ? `${quoteRows.length} bids received`
          : quoteRows.length === 1 && quoteRows[0].isSoleSource
            ? "Sole source, disclosed"
            : "No bids received",
    },
    {
      key: "scope-normalization",
      label: "Scope normalization",
      status: "fail",
      detail: "Raw-to-normalized adjustment tracking is not implemented yet (deferred to a later checkpoint)",
    },
    {
      key: "technical-review",
      label: "Technical review",
      status: quoteRows.every((q) => q.technicallyCompliant) ? "pass" : "fail",
      detail: quoteRows.every((q) => q.technicallyCompliant)
        ? "All received bids marked technically compliant"
        : "One or more bids are not technically compliant",
    },
    {
      key: "bid-validity",
      label: "Bid validity",
      status: quoteRows.length > 0 && !anyExpired ? "pass" : "fail",
      detail: anyExpired ? "One or more quotations have an expired validity date" : "All quotations within validity",
    },
    {
      key: "evidence-completeness",
      label: "Evidence completeness",
      status: "fail",
      detail: "Evidence register / audit engine is not implemented yet (deferred to a later checkpoint)",
    },
  ];
  const readinessScore = Math.round((readiness.filter((c) => c.status === "pass").length / readiness.length) * 100);

  const canOpenAward = quoteRows.length > 0 && !existingAward;
  const openAwardBlockedReason = existingAward
    ? "This package already has an award decision"
    : quoteRows.length === 0
      ? "No quotations received yet"
      : null;

  return {
    project: { reference: project.reference, name: project.name },
    package: {
      id: pkg.id,
      reference: pkg.reference,
      sourcingMethod: pkg.sourcingMethod,
      status: pkg.status,
      estimate,
      currency: estimateCurrency,
      invitedSuppliers: pkg.invitedSuppliers,
    },
    sourceRequest: { reference: sourceRequest.reference, workArea: sourceRequest.workArea },
    kpis: {
      packageEstimate: { status: "computed", value: { amount: estimate, currency: estimateCurrency }, basis: "Package estimate at creation (= source request controlled estimate)" },
      bidsReceived: { received: quoteRows.length, expected: pkg.invitedSuppliers },
      evaluatedSpread,
      commercialExceptions: { count: exceptionDetails.length, details: exceptionDetails },
      earliestBidValidity,
    },
    comparison,
    lines: lines.map((l) => ({
      lineNo: l.lineNo,
      description: l.description,
      boqReference: l.authorityReference,
      requestedQty: Number(l.requestedQty),
      allocatedQty: Number(l.requestedQty),
      unit: l.requestedUnit,
      estimate: Number(l.exposureAmount),
      currency: l.exposureCurrency,
    })),
    readiness,
    readinessScore,
    awardReference: existingAward?.reference ?? null,
    canOpenAward,
    openAwardBlockedReason,
  };
}
