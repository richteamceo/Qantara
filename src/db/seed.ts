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
  quotations,
  awardDecisions,
  awardLines,
  financeValidations,
  purchaseOrders,
  purchaseOrderLines,
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
  const goldenLines = await db
    .insert(requestLines)
    .values([
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
    ])
    .returning();

  // Demo request — NOT part of the golden-transaction-fixture.json
  // authority. Added in Checkpoint 2 because the golden request is already
  // APPROVED with a package/award/PO/PV downstream, so it can't exercise
  // "Approve & Prepare Package" or most register/dossier states. Flagged
  // via isDemoData/demoNote everywhere it's read, not silently mixed in.
  //
  // Status is APPROVED and a package already exists below (Checkpoint 3):
  // the "Approve & Prepare Package" transition was proven live in
  // Checkpoint 2 (see evidence/v7/checkpoint-2/P03/dossier-demo-*), and its
  // result is now baked into the deterministic seed baseline so Checkpoint
  // 3 can build on top of it and exercise its OWN transitions
  // (Open/Prepare Award Decision, Approve & Send to Finance) live instead.
  const [demoRequest] = await db
    .insert(requests)
    .values({
      projectId: project.id,
      controlAccountId: masonryAccount.id,
      reference: "MR-DEMO-0001",
      controlledEstimate: "9595.00",
      currency: "USD",
      status: "APPROVED",
      requestedBy: "Site QS Team",
      workArea: "Ground Floor — Block & Masonry",
      needByDate: new Date("2026-08-20T00:00:00Z"),
      priority: "URGENT",
      createdAt: new Date("2026-08-03T14:00:00Z"),
      isDemoData: true,
      demoNote:
        "Added in Checkpoint 2 to exercise the 'Approve & Prepare Package' transition and " +
        "register/dossier states the (already fully-advanced) golden transaction cannot. Not part " +
        "of golden-transaction-fixture.json. Its package (below) is now part of the seed baseline " +
        "as of Checkpoint 3 — see CHECKPOINT_3_REPORT.md.",
    })
    .returning();

  const [demoLine] = await db
    .insert(requestLines)
    .values({
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
      sourcingMethod: "Competitive RFQ",
    })
    .returning();

  // Bid comparison per 03_PAGE_CONTRACTS/PAGE_04_PROCUREMENT_PACKAGE.md
  // §Normalized comparison fixture — pack-sourced amounts, not invented.
  await db.insert(quotations).values([
    {
      packageId: pkg.id,
      supplier: "Acme Ready-Mix Ghana",
      netAmount: "1365960.00",
      currency: "GHS",
      receivedAt: new Date("2026-07-26T10:00:00Z"),
      validUntil: new Date("2026-08-09T00:00:00Z"),
      isSoleSource: false,
      technicallyCompliant: true,
    },
    {
      packageId: pkg.id,
      supplier: "Ghacem Concrete",
      netAmount: "1386800.00",
      currency: "GHS",
      receivedAt: new Date("2026-07-25T10:00:00Z"),
      validUntil: new Date("2026-08-08T00:00:00Z"),
      isSoleSource: false,
      technicallyCompliant: true,
    },
    {
      packageId: pkg.id,
      supplier: "BuildMix",
      netAmount: "1412400.00",
      currency: "GHS",
      receivedAt: new Date("2026-07-27T10:00:00Z"),
      validUntil: new Date("2026-08-10T00:00:00Z"),
      isSoleSource: false,
      technicallyCompliant: true,
    },
    {
      packageId: pkg.id,
      supplier: "PrimeCrete",
      netAmount: "1473900.00",
      currency: "GHS",
      receivedAt: new Date("2026-07-24T10:00:00Z"),
      validUntil: new Date("2026-08-07T00:00:00Z"),
      isSoleSource: false,
      technicallyCompliant: true,
    },
  ]);

  const [award] = await db
    .insert(awardDecisions)
    .values({
      packageId: pkg.id,
      reference: "AWD-2026-008",
      supplier: "Acme Ready-Mix Ghana",
      net: "1365960.00",
      currency: "GHS",
      saving: "16440.00",
      status: "SENT_TO_FINANCE",
      competitionResult: "Competitive — 4 bids received, Acme rank 1 (lowest compliant)",
      deviationCode: null,
      deviationReason: null,
    })
    .returning();

  // Award line breakdown per PAGE_05_AWARD_DECISION.md §Line decisions
  // fixture — reconciles to award.net (1,104,960 + 87,000 + 174,000 =
  // 1,365,960) and links back to the originating request line for real
  // lineage, including the line whose BOQ authority was never found
  // (goldenLines[1] / PLANT-SUB-PUMP-031) — the award still includes it,
  // same disclosed contradiction as Checkpoint 2, not resolved here.
  const goldenAwardLines = await db
    .insert(awardLines)
    .values([
      {
        awardId: award.id,
        requestLineId: goldenLines[0].id,
        lineNo: 1,
        description: "Premix RC concrete C30/35 vibrated — Raft Foundation (General)",
        quantity: "240.000",
        unit: "m3",
        rate: "4604.00",
        netAmount: "1104960.00",
        currency: "GHS",
      },
      {
        awardId: award.id,
        requestLineId: goldenLines[1].id,
        lineNo: 2,
        description: "Concrete pump — 2 shifts",
        quantity: "2.000",
        unit: "shift",
        rate: "43500.00",
        netAmount: "87000.00",
        currency: "GHS",
      },
      {
        awardId: award.id,
        requestLineId: goldenLines[2].id,
        lineNo: 3,
        description: "Concrete testing & quality assurance",
        quantity: "1.000",
        unit: "lot",
        rate: "174000.00",
        netAmount: "174000.00",
        currency: "GHS",
      },
    ])
    .returning();

  // Demo package — the "Approve & Prepare Package" outcome from
  // Checkpoint 2, now part of the seed baseline (see note on demoRequest
  // above). Status COMPARED (one sole-source quote received, not yet
  // awarded) so Checkpoint 3's own "Open/Prepare Award Decision"
  // transition has something real to exercise live.
  const [demoPkg] = await db
    .insert(procurementPackages)
    .values({
      requestId: demoRequest.id,
      reference: "PPK-DEMO-0001",
      estimate: "9595.00",
      invitedSuppliers: 1,
      status: "COMPARED",
      sourcingMethod: "Sole Source",
    })
    .returning();

  // Supplier is real, not invented: SUPPLIER LIST sheet of Cost Control
  // System.xlsm, row 44, NR-GH-SP-037 "SAFE GLOBAL", dealership "Block
  // Supplier". Quoted at exactly the BOQ-verified rate (500 x 19.19 =
  // 9,595.00) — no markup modelled, disclosed as a simplification.
  await db.insert(quotations).values({
    packageId: demoPkg.id,
    supplier: "SAFE GLOBAL (NR-GH-SP-037)",
    netAmount: "9595.00",
    currency: "USD",
    receivedAt: new Date("2026-08-04T09:00:00Z"),
    validUntil: new Date("2026-08-18T00:00:00Z"),
    isSoleSource: true,
    technicallyCompliant: true,
  });

  // Demo award — the "Open/Prepare Award Decision" outcome proven live in
  // Checkpoint 3, now part of the seed baseline (same pattern as the
  // package above). Reference is deterministic here (PPK-DEMO-0001's live
  // test produced a random-suffixed one; not reproduced).
  const [demoAward] = await db
    .insert(awardDecisions)
    .values({
      packageId: demoPkg.id,
      reference: "AWD-DEMO-0001",
      supplier: "SAFE GLOBAL (NR-GH-SP-037)",
      net: "9595.00",
      currency: "USD",
      saving: "0.00",
      status: "SENT_TO_FINANCE",
      competitionResult: "Sole source — 1 quotation received",
      deviationCode: "SOLE_SOURCE",
      deviationReason:
        "Single quotation received (sole source, Sole Source); no competitive comparison available.",
    })
    .returning();

  await db.insert(awardLines).values({
    awardId: demoAward.id,
    requestLineId: demoLine.id,
    lineNo: 1,
    description: "150mm hollow concrete block — GF walls (general)",
    quantity: "500.000",
    unit: "m2",
    rate: "19.1900",
    netAmount: "9595.00",
    currency: "USD",
  });

  // Demo Finance Validation — the "Approve & Send to Finance" outcome
  // proven live in Checkpoint 3, now part of the seed baseline, but with
  // its tax formula CORRECTED per PAGE_06_FINANCE_VALIDATION.md's own
  // worked fixture (discovered in Checkpoint 4): WHT is 2% of net at the
  // payable event, not the workbook SETTINGS sheet's general 5% WHT rate
  // used as an approximation in Checkpoint 3. VAT 15% / NHIL 2.5% /
  // GETFund 2.5% match the workbook's real published rates and this
  // page's own fixture. Status PENDING (not yet locked) so Checkpoint 4's
  // own "Validate & Lock Route" transition has something real to exercise.
  const demoNet = 9595;
  const demoVat = Math.round(demoNet * 0.15 * 100) / 100;
  const demoNhil = Math.round(demoNet * 0.025 * 100) / 100;
  const demoGetfund = Math.round(demoNet * 0.025 * 100) / 100;
  const demoGross = Math.round((demoNet + demoVat + demoNhil + demoGetfund) * 100) / 100;
  const demoWht = Math.round(demoNet * 0.02 * 100) / 100;
  const demoNetPayable = Math.round((demoGross - demoWht) * 100) / 100;

  await db.insert(financeValidations).values({
    awardId: demoAward.id,
    reference: "FV-DEMO-0001",
    route: "CREDIT",
    grossOrderValue: demoGross.toFixed(2),
    currency: "USD",
    vatAmount: demoVat.toFixed(2),
    nhilAmount: demoNhil.toFixed(2),
    getfundAmount: demoGetfund.toFixed(2),
    whtAmount: demoWht.toFixed(2),
    netPayable: demoNetPayable.toFixed(2),
    status: "PENDING",
  });

  const [fv] = await db
    .insert(financeValidations)
    .values({
      awardId: award.id,
      reference: "FV-2026-018",
      route: "CREDIT",
      grossOrderValue: "1639152.00",
      currency: "GHS",
      // Real formula-bridge breakdown per PAGE_06_FINANCE_VALIDATION.md:
      // VAT 15% = 204,894; NHIL 2.5% = 34,149; GETFund 2.5% = 34,149;
      // sum = 1,639,152 (reconciles exactly to the seeded gross above).
      // WHT indicative 2% of net at payable event = 27,319.
      vatAmount: "204894.00",
      nhilAmount: "34149.00",
      getfundAmount: "34149.00",
      whtAmount: "27319.00",
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
      currency: "GHS",
      status: "ISSUED",
      issuedAt: new Date("2026-08-02T10:00:00Z"),
    })
    .returning();

  // PO line breakdown per PAGE_07_PURCHASE_ORDER.md §Lines fixture —
  // concrete gross GHS 1,325,952 is given verbatim; pump/testing gross are
  // not stated individually but reconcile exactly at the same real 20%
  // combined VAT+NHIL+GETFund rate used throughout (1,325,952 + 104,400 +
  // 208,800 = 1,639,152, matching the PO's own seeded gross total).
  const goldenPoLines = await db
    .insert(purchaseOrderLines)
    .values([
      {
        purchaseOrderId: po.id,
        awardLineId: goldenAwardLines[0].id,
        lineNo: 1,
        description: "Premix RC concrete C30/35 vibrated — Raft Foundation (General)",
        quantity: "240.000",
        unit: "m3",
        rate: "4604.00",
        net: "1104960.00",
        taxAmount: "220992.00",
        gross: "1325952.00",
        currency: "GHS",
      },
      {
        purchaseOrderId: po.id,
        awardLineId: goldenAwardLines[1].id,
        lineNo: 2,
        description: "Concrete pump — 2 shifts",
        quantity: "2.000",
        unit: "shift",
        rate: "43500.00",
        net: "87000.00",
        taxAmount: "17400.00",
        gross: "104400.00",
        currency: "GHS",
      },
      {
        purchaseOrderId: po.id,
        awardLineId: goldenAwardLines[2].id,
        lineNo: 3,
        description: "Concrete testing & quality assurance",
        quantity: "1.000",
        unit: "lot",
        rate: "174000.00",
        net: "174000.00",
        taxAmount: "34800.00",
        gross: "208800.00",
        currency: "GHS",
      },
    ])
    .returning();

  const [fulfilment] = await db
    .insert(fulfilmentEntries)
    .values({
      purchaseOrderId: po.id,
      purchaseOrderLineId: goldenPoLines[0].id,
      reference: "GRN-2026-0041",
      status: "POSTED",
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
