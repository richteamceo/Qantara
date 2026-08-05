# Checkpoint 4 Formula/Data Reconciliation

## Golden FV — reconciles exactly to PAGE_06's own worked fixture

`03_PAGE_CONTRACTS/PAGE_06_FINANCE_VALIDATION.md` §Finance computation
panel gives literal figures. Seeded and displayed, matching exactly:

| Line | Amount (GHS) |
|---|---|
| Validated net award | 1,365,960 |
| VAT 15% | +204,894 |
| NHIL 2.5% | +34,149 |
| GETFund 2.5% | +34,149 |
| **Gross order value** | **1,639,152** |
| Indicative WHT 2% of net | −27,319 |
| **Indicative total net payable** | **1,611,833** |

All six figures were already present in Checkpoint 1's seed (copied
verbatim from `golden-transaction-fixture.json`); this checkpoint added
the individual VAT/NHIL/GETFund/WHT line amounts (previously only the
gross/net-payable totals existed) by reading them off this page's own
fixture text, and verified they sum correctly: 204,894 + 34,149 + 34,149 +
1,365,960 = 1,639,152 ✓.

## A real correction: WHT rate

Checkpoint 3's `approveSendToFinance` action approximated WHT at **5%**,
taken from the workbook's `⚙ SETTINGS` sheet ("WHT Rate: 0.05"). Reading
PAGE_06's own worked fixture this checkpoint shows the real figure is
**2%** of net at the payable event (1,365,960 × 0.02 = 27,320 ≈ the
fixture's 27,319, off by GHS 1 from rounding — not 68,298, which is what
5% would give). This is a genuine discrepancy between the workbook's
general WHT rate and this specific page's binding worked example; per the
pack's own authority order (page contracts rank above the retained
workbook), the 2% figure governs. Corrected in the demo chain's seeded
Finance Validation and in `finance-actions.ts`/`procurement-actions.ts`
for any future use — not left as the 5% approximation.

## Demo chain — live-tested end to end

Starting state (seed baseline, this checkpoint): `AWD-DEMO-0001` (sole
source, `SENT_TO_FINANCE`) → `FV-DEMO-0001` (`PENDING`, route pre-set to
CREDIT as a non-binding recommendation, corrected 2%-WHT formula: gross
USD 11,514.00, net payable USD 11,322.10 — recomputed from
`9595 × 1.20 = 11,514.00`, `11,514.00 − 9595×0.02(=191.90) = 11,322.10`).

**Live transition:** clicked "Validate & Lock CREDIT" on `FV-DEMO-0001`
(`P06/fv-demo-before-lock-1440x900.png` → `...-after-lock-1440x900.png`).
Server-side re-validated eligibility, set status → `VALIDATED`, created
**`PO-DEMO-0001`** (net USD 9,595, gross USD 11,514, currency USD) —
matching PAGE_06 acceptance test #9's shape exactly (CREDIT route
produces a real PO) on the demo chain instead of the golden one.

Re-checked immediately after (`control-room-after-checkpoint4-1440x900.png`):
- Page 01's "Order & commit" lifecycle position now shows the demo's real
  PO (count 1, US$11,514) while the golden request correctly stays
  bucketed at "PV & settle" (already further along) — no double-counting.
- Block & Masonry's budget headroom recalculated live: US$304,375.96 −
  US$11,514.00 = **US$292,861.96** (displayed US$292,862), reusing Page
  01's own variance computation — verified independently, not just
  displayed.
- P05 (`AWD-DEMO-0001`)'s "Open {FV}" link now navigates to the real P06
  page instead of the Checkpoint 3 "(view — soon)" placeholder.

## A second real bug found and fixed this checkpoint

Adding a genuine second Purchase Order (USD, demo) alongside the golden
one (GHS) reproduced the exact bug class already fixed twice before
(Checkpoints 3 and 4's earlier work today): `purchaseOrders` had no
`currency` column, so `openCommitment` and the lifecycle spine's "Order &
commit" position were about to mislabel the new USD PO as GHS. Fixed
*before* exercising the live transition this time (added `currency` to
`purchaseOrders`, extended the `mergeCurrency` guard to `openCommitment`,
made the "Open commitments" KPI and the Exposure Composition donut
currency-aware) — verified live afterward rather than discovered by
accident. One remaining donut-specific gap was caught during that
verification: the donut's "excluded" disclosure note only fired for
metrics that were `computed`-but-wrong-currency, not for metrics that were
already `incomplete` (mixed currency) — so once `openCommitments` itself
became `incomplete`, the donut silently dropped it with no explanation.
Fixed by disclosing both cases uniformly.
