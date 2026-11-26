import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";
import app from "../apps/api/src/index.js";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

const BASE = process.env.NEON_AUTH_BASE_URL!;
const email = `mms-cov-${Date.now()}@akijresource.com`;
const password = "MmsTestPass123!";

async function getJwt() {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  let res = await fetch(`${BASE}/sign-up/email`, { method: "POST", headers, body: JSON.stringify({ email, password, name: "MMS Cov Test" }) });
  if (res.status >= 400) res = await fetch(`${BASE}/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const tok = await fetch(`${BASE}/token`, { method: "GET", headers: { Origin: "http://localhost:5173", Cookie: cookie } });
  return ((await tok.json()) as { token: string }).token;
}

const auth: Record<string, string> = { "Content-Type": "application/json" };
auth.Authorization = `Bearer ${await getJwt()}`;
await db.insert(schema.user).values({ email, name: "MMS Cov Test" }).onConflictDoNothing();
const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
const [spa] = await db.select({ id: schema.role.id }).from(schema.role).where(eq(schema.role.code, "SPA"));
if (u && spa) await db.insert(schema.userRole).values({ userId: u.id, roleId: spa.id }).onConflictDoNothing();

// coverage
const cov = await app.request("/api/coverage", { headers: auth });
const cv = (await cov.json()) as Record<string, any>;
console.log(`GET /api/coverage → ${cov.status}`);
console.log(`  summary: ${cv.summary?.totalSbus} SBUs × ${cv.summary?.totalModules} modules`);
console.log(`  measured=${cv.summary?.measuredCells} estimate=${cv.summary?.estimateCells} missing=${cv.summary?.missingCells} completeness=${(cv.summary?.groupCompleteness * 100).toFixed(0)}%`);
for (const r of cv.sbus ?? []) {
  console.log(`  ${r.code.padEnd(5)} ${(r.name ?? "").padEnd(18)} measured=${r.measuredCount} estimate=${r.estimateCount} missing=${r.missingCount}`);
}

// approve-estimates (SPA = admin tier, should pass) — verify against a dry check
// NOTE: approve-estimates mutates data, so we do NOT call it here (verified separately).
console.log(`\n(approve-estimates verified separately; requires admin tier + writes audit log)`);
const aail = cv.sbus?.find((r: any) => r.code === "AAIL");
console.log(`  AAIL baseline: measured=${aail?.measuredCount} estimate=${aail?.estimateCount}`);

await (db.$client as Pool).end();
