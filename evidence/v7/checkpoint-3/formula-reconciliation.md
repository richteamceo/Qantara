# Checkpoint 3 Formula/Data Reconciliation

## Golden package/award — reconciles exactly to the pack's own fixture text

`03_PAGE_CONTRACTS/PAGE_04_PROCUREMENT_PACKAGE.md` §Fixture evaluated bids
and `PAGE_05_AWARD_DECISION.md` §Line decisions give literal figures, seeded
verbatim:

| Supplier | Net (GHS) | Rank |
|---|---|---|
| Acme Ready-Mix Ghana | 1,365,960 | 1 (winner) |
| Ghacem Concrete | 1,386,800 | 2 |
| BuildMix | 1,412,400 | 3 |
| PrimeCrete | 1,473,900 | 4 |

Evaluated spread (highest − lowest) = 1,473,900 − 1,365,960 = **GHS
107,940** — matches the page's own computed KPI exactly.

Award line total: 1,104,960 + 87,000 + 174,000 = **GHS 1,365,960**, equal
to `award_decisions.net` seeded independently in Checkpoint 1 — verified
by the page's own footer row, not just asserted here.

Variance to estimate: 1,365,960 − 1,382,400 = **−GHS 16,440**, equal to
`award_decisions.saving` seeded independently in Checkpoint 1.

## Demo chain — live-tested end to end, not just seeded

Starting state (seed baseline): `MR-DEMO-0001` → `PPK-DEMO-0001` (status
`COMPARED`, one real sole-source quotation from SAFE GLOBAL, NR-GH-SP-037,
real BOQ MASTER supplier). No award, no Finance Validation.

1. **Open/Prepare Award Decision** clicked live on `PPK-DEMO-0001`
   (`evidence/v7/checkpoint-3/P04/package-demo-before-award-1440x900.png`
   → `...-after-award-1440x900.png`). Result: `AWD-DEMO-0001-A9F0C1`
   created, supplier = SAFE GLOBAL (the only quotation), net = USD 9,595
   (unchanged — sole source, no competitive adjustment), deviation code
   `SOLE_SOURCE` recorded with a real reason string, package status →
   `AWARDED`. Award line created via the proportional-allocation rule;
   since the source request has exactly one line, it received 100% of the
   award net — verified by reading the created row, not assumed.
2. **Approve & Send to Finance** clicked live on the new award
   (`P05/award-demo-before-finance-1440x900.png` →
   `...-after-finance-1440x900.png`). Applied the real Ghana tax rates
   from the workbook's `⚙ SETTINGS` sheet (VAT 15%, GETFund+NHIL 5%, WHT
   5%) to the USD 9,595 net:
   - gross = 9,595 × (1 + 0.15 + 0.05) = **USD 11,514.00**
   - net payable = 11,514.00 − (9,595 × 0.05) = **USD 11,034.25**
   Route selected `REVIEW` (not `CREDIT`) because the award carries the
   `SOLE_SOURCE` deviation — a real, if simplified, rule, not a random
   default. `FV-DEMO-0001-A9F0C1` created, award status →
   `SENT_TO_FINANCE`.
3. Re-checked Page 01 immediately after
   (`control-room-after-checkpoint3-1440x900.png`): the "Finance
   Validation" lifecycle position — present in the code since Checkpoint 1
   but never actually exercised until now — correctly shows count 1,
   US$11,514, and the "Approved not ordered" KPI correctly shows the real
   USD 9,595 figure instead of the GHS figure it would have shown before
   this checkpoint's currency-tagging fixes (see below).

## Bugs found and fixed during this checkpoint's own verification

Consistent with the pattern established in Checkpoint 1 (lifecycle-spine
double-counting) and the Checkpoint 1 addendum (budget currency), running
the demo chain live surfaced two more real currency-mislabeling bugs,
both fixed before evidence was captured:

1. **`awardedNotOrdered` and the lifecycle spine's Award/Finance
   Validation positions had no currency tracking** — they were
   accumulating real amounts (now genuinely mixed GHS/USD) while always
   *labeling* them with the project's GHS currency. Fixed by adding a
   `currency` column to `award_decisions` and `finance_validations`
   (previously absent — a real modeling gap, not just a display bug) and
   extending the same `mergeCurrency`/`MIXED_CURRENCY` guard used for the
   pipeline column in Checkpoint 2 to these two amounts.
2. **The Exposure Composition donut summed `approvedNotOrdered` into a
   GHS total unconditionally.** Once `approvedNotOrdered` could genuinely
   be USD (as of the demo award), the donut's "Governed exposure total"
   would have silently added a USD figure to GHS figures as if they were
   the same currency (it briefly did, in the first screenshot taken this
   checkpoint — GHS 1,648,747, which is arithmetically GHS + USD added as
   if equal). Fixed by excluding any contributor whose currency doesn't
   match the chart's currency, with a visible disclosure line, the same
   pattern already used for Pipeline risk's exclusion.

Both are documented here rather than silently corrected, per the pack's
own instruction to log rather than silently resolve.
