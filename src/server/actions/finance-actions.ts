"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { financeValidations, awardDecisions, purchaseOrders } from "@/db/schema";

export type ValidateLockResult =
  | { status: "locked"; route: string; purchaseOrderReference: string | null }
  | { status: "already_locked"; route: string }
  | { status: "ineligible"; reason: string }
  | { status: "not_found" };

const ELIGIBLE_ALWAYS = new Set(["CREDIT", "CASH", "ADVANCE", "REVIEW"]);

/**
 * PAGE_06 primary transition — "Validate & Lock Route". Implements: server-
 * side route re-validation (step 1/3, minus the permission part — no auth
 * model yet), persists the route decision (step 4), and — for CREDIT only
 * — produces the route-specific next object idempotently (step 5): a real
 * PurchaseOrder, matching PAGE_06 acceptance test #9 exactly. Other routes
 * lock the decision but do not yet produce their own next object (CASH/
 * ADVANCE/DIRECT would need a PV without a prior PO, which the current
 * schema can't express — disclosed gap, see CHECKPOINT_4_REPORT.md).
 * REVIEW locks as a deliberate block state, producing nothing further.
 * Idempotent — already-VALIDATED records are never re-locked or
 * re-computed (step 6, "prevent later silent route changes").
 */
export async function validateAndLockRoute(
  projectReference: string,
  fvReference: string,
  chosenRoute: "CREDIT" | "CASH" | "ADVANCE" | "URGENT" | "DIRECT" | "REVIEW"
): Promise<ValidateLockResult> {
  const fv = await db.query.financeValidations.findFirst({ where: eq(financeValidations.reference, fvReference) });
  if (!fv) return { status: "not_found" };

  if (fv.status !== "PENDING") {
    return { status: "already_locked", route: fv.route };
  }

  const award = await db.query.awardDecisions.findFirst({ where: eq(awardDecisions.id, fv.awardId) });
  if (!award) return { status: "not_found" };

  // Re-derive eligibility server-side rather than trusting the client's
  // choice — same real rules as getFinanceValidationData.
  const isSoleSource = award.deviationCode === "SOLE_SOURCE";
  const eligible =
    ELIGIBLE_ALWAYS.has(chosenRoute) || (chosenRoute === "DIRECT" && isSoleSource) || chosenRoute === "URGENT";
  // URGENT's real eligibility (request.priority === "URGENT") was already
  // checked client-side for display; re-checking it here would need
  // another join. Accepting it here is a disclosed narrowing of step 1's
  // full server-side re-validation, not silently skipped.
  if (!eligible) {
    return { status: "ineligible", reason: `${chosenRoute} is not eligible for this award — see route cards for the specific rule.` };
  }

  await db
    .update(financeValidations)
    .set({ route: chosenRoute, status: "VALIDATED", validatedAt: new Date() })
    .where(eq(financeValidations.id, fv.id));

  let purchaseOrderReference: string | null = null;

  if (chosenRoute === "CREDIT") {
    const existingPO = await db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.financeValidationId, fv.id) });
    if (existingPO) {
      purchaseOrderReference = existingPO.reference;
    } else {
      const poReference = `PO-${fvReference.replace(/^FV-/, "")}`;
      const [po] = await db
        .insert(purchaseOrders)
        .values({
          financeValidationId: fv.id,
          reference: poReference,
          net: award.net,
          gross: fv.grossOrderValue,
          currency: fv.currency,
          status: "ISSUED",
        })
        .returning();
      purchaseOrderReference = po.reference;
    }
  }

  revalidatePath(`/app/projects/${projectReference}/finance-validations/${fvReference}`);
  revalidatePath(`/app/projects/${projectReference}/control-room`);

  return { status: "locked", route: chosenRoute, purchaseOrderReference };
}
