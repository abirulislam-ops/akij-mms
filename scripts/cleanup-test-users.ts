import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

// Remove throwaway test users (mms-*) created by the build-time check scripts.
async function main() {
  const testUsers = await db.select({ id: schema.user.id, email: schema.user.email }).from(schema.user).where(like(schema.user.email, "mms-%"));
  if (!testUsers.length) { console.log("No test users to clean up."); await (db.$client as Pool).end(); return; }

  for (const u of testUsers) {
    await db.delete(schema.userRole).where(eq(schema.userRole.userId, u.id));
    await db.delete(schema.user).where(eq(schema.user.id, u.id));
    console.log(`removed ${u.email}`);
  }
  console.log(`\nRemoved ${testUsers.length} test user(s).`);
  await (db.$client as Pool).end();
}

import { eq } from "drizzle-orm";
main().catch((e) => {
  console.error("cleanup failed:", e);
  process.exitCode = 1;
});
