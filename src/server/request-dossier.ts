import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, requests, requestLines, controlAccounts, procurementPackages } from "@/db/schema";
import { getControlRoomData, type MetricValue } from "./control-room";
import { getChainStatus, type ChainStatus } from "./approvals";

export type DossierLine = {
  lineNo: number;
  description: string;
  costType: string;
  authorityType: "BOQ" | "EXCEPTION";
  authorityReference: string;
  requestedQty: number;
  requestedUnit: string;
  exposureAmount: number;
  exposureCurrency: string;
  boqAvailableQty: number | null;
  authorityOk: boolean;
  boqSourceNote: string;
};

export type ReadinessCheck = {
  key: string;
  label: string;
  status: "pass" | "fail";
  detail: string;
};

export type RequestDossierData = {
  project: { reference: string; name: string };
  request: {
    id: string;
    reference: string;
    status: string;
    priority: string | null;
    workArea: string | null;
    requestedBy: string;
    needByDate: string | null;
    createdAt: string;
    isDemoData: boolean;
    demoNote: string | null;
  };
  controlAccount: { id: string; code: string; name: string };
  packageReference: string | null;
  kpis: {
    requestedValue: MetricValue;
    budgetHeadroom: MetricValue;
    governedQuantity: { requestedQty: number; requestedUnit: string }[];
    needByTimeRemainingDays: number | null;
  };
  lines: DossierLine[];
  reconciliation: { ok: boolean; requestTotal: number; lineTotal: number };
  readiness: ReadinessCheck[];
  readinessScore: number;
  canApprovePrepare: boolean;
  approveBlockedReason: string | null;
  /** Added Checkpoint 12 — Procurement -> Finance/Admin -> MD chain, source workbook REQUESTER/PROCUREMENT sheets. Gates canApprovePrepare. */
  approvalChain: ChainStatus;
};

