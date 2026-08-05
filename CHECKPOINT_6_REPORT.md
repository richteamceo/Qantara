# Owner Checkpoint Report

Using the template in `05_CLAUDE_CODE_EXECUTION/OWNER_CHECKPOINT_REPORT_TEMPLATE.md`.

1. **Checkpoint/page:** Checkpoint 6 — Payment Voucher and Settlement (P09).
2. **Branch and commit:** `claude/design-authority-review-azeq82`, on top of Checkpoints 1–5.
3. **Production files changed:** `src/server/payment-voucher.ts` (new), `src/server/actions/payment-voucher-actions.ts` (new — Certify & Open Payment Voucher, Approve Voucher & Release Payment), `src/app/app/projects/[projectId]/payment-vouchers/[voucherId]/page.tsx` (new route), `src/components/finance/ApproveAndPayButton.tsx` (new), `src/components/procurement/OpenPaymentVoucherButton.tsx` (new), `src/app/.../fulfilment/[fulfilmentId]/page.tsx` (P08 header now bridges to P09 once POSTED), `src/server/fulfilment.ts` (exposes `paymentVoucherReference`), `src/db/schema.ts` (`currency` added to `payment_vouchers`), `src/db/seed.ts` (golden PV gets its real GHS currency), `src/server/control-room.ts` + `src/components/control-room/ControlSheet.tsx` (currency guard extended to `certifiedActual`/`cashPaid` — fourth and, per the pattern, hopefully last recurrence of this bug class, fixed proactively this time).
4. **Schema/migrations:** squashed fresh `drizzle/0000_unusual_phalanx.sql` (still dev-only data, no production data to preserve). Added `currency` to `payment_vouchers`.
5. **Routes/services/APIs:** `/app/projects/:projectId/payment-vouchers/:voucherId` — matches the pack's canonical route exactly. Two new Server Actions: `openPaymentVoucher` (bridges P08→P09, creates a DRAFT voucher from a POSTED fulfilment, idempotent per fulfilment), `approveAndReleasePayment` (P09's single header action, DRAFT→PAID, immutable thereafter).
6. **Permissions/SoD:** Unchanged disclosed gap — the page's own readiness sidecar honestly marks "Authority / SoD" as failing ("approval and payment-release are not actually separated") rather than assumed satisfied.
7. **Formula reconciliations:** see `evidence/v7/checkpoint-6/formula-reconciliation.md`. Golden PV's full amount bridge reconciles exactly to PAGE_09's own fixture (174,952 + 34,990 = 209,942 gross; − 3,499 WHT = 206,443 net payable — acceptance test #1). The demo chain's "Certify & Open Payment Voucher" then "Approve Voucher & Release Payment" transitions were exercised live end to end on `PV-DEMO-0001` (USD), producing net payable US$11,322.10 — matching the figure independently derived and disclosed back in `CHECKPOINT_4_REPORT.md`, confirming formula consistency across checkpoints.
8. **Evidence/lineage/audit:** No audit-event log yet (same disclosed gap). Voucher links back via `fulfilmentId`; full chain PV→GRN→PO→Award is real and traversable via the page's own source links.
9. **Tests:** No automated test suite. Verification: `tsc --noEmit`, `eslint`, `next build` clean; Playwright pass across golden PV tabs and the live demo Certify+Approve/Pay transitions, zero console errors; re-checked Page 01 Control Room, the demo request dossier (P03), and the requests register (P02) afterward for regressions — which is exactly what confirmed the currency-guard fix in §16 worked correctly rather than just not crashing.
10. **Build and deterministic install:** `npm run build` succeeds. No new dependencies.
11. **Browser states and viewports:** "Populated" only, 1440x900, plus one live before/after transition. Most of the contract's required-states list (match pending, tolerance exception, tax review, payment instructed, bank reconciliation pending, reconciled, part-paid, advance open/recovered, returned, reversed, cancelled, closed period) not covered — see `evidence/v7/checkpoint-6/screenshot-manifest.json`.
12. **Screenshot manifest and hashes:** `evidence/v7/checkpoint-6/screenshot-manifest.json`.
13. **Region-by-region authority comparison** against the pack's reference screenshot for P09: not performed (same disclosed Gate 3/5 cut as every prior checkpoint). Built: header/actions (Return to Fulfilment disabled, Approve Voucher & Release Payment real, Full Lineage and Evidence disabled), 6-cell KPI strip matching the contract exactly, 4 of 8 tabs real (Voucher Summary, Three-Way Match, Tax & Deductions, Approval & Payment — 4 disclosed "soon"), 8-item readiness sidecar (the contract's own list verbatim: source lineage, three-way match, tax determination, authority/SoD, supplier/bank verification, evidence completeness, reporting period, latest immutable event). Not attempted: per-component formula ID/effective tax profile/rounding drill-down, advance/cash route controls (only CREDIT modelled, same as Checkpoint 4's PO creation), bank verification, recoveries/advances/credits, part-payment, reversal.
14. **Console/network:** Zero console errors/warnings across all pages and both live transitions.
15. **Accessibility/performance/security:** Same disclosed gap as prior checkpoints — no automated scan.
16. **Defects:**
    - *Major (disclosed, unresolved, inherited):* no auth/RBAC; no evidence/audit engine; register row-opening behavior.
    - *Major (found and fixed proactively this checkpoint, not left to be discovered live):* `payment_vouchers` had no `currency` column — the same bug class that hit `award_decisions`/`finance_validations`/`purchase_orders` in Checkpoints 3–4, explicitly flagged in `CHECKPOINT_4_REPORT.md` §18 as coming next. Fixed *before* driving any live transition this time: added the column, threaded real per-record currency through `control-room.ts`'s `certifiedActual`/`cashPaid` KPIs and the per-account table (both previously hardcoded to `project.currency`, unlike the other four money KPIs on that page which already had the correct guard). Verified live: once the demo chain's real USD PV existed alongside the golden GHS PV — the first time two real currencies ever coexisted at the settle stage — both KPIs correctly flip to "Incomplete: different currencies" instead of silently producing a wrong blended number, and the per-row table correctly shows US$11,514 (not a mislabeled GHS 11,514) for the demo row.
    - *Minor:* the "Three-Way Match" tab is genuinely a two-way match (PO vs GRN only) — no supplier invoice/certificate entity exists in the schema, disclosed both in the readiness sidecar and directly on the tab itself; tax additions are prorated from the PO line's own tax rather than re-sourced from an independent invoice.
17. **Approved variations:** none sought or granted.
18. **Owner decisions required before Checkpoint 7:**
    - This is the fourth recurrence of the "new money table needs its own currency column" pattern (Checkpoints 3, 4, 4 again, now 6) — every money-bearing table in the current schema now has one; worth confirming no further tables are planned before the pattern is declared closed.
    - The golden transaction is now closed end to end (Request → Package → Award → Finance Validation → PO → GRN → PV, PAID) and the demo chain has been live-exercised through every stage twice (Checkpoints 4–6 each re-drive it from a fresh reseed, since it isn't persisted forward in `seed.ts`). Confirm whether Checkpoint 7 should (a) continue to the pack's next page-implementation slice, or (b) bake the demo chain's now-proven transitions into the seed baseline itself so future checkpoints don't need to re-drive 4+ live transitions just to reach their own starting state.
    - No supplier invoice/certificate entity exists — the Three-Way Match tab is honestly a two-way match. Worth deciding whether a later checkpoint should add this entity or whether the two-way match is an acceptable permanent simplification for this build.
19. **Next proposed checkpoint (not started):** Checkpoint 7 — per the pack's page-implementation programme, whichever page or reconciliation work the owner selects next (options in §18). Not started; no code written toward it.
20. **Status:** `NOT OWNER-ACCEPTED`.

---

**Reproduction:** same as prior checkpoints, extended by one more stage.
Fresh seed leaves `FV-DEMO-0001` at `PENDING` with CREDIT pre-selected —
click "Validate & Lock CREDIT" → "Issue PO & Open Fulfilment" → "Post
Accepted Receipt" (defaults to full acceptance) → "Certify & Open Payment
Voucher" → "Approve Voucher & Release Payment" to reproduce the full demo
chain and the "after" screenshots.

CHECKPOINT 6 IMPLEMENTED AND VERIFIED — NOT OWNER-ACCEPTED — AWAITING
OWNER REVIEW — DO NOT START ANOTHER PAGE.
