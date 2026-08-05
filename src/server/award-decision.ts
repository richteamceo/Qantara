import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  awardDecisions,
  awardLines,
  procurementPackages,
  financeValidations,
  requests,
} from "@/db/schema";
import type { MetricValue } from "./control-room";

export type AwardLineRow = {
  lineNo: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  netAmount: number;
  currency: string;
  requestLineId: string | null;
};

export type AwardDecisionData = {
  project: { reference: string; name: string };
  award: {
    id: string;
    reference: string;
    supplier: string;
    status: string;
    net: number;
    currency: string;
    saving: number;
    competitionResult: string | null;
    deviationCode: string | null;
    deviationReason: string | null;
  };
  packageReference: string;
  kpis: {
    recommendedAwardNet: MetricValue;
    varianceToEstimate: MetricValue;
    lineCount: number;
    commercialExceptions: number;
  };
  lines: AwardLineRow[];
  financeReference: string | null;
  canApproveSendToFinance: boolean;
  approveBlockedReason: string | null;
};

export async function getAwardDecisionData(
  projectReference: string,
  awardReference: string
): Promise<AwardDecisionData | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const award = await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.reference, awardReference) });
  if (!award) return null;

  const pkg = await db.query.procurementPackages.findFirst({ where: eq(procurementPackages.id, award.packageId) });
  if (!pkg) return null;

  const lineRows = await db.select().from(awardLines).where(eq(awardLines.awardId, award.id));
  const financeValidation = await db.query.financeValidations.findFirst({ where: eq(financeValidations.awardId, award.id) });

  const net = Number(award.net);
  const estimate = Number(pkg.estimate);
  const sameCurrency = award.currency === (await deriveEstimateCurrency(pkg.id));

  const varianceToEstimate: MetricValue = sameCurrency
    ? {
        status: "computed",
        value: { amount: net - estimate, currency: award.currency },
        basis: "Award net minus package estimate (like-for-like currency)",
      }
    : {
        status: "incomplete",
        reason: "Award currency does not match the package estimate's currency — no dated exchange rate available",
      };

  return {
    project: { reference: project.reference, name: project.name },
    award: {
      id: award.id,
      reference: award.reference,
      supplier: award.supplier,
      status: award.status,
      net,
      currency: award.currency,
      saving: Number(award.saving),
      competitionResult: award.competitionResult,
      deviationCode: award.deviationCode,
      deviationReason: award.deviationReason,
    },
    packageReference: pkg.reference,
    kpis: {
      recommendedAwardNet: { status: "computed", value: { amount: net, currency: award.currency }, basis: "Sum of active awarded line net" },
      varianceToEstimate,
      lineCount: lineRows.length,
      commercialExceptions: award.deviationCode ? 1 : 0,
    },
    lines: lineRows
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((l) => ({
        lineNo: l.lineNo,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        rate: Number(l.rate),
        netAmount: Number(l.netAmount),
        currency: l.currency,
        requestLineId: l.requestLineId,
      })),
    financeReference: financeValidation?.reference ?? null,
    canApproveSendToFinance: !financeValidation,
    approveBlockedReason: financeValidation ? "Already sent to Finance" : null,
  };
}

async function deriveEstimateCurrency(packageId: string): Promise<string> {
  const pkg = await db.query.procurementPackages.findFirst({ where: eq(procurementPackages.id, packageId) });
  if (!pkg) return "";
  const request = await db.query.requests.findFirst({ where: eq(requests.id, pkg.requestId) });
  return request?.currency ?? "";
}
