import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

const res = await db.execute(sql`
  select s.code, b.id, b.name, b.is_own, b.is_competitor
  from brand b join sbu s on s.id = b.sbu_id
  where s.code = 'ACCL'
  order by b.id
`);
for (const r of res.rows) console.log(`${r.code}  id=${r.id}  own=${r.is_own} comp=${r.is_competitor}  ${r.name}`);

await (db.$client as Pool).end();
