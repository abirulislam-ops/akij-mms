import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

// Find duplicate brands: same (sbu_id, name), keep the lowest id.
const dups = await db.execute(sql`
  select sbu_id, name, array_agg(id order by id) as ids, count(*) as n
  from brand
  group by sbu_id, name
  having count(*) > 1
`);

let removed = 0;
for (const d of dups.rows as { sbu_id: number; name: string; ids: number[]; n: number }[]) {
  const [keep, ...drop] = d.ids;
  for (const id of drop) {
    // delete dependent rows first
    await db.execute(sql`delete from market_share where brand_id = ${id}`);
    await db.execute(sql`delete from price_point where brand_id = ${id}`);
    await db.execute(sql`delete from research_metric where brand_id = ${id}`);
    await db.execute(sql`update campaign set brand_id = null where brand_id = ${id}`);
    await db.execute(sql`delete from brand where id = ${id}`);
    removed++;
  }
  console.log(`dedupe "${d.name}" (sbu ${d.sbu_id}): kept ${keep}, dropped ${drop.join(", ")}`);
}

console.log(`\nRemoved ${removed} duplicate brand rows.`);
await (db.$client as Pool).end();
