import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

// Revert AAIL's estimate approval (test side-effect): restore is_estimate=true
// for AAIL sbu_kpi whose baseline actual confidence is 'Low'.
const res = await db.execute(sql`
  update sbu_kpi sk
  set is_estimate = true
  where sk.sbu_id = (select id from sbu where code = 'AAIL')
    and exists (
      select 1 from kpi_actual a
      where a.sbu_kpi_id = sk.id
        and a.period_id = 'FY25-26'
        and a.confidence = 'Low'
    )
  returning sk.id
`);
console.log(`restored is_estimate=true on ${res.rowCount} AAIL KPI rows`);

await (db.$client as Pool).end();
