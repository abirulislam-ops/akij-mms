import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

const rows = await db
  .select({ email: schema.user.email, code: schema.role.code, tier: schema.role.tier })
  .from(schema.userRole)
  .innerJoin(schema.user, eq(schema.user.id, schema.userRole.userId))
  .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
  .orderBy(schema.user.email);

console.log("Current user → role assignments:");
for (const r of rows) console.log(`  ${r.email}  →  ${r.code} (${r.tier})`);

await (db.$client as Pool).end();
