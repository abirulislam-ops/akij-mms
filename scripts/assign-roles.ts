import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

// Admin access assignments (email -> role code).
//   CBDO sir         -> CBDO (moderator)
//   SP&A team        -> SPA  (admin)
const ASSIGNMENTS: [string, string][] = [
  ["cbdo.ar@akijresource.com", "CBDO"],
  ["sabbir04@akijresource.com", "SPA"],
  ["ahmedahnaf@akijresource.com", "SPA"],
  ["abirul.islam@akijresource.com", "SPA"],
];

async function main() {
  for (const [email, roleCode] of ASSIGNMENTS) {
    // 1. ensure the MMS user row exists (auto-created on first sign-in, but pre-create so RBAC resolves now)
    await db.insert(schema.user).values({ email }).onConflictDoNothing();
    const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
    if (!u) { console.log(`SKIP ${email}: could not resolve user id`); continue; }

    // 2. resolve the role id
    const [r] = await db.select({ id: schema.role.id }).from(schema.role).where(eq(schema.role.code, roleCode));
    if (!r) { console.log(`SKIP ${email}: role ${roleCode} not found`); continue; }

    // 3. map user -> role (idempotent)
    await db.insert(schema.userRole).values({ userId: u.id, roleId: r.id }).onConflictDoNothing();
    console.log(`✓ ${email} → ${roleCode} (user ${u.id})`);
  }

  console.log("\nFinal assignments:");
  const rows = await db
    .select({ email: schema.user.email, code: schema.role.code, tier: schema.role.tier })
    .from(schema.userRole)
    .innerJoin(schema.user, eq(schema.user.id, schema.userRole.userId))
    .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
    .orderBy(schema.user.email, schema.role.code);
  for (const r of rows) console.log(`  ${r.email}  →  ${r.code} (${r.tier})`);

  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("assign-roles failed:", e);
  process.exitCode = 1;
});
