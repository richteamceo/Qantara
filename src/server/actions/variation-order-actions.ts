"use server";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { variationOrders, controlAccounts } from "@/db/schema";
import { getActorRole, requireRole, type Role } from "@/lib/auth";

export type RaiseVoInput = {
  controlAccountId: string;
  tradeCode: string;
  description: string;
  originator: string;
  instructionRef: string;
  drawingRef: string;
  boqItemRef: string;
  unit: string;
  quantity: number;
  rate: number;
  currency: string;
  contractImpact: string;
};

export type RaiseVoResult =
  | { status: "raised"; voNumber: string }
  | { status: "invalid"; reason: string }
  | { status: "not_found" }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role };

/**
 * Added Checkpoint 13 — "raise" half of the workbook's VO REGISTER sheet
 * (single-actor origination, no chain). Role choice (SITE_QS_COMMERCIAL)
 * is a judgment call, not workbook-sourced (the sheet's ORIGINATOR column
 * holds free-text names in the empty-template rows, not a role) — QS/
 * Commercial already owns request-package preparation elsewhere in this
 * build, and variation valuation is a commercial-QS function in real
 * construction practice. Disclosed, not asserted as workbook fact.
 */
export async function raiseVariationOrder(projectReference: string, projectId: string, input: RaiseVoInput): Promise<RaiseVoResult> {
  const actorRole = await getActorRole();
  const permission = requireRole(actorRole, "SITE_QS_COMMERCIAL");
  if (!permission.ok) return { status: "forbidden", requiredRole: permission.requiredRole, actorRole: permission.actorRole };

  if (!input.description.trim()) return { status: "invalid", reason: "Description is required" };
  if (!input.boqItemRef.trim()) return { status: "invalid", reason: "BOQ item reference is required" };
  if (input.quantity <= 0) return { status: "invalid", reason: "Quantity must be positive" };
  if (input.rate <= 0) return { status: "invalid", reason: "Rate must be positive" };

  const account = await db.query.controlAccounts.findFirst({ where: eq(controlAccounts.id, input.controlAccountId) });
  if (!account) return { status: "not_found" };

  const voValue = Math.round(input.quantity * input.rate * 100) / 100;
  const voNumber = `VO-${projectReference}-${randomUUID().slice(0, 6).toUpperCase()}`;

  await db.insert(variationOrders).values({
    projectId,
    controlAccountId: input.controlAccountId,
    voNumber,
    dateRaised: new Date(),
    tradeCode: input.tradeCode || "—",
    description: input.description,
    originator: input.originator || "Site QS Team",
    instructionRef: input.instructionRef || null,
    drawingRef: input.drawingRef || null,
    boqItemRef: input.boqItemRef,
    unit: input.unit || "—",
    quantity: input.quantity.toFixed(3),
    rate: input.rate.toFixed(4),
    voValue: voValue.toFixed(2),
    currency: input.currency || account.currency,
    status: "PENDING",
    contractImpact: input.contractImpact || null,
    isDemoData: false,
    demoNote: null,
  });

  revalidatePath(`/app/projects/${projectReference}/variation-orders`);
  return { status: "raised", voNumber };
}

export type DecideVoResult =
  | { status: "decided"; decision: "APPROVED" | "REJECTED" }
  | { status: "already_decided"; decision: string }
  | { status: "not_found" }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role };

/**
 * Added Checkpoint 13 — "approve/reject" half. Single-actor, matching the
 * workbook's single APPROVAL STATUS/APPROVED BY column pair (confirmed by
 * direct inspection — no second/third approval column exists on VO
 * REGISTER, unlike REQUESTER/PROCUREMENT's 3-column and FINANCE
 * VALIDATION's 2-column chains built in Checkpoint 12). Role
 * (MANAGING_DIRECTOR) chosen because a Variation Order changes contract
 * value — the same authority level as the MD approvals already required
 * elsewhere for commercial commitments, not because the workbook names a
 * role explicitly (it doesn't; the sheet's APPROVED BY column is empty in
 * every row of this workbook copy).
 */
export async function decideVariationOrder(
  projectReference: string,
  voNumber: string,
  decision: "APPROVED" | "REJECTED"
): Promise<DecideVoResult> {
  const actorRole = await getActorRole();
  const permission = requireRole(actorRole, "MANAGING_DIRECTOR");
  if (!permission.ok) return { status: "forbidden", requiredRole: permission.requiredRole, actorRole: permission.actorRole };

  const vo = await db.query.variationOrders.findFirst({ where: eq(variationOrders.voNumber, voNumber) });
  if (!vo) return { status: "not_found" };
  if (vo.status !== "PENDING") return { status: "already_decided", decision: vo.status };

  await db
    .update(variationOrders)
    .set({ status: decision, approvedByRole: actorRole, approvalDate: new Date() })
    .where(eq(variationOrders.id, vo.id));

  revalidatePath(`/app/projects/${projectReference}/variation-orders`);
  return { status: "decided", decision };
}
