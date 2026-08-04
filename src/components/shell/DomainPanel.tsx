type NavLink = {
  label: string;
  href?: string;
  badge?: number;
};

type NavGroup = {
  title: string;
  links: NavLink[];
};

function groups(projectId: string): NavGroup[] {
  return [
    {
      title: "Command",
      links: [
        { label: "Control room", href: `/app/projects/${projectId}/control-room` },
        { label: "Decision inbox" },
      ],
    },
    {
      title: "Demand & Procurement",
      links: [
        { label: "Requests" },
        { label: "Procurement packages" },
        { label: "Bid comparisons" },
        { label: "Awards" },
        { label: "Purchase orders" },
      ],
    },
    {
      title: "Cost Control",
      links: [
        { label: "BOQ & budget" },
        { label: "Commitments" },
        { label: "Finance validation" },
        { label: "Payment vouchers" },
        { label: "Forecast & cashflow" },
        { label: "Exceptions" },
      ],
    },
    {
      title: "Delivery & Performance",
      links: [{ label: "Fulfilment" }, { label: "Inventory" }, { label: "Progress & allowable" }],
    },
    {
      title: "Assurance",
      links: [{ label: "Evidence register" }, { label: "Certified reports" }, { label: "Workflow & audit" }],
    },
  ];
}

/** Project/domain panel — APPLICATION_SHELL_AND_NAVIGATION_CONTRACT.md §2. */
export function DomainPanel({
  projectId,
  projectName,
  currency,
  baselineVersion,
  reportingPeriod,
  activeHref,
}: {
  projectId: string;
  projectName: string;
  currency: string;
  baselineVersion: string;
  reportingPeriod: string;
  activeHref: string;
}) {
  return (
    <nav
      aria-label="Project"
      className="fixed inset-y-0 z-20 flex flex-col overflow-y-auto border-r border-c1x-line bg-c1x-surface"
      style={{ left: "var(--c1x-rail-w)", width: "var(--c1x-domain-w)", top: "var(--c1x-topbar-h)" }}
    >
      <div className="border-b border-c1x-line px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-c1x-muted-2">
          Commercial Control
        </div>
        <div className="mt-2 rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface-soft p-3">
          <div className="truncate text-sm font-semibold text-c1x-ink">{projectName}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-c1x-muted">
            <span>{currency}</span>
            <span>Baseline {baselineVersion}</span>
          </div>
          <div className="mt-1 text-xs text-c1x-muted">Period {reportingPeriod}</div>
        </div>
      </div>

      <div className="flex-1 px-2 py-2">
        {groups(projectId).map((group) => (
          <div key={group.title} className="mb-3">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-c1x-muted-2">
              {group.title}
            </div>
            <ul>
              {group.links.map((link) => {
                const isActive = link.href === activeHref;
                const disabled = !link.href;
                return (
                  <li key={link.label}>
                    {disabled ? (
                      <span
                        aria-disabled="true"
                        title={`${link.label} — not yet available (Checkpoint 2+)`}
                        className="flex items-center justify-between rounded-[var(--c1x-radius-control)] px-2 py-1.5 text-sm text-c1x-muted-2/70 cursor-not-allowed"
                      >
                        {link.label}
                      </span>
                    ) : (
                      <a
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        className={[
                          "flex items-center justify-between rounded-[var(--c1x-radius-control)] px-2 py-1.5 text-sm c1x-focusable",
                          isActive
                            ? "bg-c1x-blue-soft font-medium text-c1x-blue"
                            : "text-c1x-ink hover:bg-c1x-surface-soft",
                        ].join(" ")}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
