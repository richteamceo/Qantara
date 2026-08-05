/**
 * BUSINESS_CONTINUITY_AND_DISASTER_RECOVERY_STANDARD.md §Recovery procedure
 * step 4: "run the workbook-parity-style reconciliation check ... against a
 * known-good reference point before declaring recovery complete — 'the
 * application responds' is not sufficient verification for a financial
 * system, 'the figures reconcile' is." NON_FUNCTIONAL_REQUIREMENTS.md:
 * "Close certificate reproduction after restore must match hashes/totals
 * exactly."
 *
 * Compares a source database against a restored database: row counts for
 * every table, plus the specific certified golden-fixture figures that
 * every checkpoint's formula-reconciliation has already verified are
 * correct — if those don't match byte-for-byte after restore, the restore
 * is not trustworthy regardless of whether pg_restore exited 0.
 */
import { Client } from "pg";

const TABLES = [
  "organisations", "projects", "baselines", "control_accounts",
  "requests", "request_lines", "procurement_packages", "quotations",
  "award_decisions", "award_lines", "finance_validations",
  "purchase_orders", "purchase_order_lines", "fulfilment_entries",
  "payment_vouchers", "audit_events",
];

async function rowCounts(url: string): Promise<Record<string, number>> {
  const client = new Client({ connectionString: url });
  await client.connect();
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    counts[t] = r.rows[0].n;
  }
  await client.end();
  return counts;
}

async function goldenFigures(url: string): Promise<Record<string, string>> {
  const client = new Client({ connectionString: url });
  await client.connect();
  const pv = await client.query(
    `SELECT accepted_net, tax_additions, wht, net_payable, currency, status FROM payment_vouchers WHERE reference = 'PV-2026-0076'`
  );
  const po = await client.query(
    `SELECT net, gross, currency, status FROM purchase_orders WHERE reference = 'PO-2026-041'`
  );
  await client.end();
  return {
    "PV-2026-0076 acceptedNet": pv.rows[0]?.accepted_net,
    "PV-2026-0076 taxAdditions": pv.rows[0]?.tax_additions,
    "PV-2026-0076 wht": pv.rows[0]?.wht,
    "PV-2026-0076 netPayable": pv.rows[0]?.net_payable,
    "PV-2026-0076 status": pv.rows[0]?.status,
    "PO-2026-041 net": po.rows[0]?.net,
    "PO-2026-041 gross": po.rows[0]?.gross,
    "PO-2026-041 status": po.rows[0]?.status,
  };
}

async function main() {
  const sourceUrl = process.argv[2];
  const restoredUrl = process.argv[3];
  if (!sourceUrl || !restoredUrl) {
    console.error("Usage: tsx scripts/reconcile.ts <source-db-url> <restored-db-url>");
    process.exit(1);
  }

  const [sourceCounts, restoredCounts] = await Promise.all([rowCounts(sourceUrl), rowCounts(restoredUrl)]);
  const [sourceFigures, restoredFigures] = await Promise.all([goldenFigures(sourceUrl), goldenFigures(restoredUrl)]);

  let allMatch = true;

  console.log("=== Row counts ===");
  for (const t of TABLES) {
    const match = sourceCounts[t] === restoredCounts[t];
    if (!match) allMatch = false;
    console.log(`${match ? "OK  " : "FAIL"} ${t}: source=${sourceCounts[t]} restored=${restoredCounts[t]}`);
  }

  console.log("\n=== Golden fixture figures ===");
  for (const key of Object.keys(sourceFigures)) {
    const match = sourceFigures[key] === restoredFigures[key];
    if (!match) allMatch = false;
    console.log(`${match ? "OK  " : "FAIL"} ${key}: source=${sourceFigures[key]} restored=${restoredFigures[key]}`);
  }

  console.log(`\n${allMatch ? "RECONCILED — restore matches source exactly" : "MISMATCH — restore does NOT match source"}`);
  process.exit(allMatch ? 0 : 1);
}

main();
