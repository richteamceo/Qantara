# Owner Checkpoint Report

Using the template in `05_CLAUDE_CODE_EXECUTION/OWNER_CHECKPOINT_REPORT_TEMPLATE.md`.

1. **Checkpoint/page:** Checkpoint 10 — **self-scoped**, not pack-mandated (same situation as Checkpoints 8–9; `OWNER_ACCEPTANCE_PACK.md` §7.6 is still an open owner decision). Picks "performance" from Checkpoint 7's deferred Phase-1 hardening basket, specifically `ACCESSIBILITY_PERFORMANCE_AND_POLISH_GATES.md`'s explicit rule: "no N+1 page-service patterns" — asserted informally in code-review comments across several prior checkpoints, never actually measured.
2. **Branch and commit:** `claude/design-authority-review-azeq82`, on top of Checkpoints 1–9.
3. **Production files changed:** `src/db/query-counter.ts` (new — AsyncLocalStorage-based per-request query counter, zero-cost outside an active measurement context), `src/db/index.ts` (wired a `logger` hook into the existing Drizzle client — additive, no behavior change to any query), `src/lib/auth.ts` (defensive fix — see §16), `scripts/audit-performance.ts` (new).
4. **Schema/migrations:** none.
5. **Routes/services/APIs:** none. One new CLI script.
6. **Permissions/SoD:** not applicable — this checkpoint is a measurement tool plus one defensive fix, no new user-facing capability.
7. **Formula reconciliations:** none new.
8. **Evidence/lineage/audit:** `evidence/v7/checkpoint-10/performance-audit-output.txt` — a real measured query count for all 9 pages' server-side data-fetch functions against the golden fixture, plus the literal SQL text of every query issued (not just a count), so the claim "no N+1" is independently checkable rather than asserted.
9. **Tests:** No automated test suite (same disclosed gap). `scripts/audit-performance.ts` itself functions as a real regression check going forward: re-run it after any future change to a `getXData` function and a query count that jumps unexpectedly is a signal worth investigating.
10. **Build and deterministic install:** `npm run build`/`tsc --noEmit`/`eslint` clean. No new dependencies — `node:async_hooks` is a Node built-in.
11. **Browser states and viewports:** one regression screenshot (P06, 1440x900) confirming zero visual/behavioral change from this checkpoint's one production code edit — see §16.
12. **Screenshot manifest and hashes:** `evidence/v7/checkpoint-10/screenshot-manifest.json`.
13. **Region-by-region authority comparison:** not applicable — no UI built this checkpoint.
14. **Console/network:** zero errors.
15. **Accessibility/performance/security — the measured results:**

    | Page | Queries | vs. threshold (15) |
    |---|---:|---|
    | P01 Control Room | 5 | ok |
    | P02 Requests Register | 4 | ok |
    | P03 Request Dossier | 10 | ok |
    | P04 Procurement Package | 6 | ok |
    | P05 Award Decision | 7 | ok |
    | P06 Finance Validation | 12 | ok |
    | P07 Purchase Order | 6 | ok |
    | P08 Fulfilment/GRN | 7 | ok |
    | P09 Payment Voucher | 7 | ok |

    Every page's query count is flat with respect to row/line count (the classic N+1 shape — one query per iteration of a loop over N records — was not found anywhere; the earlier code-review grep for `await`-inside-loop patterns found none, and this measurement independently confirms it). P07–P09's 6–7 queries are a fixed-depth chain of single-row foreign-key lookups climbing the lineage (fulfilment → PO line → PO → finance validation → award), not a scaling pattern.

    **A real, non-N+1 inefficiency found and deliberately not fixed:** P06 (Finance Validation) is the highest at 12 queries because `finance-validation.ts` calls `getControlRoomData()` in full (queries 8–12 in the transcript — projects, organisations, baselines, control_accounts, and one large multi-join across every request in the project) just to extract one control account's `variance` field for the "Budget headroom" KPI. This is already disclosed in that file's own code comment as a deliberate reuse-over-duplication trade-off. It does not scale with any single page's row count, but it does scale with the *project's total request count* — currently invisible at 2 requests, but would become real overhead on a large project. Not fixed this checkpoint: extracting a scoped, single-account variance helper would require carefully re-deriving the existing currency-guard logic without duplicating or subtly diverging from it, a nontrivial risk for a page that currently returns in milliseconds. Flagged as a candidate for a future checkpoint if/when this project's request volume grows.
16. **Defects:**
    - *Found and fixed this checkpoint:* `getActorRole()` (`src/lib/auth.ts`) called `next/headers`' `cookies()` unconditionally, which throws when called outside a real Next.js request scope. This didn't affect the running application (every real call site is a route handler, Server Action, or Server Component render — all real request scopes) but broke this checkpoint's own audit script, which calls `getXData` functions directly. Fixed with a narrow try/catch that falls back to the same default role used when no cookie is set — verified this changes nothing about real request behavior (regression screenshot hash-identical to Checkpoint 7's, §11) and only ever activates for non-request callers like the new audit script.
    - *Found, disclosed, not fixed:* the P06 control-room-reuse inefficiency (§15).
17. **Approved variations:** none sought or granted.
18. **Owner decisions required before Checkpoint 11:** unchanged from `OWNER_ACCEPTANCE_PACK.md` §7, plus: (9) is the P06 control-room-reuse inefficiency (§15) worth fixing now, or acceptable until request volume grows enough to matter?
19. **Next proposed checkpoint (not started):** not specified — same open question as Checkpoints 7–9. Remaining untouched items from the Phase-1 hardening basket: security (deeper SAST/dependency posture), observability (structured logging, health-check endpoint), migration (incremental upgrade path never tested — every checkpoint has squashed to a single `0000` migration), integration (no external system named as in-scope). Not started; no code written toward any of them.
20. **Status:** `NOT OWNER-ACCEPTED`.

---

**Reproduction:** `npx tsx scripts/audit-performance.ts` — prints a query
count per page plus the full SQL of every query, exits non-zero if any
page exceeds the 15-query threshold.

CHECKPOINT 10 IMPLEMENTED AND VERIFIED — NOT OWNER-ACCEPTED — AWAITING
OWNER REVIEW — DO NOT START ANOTHER CHECKPOINT.
