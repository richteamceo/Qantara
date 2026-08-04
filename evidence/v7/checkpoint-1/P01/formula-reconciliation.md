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

## Known reconciliation gap — not resolved this checkpoint

`Current approved budget` (GHS 1,382,400) is the *net* controlled estimate
from the request. `Open commitments` / `Certified actual` are computed on a
*gross* (tax-inclusive) basis, because the only downstream figures the
fixture provides are gross. The resulting `Variance` figure
(−GHS 256,752 on the account row) therefore mixes bases and is **not** a
reliable cost-overrun signal — it is disclosed as a known gap in the UI
(amber note under the control sheet) and here, rather than presented as a
computed fact. Fixing this requires either a gross budget figure from the
workbook or a documented tax-normalization rule, neither of which was
sourced this checkpoint.
