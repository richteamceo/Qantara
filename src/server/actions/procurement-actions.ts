"use server";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  procurementPackages,
  requests,
  requestLines,
  quotations,
  awardDecisions,
  awardLines,
  financeValidations,
} from "@/db/schema";

export type OpenAwardResult =
  | { status: "created"; awardReference: string }
  | { status: "already_exists"; awardReference: string }
  | { status: "blocked"; reason: string }
  | { status: "not_found" };

/**
 * PAGE_04 primary transition — "Open/Prepare Award Decision". Implements:
 * selects the lowest technically-compliant same-currency bid as the
 * recommendation (falling back to the sole quotation when sole-sourced);
 * records a mandatory deviation reason when the award is sole-source
 * (PAGE_05 §Mandatory deviation reasons); allocates the award net across
 * the source request's lines proportional to each line's own exposure
 * share; is idempotent (no duplicate award on retry). NOT implemented:
 * permission/version revalidation, full comparison-version locking,
 * clarification effects, audit event persistence — disclosed gaps, see
 * CHECKPOINT_3_REPORT.md.
 */
export async function openAwardDecision(projectReference: string, packageReference: string): Promise<OpenAwardResult> {
  const pkg = await db.query.procurementPackages.findFirst({ where: eq(procurementPackages.reference, packageReference) });
  if (!pkg) return { status: "not_found" };

  const existing = await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.packageId, pkg.id) });
  if (existing) return { status: "already_exists", awardReference: existing.reference };

  const quoteRows = await db.select().from(quotations).where(eq(quotations.packageId, pkg.id));
  if (quoteRows.length === 0) return { status: "blocked", reason: "No quotations received yet" };

  const request = await db.query.requests.findFirst({ where: eq(requests.id, pkg.requestId) });
  if (!request) return { status: "not_found" };

  const compliant = quoteRows.filter((q) => q.technicallyCompliant && q.currency === request.currency);
  if (compliant.length === 0) return { status: "blocked", reason: "No technically-compliant, same-currency bid available" };

  const winner = compliant.reduce((best, q) => (Number(q.netAmount) < Number(best.netAmount) ? q : best));
  const estimate = Number(pkg.estimate);
  const saving = estimate - Number(winner.netAmount);

  const deviationCode = winner.isSoleSource ? "SOLE_SOURCE" : null;
  const deviationReason = winner.isSoleSource
    ? `Single quotation received (sole source, ${pkg.sourcingMethod ?? "sourcing method not recorded"}); no competitive comparison available.`
    : null;

  const awardReference = `AWD-${packageReference.replace(/^PPK-/, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;

  const [award] = await db
    .insert(awardDecisions)
    .values({
      packageId: pkg.id,
      reference: awardReference,
      supplier: winner.supplier,
      net: winner.netAmount,
      currency: winner.currency,
      saving: saving.toFixed(2),
      status: "DRAFT",
      competitionResult: winner.isSoleSource
        ? `Sole source — ${quoteRows.length} quotation received`
        : `Competitive — ${quoteRows.length} bids received, ${winner.supplier} rank 1 (lowest compliant)`,
      deviationCode,
      deviationReason,
    })
    .returning();

  const lines = await db.select().from(requestLines).where(eq(requestLines.requestId, request.id));
  const totalExposure = lines.reduce((s, l) => s + Number(l.exposureAmount), 0);
  const net = Number(winner.netAmount);

  await db.insert(awardLines).values(
    lines.map((l) => {
      const share = totalExposure > 0 ? Number(l.exposureAmount) / totalExposure : 1 / lines.length;
      const lineNet = Math.round(net * share * 100) / 100;
      return {
        awardId: award.id,
        requestLineId: l.id,
        lineNo: l.lineNo,
        description: l.description,
        quantity: l.requestedQty,
        unit: l.requestedUnit,
        rate: (lineNet / Number(l.requestedQty)).toFixed(4),
        netAmount: lineNet.toFixed(2),
        currency: winner.currency,
      };
    })
  );

  await db.update(procurementPackages).set({ status: "AWARDED" }).where(eq(procurementPackages.id, pkg.id));

  revalidatePath(`/app/projects/${projectReference}/procurement-packages/${packageReference}`);
  revalidatePath(`/app/projects/${projectReference}/awards/${awardReference}`);
  revalidatePath(`/app/projects/${projectReference}/control-room`);

  return { status: "created", awardReference };
}

export type ApproveSendToFinanceResult =
  | { status: "created"; financeReference: string }
  | { status: "already_exists"; financeReference: string }
  | { status: "not_found" };

/**
 * PAGE_05 primary transition — "Approve & Send to Finance". Applies the
 * real Ghana VAT (15%) / GETFund+NHIL (5%) / WHT (5%) rates published in
 * the workbook's ⚙ SETTINGS sheet to compute gross order value and
 * indicative net payable. Route selection is a deliberately simple rule
 * (REVIEW for sole-source awards, CREDIT otherwise) — a real
 * simplification of the full route-eligibility engine
 * (SETTINGS!COST_TYPE_ROUTE_COMPATIBILITY), disclosed rather than
 * pretending to implement it. Idempotent — no duplicate Finance
 * Validation on retry. Keeps Procurement's route as recommendation only,
 * consistent with the master execution prompt's binding-Finance-route
 * invariant (the created record's `route` is not locked/validated here —
 * that's Page 06's job).
 */
export async function approveSendToFinance(
  projectReference: string,
  awardReference: string
): Promise<ApproveSendToFinanceResult> {
  const award = await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.reference, awardReference) });
  if (!award) return { status: "not_found" };

  const existing = await db.query.financeValidations.findFirst({ where: eq(financeValidations.awardId, award.id) });
  if (existing) return { status: "already_exists", financeReference: existing.reference };

  const net = Number(award.net);
  const VAT = 0.15;
  const GETFUND_NHIL = 0.05;
  const WHT = 0.05;
  const gross = Math.round(net * (1 + VAT + GETFUND_NHIL) * 100) / 100;
  const netPayable = Math.round((gross - net * WHT) * 100) / 100;

  const financeReference = `FV-${awardReference.replace(/^AWD-/, "")}`;

  await db.insert(financeValidations).values({
    awardId: award.id,
    reference: financeReference,
    route: award.deviationCode === "SOLE_SOURCE" ? "REVIEW" : "CREDIT",
    grossOrderValue: gross.toFixed(2),
    currency: award.currency,
    netPayable: netPayable.toFixed(2),
    status: "PENDING",
  });

  await db.update(awardDecisions).set({ status: "SENT_TO_FINANCE" }).where(eq(awardDecisions.id, award.id));

  revalidatePath(`/app/projects/${projectReference}/awards/${awardReference}`);
  revalidatePath(`/app/projects/${projectReference}/control-room`);

  return { status: "created", financeReference };
}
