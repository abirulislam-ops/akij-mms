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
const email = `mms-hub-${Date.now()}@akijresource.com`;
const password = "MmsTestPass123!";

async function getJwt() {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  let res = await fetch(`${BASE}/sign-up/email`, { method: "POST", headers, body: JSON.stringify({ email, password, name: "MMS Hub Test" }) });
  if (res.status >= 400) res = await fetch(`${BASE}/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const tok = await fetch(`${BASE}/token`, { method: "GET", headers: { Origin: "http://localhost:5173", Cookie: cookie } });
  return ((await tok.json()) as { token: string }).token;
}

const auth: Record<string, string> = { "Content-Type": "application/json" };
auth.Authorization = `Bearer ${await getJwt()}`;
await db.insert(schema.user).values({ email, name: "MMS Hub Test" }).onConflictDoNothing();
const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
const [viewer] = await db.select({ id: schema.role.id }).from(schema.role).where(eq(schema.role.code, "VIEWER"));
if (u && viewer) await db.insert(schema.userRole).values({ userId: u.id, roleId: viewer.id }).onConflictDoNothing();

for (const code of ["ACCL", "AIL", "ACEL"]) {
  const res = await app.request(`/api/sbus/${code}/hub`, { headers: auth });
  const h = (await res.json()) as Record<string, any>;
  console.log(`\n=== ${code} ${h.sbu?.name} ===`);
  console.log(`  indices: BEI=${h.indices?.BEI?.score} BHI=${h.indices?.BHI?.score} BPI=${h.indices?.BPI?.score} Comp=${h.indices?.Composite?.score}`);
  console.log(`  dimensions: ${h.dimensions?.length} | kpis: ${h.kpis?.length}`);
  console.log(`  campaigns: online=${h.campaigns?.online?.length} offline=${h.campaigns?.offline?.length}`);
  console.log(`  market: own=${h.market?.own?.length} competitors=${h.market?.competitors?.length}`);
  console.log(`  revenue base=${h.revenue?.base} | targets=${h.revenue?.targets?.length} | budget=${h.budget?.value}`);
  console.log(`  maturity: ${h.maturity ? `score=${h.maturity.score} level=${h.maturity.level}` : "none"}`);
}

await (db.$client as Pool).end();
