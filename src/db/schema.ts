import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * Checkpoint-1 domain slice.
 *
 * This is a deliberate subset of the full canonical domain model in
 * 04_ENGINEERING_CONTRACTS/CANONICAL_DOMAIN_MODEL_V7_DELTA.md — enough to
 * honestly compute Page 01 (Control Room) from real, queryable records.
 * Deferred entities (Supplier/Quotation/ComparisonVersion, Exception*,
 * Workflow*, Evidence*, Advance*, tax component breakdown, multi-version
 * PO amendments) are listed as gaps in the Checkpoint-1 evidence report,
 * not silently implied here.
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
  quantity: numeric("quantity", { precision: 18, scale: 3 }),
  unit: text("unit"),
  status: requestStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
});

export const awardDecisions = pgTable("award_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => procurementPackages.id),
  reference: text("reference").notNull().unique(),
  supplier: text("supplier").notNull(),
  net: numeric("net", { precision: 18, scale: 2 }).notNull(),
  saving: numeric("saving", { precision: 18, scale: 2 }).notNull().default("0"),
  status: awardStatusEnum("status").notNull().default("DRAFT"),
});

export const financeValidations = pgTable("finance_validations", {
  id: uuid("id").primaryKey().defaultRandom(),
  awardId: uuid("award_id")
    .notNull()
    .references(() => awardDecisions.id),
  reference: text("reference").notNull().unique(),
  route: financeRouteEnum("route").notNull(),
  grossOrderValue: numeric("gross_order_value", { precision: 18, scale: 2 }).notNull(),
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
