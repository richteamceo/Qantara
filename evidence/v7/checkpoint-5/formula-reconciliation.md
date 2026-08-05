# Checkpoint 5 Formula/Data Reconciliation

## Golden PO lines — inferred breakdown reconciles exactly to PAGE_07's own fixture

`03_PAGE_CONTRACTS/PAGE_07_PURCHASE_ORDER.md` gives, verbatim, only the
concrete line's gross value (GHS 1,325,952) and the PO's overall gross
(GHS 1,639,152, already seeded since Checkpoint 1). It does not break out
the pump/testing lines individually. This checkpoint infers that break-out
using a uniform 20% tax rate (VAT+NHIL+GETFund combined, matching the
Checkpoint 4-established 20% additions on net award), applied per award
line:

| Line | Net (GHS) | Tax @ 20% | Gross (GHS) |
|---|---|---|---|
| Premix RC concrete C30/35 — 240 m3 @ 4,604 | 1,104,960 | 220,992 | **1,325,952** ✓ matches fixture |
| Concrete pump — 2 shifts @ 43,500 | 87,000 | 17,400 | 104,400 |
| Concrete testing & QA — 1 lot | 174,000 | 34,800 | 208,800 |
| **Total** | **1,365,960** | **273,192** | **1,639,152** |

The concrete line reconciles exactly against the fixture's own stated
figure, and the three-line total (1,639,152) matches the PO's overall
gross seeded since Checkpoint 1 — confirming the inferred per-line
breakdown is consistent with the pack's own numbers rather than invented
independently of it. Disclosed in `finance-actions.ts` and the seed
script as an inference, not a literal fixture value, for the two
non-concrete lines.

## Golden GRN — reconciles exactly to PAGE_08's own worked fixture

`03_PAGE_CONTRACTS/PAGE_08_FULFILMENT_GRN_SERVICE_ENTRY.md` states GRN's
quantities (240 ordered / 40 delivered / 38 accepted / 2 rejected / 202
outstanding m3) and "current certifiable net GHS 174,952". Implemented
formula `certifiableValue = acceptedQty x line.rate`:

```
38 x GHS 4,604/m3 = GHS 174,952
```

Matches the fixture exactly — verified live in the browser
(`P08/grn-golden-posted-1440x900.png`), not just in source.

## Demo chain — live-tested end to end, second currency exercised

Starting state (seed baseline, carried from Checkpoint 4):
`FV-DEMO-0001` already `VALIDATED`/CREDIT-locked with `PO-DEMO-0001`
created (USD 11,514 gross / USD 9,595 net, 500 m2 blockwork line at
USD 19.19/m2). Re-clicking "Validate & Lock CREDIT" this run correctly
hit the `already_locked` idempotency guard rather than creating a
duplicate PO.

**Live transition 1:** clicked "Issue PO & Open Fulfilment" on
`PO-DEMO-0001` (`P07/po-demo-before-fulfilment-1440x900.png`). Server
action found the sole PO line with no existing fulfilment record, created
`GRN-DEMO-0001-L1` (`DRAFT`, all-zero quantities, outstanding = full 500
m2), navigated to it (`P08/grn-demo-draft-1440x900.png`).

**Live transition 2:** submitted `PostReceiptForm` with defaulted
accepted=500, rejected=0 (`P08/grn-demo-posted-1440x900.png`). Result:
`delivered = 500`, `outstanding = 0`, `certifiableValue = 500 x 19.19 =
US$9,595.00` — matches the PO line's net exactly, as expected for a
100%-accepted receipt with no rejection.

Re-checked immediately after (`P07/po-demo-after-fulfilment-*.png`,
`control-room-after-checkpoint5-1440x900.png`):
- PO-DEMO-0001's "Fulfilled/certified balance" KPI moved from 0% to 100%
  (500/500 m2); header swapped the "Issue PO & Open Fulfilment" button for
  a static "All lines fulfilled or in fulfilment" badge (no more
  unfulfilled lines to open — verified against `nextUnfulfilledLine`
  correctly returning `null`).
- Top-of-page lifecycle spine on Page 01 already correctly classified the
  demo request under bucket 7 ("Fulfilment", count 1) rather than bucket 6
  ("Order & commit") even before any fix this checkpoint, since that
  classification is driven directly by `fulfilmentId` presence
  (`control-room.ts` lines ~264-271), which was already correct.
- The per-control-account "Active gate/next control" column (a coarser,
  separate label used only in the Commercial Lifecycle Control Sheet
  table) was **not** updated for the new intermediate "fulfilled, not yet
  certified" state and still read "Order & Commit" for Block & Masonry —
  see bug below.

## A real bug found and fixed this checkpoint

`control-room.ts`'s per-account `activeGate` label (shown in the
Commercial Lifecycle Control Sheet's "Active gate/next control" column)
was computed as `certifiedActual > 0 ? "Fulfilment / PV & Settle" :
openCommitment > 0 ? "Order & Commit" : ...` — a two-state ternary written
in Checkpoint 1 before Fulfilment (Checkpoint 5) or Payment Voucher
(Checkpoint 6+) existed as real entities. Once the demo chain's fulfilment
was live-posted this checkpoint, `certifiedActual` correctly stayed 0 (no
Payment Voucher exists yet — that's Checkpoint 6), so the ternary fell
through to "Order & Commit" even though the PO's balance was already
100% fulfilled. This is inconsistent with the same page's own
higher-fidelity lifecycle-spine bucket, which already classified the same
transaction as "Fulfilment" one section above.

Fixed by tracking a `hasFulfilment` flag per control account (set when any
row carries a `fulfilmentId`) and using it alongside `certifiedActual` in
the ternary, so a control account with an open (or posted) fulfilment
record but no Payment Voucher yet now reads "Fulfilment / PV & Settle" —
consistent with the lifecycle spine. Caught by comparing the two
control-room sections against each other after the live demo transition,
not by a pre-existing test; re-verified against both the golden
(concrete, already fulfilled since before Checkpoint 5) and demo
(newly fulfilled live) rows with no regression to either
(`control-room-after-checkpoint5-1440x900.png`).
