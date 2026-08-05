import { RoleSwitcher } from "./RoleSwitcher";
import type { Role } from "@/lib/auth";

/** Top command bar — APPLICATION_SHELL_AND_NAVIGATION_CONTRACT.md §3. */
export function TopBar({
  organisationName,
  reportingPeriod,
  actorRole,
}: {
  organisationName: string;
  reportingPeriod: string;
  actorRole: Role;
}) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-c1x-line bg-c1x-surface px-4"
      style={{ height: "var(--c1x-topbar-h)", left: "var(--c1x-rail-w)" }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled
          title="Global search — not yet wired to a search index (Checkpoint 2+)"
          className="c1x-focusable flex items-center gap-2 rounded-[var(--c1x-radius-control)] border border-c1x-line px-3 text-sm text-c1x-muted disabled:cursor-not-allowed"
          style={{ height: "var(--c1x-search-h)" }}
        >
          <span>Search</span>
          <kbd className="rounded border border-c1x-line-strong bg-c1x-surface-soft px-1.5 py-0.5 text-[11px] text-c1x-muted-2">
            ⌘K
          </kbd>
        </button>
        <span className="text-sm text-c1x-muted">{organisationName}</span>
      </div>
      <div className="flex items-center gap-4">
        <span
          className="rounded-[var(--c1x-radius-control)] border border-c1x-line bg-c1x-surface-soft px-2 py-1 text-xs text-c1x-muted"
          title="Reporting period — drives certified/live basis"
        >
          Period {reportingPeriod}
        </span>
        <button
          type="button"
          disabled
          title="Notifications — not yet wired (Checkpoint 2+)"
          className="c1x-focusable text-c1x-muted disabled:cursor-not-allowed"
        >
          Notifications
        </button>
        <RoleSwitcher actorRole={actorRole} />
      </div>
    </header>
  );
}
