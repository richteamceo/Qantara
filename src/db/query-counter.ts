import { AsyncLocalStorage } from "node:async_hooks";

/**
 * ACCESSIBILITY_PERFORMANCE_AND_POLISH_GATES.md §Performance: "no N+1
 * page-service patterns." Never measured until now (Checkpoint 10) — this
 * is the instrumentation that measures it for real, rather than asserting
 * it from a code-review grep alone.
 *
 * Zero cost outside an active `countQueries` context: the db logger below
 * checks `store.getStore()` on every query and no-ops when there isn't
 * one, so normal application requests are completely unaffected.
 */
type QueryLog = { count: number; queries: string[] };

const store = new AsyncLocalStorage<QueryLog>();

export function recordQuery(query: string) {
  const log = store.getStore();
  if (log) {
    log.count++;
    log.queries.push(query);
  }
}

export async function countQueries<T>(fn: () => Promise<T>): Promise<{ result: T; count: number; queries: string[] }> {
  const log: QueryLog = { count: 0, queries: [] };
  const result = await store.run(log, fn);
  return { result, count: log.count, queries: log.queries };
}
