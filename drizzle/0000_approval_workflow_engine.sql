CREATE TYPE "public"."approval_chain_type" AS ENUM('REQUEST_AUTHORIZATION', 'FINANCE_PAYMENT_AUTHORIZATION');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."audit_event_type" AS ENUM('DOCUMENT_EXPORT', 'APPROVAL_DECISION');--> statement-breakpoint
CREATE TYPE "public"."award_status" AS ENUM('DRAFT', 'SENT_TO_FINANCE');--> statement-breakpoint
CREATE TYPE "public"."finance_route" AS ENUM('CREDIT', 'CASH', 'ADVANCE', 'URGENT', 'DIRECT', 'REVIEW');--> statement-breakpoint
CREATE TYPE "public"."finance_validation_status" AS ENUM('PENDING', 'VALIDATED');--> statement-breakpoint
CREATE TYPE "public"."fulfilment_status" AS ENUM('DRAFT', 'POSTED');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('OPEN', 'COMPARED', 'AWARDED');--> statement-breakpoint
CREATE TYPE "public"."payment_voucher_status" AS ENUM('DRAFT', 'APPROVED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('ISSUED', 'AMENDED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."request_line_authority_type" AS ENUM('BOQ', 'EXCEPTION');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "approval_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_type" "approval_chain_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"subject_reference" text NOT NULL,
	"step_no" integer NOT NULL,
	"step_role" text NOT NULL,
	"step_label" text NOT NULL,
	"decision" "approval_decision" DEFAULT 'PENDING' NOT NULL,
	"decided_by_role" text,
	"decided_at" timestamp with time zone,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "audit_event_type" NOT NULL,
	"object_type" text NOT NULL,
	"object_reference" text NOT NULL,
	"actor_role" text NOT NULL,
	"detail" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"supplier" text NOT NULL,
	"net" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"saving" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" "award_status" DEFAULT 'DRAFT' NOT NULL,
	"competition_result" text,
	"deviation_code" text,
	"deviation_reason" text,
	CONSTRAINT "award_decisions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "award_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"award_id" uuid NOT NULL,
	"request_line_id" uuid,
	"line_no" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(18, 3) NOT NULL,
	"unit" text NOT NULL,
	"rate" numeric(18, 4) NOT NULL,
	"net_amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL
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
	"current_budget" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"budget_source" text
);
--> statement-breakpoint
CREATE TABLE "finance_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"award_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"route" "finance_route" NOT NULL,
	"gross_order_value" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"vat_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"nhil_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"getfund_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"wht_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(18, 2) NOT NULL,
	"status" "finance_validation_status" DEFAULT 'PENDING' NOT NULL,
	"validated_at" timestamp with time zone,
	CONSTRAINT "finance_validations_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "fulfilment_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"purchase_order_line_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"status" "fulfilment_status" DEFAULT 'DRAFT' NOT NULL,
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
	"currency" text NOT NULL,
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
	"sourcing_method" text,
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
CREATE TABLE "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"award_line_id" uuid,
	"line_no" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(18, 3) NOT NULL,
	"unit" text NOT NULL,
	"rate" numeric(18, 4) NOT NULL,
	"net" numeric(18, 2) NOT NULL,
	"tax_amount" numeric(18, 2) NOT NULL,
	"gross" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finance_validation_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"net" numeric(18, 2) NOT NULL,
	"gross" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"status" "purchase_order_status" DEFAULT 'ISSUED' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"supplier" text NOT NULL,
	"net_amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"is_sole_source" boolean DEFAULT false NOT NULL,
	"technically_compliant" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"description" text NOT NULL,
	"cost_type" text NOT NULL,
	"authority_type" "request_line_authority_type" NOT NULL,
	"authority_reference" text NOT NULL,
	"requested_qty" numeric(18, 3) NOT NULL,
	"requested_unit" text NOT NULL,
	"exposure_amount" numeric(18, 2) NOT NULL,
	"exposure_currency" text NOT NULL,
	"boq_available_qty" numeric(18, 3),
	"boq_source_note" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"control_account_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"controlled_estimate" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" "request_status" DEFAULT 'DRAFT' NOT NULL,
	"requested_by" text NOT NULL,
	"work_area" text,
	"need_by_date" timestamp with time zone,
	"priority" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo_data" boolean DEFAULT false NOT NULL,
	"demo_note" text,
	CONSTRAINT "requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "award_decisions" ADD CONSTRAINT "award_decisions_package_id_procurement_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."procurement_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_lines" ADD CONSTRAINT "award_lines_award_id_award_decisions_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."award_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_lines" ADD CONSTRAINT "award_lines_request_line_id_request_lines_id_fk" FOREIGN KEY ("request_line_id") REFERENCES "public"."request_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_accounts" ADD CONSTRAINT "control_accounts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_validations" ADD CONSTRAINT "finance_validations_award_id_award_decisions_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."award_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfilment_entries" ADD CONSTRAINT "fulfilment_entries_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfilment_entries" ADD CONSTRAINT "fulfilment_entries_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_fulfilment_id_fulfilment_entries_id_fk" FOREIGN KEY ("fulfilment_id") REFERENCES "public"."fulfilment_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_packages" ADD CONSTRAINT "procurement_packages_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_award_line_id_award_lines_id_fk" FOREIGN KEY ("award_line_id") REFERENCES "public"."award_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_finance_validation_id_finance_validations_id_fk" FOREIGN KEY ("finance_validation_id") REFERENCES "public"."finance_validations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_package_id_procurement_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."procurement_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_lines" ADD CONSTRAINT "request_lines_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_control_account_id_control_accounts_id_fk" FOREIGN KEY ("control_account_id") REFERENCES "public"."control_accounts"("id") ON DELETE no action ON UPDATE no action;