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
 * 06_MACHINE_READABLE/golden-transaction-fixture.json — no invented
 * additional requests/accounts. Two disclosed placeholders (not present
 * in the fixture, not sourced from the Switchback workbook this
 * checkpoint):
 *  - control account budget is set equal to the single seeded request's
 *    controlled estimate (no independent BOQ budget figure was extracted
 *    from the workbook yet);
 *  - baseline approval date and reporting cut-off dates are placeholders.
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
      code: "CA-CONCRETE",
      name: "Ready-Mix Concrete Supply",
      currentBudget: "1382400.00",
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
