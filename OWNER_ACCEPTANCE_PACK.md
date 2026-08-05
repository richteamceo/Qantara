# CORE1X — Owner Acceptance Pack

Consolidated summary across Checkpoints 0–8. Checkpoints 0–7 follow
`05_CLAUDE_CODE_EXECUTION/CONTROLLED_BUILD_AND_CHECKPOINT_PROGRAMME.md`,
which ends at Checkpoint 7; Checkpoint 8 is self-scoped (see
`CHECKPOINT_8_REPORT.md` §1) since the pack does not define what comes
after. This document indexes the individual checkpoint reports; it does
not replace them. Every figure below is sourced from the checkpoint
reports and their evidence directories, not restated from memory.

## 1. What was built

All nine V7 page contracts (`03_PAGE_CONTRACTS/PAGE_01`–`PAGE_09`) have a
real, working implementation: server-side data aggregation from a
Postgres/Drizzle schema, a UI matching each contract's KPI strip and a
real subset of its required tabs, and one primary state-changing
transition per page, gated by a real (if simulated-identity) permission
check as of Checkpoint 7.

| Checkpoint | Scope | Report |
|---|---|---|
| 0 | Authority intake, stack authorization | `GATE_0_INTAKE_REPORT.md` |
| 1 | App shell, Page 01 Control Room, real BOQ budget data | `CHECKPOINT_1_REPORT.md`, `CHECKPOINT_1_ADDENDUM.md` |
| 2 | Page 02 Requests Register, Page 03 Request Dossier | `CHECKPOINT_2_REPORT.md` |
| 3 | Page 04 Procurement Package, Page 05 Award Decision | `CHECKPOINT_3_REPORT.md` |
| 4 | Page 06 Finance Validation, binding route | `CHECKPOINT_4_REPORT.md` |
| 5 | Page 07 Purchase Order, Page 08 Fulfilment/GRN | `CHECKPOINT_5_REPORT.md` |
| 6 | Page 09 Payment Voucher, end-to-end golden closure | `CHECKPOINT_6_REPORT.md` |
| 7 | Phase-1 hardening: RBAC/SoD, accessibility, regression | `CHECKPOINT_7_REPORT.md` |
| 8 | Self-scoped: real PDF generation for PO/PV, export audit logging | `CHECKPOINT_8_REPORT.md` |

Every checkpoint's status is **NOT OWNER-ACCEPTED**. This pack does not
change that — it is a navigation aid for review, not a self-certification.

## 2. The golden transaction — closed end to end

`MR-SWTBK-2026-0035` (Premix concrete, Structural Concrete control
account) is fully seeded and traceable through all nine pages:

```
MR-SWTBK-2026-0035 -> PPK-2026-011 -> AWD-2026-008 -> FV-2026-018
  -> PO-2026-041 -> GRN-2026-0041 -> PV-2026-0076 (PAID)
```

