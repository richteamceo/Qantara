CREATE TYPE "public"."award_status" AS ENUM('DRAFT', 'SENT_TO_FINANCE');--> statement-breakpoint
CREATE TYPE "public"."finance_route" AS ENUM('CREDIT', 'CASH', 'ADVANCE', 'URGENT', 'DIRECT', 'REVIEW');--> statement-breakpoint
CREATE TYPE "public"."finance_validation_status" AS ENUM('PENDING', 'VALIDATED');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('OPEN', 'COMPARED', 'AWARDED');--> statement-breakpoint
CREATE TYPE "public"."payment_voucher_status" AS ENUM('DRAFT', 'APPROVED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('ISSUED', 'AMENDED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "award_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"supplier" text NOT NULL,
	"net" numeric(18, 2) NOT NULL,
	"saving" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" "award_status" DEFAULT 'DRAFT' NOT NULL,
	CONSTRAINT "award_decisions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" text NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'APPROVED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"current_budget" numeric(18, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"award_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"route" "finance_route" NOT NULL,
	"gross_order_value" numeric(18, 2) NOT NULL,
	"net_payable" numeric(18, 2) NOT NULL,
	"status" "finance_validation_status" DEFAULT 'PENDING' NOT NULL,
	"validated_at" timestamp with time zone,
	CONSTRAINT "finance_validations_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "fulfilment_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"delivered_qty" numeric(18, 3) NOT NULL,
	"accepted_qty" numeric(18, 3) NOT NULL,
	"rejected_qty" numeric(18, 3) NOT NULL,
	"outstanding_qty" numeric(18, 3) NOT NULL,
	"unit" text NOT NULL,
	CONSTRAINT "fulfilment_entries_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fulfilment_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"accepted_net" numeric(18, 2) NOT NULL,
	"tax_additions" numeric(18, 2) DEFAULT '0' NOT NULL,
	"wht" numeric(18, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(18, 2) NOT NULL,
	"status" "payment_voucher_status" DEFAULT 'DRAFT' NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payment_vouchers_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "procurement_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"estimate" numeric(18, 2) NOT NULL,
	"invited_suppliers" integer DEFAULT 0 NOT NULL,
	"status" "package_status" DEFAULT 'OPEN' NOT NULL,
	CONSTRAINT "procurement_packages_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"reporting_period" text NOT NULL,
	CONSTRAINT "projects_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finance_validation_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"net" numeric(18, 2) NOT NULL,
	"gross" numeric(18, 2) NOT NULL,
	"status" "purchase_order_status" DEFAULT 'ISSUED' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"control_account_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"controlled_estimate" numeric(18, 2) NOT NULL,
	"quantity" numeric(18, 3),
	"unit" text,
	"status" "request_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "award_decisions" ADD CONSTRAINT "award_decisions_package_id_procurement_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."procurement_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_accounts" ADD CONSTRAINT "control_accounts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_validations" ADD CONSTRAINT "finance_validations_award_id_award_decisions_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."award_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfilment_entries" ADD CONSTRAINT "fulfilment_entries_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_fulfilment_id_fulfilment_entries_id_fk" FOREIGN KEY ("fulfilment_id") REFERENCES "public"."fulfilment_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_packages" ADD CONSTRAINT "procurement_packages_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_finance_validation_id_finance_validations_id_fk" FOREIGN KEY ("finance_validation_id") REFERENCES "public"."finance_validations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_control_account_id_control_accounts_id_fk" FOREIGN KEY ("control_account_id") REFERENCES "public"."control_accounts"("id") ON DELETE no action ON UPDATE no action;