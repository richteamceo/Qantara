import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * Checkpoint-1 domain slice.
 *
 * This is a deliberate subset of the full canonical domain model in
 * 04_ENGINEERING_CONTRACTS/CANONICAL_DOMAIN_MODEL_V7_DELTA.md — enough to
 * honestly compute Pages 01-05 from real, queryable records. `quotations`
 * (Checkpoint 3) is a flattened single-version snapshot, not the full
 * Supplier/Invitation/QuotationVersion/QuotationLine/NormalizationAdjustment
 * model. Deferred entities (full Supplier master data, ComparisonVersion,
 * Exception*, Workflow*, Evidence*, Advance*, tax component breakdown,
 * multi-version PO amendments) are listed as gaps in each checkpoint's
 * evidence report, not silently implied here.
 */

export const financeRouteEnum = pgEnum("finance_route", [
  "CREDIT",
  "CASH",
  "ADVANCE",
  "URGENT",
  "DIRECT",
  "REVIEW",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
]);

export const packageStatusEnum = pgEnum("package_status", [
  "OPEN",
  "COMPARED",
  "AWARDED",
]);

export const awardStatusEnum = pgEnum("award_status", [
  "DRAFT",
  "SENT_TO_FINANCE",
]);

export const financeValidationStatusEnum = pgEnum("finance_validation_status", [
  "PENDING",
  "VALIDATED",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "ISSUED",
  "AMENDED",
  "CLOSED",
]);

export const paymentVoucherStatusEnum = pgEnum("payment_voucher_status", [
  "DRAFT",
  "APPROVED",
  "PAID",
]);

export const requestLineAuthorityEnum = pgEnum("request_line_authority_type", [
  "BOQ",
  "EXCEPTION",
]);

export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id),
  reference: text("reference").notNull().unique(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  reportingPeriod: text("reporting_period").notNull(),
});

export const baselines = pgTable("baselines", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  version: text("version").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("APPROVED"),
});

export const controlAccounts = pgTable("control_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  currentBudget: numeric("current_budget", { precision: 18, scale: 2 }).notNull(),
  /**
   * Budget's own native currency, as sourced from the BOQ MASTER sheet of
   * Cost Control System.xlsm — which is USD-denominated throughout,
   * independent of the project's GHS reporting currency. Money arithmetic
   * across currencies requires an explicit, dated exchange rate
   * (CANONICAL_DOMAIN_MODEL_V7_DELTA.md §4;
   * MULTI_CURRENCY_CONTRACT_AND_REPORTING_STANDARD.md — "never hardcoded,
   * never silently defaulted"), which this build does not have a live
   * source for. So this is tracked per-account rather than assumed equal
   * to the project currency.
   */
  currency: text("currency").notNull(),
  budgetSource: text("budget_source"),
});

export const requests = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  controlAccountId: uuid("control_account_id")
    .notNull()
    .references(() => controlAccounts.id),
  reference: text("reference").notNull().unique(),
  controlledEstimate: numeric("controlled_estimate", { precision: 18, scale: 2 }).notNull(),
  /** Currency of controlledEstimate — see request_lines.exposureCurrency for the same on each line. */
  currency: text("currency").notNull(),
  status: requestStatusEnum("status").notNull().default("DRAFT"),
  requestedBy: text("requested_by").notNull(),
  workArea: text("work_area"),
  needByDate: timestamp("need_by_date", { withTimezone: true }),
  priority: text("priority"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /**
   * Not every seeded request is the golden transaction fixture. One demo
   * request is added so the register/dossier have more than a single,
   * already-fully-advanced row to show real state variety (e.g. the
   * "Approve & Prepare Package" transition, which the golden request has
   * already passed). Flagged explicitly rather than silently mixed in —
   * see CHECKPOINT_2_REPORT.md.
   */
  isDemoData: boolean("is_demo_data").notNull().default(false),
  demoNote: text("demo_note"),
});

export const requestLines = pgTable("request_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => requests.id),
  lineNo: integer("line_no").notNull(),
  description: text("description").notNull(),
  costType: text("cost_type").notNull(),
  authorityType: requestLineAuthorityEnum("authority_type").notNull(),
  authorityReference: text("authority_reference").notNull(),
  requestedQty: numeric("requested_qty", { precision: 18, scale: 3 }).notNull(),
  requestedUnit: text("requested_unit").notNull(),
  exposureAmount: numeric("exposure_amount", { precision: 18, scale: 2 }).notNull(),
  exposureCurrency: text("exposure_currency").notNull(),
  /**
   * Real "available BOQ quantity" as read from BOQ MASTER at seed time,
   * where the authorityReference could actually be found there. Null (not
   * zero) when the line's BOQ code was searched for and not found — a
   * genuine, disclosed data-integrity finding for the golden fixture's own
   * pump line (PLANT-SUB-PUMP-031), not a placeholder. See
   * boqSourceNote for what was actually checked.
   */
  boqAvailableQty: numeric("boq_available_qty", { precision: 18, scale: 3 }),
  boqSourceNote: text("boq_source_note").notNull(),
});

