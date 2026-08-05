"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, fulfilmentEntries } from "@/db/schema";
import { getActorRole, requireRole, type Role } from "@/lib/auth";

export type OpenFulfilmentResult =
  | { status: "opened"; fulfilmentReference: string }
  | { status: "no_lines_available" }
  | { status: "not_found" }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role };

/**
 * PAGE_07 primary transition — "Issue PO & Open Fulfilment". The PO is
 * already ISSUED at creation time (Page 06's own transition — see
 * CHECKPOINT_4_REPORT.md), so this implements the "open fulfilment
 * availability" half only: creates a DRAFT fulfilment shell (zero
 * quantities, outstanding = full line quantity) for the next PO line that
 * doesn't have one yet, and returns its reference for navigation. Real
 * quantity posting happens on Page 08's own "Post Accepted Receipt"
 * transition, not here — matching the contract's separation between
 * "opening availability" (this page) and "recording what was delivered"
 * (Page 08). Idempotent per line: a line that already has a fulfilment
 * record is skipped, not duplicated. Permission revalidation is now real
 * (Checkpoint 7) — requires PROCUREMENT, matching the SoD matrix's "Issue
 * PO" row (prepare/release control).
 */
export async function openFulfilment(projectReference: string, poReference: string): Promise<OpenFulfilmentResult> {
  const actorRole = await getActorRole();
  const permission = requireRole(actorRole, "PROCUREMENT");
  if (!permission.ok) return { status: "forbidden", requiredRole: permission.requiredRole, actorRole: permission.actorRole };

  const po = await db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.reference, poReference) });
  if (!po) return { status: "not_found" };

  const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.purchaseOrderId, po.id));
  const existingFulfilments = await db.select().from(fulfilmentEntries);
  const fulfilledLineIds = new Set(existingFulfilments.map((f) => f.purchaseOrderLineId));

  const nextLine = lines.sort((a, b) => a.lineNo - b.lineNo).find((l) => !fulfilledLineIds.has(l.id));
  if (!nextLine) return { status: "no_lines_available" };

  const reference = `GRN-${poReference.replace(/^PO-/, "")}-L${nextLine.lineNo}`;

  await db.insert(fulfilmentEntries).values({
    purchaseOrderId: po.id,
    purchaseOrderLineId: nextLine.id,
    reference,
    status: "DRAFT",
    deliveredQty: "0",
    acceptedQty: "0",
    rejectedQty: "0",
    outstandingQty: nextLine.quantity,
    unit: nextLine.unit,
  });

  revalidatePath(`/app/projects/${projectReference}/purchase-orders/${poReference}`);

  return { status: "opened", fulfilmentReference: reference };
}
