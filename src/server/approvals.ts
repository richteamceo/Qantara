import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { approvalSteps, auditEvents } from "@/db/schema";
import type { Role } from "@/lib/roles";

/**
 * Added Checkpoint 12 — the real multi-tier approval engine the pack's own
 * WORKFLOW_AND_APPROVAL_ENGINE_STANDARD.md requires ("no stage builds its
 * own competing approval mechanism") and the source workbook evidences
 * directly (REQUESTER/PROCUREMENT sheets' ①②③ Procurement/Finance/MD
 * columns; FINANCE VALIDATION sheet's Accountant/MD columns). Two chain
 * types share this one mechanism rather than each getting its own
 * bespoke code path, per that standard's explicit rule. See
 * CHECKPOINT_12_REPORT.md for what this deliberately does not implement
 * (claim/unclaim, delegation, escalation/SLA, effective-dated authority
 * matrices, organisation-configurable step sets — the standard's full
 * enterprise scope) versus what it does (sequential gating, SoD-by-role,
 * reject/return with correct blocking semantics, an audit trail).
 */

export type ChainType = "REQUEST_AUTHORIZATION" | "FINANCE_PAYMENT_AUTHORIZATION";
export type Decision = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";

type StepDef = { stepNo: number; role: Role; label: string; allowedDecisions: Decision[] };

/**
 * MD steps never receive RETURNED — workbook's "MD APPROVAL CORRECTION QA"
 * sheet documents the MD dropdown as APPROVED/UNDER REVIEW/REJECTED only.
 * UNDER REVIEW (a claim/in-progress state, not a terminal decision) is a
 * disclosed scope-out — see CHECKPOINT_12_REPORT.md.
 */
const CHAIN_DEFS: Record<ChainType, StepDef[]> = {
  REQUEST_AUTHORIZATION: [
    { stepNo: 1, role: "PROCUREMENT", label: "Procurement Approval", allowedDecisions: ["APPROVED", "REJECTED", "RETURNED"] },
    { stepNo: 2, role: "FINANCE", label: "Finance / Admin Approval", allowedDecisions: ["APPROVED", "REJECTED", "RETURNED"] },
    { stepNo: 3, role: "MANAGING_DIRECTOR", label: "Managing Director Approval", allowedDecisions: ["APPROVED", "REJECTED"] },
  ],
  FINANCE_PAYMENT_AUTHORIZATION: [
    { stepNo: 1, role: "ACCOUNTANT", label: "Accountant Approval", allowedDecisions: ["APPROVED", "REJECTED", "RETURNED"] },
    { stepNo: 2, role: "MANAGING_DIRECTOR", label: "Managing Director Approval", allowedDecisions: ["APPROVED", "REJECTED"] },
  ],
};

export const CHAIN_LABELS: Record<ChainType, string> = {
  REQUEST_AUTHORIZATION: "Request Authorization (Procurement → Finance/Admin → MD)",
  FINANCE_PAYMENT_AUTHORIZATION: "Payment Authorization (Accountant → MD)",
};

export type ApprovalStepView = {
  stepNo: number;
  role: Role;
  label: string;
  decision: Decision;
  decidedByRole: string | null;
  decidedAt: string | null;
  comment: string | null;
  allowedDecisions: Decision[];
  actionable: boolean;
  blockedReason: string | null;
};

export type ChainStatus = {
  chainType: ChainType;
  steps: ApprovalStepView[];
  overallStatus: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
};

async function ensureChainInitialized(chainType: ChainType, subjectId: string, subjectReference: string) {
  const existing = await db
    .select({ id: approvalSteps.id })
    .from(approvalSteps)
    .where(and(eq(approvalSteps.chainType, chainType), eq(approvalSteps.subjectId, subjectId)));
  if (existing.length > 0) return;

  await db.insert(approvalSteps).values(
    CHAIN_DEFS[chainType].map((d) => ({
      chainType,
      subjectId,
      subjectReference,
      stepNo: d.stepNo,
      stepRole: d.role,
      stepLabel: d.label,
      decision: "PENDING" as const,
    }))
  );
}

