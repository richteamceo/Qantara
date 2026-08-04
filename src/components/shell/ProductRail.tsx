type RailItem = {
  key: string;
  label: string;
  glyph: string;
  href?: string;
};

const RAIL_ITEMS: RailItem[] = [
  { key: "command", label: "Command", glyph: "CM" },
  { key: "inbox", label: "Inbox", glyph: "IB" },
  { key: "projects", label: "Projects", glyph: "PJ", href: "/" },
  { key: "commercial", label: "Commercial", glyph: "CC" },
  { key: "finance", label: "Finance", glyph: "FN" },
  { key: "resources", label: "Resources", glyph: "RS" },
  { key: "site", label: "Site & Progress", glyph: "SP" },
  { key: "insights", label: "Insights", glyph: "IN" },
  { key: "core-ai", label: "CORE AI", glyph: "AI" },
];

/** Global product rail — 02_DESIGN_SYSTEM_AUTHORITY/APPLICATION_SHELL_AND_NAVIGATION_CONTRACT.md §1. */
export function ProductRail({ active }: { active: string }) {
  return (
    <nav
      aria-label="Global"
      className="fixed inset-y-0 left-0 z-30 flex flex-col items-center bg-c1x-navy py-3"
      style={{ width: "var(--c1x-rail-w)" }}
    >
      <div
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-[var(--c1x-radius-control)] bg-c1x-blue text-xs font-semibold text-white"
        title="CORE1X"
      >
        C1
      </div>
      <ul className="flex flex-1 flex-col items-center gap-1">
        {RAIL_ITEMS.map((item) => {
          const isActive = item.key === active;
          const disabled = !item.href;
          const className = [
            "flex h-10 w-10 items-center justify-center rounded-[var(--c1x-radius-control)] text-[11px] font-medium c1x-focusable",
            isActive
              ? "bg-white text-c1x-blue relative before:absolute before:-left-3 before:h-5 before:w-[3px] before:rounded-full before:bg-c1x-blue"
              : disabled
                ? "text-white/30 cursor-not-allowed"
                : "text-white/70 hover:bg-white/10 hover:text-white",
          ].join(" ");
          return (
            <li key={item.key} title={disabled ? `${item.label} — not yet available` : item.label}>
              {disabled ? (
                <span aria-disabled="true" className={className}>
                  {item.glyph}
                </span>
              ) : (
                <a href={item.href} className={className} aria-current={isActive ? "page" : undefined}>
                  {item.glyph}
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium text-white"
        title="Help / User"
      >
        RC
      </div>
    </nav>
  );
}
