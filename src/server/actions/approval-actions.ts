"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requests, financeValidations } from "@/db/schema";
import { getActorRole } from "@/lib/auth";
import { decideApprovalStep, type Decision, type DecideStepResult } from "@/server/approvals";

/**
 * Checkpoint 12 — decide one step of the Request Authorization chain
 * (Procurement -> Finance/Admin -> MD). On the final step's APPROVED
 * decision, flips request.status to APPROVED (unblocking "Approve &
 * Prepare Package" in request-actions.ts); on any REJECTED decision,
 * flips it to REJECTED. RETURNED leaves status alone — the workbook's
 * correction loop is modelled entirely inside the chain's own step
 * state, not the request's coarser status field.
 */
export async function decideRequestAuthorizationStep(
  projectReference: string,
  requestReference: string,
  stepNo: number,
  decision: Exclude<Decision, "PENDING">,
  comment: string
): Promise<DecideStepResult> {
  const actorRole = await getActorRole();
  const request = await db.query.requests.findFirst({ where: eq(requests.reference, requestReference) });
  if (!request) return { status: "not_found" };

  const result = await decideApprovalStep({
    chainType: "REQUEST_AUTHORIZATION",
    subjectId: request.id,
    subjectReference: requestReference,
    stepNo,
    decision,
    actorRole,
    comment: comment || null,
  });

  if (result.status === "decided") {
    if (decision === "REJECTED") {
      await db.update(requests).set({ status: "REJECTED" }).where(eq(requests.id, request.id));
    } else if (decision === "APPROVED" && stepNo === 3) {
      await db.update(requests).set({ status: "APPROVED" }).where(eq(requests.id, request.id));
    }
    revalidatePath(`/app/projects/${projectReference}/requests/${requestReference}`);
    revalidatePath(`/app/projects/${projectReference}/requests`);
  }

  return result;
}

/**
 * Checkpoint 12 — decide one step of the Finance Payment Authorization
 * chain (Accountant -> MD), gating Payment Voucher creation
 * (openPaymentVoucher in payment-voucher-actions.ts). Only actionable
 * once the parent Finance Validation's route is already VALIDATED
 * (locked) — the Accountant is approving the FINAL validated payable
 * amount, which does not exist before route lock (BR-FIN-002/003).
 */
export async function decideFinancePaymentAuthorizationStep(
  projectReference: string,
  fvReference: string,
  stepNo: number,
  decision: Exclude<Decision, "PENDING">,
  comment: string
): Promise<DecideStepResult | { status: "not_validated" }> {
  const actorRole = await getActorRole();
  const fv = await db.query.financeValidations.findFirst({ where: eq(financeValidations.reference, fvReference) });
  if (!fv) return { status: "not_found" };
  if (fv.status !== "VALIDATED") return { status: "not_validated" };

  const result = await decideApprovalStep({
    chainType: "FINANCE_PAYMENT_AUTHORIZATION",
    subjectId: fv.id,
    subjectReference: fvReference,
    stepNo,
    decision,
    actorRole,
    comment: comment || null,
  });

  if (result.status === "decided") {
    revalidatePath(`/app/projects/${projectReference}/finance-validations/${fvReference}`);
  }

  return result;
}
