# Checkpoint 2 Formula/Data Reconciliation

## Line-to-request reconciliation (PAGE_02 acceptance test #4 / PAGE_03 acceptance test #1)

`src/server/requests-register.ts` and `src/server/request-dossier.ts` both
independently sum `request_lines.exposureAmount` and compare it to
`requests.controlledEstimate`, surfacing `reconciliation.ok` in the data and
a visible red banner in the UI if they ever disagree.

| Request | Lines total | Request total | Match |
|---|---|---|---|
| MR-SWTBK-2026-0035 | 1,123,200.00 + 85,200.00 + 174,000.00 = GHS 1,382,400.00 | GHS 1,382,400.00 | ✅ |
| MR-DEMO-0001 | 9,595.00 | USD 9,595.00 | ✅ |

## BOQ authority verification (real, per line)

Verified independently against `Cost Control System.xlsm` at seed time
(method: `openpyxl`, full-workbook search, documented per-line in
`boqSourceNote`):

| Request | Line | Authority | Found in BOQ MASTER? |
|---|---|---|---|
| MR-SWTBK-2026-0035 | 1 (concrete) | BOQ `CONC-SUB-RAFT-014` | Yes — row 14, 2074.625 m³ available |
| MR-SWTBK-2026-0035 | 2 (pump) | BOQ `PLANT-SUB-PUMP-031` | **No** — zero matches in all 103 sheets |
| MR-SWTBK-2026-0035 | 3 (testing) | Exception `EXC-008` | Yes — recognized exception code, row 177 |
| MR-DEMO-0001 | 1 (blockwork) | BOQ `MASON-GF-BLK150-098` | Yes — row 98, 15065.644 m² available |

This produces a real, disclosed contradiction: MR-SWTBK-2026-0035 carries
status `APPROVED` (per the golden fixture) despite one line's BOQ authority
not existing in the source workbook. The dossier does not hide or resolve
this — its readiness score for that request is 40% (2/5 checks pass), and
the "BOQ / exception authority" check fails with the specific line and
code named, exactly reflecting what the underlying data shows.

## Approve & Prepare Package transition — live-tested

Exercised end-to-end via Playwright against MR-DEMO-0001 (see
`evidence/v7/checkpoint-2/P03/dossier-demo-before-transition-1440x900.png`
→ `...-after-transition-1440x900.png`):

- Before: status `SUBMITTED`, no package, button enabled.
- Click → server action `approvePrepareRequestPackage` ran, created
  `PPK-DEMO-0001-<random>`, set request status to `APPROVED`.
- After: status `APPROVED`, package reference shown, button now disabled
  ("Already allocated to a procurement package"), readiness rose from 60%
  to 80% (approval-authority check now passes), Page 01's control sheet
  and Requests Register both re-rendered with the new state — checked
  directly (`08-control-room-after.png`, `09-register-after.png`), zero
  console errors.

The **blocked** branch (missing BOQ authority prevents the transition) is
not reachable through the current UI, because both seeded requests are
already past the point where it would apply (the golden request already
has a package; the demo request's own line has valid authority). Verified
instead with a standalone script: inserted a temporary request with a
deliberately-nonexistent BOQ reference, called
`approvePrepareRequestPackage` directly, confirmed it returned
`{status: "blocked", blockedLines: [...]}` and created no package, then
deleted the temporary rows. Script and output are not committed (ad hoc,
not part of the seeded fixture) — reproducible from
`src/server/actions/request-actions.ts`'s own logic.

## Currency-guard extension (builds on CHECKPOINT_1_ADDENDUM.md)

Adding MR-DEMO-0001 (genuinely USD, sourced from its own real BOQ rate)
alongside the GHS golden transaction meant Page 01's lifecycle spine and
control-sheet pipeline column could have silently mislabeled a real USD
figure as GHS. Fixed by making pipeline amounts currency-tagged per
account/position (`MIXED_CURRENCY` sentinel when a position would combine
different currencies) rather than assuming project currency everywhere.
Net effect, visible on Page 01 after this checkpoint:

- Structural Concrete account: budget USD, commitments GHS → Variance
  still correctly "Incomplete — cross-currency" (unchanged from Checkpoint
  1, now via a currency-set check rather than a project-currency check).
- Block & Masonry account: budget USD, pipeline USD (nothing else nonzero)
  → Variance **computes correctly**: USD 294,780.96 headroom. This is the
  first control account where the currency guard's "computed" branch is
  actually exercised, not just its "incomplete" branch.