export const procurementPackages = pgTable("procurement_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => requests.id),
  reference: text("reference").notNull().unique(),
  estimate: numeric("estimate", { precision: 18, scale: 2 }).notNull(),
  invitedSuppliers: integer("invited_suppliers").notNull().default(0),
  status: packageStatusEnum("status").notNull().default("OPEN"),
  /** "Competitive RFQ" / "Sole Source" — real per package, drives the P04 comparison-tab and sole-source disclosure. */
  sourcingMethod: text("sourcing_method"),
});

export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => procurementPackages.id),
  supplier: text("supplier").notNull(),
  netAmount: numeric("net_amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  isSoleSource: boolean("is_sole_source").notNull().default(false),
  technicallyCompliant: boolean("technically_compliant").notNull().default(true),
});

export const awardDecisions = pgTable("award_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => procurementPackages.id),
  reference: text("reference").notNull().unique(),
  supplier: text("supplier").notNull(),
  net: numeric("net", { precision: 18, scale: 2 }).notNull(),
  /** Added Checkpoint 3 — the golden award is GHS (assumed); the demo award is genuinely USD (its winning quotation's currency). */
  currency: text("currency").notNull().default("GHS"),
  saving: numeric("saving", { precision: 18, scale: 2 }).notNull().default("0"),
  status: awardStatusEnum("status").notNull().default("DRAFT"),
  /** "Competitive - N bids" / "Sole source" — mirrors the winning quotation's context. */
  competitionResult: text("competition_result"),
  /** Mandatory deviation reason per PAGE_05 (non-lowest, sole source, split award, etc.) — null when the award is a clean lowest-compliant-bid case. */
  deviationCode: text("deviation_code"),
  deviationReason: text("deviation_reason"),
});

export const awardLines = pgTable("award_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  awardId: uuid("award_id")
    .notNull()
    .references(() => awardDecisions.id),
  requestLineId: uuid("request_line_id").references(() => requestLines.id),
  lineNo: integer("line_no").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
  rate: numeric("rate", { precision: 18, scale: 4 }).notNull(),
  netAmount: numeric("net_amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
});

export const financeValidations = pgTable("finance_validations", {
  id: uuid("id").primaryKey().defaultRandom(),
  awardId: uuid("award_id")
    .notNull()
    .references(() => awardDecisions.id),
  reference: text("reference").notNull().unique(),
  route: financeRouteEnum("route").notNull(),
  grossOrderValue: numeric("gross_order_value", { precision: 18, scale: 2 }).notNull(),
  /** Added Checkpoint 3 — the golden fixture's FV is GHS (assumed, matching the rest of that chain); the demo award is genuinely USD. */
  currency: text("currency").notNull().default("GHS"),
  netPayable: numeric("net_payable", { precision: 18, scale: 2 }).notNull(),
  status: financeValidationStatusEnum("status").notNull().default("PENDING"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  financeValidationId: uuid("finance_validation_id")
    .notNull()
    .references(() => financeValidations.id),
  reference: text("reference").notNull().unique(),
  net: numeric("net", { precision: 18, scale: 2 }).notNull(),
  gross: numeric("gross", { precision: 18, scale: 2 }).notNull(),
  status: purchaseOrderStatusEnum("status").notNull().default("ISSUED"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fulfilmentEntries = pgTable("fulfilment_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id),
  reference: text("reference").notNull().unique(),
  deliveredQty: numeric("delivered_qty", { precision: 18, scale: 3 }).notNull(),
  acceptedQty: numeric("accepted_qty", { precision: 18, scale: 3 }).notNull(),
  rejectedQty: numeric("rejected_qty", { precision: 18, scale: 3 }).notNull(),
  outstandingQty: numeric("outstanding_qty", { precision: 18, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
});

export const paymentVouchers = pgTable("payment_vouchers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fulfilmentId: uuid("fulfilment_id")
    .notNull()
    .references(() => fulfilmentEntries.id),
  reference: text("reference").notNull().unique(),
  acceptedNet: numeric("accepted_net", { precision: 18, scale: 2 }).notNull(),
  taxAdditions: numeric("tax_additions", { precision: 18, scale: 2 }).notNull().default("0"),
  wht: numeric("wht", { precision: 18, scale: 2 }).notNull().default("0"),
  netPayable: numeric("net_payable", { precision: 18, scale: 2 }).notNull(),
  status: paymentVoucherStatusEnum("status").notNull().default("DRAFT"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});
