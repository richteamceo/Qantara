"use client";

import { useState, useTransition } from "react";
import { validateAndLockRoute, type ValidateLockResult } from "@/server/actions/finance-actions";
import type { RouteOption } from "@/server/finance-validation";
import { ForbiddenNotice } from "@/components/shell/ForbiddenNotice";

export function RouteSelector({
  projectReference,
  fvReference,
  routeOptions,
  currentRoute,
  locked,
}: {
  projectReference: string;
  fvReference: string;
  routeOptions: RouteOption[];
  currentRoute: string;
  locked: boolean;
}) {
  const [selected, setSelected] = useState(currentRoute);
  const [result, setResult] = useState<ValidateLockResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const primaryCards = routeOptions.filter((r) => r.isPrimaryCard);
  const conditionalCards = routeOptions.filter((r) => !r.isPrimaryCard);

  function renderCard(opt: RouteOption) {
    const isSelected = selected === opt.route;
    return (
      <button
        key={opt.route}
        type="button"
        disabled={locked || !opt.eligible}
        title={opt.eligible ? undefined : opt.reason}
        onClick={() => setSelected(opt.route)}
        className={[
          "c1x-focusable flex flex-col gap-1 rounded-[var(--c1x-radius-surface)] border p-3 text-left text-xs",
          isSelected ? "border-c1x-blue bg-c1x-blue-soft" : "border-c1x-line bg-c1x-surface",
          !opt.eligible ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-c1x-blue",
        ].join(" ")}
      >
        <span className="text-sm font-semibold text-c1x-ink">{opt.route}</span>
        <span className="text-c1x-muted-2">{opt.reason}</span>
        <span className="text-[10px] text-c1x-muted-2">{opt.sequence}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{primaryCards.map(renderCard)}</div>
      {conditionalCards.some((c) => c.eligible) && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{conditionalCards.filter((c) => c.eligible).map(renderCard)}</div>
      )}
      {!locked && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const r = await validateAndLockRoute(
                  projectReference,
                  fvReference,
                  selected as RouteOption["route"]
                );
                setResult(r);
              })
            }
            className="c1x-focusable rounded-[var(--c1x-radius-control)] bg-c1x-blue px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-c1x-line"
          >
            {isPending ? "Working…" : `Validate & Lock ${selected}`}
          </button>
        </div>
      )}
      {result && (
        <div className={`text-right text-[11px] ${result.status === "locked" ? "text-c1x-green" : "text-c1x-red"}`}>
          {result.status === "locked" &&
            `Locked ${result.route}.${result.purchaseOrderReference ? ` Created ${result.purchaseOrderReference}.` : " No route-specific object created for this route yet (Checkpoint 5+)."}`}
          {result.status === "already_locked" && `Already locked as ${result.route}.`}
          {result.status === "ineligible" && result.reason}
          {result.status === "not_found" && "Not found."}
          {result.status === "forbidden" && <ForbiddenNotice requiredRole={result.requiredRole} actorRole={result.actorRole} />}
        </div>
      )}
    </div>
  );
}
