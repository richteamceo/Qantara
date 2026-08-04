# P01 Formula Reconciliation — Checkpoint 1

Source fixture: `06_MACHINE_READABLE/golden-transaction-fixture.json` (single
transaction: MR-SWTBK-2026-0035 → PPK-2026-011 → AWD-2026-008 → FV-2026-018 →
PO-2026-041 → GRN-2026-0041 → PV-2026-0076). Seeded verbatim in
`src/db/seed.ts`, no invented additional records.

Computed by `src/server/control-room.ts::getControlRoomData`, verified by
reading the rendered page (see `screenshot-manifest.json`), not asserted
separately in an automated test yet (see gaps below).

| Metric | Formula (as implemented) | Computation | Result |
|---|---|---|---|
| Current approved budget | sum of control-account `currentBudget` | 1,382,400.00 | GHS 1,382,400 |
| Certified actual | PV `acceptedNet + taxAdditions` | 174,952.00 + 34,990.00 | GHS 209,942 |
| Open commitments | PO `gross` − certified gross | 1,639,152.00 − 209,942.00 | GHS 1,429,210 |
| Approved not ordered | award `net` where no PO exists | (PO already exists for this transaction) | GHS 0 |
| Cash paid | PV `netPayable` where `status = PAID` | 206,443.00 | GHS 206,443 |
| Exposure total (donut) | certified + open commitment + approved-not-ordered | 209,942 + 1,429,210 + 0 | GHS 1,639,152 (= PO gross, correct) |
| Lifecycle spine | transaction counted once, at highest reached position | PV exists → "PV & settle" only | count 1, GHS 206,443 at position 8; all other 7 positions read 0 |

All figures above were independently re-derived from the raw fixture JSON
in this document and matched the rendered page output exactly (see
`control-room-1440x900.png`). Acceptance test #2 from
`03_PAGE_CONTRACTS/PAGE_01_PROJECT_COMMERCIAL_CONTROL_ROOM.md` ("one golden
transaction appears at one lifecycle position only") passes: an earlier
implementation attempt incremented the spine at every stage the transaction
had passed through (Finance Validation, Order, Fulfilment, *and* Settle
simultaneously); this was caught during this checkpoint's own browser
verification and fixed before evidence was captured — see commit history.

## Budget figure — superseded, now BOQ-sourced

An earlier version of this checkpoint used a placeholder budget (the
request's own controlled estimate, GHS 1,382,400) and disclosed a net-vs-
gross basis mismatch as a known gap. That placeholder has been replaced —
see `CHECKPOINT_1_ADDENDUM.md` for the full account: the control account's
`currentBudget` (US$1,204,144.03) is now sourced directly from
`Cost Control System.xlsm` → `📐 BOQ MASTER`, summing the 49 rows where
`TRADE NAME = "Structural Concrete"` (item codes `CONC-SUB-BLIND-008`
through `CONC-RF-SLABBEAM-056`, 8,364.904 m³ total). That is real,
traceable, sourced data — not invented.

## Current reconciliation gap — currency, not basis

The BOQ MASTER sheet is entirely USD-denominated (project contract value
USD 3,978,702.90, per `⚙ SETTINGS`); the golden-fixture request/award/PO/PV
chain is GHS. No row or reference anywhere in the 103-sheet workbook
matches the golden fixture's amounts or reference numbers — it is a
synthetic illustrative transaction, not a literal extract of this
project's real data. The pack's own
`MULTI_CURRENCY_CONTRACT_AND_REPORTING_STANDARD.md` requires a real, dated
exchange rate for any USD↔GHS conversion ("never hardcoded, never silently
defaulted") — no such live rate source exists in this build. Rather than
invent one, `Variance` is computed only when an account's budget currency
matches the project's reporting currency; here it does not, so Variance
renders as an explicit "Incomplete — cross-currency" state, and a new
readiness check ("Budget currency matches transaction currency") reports
this as a failing, named check — dropping Control Confidence from 60% to
50%, which is the correct direction for a newly-surfaced real gap.