Every money figure on this chain reconciles exactly to the pack's own
worked fixtures in the page contracts (verified and documented in each
checkpoint's `evidence/v7/checkpoint-N/formula-reconciliation.md`):
gross order value GHS 1,639,152; certified net GHS 174,952; net payable
GHS 206,443. No figure on this chain is fabricated or approximated —
where the pack's fixture didn't give every line explicitly (e.g. PAGE_07's
per-line tax breakdown), the inference is disclosed and cross-checked
against the totals the pack does give.

## 3. The demo transaction — real, disclosed, and live-exercised every checkpoint

`MR-DEMO-0001` (150mm block, Block & Masonry control account, currency
USD — deliberately different from the golden fixture's GHS to exercise
the currency-guard logic) is explicitly tagged `isDemoData`/`DEMO`
everywhere it appears. It is not persisted forward through the seed
between checkpoints; each checkpoint's evidence was captured by driving
its live transitions from a fresh reseed, which is itself evidence that
the transitions are idempotent and reproducible, not one-off.

## 4. Known gaps register (consolidated)

These are the material, currently-open gaps across the whole build, most
already disclosed individually in their originating checkpoint report:

| Gap | Since | Status |
|---|---|---|
| No real authentication/login | CP1 | CP7 added a real server-enforced RBAC/SoD *gate*, but "who you are" is a self-service cookie switcher, not a credential-checked identity — see CHECKPOINT_7_REPORT.md §7 |
| No evidence/audit engine | CP1 | CP8 added a real, minimal `audit_events` table logging document exports only (triggered by the PDF feature actually needing it) — not the full immutable audit/evidence engine every readiness sidecar still discloses as missing |
| No forecast/cashflow model | CP1 | Page 01's Forecast final cost KPI stays `Incomplete`, not zero |
| No cross-currency conversion | CP1 | Currency-guard pattern refuses to blend currencies rather than guess an exchange rate — recurred and was fixed 4 times (CP3, CP4 x2, CP6) as new money tables were added; CP7 confirms no more untagged money tables remain |
| Three-way match is two-way | CP6 | No supplier invoice/certificate entity exists; PO-vs-GRN match is real, invoice leg is not |
| Approved design tokens fail WCAG 2 AA contrast in several combinations | CP7 (found) | Not silently fixed — recorded as an authority conflict requiring an owner decision, see CHECKPOINT_7_REPORT.md §16 |
| Only CREDIT route produces its own next object (PO) | CP4 | CASH/ADVANCE/DIRECT/URGENT lock the route decision but the schema has no PV-without-PO path yet |
| Single-shot immutable receipts/vouchers | CP5, CP6 | No partial/multiple GRNs per line, no reversal/part-payment flow |
| Register pagination/export/bulk ops | CP2 | Deferred, dataset is 2 rows so not yet load-bearing |
| No PDF pagination (multi-page documents) | CP8 | A PO/PV with enough lines to exceed one page would draw off the bottom of the page; not reachable with current seed data (max 3 lines) |
| Only 2 of ~14 required document types have real PDF generation | CP8 | PO and PV only; RFQs, GRNs, board packs, quotation comparisons, etc. not attempted |
| Pre-existing dev-only `esbuild`/`drizzle-kit` moderate advisory | CP8 (found) | Dev-server-only, not shipped in the app; fix requires a breaking `drizzle-kit` downgrade — not applied, see CHECKPOINT_8_REPORT.md §15 |

## 5. Verification performed

- `tsc --noEmit`, `eslint`, `next build` clean at every checkpoint, including this one.
- Every checkpoint's primary transition(s) exercised live in a real browser (Playwright/chromium), not just unit-tested against the server function.
- Checkpoint 7 additionally: a full regression screenshot pass across all 9 pages + Control Room from a fresh reseed (`evidence/v7/checkpoint-7/regression/`), a live blocked-then-allowed demonstration of 5 role-gated transitions (`evidence/v7/checkpoint-7/rbac/`), and an axe-core WCAG 2 A/AA scan across 6 representative pages.
- No automated test suite exists at any checkpoint (disclosed gap, every report).

## 6. Reproduction

Fresh clone → `npm install` → `npx drizzle-kit migrate` → `npx tsx src/db/seed.ts` → `npm run dev`. The golden transaction is fully populated and read-only browsable immediately. The demo transaction starts at `FV-DEMO-0001` (`PENDING`) and requires driving its live transitions in sequence (see each checkpoint report's "Reproduction" section) — as of Checkpoint 7, each transition requires switching the top-bar "Acting as" role to the one the SoD matrix assigns it (Finance for route-lock/payment-release, Procurement for PO/fulfilment-issuance, Receiver for posting receipts, QS/Commercial for package-prep and voucher-certification, Project Director for award-approval).

## 7. Owner decision log (open items requiring a decision before further work)

1. Confirm the inferred 20% uniform tax rate on the golden PO's pump/testing lines (CP5).
2. Multiple/partial GRNs per PO line and a reversal/part-payment flow — invest now or keep deferring (CP5, CP6)?
3. The approved design tokens' WCAG AA contrast conflict (CP7) — adjust the tokens (a design-authority change requiring sign-off) or accept AA as a non-binding target for this internal tool?
4. Should the demo chain's now-fully-proven transitions be baked into `seed.ts` permanently, so future checkpoints don't need to re-drive 5+ live transitions to reach their own starting state (CP6, CP7)?
5. Real authentication (replacing the Checkpoint 7 simulated role switcher) — priority for the next checkpoint, or continue with further page/contract depth first?
6. Confirm "professional outputs" (CP8) was an acceptable checkpoint to self-scope, or specify a different area from the remaining Phase-1 hardening basket (security/SAST, performance/load testing, migration, integration, backup/restore, observability) going forward.
7. The pre-existing `drizzle-kit`/`esbuild` dev-dependency advisory (CP8) — accept as dev-only risk or invest in the breaking downgrade.

## 8. Status

**NOT OWNER-ACCEPTED.** This pack, and every checkpoint it indexes, awaits
explicit owner sign-off. No further checkpoint should start until that
review happens, per the pack's own work-in-progress limit ("At most one
unaccepted page slice in implementation").

---

Owner acceptance (to be completed by the owner, not by Claude Code):

- [ ] Reviewed and accepted: Checkpoints 0–8
- Signed:
- Date:
