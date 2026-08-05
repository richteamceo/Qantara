import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, organisations, baselines } from "@/db/schema";
import { AppShell } from "@/components/shell/AppShell";
import { getActorRole } from "@/lib/auth";

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
}) {
  const { projectId } = await params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.reference, projectId),
  });
  if (!project) notFound();

  const organisation = await db.query.organisations.findFirst({
    where: eq(organisations.id, project.organisationId),
  });
  const baseline = await db.query.baselines.findFirst({
    where: eq(baselines.projectId, project.id),
  });
  const actorRole = await getActorRole();

  return (
    <AppShell
      projectId={project.reference}
      projectName={project.name}
      organisationName={organisation?.name ?? ""}
      currency={project.currency}
      baselineVersion={baseline?.version ?? "—"}
      reportingPeriod={project.reportingPeriod}
      actorRole={actorRole}
    >
      {children}
    </AppShell>
  );
}
