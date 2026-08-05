"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { fulfilmentEntries, purchaseOrderLines } from "@/db/schema";

export type PostReceiptResult =
  | { status: "posted"; accepted: number; rejected: number; outstanding: number }
  | { status: "already_posted" }
  | { status: "invalid"; reason: string }
  | { status: "not_found" };

/**
 * PAGE_08 primary transition — "Post Accepted Receipt/Confirm Service".
 * Enforces acceptance test #1 (delivered = accepted + rejected) and #2
 * (cumulative/outstanding balance) for the single-entry-per-line model
 * this build uses (no partial/multiple deliveries against one line yet —
 * disclosed gap, see CHECKPOINT_5_REPORT.md). Immutable once posted:
 * calling again on a POSTED record returns already_posted rather than
 * overwriting (contract: "Posted receipt is immutable; correction uses
 * reversal/version" — reversal itself isn't implemented).
 */
export async function postAcceptedReceipt(
  projectReference: string,
  fulfilmentReference: string,
  acceptedQty: number,
  rejectedQty: number
): Promise<PostReceiptResult> {
  const fulfilment = await db.query.fulfilmentEntries.findFirst({ where: eq(fulfilmentEntries.reference, fulfilmentReference) });
  if (!fulfilment) return { status: "not_found" };
  if (fulfilment.status !== "DRAFT") return { status: "already_posted" };

  const line = await db.query.purchaseOrderLines.findFirst({ where: eq(purchaseOrderLines.id, fulfilment.purchaseOrderLineId) });
  if (!line) return { status: "not_found" };

  if (acceptedQty < 0 || rejectedQty < 0) {
    return { status: "invalid", reason: "Quantities cannot be negative" };
  }
  const delivered = acceptedQty + rejectedQty;
  const orderedQty = Number(line.quantity);
  if (acceptedQty > orderedQty) {
    return { status: "invalid", reason: `Accepted (${acceptedQty}) cannot exceed the ordered quantity (${orderedQty}) without an approved over-delivery policy` };
  }
  const outstanding = Math.max(orderedQty - acceptedQty, 0);

  await db
    .update(fulfilmentEntries)
    .set({
      status: "POSTED",
      deliveredQty: delivered.toFixed(3),
      acceptedQty: acceptedQty.toFixed(3),
      rejectedQty: rejectedQty.toFixed(3),
      outstandingQty: outstanding.toFixed(3),
    })
    .where(eq(fulfilmentEntries.id, fulfilment.id));

  revalidatePath(`/app/projects/${projectReference}/fulfilment/${fulfilmentReference}`);
  revalidatePath(`/app/projects/${projectReference}/control-room`);

  return { status: "posted", accepted: acceptedQty, rejected: rejectedQty, outstanding };
}
