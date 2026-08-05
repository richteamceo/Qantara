# Checkpoint 6 Formula/Data Reconciliation

## Golden PV — reconciles exactly to PAGE_09's own worked fixture

`03_PAGE_CONTRACTS/PAGE_09_PAYMENT_VOUCHER_AND_SETTLEMENT.md` §KPI strip
gives literal figures. Seeded (since Checkpoint 1) and displayed, matching
exactly:

| Line | Amount (GHS) |
|---|---|
| Accepted net | 174,952 |
| VAT+NHIL+GETFund 20% combined | +34,990 |
| Gross payable | 209,942 |
| Indicative WHT 2% of net | −3,499 |
| **Net payable** | **206,443** |
| Concrete order balance | 202 m3 |

All six figures reconcile exactly (174,952 + 34,990 = 209,942;
209,942 − 3,499 = 206,443), matching acceptance test #1 ("Fixture bridge
produces GHS 206,443"). This checkpoint built the P09 page and readiness
sidecar around this already-seeded golden voucher and added the missing
`currency` column (see bug below) — the underlying figures were not
changed.

## Demo chain — live-tested end to end, first time two real currencies coexist across the settle stage

Starting state (fresh reseed — the demo chain is not baked forward between
checkpoints; each session re-drives it live from `FV-DEMO-0001` PENDING):
re-ran Validate & Lock CREDIT -> Issue PO & Open Fulfilment -> Post
Accepted Receipt (500/500 m2, as in Checkpoint 5) to reach
`GRN-DEMO-0001-L1` POSTED.

**Live transition 1:** clicked the new "Certify & Open Payment Voucher"
bridge button on `GRN-DEMO-0001-L1`
(`P09/grn-demo-posted-with-pv-bridge-1440x900.png`). Server action
computed, from the PO line's own real rate/tax and the fulfilment's
accepted quantity:

```
acceptedNet    = 500 x 19.19            = US$9,595.00
taxAdditions   = 1,919.00 x (500/500)   = US$1,919.00   (line's own 20% tax, prorated to accepted fraction)
grossPayable   = 9,595.00 + 1,919.00    = US$11,514.00
wht            = 9,595.00 x 0.02        = US$191.90
netPayable     = 11,514.00 - 191.90     = US$11,322.10
```

Created `PV-DEMO-0001` (DRAFT) with these exact figures
(`P09/pv-demo-draft-1440x900.png`) — the US$11,322.10 net payable matches
the number independently derived and disclosed back in
`CHECKPOINT_4_REPORT.md`'s formula reconciliation, confirming the
formula used here is consistent with what was already established when
the demo Finance Validation was first built.

**Live transition 2:** clicked "Approve Voucher & Release Payment"
(collapsing the contract's multi-actor approval/payment chain into one
server-verified action, same disclosed simplification pattern as every
prior checkpoint). Result: `PV-DEMO-0001` -> PAID
(`P09/pv-demo-paid-1440x900.png`), immutable thereafter (re-clicking would
return `already_paid`, not double-pay — acceptance test #4).

## A real bug found and fixed this checkpoint (proactive, before it could bite)

`payment_vouchers` had no `currency` column since Checkpoint 1 — the
exact bug class that hit `award_decisions`, `finance_validations`, and
`purchase_orders` in Checkpoints 3-4, flagged explicitly in
`CHECKPOINT_4_REPORT.md` §18 as "next in line" once Checkpoint 5/6 touched
this table. Added the column and threaded a real `pvCurrency` through
`control-room.ts`'s query, per-account bucket, and lifecycle-spine
aggregation *before* running any live transition this checkpoint, rather
than discovering it live as in Checkpoints 3 and 4.

This paid off immediately: once the demo chain's real USD `PV-DEMO-0001`
existed alongside the golden GHS `PV-2026-0076`, the "Certified actual"
and "Cash paid" KPIs on Page 01 — for the first time ever exercised with
two different real currencies at the settle stage simultaneously —
correctly flip to `Incomplete` ("Certified-actual amounts are in
different currencies — not summed into one misleading figure") instead of
silently blending GHS 209,942 and USD 11,514 into one wrong number, and
the per-control-account table correctly tags each row's own currency
(`GHS 209,942` for Structural Concrete, `US$11,514` for Block & Masonry)
instead of mislabeling the USD row as GHS
(`control-room-after-checkpoint6-1440x900.png`). Verified by comparing
against the identical pre-fix rendering logic used for
`openCommitments`/`approvedNotOrdered`, which already handled this
correctly — `certifiedActual`/`cashPaid` were the last two KPIs on this
page still hardcoded to `project.currency`.
