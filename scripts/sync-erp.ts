import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";
import { upsertRevenue } from "../apps/api/src/sync.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

/**
 * ERP sync: read the latest iBOSDDD revenue pull (data/erp-revenue.json) and
 * upsert it into the MMS Postgres. In production this is driven by a cron that
 * calls the gateway's HTTP API (GET /api/v1/data/...) then POSTs to /api/sync/revenue.
 */
interface PullFile {
  pulledAt: string;
  source: string;
  periodId: string;
  rows: { sbuCode: string; value: number }[];
  note?: string;
}

async function main() {
  const path = process.argv[2] ?? join(__dirname, "..", "data", "erp-revenue.json");
  const pull: PullFile = JSON.parse(readFileSync(path, "utf-8"));

  console.log(`Syncing ERP revenue — ${pull.source}`);
  console.log(`pulledAt ${pull.pulledAt} · period ${pull.periodId} · ${pull.rows.length} rows\n`);

  for (const r of pull.rows) {
    const result = await upsertRevenue(r.sbuCode, pull.periodId, r.value, pull.source, "erp-sync");
    console.log(`  ${r.sbuCode.padEnd(5)} ${String(r.value).padStart(9)} Cr  →  ${result.status}`);
  }
  if (pull.note) console.log(`\n${pull.note}`);

  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("sync failed:", e);
  process.exitCode = 1;
});
