import { getPurchaseOrderData } from "@/server/purchase-order";
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

export type PoPdfResult = { status: "generated"; pdf: Uint8Array } | { status: "not_ready"; reason: string } | { status: "not_found" };

/**
 * DOCUMENT_AND_REPORT_GENERATION_STANDARD.md §Generation mechanics:
 * "Populated only from certified/approved source records — a PO document
 * cannot be generated before the PO record itself reaches an approved
 * status." purchase_orders has one non-draft status (ISSUED) in this
 * build's schema, so that is the gate.
 */
export async function generatePurchaseOrderPdf(projectReference: string, poReference: string): Promise<PoPdfResult> {
  const data = await getPurchaseOrderData(projectReference, poReference);
  if (!data) return { status: "not_found" };
  if (data.po.status !== "ISSUED") return { status: "not_ready", reason: `PO status is ${data.po.status}, not ISSUED` };

  const b = await createDocument();
  drawTitleBlock(b, `Nextregra GH Ltd — ${data.project.name}`, "Purchase Order", data.po.reference, data.po.status);

  drawKeyValueGrid(b, [
    ["Supplier", data.award.supplier],
    ["Route", data.financeValidation.route],
    ["Source award", data.award.reference],
    ["Source finance validation", data.financeValidation.reference],
    ["Issued", data.po.issuedAt.slice(0, 10)],
    ["Currency", data.po.currency],
  ]);

  drawSectionHeading(b, "Lines");
  drawTable(
    b,
    [
      { label: "#", width: 20 },
      { label: "Description", width: 190 },
      { label: "Qty", width: 65, align: "right" },
      { label: "Rate", width: 70, align: "right" },
      { label: "Net", width: 75, align: "right" },
      { label: "Gross", width: 75, align: "right" },
    ],
    data.lines.map((l) => [
      String(l.lineNo),
      l.description,
      `${l.quantity} ${l.unit}`,
      formatMoney(l.rate, l.currency),
      formatMoney(l.net, l.currency),
      formatMoney(l.gross, l.currency),
    ])
  );

  drawTotalsBlock(b, [
    ["Net award", formatMoney(data.po.net, data.po.currency)],
    ["Statutory additions", data.kpis.statutoryAdditions.status === "computed" ? formatMoney(data.kpis.statutoryAdditions.value.amount, data.kpis.statutoryAdditions.value.currency) : "incomplete"],
    ["Gross commitment", formatMoney(data.po.gross, data.po.currency), true],
  ]);

  drawNote(
    b,
    "This document is a system-generated export of the CORE1X commercial record at the time of generation, not a signed contractual instrument. Payment/delivery/warranty/retention terms are not modelled in this build. Re-downloading after the source record changes will reflect the new state — this export is not automatically re-issued or watermarked as superseded."
  );

  drawFooter(b, data.po.id);

  const pdf = await finish(b);
  return { status: "generated", pdf };
}
