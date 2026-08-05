# Owner Checkpoint Report

Using the template in `05_CLAUDE_CODE_EXECUTION/OWNER_CHECKPOINT_REPORT_TEMPLATE.md`.

1. **Checkpoint/page:** Checkpoint 4 — Finance Validation and Binding Route (P06).
2. **Branch and commit:** `claude/design-authority-review-azeq82`, on top of Checkpoints 1–3 (+ Checkpoint 1 addendum).
3. **Production files changed:** `src/server/finance-validation.ts`, `src/server/actions/finance-actions.ts` (new — one transition), `src/app/app/projects/[projectId]/finance-validations/**` (new route), `src/components/finance/RouteSelector.tsx` (new), `src/db/schema.ts`/`src/db/seed.ts` (tax-breakdown columns on `finance_validations`, `currency` on `purchase_orders`, demo award/FV baked into seed with corrected formula), `src/server/control-room.ts` + `ControlSheet.tsx`/`ExposureDonut.tsx`/`page.tsx` (currency guard extended to `openCommitment` — third and hopefully last recurrence of this bug class; donut disclosure gap fixed), `src/app/.../awards/[awardId]/page.tsx` (Finance link now real).
4. **Schema/migrations:** squashed fresh `drizzle/0000_long_blackheart.sql` (still dev-only data). Added `vatAmount`/`nhilAmount`/`getfundAmount`/`whtAmount` to `finance_validations`; added `currency` to `purchase_orders`.
5. **Routes/services/APIs:** `/app/projects/:projectId/finance-validations/:validationId` — matches the pack's canonical route exactly. One new Server Action: `validateAndLockRoute`.
6. **Permissions/SoD:** Unchanged disclosed gap. PAGE_06's own readiness check "SoD / authority" is honestly marked failing in the UI itself ("Finance-only permission is not actually enforced") rather than silently assumed satisfied — the page discloses its own gap to whoever views it, not just this report.
7. **Formula reconciliations:** see `evidence/v7/checkpoint-4/formula-reconciliation.md`. Golden FV's full VAT/NHIL/GETFund/WHT breakdown now reconciles exactly to PAGE_06's own worked fixture (all 6 figures verified summing correctly). **Found and corrected a real rate error carried from Checkpoint 3**: the demo Finance Validation's WHT was computed at an approximated 5% (from the workbook's general SETTINGS rate); PAGE_06's own fixture reveals the real rate is 2% at the payable event. Corrected before this checkpoint's seed was finalized, not left wrong. The demo chain's "Validate & Lock Route" transition was exercised live, creating a real `PO-DEMO-0001` and correctly recalculating downstream budget headroom.
8. **Evidence/lineage/audit:** No audit-event log yet (same disclosed gap). Route decision (route, status, validatedAt) is persisted and the created PO links back via `financeValidationId`, giving real (if partial) forward lineage.
9. **Tests:** No automated test suite. Verification: `tsc --noEmit`, `eslint`, `next build` clean; Playwright pass across golden and demo FV pages plus the live lock transition, zero console errors; re-checked Page 01, the demo award page, and the requests register afterward for regressions — which is exactly what caught the donut disclosure gap in §16 before it shipped.
10. **Build and deterministic install:** `npm run build` succeeds. No new dependencies.
11. **Browser states and viewports:** "Populated" only, 1440×900, plus one live before/after transition. Most of the contract's required-states list not covered (see `evidence/v7/checkpoint-4/screenshot-manifest.json`).
12. **Screenshot manifest and hashes:** `evidence/v7/checkpoint-4/screenshot-manifest.json`.
13. **Region-by-region authority comparison** against `07_REFERENCE_ASSETS/APPROVED_SCREENSHOTS/06-finance-validation.jpg`: not performed (same disclosed Gate 3/5 cut as every prior checkpoint). Built: header/actions (Return for Correction and Export Evidence disabled, route-lock action real), 4-cell KPI strip, 4 of 6 tabs real (Decision Pack, Line Validation, Tax & Deductions, Route & Sequence — 2 disclosed "soon"), all 6 route options with real eligibility rules and reasons, release sequence per route (CREDIT's sequence is pack-verbatim; the other 5 are disclosed as reasonably inferred, not sourced). Not attempted: warning/control banner carrying award exceptions forward, per-line clickable formula drill-down, approval-chain visualization, route-change/reversal, Full Lineage drawer. Route-specific object creation on lock is implemented for CREDIT only (real PO); CASH/ADVANCE/DIRECT/URGENT lock the decision but disclose that their own next-object creation isn't built yet — the current schema has no way to reach a PaymentVoucher without a PurchaseOrder/GRN in between, which those routes would need.
14. **Console/network:** Zero console errors/warnings across all pages and the live transition.
15. **Accessibility/performance/security:** Same disclosed gap as prior checkpoints — no automated scan.
16. **Defects:**
    - *Major (disclosed, unresolved, inherited):* no auth/RBAC; no evidence/audit engine; register row-opening behavior.
    - *Major (found and fixed this checkpoint, not left unresolved):* WHT rate (5%→2%, see §7); `purchase_orders` missing `currency` (third occurrence of this exact bug class — Checkpoints 3's `award_decisions`/`finance_validations`, now `purchase_orders`); Exposure Composition donut's exclusion-disclosure only covering one of two ways a metric can be non-displayable.
    - *Minor:* only CREDIT's route-specific object creation is implemented; release sequences for CASH/ADVANCE/URGENT/DIRECT are inferred, not pack-sourced; commercial variance is definitionally always 0 in this build (no independent Finance re-entry to actually vary from the award).
17. **Approved variations:** none sought or granted.
18. **Owner decisions required before Checkpoint 5:**
    - The currency-column gap has now recurred three times across `award_decisions`, `finance_validations`, `purchase_orders` — `fulfilment_entries`/`payment_vouchers` are next in line once Checkpoint 5 touches them. Worth deciding now whether to add `currency` to all remaining money-bearing tables preemptively rather than catching it live a fourth time.
    - Should Checkpoint 5 (Purchase Order + Fulfilment/GRN) invest in a real schema path for CASH/ADVANCE/DIRECT routes (a PaymentVoucher reachable without a PurchaseOrder), or keep deferring non-CREDIT routes' downstream mechanics further?
    - Confirm the 2% WHT correction — is this genuinely a page-authority-overrides-workbook case, or should the workbook's 5% general rate and this page's 2% worked example be reconciled with the business owner directly?
19. **Next proposed checkpoint (not started):** Checkpoint 5 — Pages 07 and 08 (Purchase Order, Fulfilment/GRN/Service Entry), per the pack's page-implementation order. Not started; no code written toward it.
20. **Status:** `NOT OWNER-ACCEPTED`.

---

**Reproduction:** same as prior checkpoints. Fresh seed leaves
`FV-DEMO-0001` at `PENDING` with CREDIT pre-selected — click "Validate &
Lock CREDIT" on that page to reproduce the "after" screenshots and the PO
creation.

CHECKPOINT 4 IMPLEMENTED AND VERIFIED — NOT OWNER-ACCEPTED — AWAITING
OWNER REVIEW — DO NOT START ANOTHER PAGE.
