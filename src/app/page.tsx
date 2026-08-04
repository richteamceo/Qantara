import { db } from "@/db";
import { projects } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Minimal real Projects entry point. Not the full register from the IA
 * contract (search, filters, saved views) — that's deferred. Lists
 * whatever projects exist in the database; does not hard-code a
 * destination (INFORMATION_ARCHITECTURE_NAVIGATION_AND_ROUTE_MAP.md §8
 * prohibitions).
 */
export default async function Home() {
  const rows = await db.select().from(projects);

  return (
    <div className="flex min-h-screen items-center justify-center bg-c1x-canvas p-8">
      <div className="w-full max-w-xl rounded-[var(--c1x-radius-surface)] border border-c1x-line bg-c1x-surface p-6">
        <h1 className="text-lg font-semibold text-c1x-ink">CORE1X — Projects</h1>
        <p className="mt-1 text-sm text-c1x-muted">
          Checkpoint 1 build. Only the Control Room page (P01) is implemented.
        </p>
        <ul className="mt-4 divide-y divide-c1x-line">
          {rows.map((p) => (
            <li key={p.id}>
              <a
                href={`/app/projects/${p.reference}/control-room`}
                className="c1x-focusable flex items-center justify-between rounded-[var(--c1x-radius-control)] px-2 py-3 hover:bg-c1x-surface-soft"
              >
                <span>
                  <span className="font-medium text-c1x-ink">{p.name}</span>
                  <span className="ml-2 text-xs text-c1x-muted-2">{p.reference}</span>
                </span>
                <span className="text-xs text-c1x-blue">Open Control Room →</span>
              </a>
            </li>
          ))}
          {rows.length === 0 && <li className="py-3 text-sm text-c1x-muted-2">No projects seeded.</li>}
        </ul>
      </div>
    </div>
  );
}
