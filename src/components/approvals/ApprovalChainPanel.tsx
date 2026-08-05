"use client";

import { useActionState, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import type { ChainStatus, Decision, ApprovalStepView } from "@/server/approvals";

type DecideResult =
  | { status: "decided"; decision: Decision }
  | { status: "invalid_decision"; reason: string }
  | { status: "not_actionable"; reason: string }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role }
  | { status: "not_found" }
  | { status: "not_validated" };

type DecideFn = (
  projectReference: string,
  subjectReference: string,
  stepNo: number,
  decision: Exclude<Decision, "PENDING">,
  comment: string
) => Promise<DecideResult>;

/**
 * Added Checkpoint 12 — shared UI for both the Request Authorization
 * chain (P03) and the Finance Payment Authorization chain (P06). Per
 * WORKFLOW_AND_APPROVAL_ENGINE_STANDARD.md's SoD rule ("a user who is
 * blocked from approving their own request never sees the approve action
 * rendered, not just blocked server-side"), decide controls only render
 * for the actor whose role matches the step — everyone else sees a
 * read-only "Awaiting <role>" state. Server-side re-validation
 * (decideApprovalStep) is the real control; this is UX politeness on top.
 */
export function ApprovalChainPanel({
  title,
  chain,
  actorRole,
  projectReference,
  subjectReference,
  decideAction,
}: {
  title: string;
  chain: ChainStatus;
  actorRole: Role;
  projectReference: string;
  subjectReference: string;
  decideAction: DecideFn;
}) {
  return (
    <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">{title}</h2>
        <ChainBadge status={chain.overallStatus} />
      </div>
      <ol className="mt-3 space-y-3">
        {chain.steps.map((step) => (
          <StepRow
            key={step.stepNo}
            step={step}
            actorRole={actorRole}
            projectReference={projectReference}
            subjectReference={subjectReference}
            decideAction={decideAction}
          />
        ))}
      </ol>
    </div>
  );
}

function ChainBadge({ status }: { status: ChainStatus["overallStatus"] }) {
  const cls =
    status === "APPROVED"
      ? "bg-c1x-green/10 text-c1x-green"
      : status === "REJECTED"
        ? "bg-c1x-red/10 text-c1x-red"
        : "bg-c1x-amber/10 text-c1x-amber";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{status}</span>;
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const cls =
    decision === "APPROVED"
      ? "text-c1x-green"
      : decision === "REJECTED"
        ? "text-c1x-red"
        : decision === "RETURNED"
          ? "text-c1x-amber"
          : "text-c1x-muted-2";
  return <span className={`text-[11px] font-semibold ${cls}`}>{decision}</span>;
}

function StepRow({
  step,
  actorRole,
  projectReference,
  subjectReference,
  decideAction,
}: {
  step: ApprovalStepView;
  actorRole: Role;
  projectReference: string;
  subjectReference: string;
  decideAction: DecideFn;
}) {
  const [comment, setComment] = useState("");
  const [result, dispatch, isPending] = useActionState(
    async (_prev: DecideResult | null, decision: Exclude<Decision, "PENDING">) =>
      decideAction(projectReference, subjectReference, step.stepNo, decision, comment),
    null
  );

  const isMine = actorRole === step.role;
  const decidedByLabel = step.decidedByRole ? (ROLE_LABELS[step.decidedByRole as Role] ?? step.decidedByRole) : null;

  return (
    <li className="flex flex-col gap-1 border-b border-c1x-line pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-c1x-ink">
          Step {step.stepNo}. {step.label}
        </div>
        <DecisionBadge decision={step.decision} />
      </div>
      <div className="text-[11px] text-c1x-muted-2">
        Required role: {ROLE_LABELS[step.role]}
        {decidedByLabel && step.decidedAt && ` · Decided by ${decidedByLabel} on ${step.decidedAt.slice(0, 10)}`}
      </div>
      {step.comment && <div className="text-[11px] italic text-c1x-muted">&ldquo;{step.comment}&rdquo;</div>}

      {!step.actionable && step.blockedReason && <div className="text-[11px] text-c1x-muted-2">{step.blockedReason}</div>}

      {step.actionable && isMine && (
        <form className="mt-1 flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="c1x-focusable rounded border border-c1x-line bg-c1x-surface px-2 py-1 text-xs text-c1x-ink"
          />
          <div className="flex gap-1.5">
            {step.allowedDecisions
              .filter((d): d is Exclude<Decision, "PENDING"> => d !== "PENDING")
              .map((d) => (
                <button
                  key={d}
                  type="submit"
                  formAction={() => dispatch(d)}
                  disabled={isPending}
                  className={`c1x-focusable rounded-[var(--c1x-radius-control)] px-2 py-1 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    d === "APPROVED" ? "bg-c1x-green" : d === "REJECTED" ? "bg-c1x-red" : "bg-c1x-amber"
                  }`}
                >
                  {isPending ? "…" : d}
                </button>
              ))}
          </div>
        </form>
      )}
      {step.actionable && !isMine && (
        <div className="text-[11px] text-c1x-muted-2">
          Awaiting {ROLE_LABELS[step.role]} — switch &ldquo;Acting as&rdquo; to action this step.
        </div>
      )}

      {result && result.status === "forbidden" && (
        <div className="text-[11px] text-c1x-red">
          Forbidden: requires {ROLE_LABELS[result.requiredRole]}, acting as {ROLE_LABELS[result.actorRole]}.
        </div>
      )}
      {result && (result.status === "invalid_decision" || result.status === "not_actionable") && (
        <div className="text-[11px] text-c1x-red">{result.reason}</div>
      )}
      {result && result.status === "not_validated" && (
        <div className="text-[11px] text-c1x-red">Route must be validated and locked first (Validate & Lock Route).</div>
      )}
      {result && result.status === "not_found" && <div className="text-[11px] text-c1x-red">Not found.</div>}
    </li>
  );
}
