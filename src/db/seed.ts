import "dotenv/config";
import { db } from "./index";
import {
  organisations,
  projects,
  baselines,
  controlAccounts,
  requests,
  requestLines,
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

  // Second real, BOQ-sourced control account — added in Checkpoint 2 so the
  // demo request (below) has somewhere real to roll up to, and so Page 01's
  // control sheet has more than one row.
  const [masonryAccount] = await db
    .insert(controlAccounts)
    .values({
      projectId: project.id,
      code: "TRADE-MASON",
      name: "Block & Masonry (BOQ trade rollup)",
      currentBudget: "304375.96",
      currency: "USD",
      budgetSource:
        "Cost Control System.xlsm > \u{1F4D0} BOQ MASTER, sum of BUDGET AMOUNT (USD) " +
        "where TRADE NAME = 'Block & Masonry' (4 rows, MASON-SUB-BLK150-095, MASON-SUB-BLK200-096, " +
        "MASON-GF-BLK100-097, MASON-GF-BLK150-098). Extracted 2026-08-04.",
    })
    .returning();

  const [request] = await db
    .insert(requests)
    .values({
      projectId: project.id,
      controlAccountId: controlAccount.id,
      reference: "MR-SWTBK-2026-0035",
      controlledEstimate: "1382400.00",
      currency: "GHS",
      status: "APPROVED",
      requestedBy: "Site QS Team",
      workArea: "Substructure — Raft Foundation",
      needByDate: new Date("2026-08-05T00:00:00Z"),
      priority: "STANDARD",
      createdAt: new Date("2026-07-20T09:00:00Z"),
    })
    .returning();

  // Line breakdown per 03_PAGE_CONTRACTS/PAGE_03_REQUEST_DOSSIER.md §Lines
  // and allocations, for the fixture — pack-sourced amounts, not invented.
  // BOQ verification against the real workbook was done independently for
  // each line (see boqSourceNote per row); the results differ per line and
  // are reported as found, not smoothed into a consistent story.
  await db.insert(requestLines).values([
    {
      requestId: request.id,
      lineNo: 1,
      description: "Premix RC concrete C30/35 vibrated — Raft Foundation (General)",
      costType: "MAT",
      authorityType: "BOQ",
      authorityReference: "CONC-SUB-RAFT-014",
      requestedQty: "240.000",
      requestedUnit: "m3",
      exposureAmount: "1123200.00",
      exposureCurrency: "GHS",
      boqAvailableQty: "2074.625",
      boqSourceNote:
        "Verified: BOQ MASTER row 14, item CONC-SUB-RAFT-014 — 2074.625 m3 available (0 issued), " +
        "real rate USD 142.75/m3. The fixture's own implied rate (GHS 4,680.00/m3) does not match " +
        "the workbook's real rate/currency for this code — a disclosed inconsistency in the golden " +
        "fixture itself, not resolved here.",
    },
    {
      requestId: request.id,
      lineNo: 2,
      description: "Concrete pump — 2 shifts",
      costType: "PLT",
      authorityType: "BOQ",
      authorityReference: "PLANT-SUB-PUMP-031",
      requestedQty: "2.000",
      requestedUnit: "shift",
      exposureAmount: "85200.00",
      exposureCurrency: "GHS",
      boqAvailableQty: null,
      boqSourceNote:
        "NOT FOUND: searched all 103 sheets of Cost Control System.xlsm for 'PLANT-SUB-PUMP-031' — " +
        "zero matches. This BOQ code cited by the golden fixture does not exist in the source " +
        "workbook. Treated honestly as missing BOQ authority (see readiness/commercial-controls), " +
        "even though the fixture's own request already carries status APPROVED — a real contradiction " +
        "in the source fixture, logged rather than silently resolved.",
    },
    {
      requestId: request.id,
      lineNo: 3,
      description: "Concrete testing & quality assurance",
      costType: "QLT",
      authorityType: "EXCEPTION",
      authorityReference: "EXC-008",
      requestedQty: "1.000",
      requestedUnit: "lot",
      exposureAmount: "174000.00",
      exposureCurrency: "GHS",
      boqAvailableQty: null,
      boqSourceNote:
        "EXC-008 is a recognized exception code: present in BOQ MASTER (row 177, code-integrity VALID) " +
        "and named in EXCEPTION_AND_DECISION_CONTROL_STANDARD.md's seeded exception set (EXC-003/006/008). " +
        "A real, valid exception authority — not a BOQ quantity lookup, so no available-quantity figure applies.",
    },
  ]);

  // Demo request — NOT part of the golden-transaction-fixture.json
  // authority. Added in Checkpoint 2 because the golden request is already
  // APPROVED with a package/award/PO/PV downstream, so it can't exercise
  // "Approve & Prepare Package" or most register/dossier states. Flagged
  // via isDemoData/demoNote everywhere it's read, not silently mixed in.
  const [demoRequest] = await db
    .insert(requests)
    .values({
      projectId: project.id,
      controlAccountId: masonryAccount.id,
      reference: "MR-DEMO-0001",
      controlledEstimate: "9595.00",
      currency: "USD",
      status: "SUBMITTED",
      requestedBy: "Site QS Team",
      workArea: "Ground Floor — Block & Masonry",
      needByDate: new Date("2026-08-20T00:00:00Z"),
      priority: "URGENT",
      createdAt: new Date("2026-08-03T14:00:00Z"),
      isDemoData: true,
      demoNote:
        "Added in Checkpoint 2 to exercise the 'Approve & Prepare Package' transition and " +
        "register/dossier states the (already fully-advanced) golden transaction cannot. Not part " +
        "of golden-transaction-fixture.json.",
    })
    .returning();

  await db.insert(requestLines).values({
    requestId: demoRequest.id,
    lineNo: 1,
    description: "150mm hollow concrete block — GF walls (general)",
    costType: "MAT",
    authorityType: "BOQ",
    authorityReference: "MASON-GF-BLK150-098",
    requestedQty: "500.000",
    requestedUnit: "m2",
    exposureAmount: "9595.00",
    exposureCurrency: "USD",
    boqAvailableQty: "15065.644",
    boqSourceNote:
      "Verified: BOQ MASTER row 98, item MASON-GF-BLK150-098 — 15065.644 m2 available (0 issued), " +
      "real rate USD 19.19/m2. This line's exposure (500 x 19.19 = USD 9,595.00) was computed at the " +
      "workbook's own real rate — unlike the golden fixture's concrete line, this one is internally " +
      "consistent with its cited BOQ source.",
  });

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
