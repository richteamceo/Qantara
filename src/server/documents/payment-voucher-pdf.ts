import { getPaymentVoucherData } from "@/server/payment-voucher";
import { formatMoney } from "@/lib/format";
import {
  createDocument,
  drawTitleBlock,
  drawKeyValueGrid,
  drawSectionHeading,
  drawTable,
  drawTotalsBlock,
  drawNote,
  drawFooter,
  finish,
} from "./pdf";

export type PvPdfResult = { status: "generated"; pdf: Uint8Array } | { status: "not_ready"; reason: string } | { status: "not_found" };

/**
 * DOCUMENT_AND_REPORT_GENERATION_STANDARD.md §Generation mechanics: "a
 * board pack cannot be generated from anything below CERTIFIED trust
 * state." Payment vouchers have no separate CERTIFIED status in this
 * build's schema (DRAFT -> PAID only) — PAID is the closest equivalent
 * certified/settled state, so that is the gate; DRAFT vouchers cannot be
 * exported.
 */
export async function generatePaymentVoucherPdf(projectReference: string, voucherReference: string): Promise<PvPdfResult> {
  const data = await getPaymentVoucherData(projectReference, voucherReference);
  if (!data) return { status: "not_found" };
  if (data.voucher.status !== "PAID") return { status: "not_ready", reason: `Voucher status is ${data.voucher.status}, not PAID` };

  const b = await createDocument();
  drawTitleBlock(b, `Nextregra GH Ltd — ${data.project.name}`, "Payment Voucher", data.voucher.reference, data.voucher.status);

  drawKeyValueGrid(b, [
    ["Supplier / payee", data.supplier],
    ["Route", data.route ?? "—"],
    ["Source PO", data.purchaseOrderReference],
    ["Source GRN/SE", data.fulfilmentReference],
    ["Paid", data.voucher.paidAt?.slice(0, 10) ?? "—"],
    ["Currency", data.voucher.currency],
  ]);

  drawSectionHeading(b, "Two-way match (PO vs GRN)");
  drawTable(
    b,
    [
      { label: "Item/service", width: 180 },
      { label: "PO qty", width: 70, align: "right" },
      { label: "GRN accepted qty", width: 95, align: "right" },
      { label: "Rate", width: 75, align: "right" },
      { label: "Gross", width: 75, align: "right" },
    ],
    [
      [
        data.threeWayMatch.item,
        `${data.threeWayMatch.poQty} ${data.threeWayMatch.unit}`,
        `${data.threeWayMatch.grnAcceptedQty} ${data.threeWayMatch.unit}`,
        formatMoney(data.threeWayMatch.poRate, data.threeWayMatch.currency),
        formatMoney(data.threeWayMatch.poGross, data.threeWayMatch.currency),
      ],
    ]
  );

  drawSectionHeading(b, "Amount bridge");
  drawTotalsBlock(b, [
    ["Accepted/source net", formatMoney(data.voucher.acceptedNet, data.voucher.currency)],
    ["Tax additions (VAT+NHIL+GETFund 20%)", `+ ${formatMoney(data.voucher.taxAdditions, data.voucher.currency)}`],
    ["WHT (2% of net)", `- ${formatMoney(data.voucher.wht, data.voucher.currency)}`],
    ["Net payable", formatMoney(data.voucher.netPayable, data.voucher.currency), true],
  ]);

  drawNote(
    b,
    "This document is a system-generated export of the CORE1X commercial record at the time of generation, not a signed payment instrument. No supplier invoice/certificate entity is modelled in this build, so the match above is PO-vs-GRN only, not the full three-way match. The approval/payment-release chain is a single collapsed transition in this build, not the full multi-actor authority chain the underlying page contract calls for."
  );

  drawFooter(b, data.voucher.id);

  const pdf = await finish(b);
  return { status: "generated", pdf };
}
