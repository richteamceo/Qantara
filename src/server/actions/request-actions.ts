"use server";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requests, requestLines, procurementPackages } from "@/db/schema";
import { getActorRole, requireRole, type Role } from "@/lib/auth";

export type ApprovePrepareResult =
  | { status: "created"; packageReference: string }
  | { status: "already_allocated"; packageReference: string }
  | { status: "blocked"; reason: string; blockedLines: string[] }
  | { status: "not_found" }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role };

/**
 * PAGE_03 primary transition — "Approve & Prepare Package". Implements
 * contract steps 2 (verify BOQ/exception authority for every active line),
 * 5 (create package allocation), 6 (preserve request identity), 9
 * (idempotent — no duplicate package on retry). Step 1 (permission
 * revalidation) is now real (Checkpoint 7) — requires SITE_QS_COMMERCIAL,
 * matching the SoD matrix's "creator cannot self-approve" rule (the
 * Requester/Site Engineer role cannot run this). NOT implemented: step 3
 * (budget/evidence checks beyond authority), step 4/7 (audit event —
 * no audit log table yet), step 8 (Full Lineage). Those are disclosed
 * gaps, not silently skipped — see CHECKPOINT_2_REPORT.md.
 */
export async function approvePrepareRequestPackage(
  projectReference: string,
  requestReference: string
): Promise<ApprovePrepareResult> {
  const actorRole = await getActorRole();
  const permission = requireRole(actorRole, "SITE_QS_COMMERCIAL");
  if (!permission.ok) return { status: "forbidden", requiredRole: permission.requiredRole, actorRole: permission.actorRole };

  const request = await db.query.requests.findFirst({
    where: eq(requests.reference, requestReference),
  });
  if (!request) return { status: "not_found" };

  const existingPackage = await db.query.procurementPackages.findFirst({
    where: eq(procurementPackages.requestId, request.id),
  });
  if (existingPackage) {
    return { status: "already_allocated", packageReference: existingPackage.reference };
  }

  const lines = await db.select().from(requestLines).where(eq(requestLines.requestId, request.id));
  const blockedLines = lines
    .filter((l) => l.authorityType === "BOQ" && l.boqAvailableQty === null)
    .map((l) => `Line ${l.lineNo} (${l.authorityReference}): BOQ authority not found in source BOQ MASTER`);

  if (blockedLines.length > 0) {
    return { status: "blocked", reason: "One or more lines lack valid BOQ/exception authority", blockedLines };
  }

  const packageReference = `PPK-${requestReference.replace(/^MR-/, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;

  await db.insert(procurementPackages).values({
    requestId: request.id,
    reference: packageReference,
    estimate: request.controlledEstimate,
    invitedSuppliers: 0,
    status: "OPEN",
  });

  if (request.status !== "APPROVED") {
    await db.update(requests).set({ status: "APPROVED" }).where(eq(requests.id, request.id));
  }

  revalidatePath(`/app/projects/${projectReference}/requests/${requestReference}`);
  revalidatePath(`/app/projects/${projectReference}/requests`);
  revalidatePath(`/app/projects/${projectReference}/control-room`);

  return { status: "created", packageReference };
}
