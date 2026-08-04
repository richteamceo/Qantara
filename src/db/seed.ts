import "dotenv/config";
import { db } from "./index";
import {
  organisations,
  projects,
  baselines,
  controlAccounts,
  requests,
  procurementPackages,
  awardDecisions,
  financeValidations,
  purchaseOrders,
  fulfilmentEntries,
  paymentVouchers,
} from "./schema";

/**
 * Seeds exactly the golden transaction fixture from
 * 06_MACHINE_READABLE/golden-transaction-fixture.json (request through
 * payment voucher) — no invented amounts there.
 *
 * The control account's budget is now sourced from the real BOQ MASTER
 * sheet of "Cost Control System.xlsm": all 49 rows with
 * TRADE NAME = "Structural Concrete" (item codes CONC-SUB-BLIND-008
 * through CONC-RF-SLABBEAM-056), summing BUDGET AMOUNT (USD).
 * Total re-derived directly from the workbook: USD 1,204,144.03 across
 * 8,364.904 m3. That sheet is entirely USD-denominated (see
 * ⚙ SETTINGS: "Currency: USD — US Dollar", Contract Value USD
 * 3,978,702.90) — there is no GHS figure in it, and no row/reference in
 * the workbook matches the golden fixture's 240 m3 / GHS 1,382,400
 * request (searched all 103 sheets for every fixture reference and
 * amount — zero hits). The fixture is a synthetic illustrative
 * transaction layered onto a real project, not a literal extract of it.
 *
 * Rather than invent an exchange rate to force a single GHS number (the
 * pack's own MULTI_CURRENCY_CONTRACT_AND_REPORTING_STANDARD.md is
 * explicit that USD/GHS conversion requires a real, dated rate — "never
 * hardcoded, never silently defaulted"), the account's budget is stored
 * in its real native currency (USD) and the aggregation layer keeps it
 * separate from the GHS-denominated commitment/certified figures rather
 * than silently combining them. See CHECKPOINT_1_ADDENDUM.md.
 *
 * Remaining disclosed placeholder: baseline approval date and reporting
 * cut-off dates (not given anywhere in the fixture or the workbook).
 */
async function seed() {
  const [org] = await db
    .insert(organisations)
    .values({ name: "Nextregra GH Ltd", currency: "GHS" })
    .returning();

  const [project] = await db
    .insert(projects)
    .values({
      organisationId: org.id,
      reference: "SWTBK",
      name: "Switchback Hotel",
      currency: "GHS",
      reportingPeriod: "2026-08",
    })
    .returning();

  const [baseline] = await db
    .insert(baselines)
    .values({
      projectId: project.id,
      version: "V04",
      approvedAt: new Date("2026-07-15T00:00:00Z"),
      currency: "GHS",
      status: "APPROVED",
    })
    .returning();

  const [controlAccount] = await db
    .insert(controlAccounts)
    .values({
      projectId: project.id,
      code: "TRADE-CONC-STRUCT",
      name: "Structural Concrete (BOQ trade rollup)",
      currentBudget: "1204144.03",
      currency: "USD",
      budgetSource:
        "Cost Control System.xlsm > \u{1F4D0} BOQ MASTER, sum of BUDGET AMOUNT (USD) " +
        "where TRADE NAME = 'Structural Concrete' (49 rows, CONC-SUB-BLIND-008..CONC-RF-SLABBEAM-056, " +
        "8364.904 m3 total). Extracted 2026-08-04.",
    })
    .returning();

  const [request] = await db
    .insert(requests)
    .values({
      projectId: project.id,
      controlAccountId: controlAccount.id,
      reference: "MR-SWTBK-2026-0035",
      controlledEstimate: "1382400.00",
      quantity: "240.000",
      unit: "m3",
      status: "APPROVED",
    })
    .returning();

  const [pkg] = await db
    .insert(procurementPackages)
    .values({
      requestId: request.id,
      reference: "PPK-2026-011",
      estimate: "1382400.00",
      invitedSuppliers: 4,
      status: "AWARDED",
    })
    .returning();

  const [award] = await db
    .insert(awardDecisions)
    .values({
      packageId: pkg.id,
      reference: "AWD-2026-008",
      supplier: "Acme Ready-Mix Ghana",
      net: "1365960.00",
      saving: "16440.00",
      status: "SENT_TO_FINANCE",
    })
    .returning();

  const [fv] = await db
    .insert(financeValidations)
    .values({
      awardId: award.id,
      reference: "FV-2026-018",
      route: "CREDIT",
      grossOrderValue: "1639152.00",
      netPayable: "1611833.00",
      status: "VALIDATED",
      validatedAt: new Date("2026-08-01T09:00:00Z"),
    })
    .returning();

  const [po] = await db
    .insert(purchaseOrders)
    .values({
      financeValidationId: fv.id,
      reference: "PO-2026-041",
      net: "1365960.00",
      gross: "1639152.00",
      status: "ISSUED",
      issuedAt: new Date("2026-08-02T10:00:00Z"),
    })
    .returning();

  const [fulfilment] = await db
    .insert(fulfilmentEntries)
    .values({
      purchaseOrderId: po.id,
      reference: "GRN-2026-0041",
      deliveredQty: "40.000",
      acceptedQty: "38.000",
      rejectedQty: "2.000",
      outstandingQty: "202.000",
      unit: "m3",
    })
    .returning();

  await db.insert(paymentVouchers).values({
    fulfilmentId: fulfilment.id,
    reference: "PV-2026-0076",
    acceptedNet: "174952.00",
    taxAdditions: "34990.00",
    wht: "3499.00",
    netPayable: "206443.00",
    status: "PAID",
    paidAt: new Date("2026-08-04T12:00:00Z"),
  });

  console.log("Seeded golden transaction fixture:", {
    organisation: org.name,
    project: project.reference,
    baseline: baseline.version,
    controlAccount: controlAccount.code,
    request: request.reference,
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
