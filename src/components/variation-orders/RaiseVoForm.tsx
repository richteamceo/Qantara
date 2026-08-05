"use client";

import { useState, useTransition } from "react";
import { raiseVariationOrder, type RaiseVoResult, type RaiseVoInput } from "@/server/actions/variation-order-actions";
import { ForbiddenNotice } from "@/components/shell/ForbiddenNotice";

const EMPTY: RaiseVoInput = {
  controlAccountId: "",
  tradeCode: "",
  description: "",
  originator: "Site QS Team",
  instructionRef: "",
  drawingRef: "",
  boqItemRef: "",
  unit: "",
  quantity: 0,
  rate: 0,
  currency: "",
  contractImpact: "",
};

export function RaiseVoForm({
  projectReference,
  projectId,
  controlAccounts,
}: {
  projectReference: string;
  projectId: string;
  controlAccounts: { id: string; code: string; name: string; currency: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RaiseVoInput>({
    ...EMPTY,
    controlAccountId: controlAccounts[0]?.id ?? "",
    currency: controlAccounts[0]?.currency ?? "",
  });
  const [result, setResult] = useState<RaiseVoResult | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white"
      >
        Raise Variation Order
      </button>
    );
  }

  function field<K extends keyof RaiseVoInput>(key: K, label: string, type = "text") {
    return (
      <label className="flex flex-col gap-1 text-xs text-c1x-muted">
        {label}
        <input
          type={type}
          value={form[key] as string | number}
          onChange={(e) =>
            setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))
          }
          className="c1x-focusable rounded border border-c1x-line bg-c1x-surface px-2 py-1.5 text-sm text-c1x-ink"
        />
      </label>
    );
  }

  return (
    <div className="rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-c1x-muted-2">Raise Variation Order</h2>
        <button type="button" onClick={() => setOpen(false)} className="c1x-focusable text-xs text-c1x-muted-2">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-c1x-muted">
          Control account
          <select
            value={form.controlAccountId}
            onChange={(e) => {
              const acc = controlAccounts.find((a) => a.id === e.target.value);
              setForm((f) => ({ ...f, controlAccountId: e.target.value, currency: acc?.currency ?? f.currency }));
            }}
            className="c1x-focusable rounded border border-c1x-line bg-c1x-surface px-2 py-1.5 text-sm text-c1x-ink"
          >
            {controlAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>
        {field("tradeCode", "Trade code")}
        {field("boqItemRef", "BOQ item ref")}
        {field("unit", "Unit")}
        {field("quantity", "Quantity", "number")}
        {field("rate", "Rate", "number")}
        {field("currency", "Currency")}
        {field("originator", "Originator")}
        {field("instructionRef", "Instruction ref")}
        {field("drawingRef", "Drawing ref")}
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs text-c1x-muted">
        Description / scope of variation
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="c1x-focusable rounded border border-c1x-line bg-c1x-surface px-2 py-1.5 text-sm text-c1x-ink"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1 text-xs text-c1x-muted">
        Contract impact
        <input
          type="text"
          value={form.contractImpact}
          onChange={(e) => setForm((f) => ({ ...f, contractImpact: e.target.value }))}
          className="c1x-focusable rounded border border-c1x-line bg-c1x-surface px-2 py-1.5 text-sm text-c1x-ink"
        />
      </label>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-c1x-muted-2">
          VO value: {form.currency || "—"} {(form.quantity * form.rate).toLocaleString()}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const r = await raiseVariationOrder(projectReference, projectId, form);
              setResult(r);
              if (r.status === "raised") {
                setForm({ ...EMPTY, controlAccountId: controlAccounts[0]?.id ?? "", currency: controlAccounts[0]?.currency ?? "" });
                setOpen(false);
              }
            })
          }
          className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
        >
          {isPending ? "Raising…" : "Submit"}
        </button>
      </div>
      {result && result.status !== "raised" && (
        <div className="mt-2 text-[11px] text-c1x-red">
          {result.status === "invalid" && result.reason}
          {result.status === "not_found" && "Control account not found."}
          {result.status === "forbidden" && <ForbiddenNotice requiredRole={result.requiredRole} actorRole={result.actorRole} />}
        </div>
      )}
    </div>
  );
}
