# Owner Checkpoint Report

Using the template in `05_CLAUDE_CODE_EXECUTION/OWNER_CHECKPOINT_REPORT_TEMPLATE.md`.

1. **Checkpoint/page:** Checkpoint 1 — application shell + P01 (Project Commercial Control Room).
2. **Branch and commit:** `claude/design-authority-review-azeq82`, on top of the Gate 0 intake commit (`7a18165`).
3. **Production files changed:** everything under `src/`, `drizzle/`, `evidence/v7/checkpoint-1/`, plus `package.json`, `drizzle.config.ts`, `next.config.ts`, `.gitignore` — this is the first real application code in the repository (previously empty, per the Gate 0 report).
4. **Schema/migrations:** `drizzle/0000_worthless_bug.sql`, 11 tables. This is a deliberate subset of the full canonical domain model (`04_ENGINEERING_CONTRACTS/CANONICAL_DOMAIN_MODEL_V7_DELTA.md`) — see §16 for what's out of scope.
5. **Routes/services/APIs:** `/` (real Projects index, queries DB), `/app/projects/:projectId/control-room` (matches the pack's canonical route for P01 exactly). Aggregation service: `src/server/control-room.ts`. No JSON/REST API layer yet — the page queries the database directly via server components; the API/event contract in `04_ENGINEERING_CONTRACTS/API_EVENT_IDEMPOTENCY_AND_ERROR_CONTRACT.md` is not implemented (no mutations exist yet — P01 is read-only).
6. **Permissions/SoD:** **Not implemented.** There is a single hard-coded viewer identity ("Rich C., Commercial Manager") in the top bar with no auth, no RBAC, no permission-scoped data filtering. This is a disclosed, deliberate scope cut for Checkpoint 1, not an oversight — flagged as the top item for a decision in §18.
7. **Formula reconciliations:** see `evidence/v7/checkpoint-1/P01/formula-reconciliation.md`. All KPI-strip and lifecycle-spine figures were independently re-derived from the raw golden-fixture JSON and matched the rendered page. One caught-and-fixed bug: the lifecycle spine originally stacked the golden transaction across four positions simultaneously (violates the pack's own "counted once, at highest position" rule) — fixed before this report was written. One disclosed unresolved gap: budget (net) vs. commitment/certified (gross) basis mismatch — see that file.
8. **Evidence/lineage/audit:** No audit-event log, no evidence-hash chain, no `EvidenceItem`/`AuditEvent` tables exist yet (`04_ENGINEERING_CONTRACTS/FORMULA_EVIDENCE_LINEAGE_AND_AUDIT_ENGINE.md` not implemented). The readiness sidecar's "Evidence completeness" check is deliberately shown as failing, not faked as passing.
9. **Tests:** No automated test suite exists yet. Verification this checkpoint was: `tsc --noEmit` (clean), `next build` (clean), `eslint` (clean after one fix), and manual/scripted browser verification via Playwright (zero console errors, real numbers matched hand-computed fixture arithmetic). No regression suite, no unit tests, no formula test vectors wired up — full gap.
10. **Build and deterministic install:** `npm run build` succeeds (Next.js 16.3.0 / Turbopack). `package-lock.json` committed.
11. **Browser states and viewports:** One state captured — populated/LIVE/Overview tab — at 1440×900. The contract's full required-states list (certified, no-certified-period, no-transactions, incomplete-baseline, stale-forecast, reconciliation-failure, permission-restricted, loading, recoverable-error) is **not** covered; no seed fixtures or UI branches exist for those states yet. 1280×800/390×844 responsive viewports not captured.
12. **Screenshot manifest and hashes:** `evidence/v7/checkpoint-1/P01/screenshot-manifest.json` (SHA-256 per file).
13. **Region-by-region authority comparison against `07_REFERENCE_ASSETS/APPROVED_SCREENSHOTS/01-control-room.jpg`:** **not performed.** I did not pixel- or layout-diff the built page against the frozen approved screenshot — that's Gate 3/5 work per the pack's own checkpoint programme, and this report should not be read as claiming visual-authority conformance. What was built: header (A), KPI strip (B, 8 cells — 2 explicitly "incomplete" rather than faked), lifecycle spine (C), workspace tabs (D, only Overview populated), exposure donut (E), forecast trajectory (F, explicitly deferred placeholder), control sheet (G), readiness sidecar (H, simplified real checks). Not attempted: drill-through drawers, "Explain calculation" formula drawer, real search, real notifications, real Decision Inbox page, keyboard-full interaction contract beyond basic `tabIndex`/focus styles.
14. **Console/network:** Zero console errors/warnings and zero failed requests observed on page load (Playwright `console`/`pageerror` listeners, both routes). Not tested: interaction-triggered errors (there are few interactive controls yet), network behavior under load/latency.
15. **Accessibility/performance/security:** No automated a11y scan run (no axe-core wired up), no Lighthouse/perf budget check, no security scan. Basic manual accessibility choices made (focus-visible outline token, `aria-current`, `aria-disabled` + `title` on non-functional controls, `role="img"` + text alternative on the donut) but none of this is verified against WCAG 2.2 AA as the contract requires. Full gap against `02_DESIGN_SYSTEM_AUTHORITY/ACCESSIBILITY_PERFORMANCE_AND_POLISH_GATES.md`.
16. **Defects:**
    - *Major (disclosed, unresolved):* budget/commitment basis mismatch feeding a misleading Variance figure (§7).
    - *Major (disclosed, unresolved):* no auth/RBAC — every reader currently sees unrestricted "Finance" data that the contract says must be permission-scoped.
    - *Major (disclosed, unresolved):* Forecast trajectory, Pipeline risk, and 6 of 7 workspace tabs are explicitly not implemented (shown as honest "incomplete"/"soon" states, not faked).
    - *Minor:* control-account naming ("Ready-Mix Concrete Supply") is a placeholder — the real BOQ code/description was not extracted from `Cost Control System.xlsm` this checkpoint.
    - *Critical fixed before evidence capture:* lifecycle-spine double counting (§7).
17. **Approved variations:** none sought or granted — nothing in this checkpoint deviates from the contract by agreed exception; gaps above are scope not yet built, not approved substitutions.
18. **Owner decisions required before Checkpoint 2:**
    - Is single-tenant, no-auth acceptable for continued local development, or should authentication/RBAC be pulled forward before more pages are built on top of an unscoped data model?
    - How should the budget-basis mismatch be resolved — pull a real gross-basis budget figure from the workbook, or define a documented net→gross normalization rule?
    - Confirm control-account naming approach (placeholder vs. workbook-sourced BOQ codes) before more accounts are seeded.
19. **Next proposed checkpoint (not started):** Checkpoint 2 — Requests Register (P02) + Request Dossier (P03), per the pack's page-implementation order. Not started; no code written toward it.
20. **Status:** `NOT OWNER-ACCEPTED`.

---

**Reproduction:** `npm install && npm run build`. Local Postgres: `createdb core1x`, set `DATABASE_URL` in `.env`, `npx drizzle-kit migrate`, `npx tsx src/db/seed.ts`, `npm run dev`, open `/app/projects/SWTBK/control-room`.

CHECKPOINT 1 IMPLEMENTED AND VERIFIED — NOT OWNER-ACCEPTED — AWAITING OWNER
REVIEW — DO NOT START ANOTHER PAGE.