export async function getChainStatus(chainType: ChainType, subjectId: string, subjectReference: string): Promise<ChainStatus> {
  await ensureChainInitialized(chainType, subjectId, subjectReference);
  const rows = (
    await db
      .select()
      .from(approvalSteps)
      .where(and(eq(approvalSteps.chainType, chainType), eq(approvalSteps.subjectId, subjectId)))
  ).sort((a, b) => a.stepNo - b.stepNo);

  const defs = CHAIN_DEFS[chainType];
  const steps: ApprovalStepView[] = rows.map((row, i) => {
    const def = defs[i];
    const prevRow = i === 0 ? null : rows[i - 1];
    const prevApproved = !prevRow || prevRow.decision === "APPROVED";
    const decidable = row.decision === "PENDING" || row.decision === "RETURNED";
    return {
      stepNo: row.stepNo,
      role: row.stepRole as Role,
      label: row.stepLabel,
      decision: row.decision,
      decidedByRole: row.decidedByRole,
      decidedAt: row.decidedAt ? new Date(row.decidedAt).toISOString() : null,
      comment: row.comment,
      allowedDecisions: def.allowedDecisions,
      actionable: prevApproved && decidable,
      blockedReason: prevApproved
        ? decidable
          ? null
          : `Already decided: ${row.decision}`
        : `Step ${prevRow!.stepNo} (${prevRow!.stepLabel}) must be APPROVED first`,
    };
  });

  const overallStatus: ChainStatus["overallStatus"] = steps.some((s) => s.decision === "REJECTED")
    ? "REJECTED"
    : steps.every((s) => s.decision === "APPROVED")
      ? "APPROVED"
      : steps.some((s) => s.decision !== "PENDING")
        ? "IN_PROGRESS"
        : "PENDING";

  return { chainType, steps, overallStatus };
}

export async function isChainApproved(chainType: ChainType, subjectId: string, subjectReference: string): Promise<boolean> {
  const status = await getChainStatus(chainType, subjectId, subjectReference);
  return status.overallStatus === "APPROVED";
}

export type DecideStepResult =
  | { status: "decided"; decision: Decision }
  | { status: "invalid_decision"; reason: string }
  | { status: "not_actionable"; reason: string }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role }
  | { status: "not_found" };

/**
 * BR-APR-001 ("Run ordered workflow"): step N is only decidable once step
 * N-1 is APPROVED. BR-APR-002 ("Rejected/returned approval blocks
 * downstream ... release"): REJECTED is terminal for this chain instance;
 * RETURNED resets every later step back to PENDING (a correction upstream
 * invalidates any downstream sign-off that assumed the pre-correction
 * state) and remains itself re-decidable, matching the workbook's
 * "corrected/resubmit" loop (SWITCHBACK_WORKFLOW_AND_APPROVAL_STANDARD.md
 * §3 Finance Validation state machine's Returned -> AwaitingFinance edge).
 */
export async function decideApprovalStep(params: {
  chainType: ChainType;
  subjectId: string;
  subjectReference: string;
  stepNo: number;
  decision: Exclude<Decision, "PENDING">;
  actorRole: Role;
  comment: string | null;
}): Promise<DecideStepResult> {
  const { chainType, subjectId, subjectReference, stepNo, decision, actorRole, comment } = params;
  await ensureChainInitialized(chainType, subjectId, subjectReference);

  const def = CHAIN_DEFS[chainType].find((d) => d.stepNo === stepNo);
  if (!def) return { status: "not_found" };
  if (actorRole !== def.role) return { status: "forbidden", requiredRole: def.role, actorRole };
  if (!def.allowedDecisions.includes(decision)) {
    return {
      status: "invalid_decision",
      reason: `${def.label} may only be decided ${def.allowedDecisions.join("/")} — ${decision} is not a permitted decision for this role.`,
    };
  }

  const rows = (
    await db
      .select()
      .from(approvalSteps)
      .where(and(eq(approvalSteps.chainType, chainType), eq(approvalSteps.subjectId, subjectId)))
  ).sort((a, b) => a.stepNo - b.stepNo);

  const current = rows.find((r) => r.stepNo === stepNo);
  if (!current) return { status: "not_found" };

  const prev = rows.find((r) => r.stepNo === stepNo - 1);
  if (prev && prev.decision !== "APPROVED") {
    return { status: "not_actionable", reason: `Step ${prev.stepNo} (${prev.stepLabel}) must be APPROVED first — sequential chain (BR-APR-001).` };
  }
  if (current.decision !== "PENDING" && current.decision !== "RETURNED") {
    return { status: "not_actionable", reason: `Step already decided: ${current.decision}.` };
  }

  await db
    .update(approvalSteps)
    .set({ decision, decidedByRole: actorRole, decidedAt: new Date(), comment })
    .where(eq(approvalSteps.id, current.id));

  if (decision === "RETURNED") {
    const laterSteps = rows.filter((r) => r.stepNo > stepNo && r.decision !== "PENDING");
    for (const s of laterSteps) {
      await db
        .update(approvalSteps)
        .set({ decision: "PENDING", decidedByRole: null, decidedAt: null, comment: null })
        .where(eq(approvalSteps.id, s.id));
    }
  }

  await db.insert(auditEvents).values({
    eventType: "APPROVAL_DECISION",
    objectType: chainType,
    objectReference: subjectReference,
    actorRole,
    detail: `Step ${stepNo} (${def.label}) decided ${decision}${comment ? ` — ${comment}` : ""}`,
  });

  return { status: "decided", decision };
}