export async function getRequestDossierData(
  projectReference: string,
  requestReference: string
): Promise<RequestDossierData | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.reference, projectReference) });
  if (!project) return null;

  const request = await db.query.requests.findFirst({ where: eq(requests.reference, requestReference) });
  if (!request || request.projectId !== project.id) return null;

  const controlAccount = await db.query.controlAccounts.findFirst({
    where: eq(controlAccounts.id, request.controlAccountId),
  });

  const lineRows = await db.select().from(requestLines).where(eq(requestLines.requestId, request.id));
  const pkg = await db.query.procurementPackages.findFirst({ where: eq(procurementPackages.requestId, request.id) });

  const lines: DossierLine[] = lineRows
    .sort((a, b) => a.lineNo - b.lineNo)
    .map((l) => ({
      lineNo: l.lineNo,
      description: l.description,
      costType: l.costType,
      authorityType: l.authorityType,
      authorityReference: l.authorityReference,
      requestedQty: Number(l.requestedQty),
      requestedUnit: l.requestedUnit,
      exposureAmount: Number(l.exposureAmount),
      exposureCurrency: l.exposureCurrency,
      boqAvailableQty: l.boqAvailableQty === null ? null : Number(l.boqAvailableQty),
      authorityOk: !(l.authorityType === "BOQ" && l.boqAvailableQty === null),
      boqSourceNote: l.boqSourceNote,
    }));

  const lineTotal = lines.reduce((s, l) => s + l.exposureAmount, 0);
  const reconciliation = {
    ok: Math.abs(lineTotal - Number(request.controlledEstimate)) < 0.01,
    requestTotal: Number(request.controlledEstimate),
    lineTotal,
  };

  // Reuse Page 01's per-account budget/commitment aggregation for budget
  // headroom rather than re-deriving the same currency-guarded logic here.
  let budgetHeadroom: MetricValue = { status: "incomplete", reason: "Control account not found" };
  if (controlAccount) {
    const controlRoom = await getControlRoomData(projectReference);
    const accountRow = controlRoom?.accounts.find((a) => a.id === controlAccount.id);
    if (accountRow) budgetHeadroom = accountRow.variance;
  }

  const needByTimeRemainingDays = request.needByDate
    ? Math.ceil((new Date(request.needByDate).getTime() - Date.now()) / 86400000)
    : null;

  const missingAuthorityLines = lines.filter((l) => !l.authorityOk);
  const approvalChain = await getChainStatus("REQUEST_AUTHORIZATION", request.id, request.reference);

  const readiness: ReadinessCheck[] = [
    {
      key: "boq-authority",
      label: "BOQ / exception authority",
      status: missingAuthorityLines.length === 0 ? "pass" : "fail",
      detail:
        missingAuthorityLines.length === 0
          ? `All ${lines.length} lines have valid authority`
          : `${missingAuthorityLines.length}/${lines.length} lines cite a BOQ code not found in source BOQ MASTER: ${missingAuthorityLines.map((l) => l.authorityReference).join(", ")}`,
    },
    {
      key: "quantity-provenance",
      label: "Quantity provenance",
      status: lines.every((l) => l.requestedQty > 0 && l.requestedUnit) ? "pass" : "fail",
      detail: "Every line carries a requested quantity and unit",
    },
    {
      key: "budget-headroom",
      label: "Budget headroom",
      status: budgetHeadroom.status === "computed" ? (budgetHeadroom.value.amount >= 0 ? "pass" : "fail") : "fail",
      detail:
        budgetHeadroom.status === "computed"
          ? `Control account variance ${budgetHeadroom.value.amount >= 0 ? "positive" : "negative"} (${budgetHeadroom.value.currency} ${budgetHeadroom.value.amount.toFixed(2)})`
          : (budgetHeadroom as { reason: string }).reason,
    },
    {
      key: "technical-evidence",
      label: "Technical evidence",
      status: "fail",
      detail: "Evidence register / document attachment is not implemented yet (deferred to a later checkpoint)",
    },
    {
      key: "approval-authority",
      label: "Approval authority",
      status: approvalChain.overallStatus === "APPROVED" ? "pass" : "fail",
      detail:
        approvalChain.overallStatus === "APPROVED"
          ? "Request Authorization chain (Procurement → Finance/Admin → MD) fully approved"
          : `Request Authorization chain is ${approvalChain.overallStatus} (${approvalChain.steps.filter((s) => s.decision === "APPROVED").length}/${approvalChain.steps.length} steps approved) — see Workflow tab`,
    },
  ];
  const readinessScore = Math.round((readiness.filter((c) => c.status === "pass").length / readiness.length) * 100);

  const canApprovePrepare = !pkg && missingAuthorityLines.length === 0 && approvalChain.overallStatus === "APPROVED";
  const approveBlockedReason = pkg
    ? "Already allocated to a procurement package"
    : missingAuthorityLines.length > 0
      ? `Blocked: ${missingAuthorityLines.length} line(s) lack valid BOQ/exception authority`
      : approvalChain.overallStatus !== "APPROVED"
        ? `Request Authorization chain (Procurement → Finance/Admin → MD) is ${approvalChain.overallStatus} — not yet fully approved`
        : null;

  return {
    project: { reference: project.reference, name: project.name },
    request: {
      id: request.id,
      reference: request.reference,
      status: request.status,
      priority: request.priority,
      workArea: request.workArea,
      requestedBy: request.requestedBy,
      needByDate: request.needByDate ? new Date(request.needByDate).toISOString() : null,
      createdAt: new Date(request.createdAt).toISOString(),
      isDemoData: request.isDemoData,
      demoNote: request.demoNote,
    },
    controlAccount: controlAccount
      ? { id: controlAccount.id, code: controlAccount.code, name: controlAccount.name }
      : { id: "", code: "—", name: "Not found" },
    packageReference: pkg?.reference ?? null,
    kpis: {
      requestedValue: {
        status: "computed",
        value: { amount: Number(request.controlledEstimate), currency: request.currency },
        basis: "Sum of active line exposures",
      },
      budgetHeadroom,
      governedQuantity: lines.map((l) => ({ requestedQty: l.requestedQty, requestedUnit: l.requestedUnit })),
      needByTimeRemainingDays,
    },
    lines,
    reconciliation,
    readiness,
    readinessScore,
    canApprovePrepare,
    approveBlockedReason,
    approvalChain,
  };
}
