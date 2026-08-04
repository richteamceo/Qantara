# Checkpoint 1 Addendum — real BOQ budget figures

Follows on from `CHECKPOINT_1_REPORT.md` (still `NOT OWNER-ACCEPTED`). This
addendum records one focused change made at owner request: replace the
placeholder control-account budget with a real figure sourced from
`Cost Control System.xlsm`, and its consequences.

## What was done

1. Loaded the workbook (`openpyxl`, all 103 sheets) and searched it for
   every reference number and amount in the golden transaction fixture
   (`MR-SWTBK-2026-0035`, `PPK-2026-011`, `AWD-2026-008`, `FV-2026-018`,
   `PO-2026-041`, `GRN-2026-0041`, `PV-2026-0076`, and their GHS amounts).
   **Zero matches anywhere in the workbook.** The golden fixture is a
   synthetic illustrative transaction layered onto a real project, not a
   literal extract of it — worth knowing before treating it as ground
   truth for anything beyond exercising the lifecycle mechanics it was
   designed to test.
2. Found the real `📐 BOQ MASTER` sheet: 102 BOQ line items, USD-
   denominated throughout (`⚙ SETTINGS`: `Currency = USD — US Dollar`,
   `Contract Value (USD) = 3,978,702.90`). No GHS figure exists anywhere
   in the workbook.
3. Summed the 49 rows tagged `TRADE NAME = "Structural Concrete"` (item
   codes `CONC-SUB-BLIND-008` … `CONC-RF-SLABBEAM-056`) — the closest real
   trade grouping to the seeded "concrete" control account:
   **USD 1,204,144.03** across **8,364.904 m³**. This is the real,
   traceable figure now seeded as the control account's `currentBudget`.
4. Added `currency` and `budgetSource` columns to `control_accounts`
   (migration `drizzle/0000_daffy_purple_man.sql` — squashed into a fresh
   `0000` since no real data existed yet to migrate forward).
5. Renamed the control account from the placeholder "Ready-Mix Concrete
   Supply" to "Structural Concrete (BOQ trade rollup)" /
   `TRADE-CONC-STRUCT`, matching what it actually now represents.
6. Updated `src/server/control-room.ts` so budget-vs-commitment `Variance`
   is computed **only** when the account's budget currency matches the
   project's reporting currency — otherwise it renders as an explicit
   "Incomplete — cross-currency" state with the reason inline, never a
   silently-wrong subtraction. Added a new readiness check ("Budget
   currency matches transaction currency") so this gap is a named,
   visible fact rather than something only discoverable by reading code.

## Why not just convert USD → GHS and move on

The pack's own `MULTI_CURRENCY_CONTRACT_AND_REPORTING_STANDARD.md` is
explicit and detailed about this exact situation (USD contract, GHS-and-
USD suppliers) and states the conversion rate must be a real, dated,
sourced rate (default: Bank of Ghana daily reference, or an organisation-
configured alternative) — "never hardcoded, never silently defaulted."
This build has no live rate feed. Picking a plausible-looking rate myself
would produce a Variance figure that *looks* more finished while being
exactly the kind of invented number the pack repeatedly instructs against
("no silent dilution," "never fabricate KPIs"). Showing the gap honestly —
budget in real USD, commitments in real GHS, no fake conversion — is more
useful than a confident wrong number.

## Effect on the page

- KPI "Current approved budget": now **US$1,204,144** (was GHS 1,382,400
  placeholder), with its basis text explaining it's native-currency and
  not yet reconciled to the project's GHS reporting currency.
- Control sheet "Current budget" column: shows the USD figure with an
  inline "native USD, not GHS" note; "Variance" column shows "Incomplete —
  cross-currency" instead of a number.
- Readiness: 6 named checks now (was 5), Control Confidence **50%** (was
  60%) — the new check fails honestly rather than being omitted.
- Re-verified: `tsc --noEmit`, `eslint`, `next build` all clean; fresh
  Playwright pass, zero console errors; screenshots and hashes updated in
  `evidence/v7/checkpoint-1/P01/`.

## Owner decisions still open

1. Should the request/award/PO/PV chain itself eventually be recorded in
   its real transaction currency (mixed GHS/USD per supplier, per the
   multi-currency standard) instead of assuming GHS throughout? That's a
   real schema change (`Money(amount, currency)` on every transactional
   table), not done here.
2. Is a per-trade BOQ rollup (`Structural Concrete`, USD 1,204,144 across
   49 rows) the right grain for a control account, or should control
   accounts map to BOQ section codes / cost centres some other way? I
   picked the closest existing real grouping in the sheet; it wasn't
   independently confirmed against how the business actually wants control
   accounts scoped.
3. Where should the GHS/USD exchange-rate source actually come from for
   this build (Bank of Ghana feed vs. a manually entered organisation
   rate) — needed before Variance can be computed at all for this account.

Status unchanged: `NOT OWNER-ACCEPTED`.
