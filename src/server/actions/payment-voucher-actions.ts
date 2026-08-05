"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { fulfilmentEntries, purchaseOrderLines, purchaseOrders, financeValidations, paymentVouchers } from "@/db/schema";
import { getActorRole, requireRole, type Role } from "@/lib/auth";
import { isChainApproved } from "@/server/approvals";

export type OpenPaymentVoucherResult =
  | { status: "opened"; voucherReference: string }
  | { status: "already_open"; voucherReference: string }
  | { status: "not_posted" }
  | { status: "payment_authorization_incomplete"; reason: string }
  | { status: "not_found" }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role };

/**
 * Bridge from PAGE_08 to PAGE_09 — not a header action in either page
 * contract by that exact name, but PAGE_08's own decision purpose says it
 * "create[s] the certifiable basis for the Payment Voucher" and PAGE_09
 * requires a Draft state to exist before its single "Approve Voucher &
 * Release Payment" action can act on it. Mirrors the same
 * open-then-transition split already used for PAGE_07 -> PAGE_08
 * (openFulfilment). Idempotent per fulfilment: a fulfilment that already
 * has a voucher returns its existing reference rather than duplicating.
 *
 * Amount bridge (PAGE_09 §Amount bridge, CREDIT receipt fixture): accepted
 * qty x PO rate = net accepted amount; tax additions are the PO line's own
 * tax, prorated to the accepted fraction of the ordered quantity (same
 * real 20% VAT+NHIL+GETFund rate as PAGE_06/PAGE_07); WHT is an indicative
 * 2% of net at the payable event (same rate PAGE_06's own fixture
 * established in Checkpoint 4).
 *
 * Checkpoint 12 addition: also requires the Finance Payment Authorization
 * chain (Accountant -> MD, see src/server/approvals.ts) on the source
 * Finance Validation to be fully APPROVED first — sourced directly from
 * the workbook's FINANCE VALIDATION sheet ("ELIGIBLE FOR PAYMENT ... only
 * when MD approval is APPROVED and Accountant has not rejected", MD
 * APPROVAL CORRECTION QA) and BR-APR-002. Server-side, not just a
 * disabled button — see CHECKPOINT_12_REPORT.md.
 */
export async function openPaymentVoucher(
  projectReference: string,
  fulfilmentReference: string
): Promise<OpenPaymentVoucherResult> {
  const actorRole = await getActorRole();
  const permission = requireRole(actorRole, "SITE_QS_COMMERCIAL");
  if (!permission.ok) return { status: "forbidden", requiredRole: permission.requiredRole, actorRole: permission.actorRole };

  const fulfilment = await db.query.fulfilmentEntries.findFirst({ where: eq(fulfilmentEntries.reference, fulfilmentReference) });
  if (!fulfilment) return { status: "not_found" };
  if (fulfilment.status !== "POSTED") return { status: "not_posted" };

  const existing = await db.query.paymentVouchers.findFirst({ where: eq(paymentVouchers.fulfilmentId, fulfilment.id) });
  if (existing) return { status: "already_open", voucherReference: existing.reference };

  const line = await db.query.purchaseOrderLines.findFirst({ where: eq(purchaseOrderLines.id, fulfilment.purchaseOrderLineId) });
  if (!line) return { status: "not_found" };

  const po = await db.query.purchaseOrders.findFirst({ where: eq(purchaseOrders.id, fulfilment.purchaseOrderId) });
  if (!po) return { status: "not_found" };
  const fv = await db.query.financeValidations.findFirst({ where: eq(financeValidations.id, po.financeValidationId) });
  if (!fv) return { status: "not_found" };

  const paymentChainApproved = await isChainApproved("FINANCE_PAYMENT_AUTHORIZATION", fv.id, fv.reference);
  if (!paymentChainApproved) {
    return {
      status: "payment_authorization_incomplete",
      reason: `Finance Payment Authorization chain (Accountant → MD) on ${fv.reference} is not fully approved yet`,
    };
  }

  const orderedQty = Number(line.quantity);
  const acceptedQty = Number(fulfilment.acceptedQty);
  const rate = Number(line.rate);
  const lineTax = Number(line.taxAmount);

  const acceptedNet = Math.round(acceptedQty * rate * 100) / 100;
  const taxAdditions = Math.round(lineTax * (orderedQty > 0 ? acceptedQty / orderedQty : 0) * 100) / 100;
  const wht = Math.round(acceptedNet * 0.02 * 100) / 100;
  const netPayable = Math.round((acceptedNet + taxAdditions - wht) * 100) / 100;

  const reference = `PV-${fulfilmentReference.replace(/^GRN-/, "").replace(/-L\d+$/, "")}`;

  await db.insert(paymentVouchers).values({
    fulfilmentId: fulfilment.id,
    reference,
    acceptedNet: acceptedNet.toFixed(2),
    taxAdditions: taxAdditions.toFixed(2),
    wht: wht.toFixed(2),
    netPayable: netPayable.toFixed(2),
    currency: line.currency,
    status: "DRAFT",
  });

  revalidatePath(`/app/projects/${projectReference}/fulfilment/${fulfilmentReference}`);

  return { status: "opened", voucherReference: reference };
}

export type ApproveAndPayResult =
  | { status: "paid"; netPayable: number; currency: string }
  | { status: "already_paid" }
  | { status: "not_found" }
  | { status: "forbidden"; requiredRole: Role; actorRole: Role };

/**
 * PAGE_09 header action — "Approve Voucher & Release Payment" is a single
 * button in the page contract, so this collapses the contract's own
 * multi-actor approval/payment chain (prepared -> site/QS certification ->
 * Finance approval -> management authority -> payment instruction ->
 * bank/treasury execution -> reconciliation -> posting) into one
 * server-verified transition, same disclosed simplification pattern as
 * every prior checkpoint's primary action. Immutable once PAID — calling
 * again returns already_paid rather than double-paying (acceptance test
 * #4: "Payment cannot exceed current approved payable or execute twice").
 * Permission revalidation is now real (Checkpoint 7) — requires FINANCE,
 * matching the SoD matrix's explicit rules ("receiver cannot alone certify
 * payment value"; "payment preparation, approval and execution are
 * separable functions") — a different role than openPaymentVoucher's
 * SITE_QS_COMMERCIAL certification step.
 */
export async function approveAndReleasePayment(
  projectReference: string,
  voucherReference: string
): Promise<ApproveAndPayResult> {
  const actorRole = await getActorRole();
  const permission = requireRole(actorRole, "FINANCE");
  if (!permission.ok) return { status: "forbidden", requiredRole: permission.requiredRole, actorRole: permission.actorRole };

  const voucher = await db.query.paymentVouchers.findFirst({ where: eq(paymentVouchers.reference, voucherReference) });
  if (!voucher) return { status: "not_found" };
  if (voucher.status === "PAID") return { status: "already_paid" };

  await db
    .update(paymentVouchers)
    .set({ status: "PAID", paidAt: new Date() })
    .where(eq(paymentVouchers.id, voucher.id));

  revalidatePath(`/app/projects/${projectReference}/payment-vouchers/${voucherReference}`);
  revalidatePath(`/app/projects/${projectReference}/control-room`);

  return { status: "paid", netPayable: Number(voucher.netPayable), currency: voucher.currency };
}
