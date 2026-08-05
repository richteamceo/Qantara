import { NextResponse } from "next/server";
import { generatePurchaseOrderPdf } from "@/server/documents/purchase-order-pdf";
import { logDocumentExport } from "@/server/audit";
import { getActorRole } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; purchaseOrderId: string }> }
) {
  const { projectId, purchaseOrderId } = await params;
  const result = await generatePurchaseOrderPdf(projectId, purchaseOrderId);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }
  if (result.status === "not_ready") {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  const actorRole = await getActorRole();
  await logDocumentExport("PurchaseOrder", purchaseOrderId, actorRole, `Downloaded ${purchaseOrderId}.pdf`);

  return new NextResponse(Buffer.from(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${purchaseOrderId}.pdf"`,
    },
  });
}
