import { ProductRail } from "./ProductRail";
import { DomainPanel } from "./DomainPanel";
import { TopBar } from "./TopBar";

export function AppShell({
  projectId,
  projectName,
  organisationName,
  currency,
  baselineVersion,
  reportingPeriod,
  activeHref,
  children,
}: {
  projectId: string;
  projectName: string;
  organisationName: string;
  currency: string;
  baselineVersion: string;
  reportingPeriod: string;
  activeHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-c1x-canvas">
      <ProductRail active="projects" />
      <TopBar organisationName={organisationName} reportingPeriod={reportingPeriod} />
      <DomainPanel
        projectId={projectId}
        projectName={projectName}
        currency={currency}
        baselineVersion={baselineVersion}
        reportingPeriod={reportingPeriod}
        activeHref={activeHref}
      />
      <main
        className="min-h-screen"
        style={{
          marginLeft: "calc(var(--c1x-rail-w) + var(--c1x-domain-w))",
          paddingTop: "var(--c1x-topbar-h)",
        }}
      >
        <div style={{ padding: "var(--c1x-page-padding)" }}>{children}</div>
      </main>
    </div>
  );
}
