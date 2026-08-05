import { NextResponse } from "next/server";
import { generatePaymentVoucherPdf } from "@/server/documents/payment-voucher-pdf";
import { logDocumentExport } from "@/server/audit";
import { getActorRole } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; voucherId: string }> }
) {
  const { projectId, voucherId } = await params;
  const result = await generatePaymentVoucherPdf(projectId, voucherId);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Payment voucher not found" }, { status: 404 });
  }
  if (result.status === "not_ready") {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  const actorRole = await getActorRole();
  await logDocumentExport("PaymentVoucher", voucherId, actorRole, `Downloaded ${voucherId}.pdf`);

  return new NextResponse(Buffer.from(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${voucherId}.pdf"`,
    },
  });
}
