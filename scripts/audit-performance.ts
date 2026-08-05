/**
 * ACCESSIBILITY_PERFORMANCE_AND_POLISH_GATES.md §Performance: "no N+1
 * page-service patterns." Measures the real query count issued by every
 * page's server-side data-fetch function against the golden fixture,
 * using the AsyncLocalStorage-based counter in src/db/query-counter.ts.
 * A query count that's flat regardless of how many lines/rows a record
 * has is fine; a count that scales with row count is the N+1 smell this
 * is built to catch.
 */
import "dotenv/config";
import { countQueries } from "../src/db/query-counter";
import { getControlRoomData } from "../src/server/control-room";
import { getRequestsRegisterData } from "../src/server/requests-register";
import { getRequestDossierData } from "../src/server/request-dossier";
import { getProcurementPackageData } from "../src/server/procurement-package";
import { getAwardDecisionData } from "../src/server/award-decision";
import { getFinanceValidationData } from "../src/server/finance-validation";
import { getPurchaseOrderData } from "../src/server/purchase-order";
import { getFulfilmentData } from "../src/server/fulfilment";
import { getPaymentVoucherData } from "../src/server/payment-voucher";

const PROJECT = "SWTBK";

const checks: { page: string; run: () => Promise<unknown> }[] = [
  { page: "P01 Control Room", run: () => getControlRoomData(PROJECT) },
  { page: "P02 Requests Register", run: () => getRequestsRegisterData(PROJECT) },
  { page: "P03 Request Dossier", run: () => getRequestDossierData(PROJECT, "MR-SWTBK-2026-0035") },
  { page: "P04 Procurement Package", run: () => getProcurementPackageData(PROJECT, "PPK-2026-011") },
  { page: "P05 Award Decision", run: () => getAwardDecisionData(PROJECT, "AWD-2026-008") },
  { page: "P06 Finance Validation", run: () => getFinanceValidationData(PROJECT, "FV-2026-018") },
  { page: "P07 Purchase Order", run: () => getPurchaseOrderData(PROJECT, "PO-2026-041") },
  { page: "P08 Fulfilment/GRN", run: () => getFulfilmentData(PROJECT, "GRN-2026-0041") },
  { page: "P09 Payment Voucher", run: () => getPaymentVoucherData(PROJECT, "PV-2026-0076") },
];

const THRESHOLD = 15; // generous — a hand-built page joining ~6 related tables should not need more than this

async function main() {
  console.log("Page".padEnd(28), "Queries", "Status");
  console.log("-".repeat(50));
  let anyOver = false;
  const details: Record<string, string[]> = {};

  for (const c of checks) {
    const { result, count, queries } = await countQueries(c.run);
    if (result === null) {
      console.log(c.page.padEnd(28), "N/A", "record not found — check reference");
      continue;
    }
    const status = count > THRESHOLD ? "FLAG (>threshold)" : "ok";
    if (count > THRESHOLD) anyOver = true;
    console.log(c.page.padEnd(28), String(count).padEnd(7), status);
    details[c.page] = queries;
  }

  console.log("\n=== Full query lists (for manual N+1 inspection) ===");
  for (const [page, queries] of Object.entries(details)) {
    console.log(`\n-- ${page} (${queries.length} queries) --`);
    queries.forEach((q, i) => console.log(`${i + 1}. ${q.replace(/\s+/g, " ").trim()}`));
  }

  process.exit(anyOver ? 1 : 0);
}

main();
