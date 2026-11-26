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
const email = `mms-p3-${Date.now()}@akijresource.com`;
const password = "MmsTestPass123!";

async function getJwt() {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  let res = await fetch(`${BASE}/sign-up/email`, { method: "POST", headers, body: JSON.stringify({ email, password, name: "P3" }) });
  if (res.status >= 400) res = await fetch(`${BASE}/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const tok = await fetch(`${BASE}/token`, { method: "GET", headers: { Origin: "http://localhost:5173", Cookie: cookie } });
  return ((await tok.json()) as { token: string }).token;
}
const auth: Record<string, string> = { "Content-Type": "application/json" };
auth.Authorization = `Bearer ${await getJwt()}`;
await db.insert(schema.user).values({ email, name: "P3" }).onConflictDoNothing();
const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
const [v] = await db.select({ id: schema.role.id }).from(schema.role).where(eq(schema.role.code, "VIEWER"));
if (u && v) await db.insert(schema.userRole).values({ userId: u.id, roleId: v.id }).onConflictDoNothing();

async function hit<T = any>(path: string): Promise<{ status: number; body: T }> {
  const r = await app.request(path, { headers: auth });
  return { status: r.status, body: (await r.json()) as T };
}

const mkt = await hit<{ sbus: any[] }>("/api/market");
console.log(`/api/market → ${mkt.status}`);
for (const s of mkt.body.sbus.slice(0, 4)) {
  console.log(`  ${s.code.padEnd(5)} share=${s.ownShare}% (${s.ownShareEstimate ? "est" : "real"}) rank=${s.rank ?? "—"} mkt=${s.marketSize?.toLocaleString?.("en-IN")}Cr growth=${s.marketGrowth}% brand=${s.brandGrowth}% → projShare=${s.projectedShare}% [${s.verdict}]${s.flags.length ? " FLAGS:" + s.flags.join(";") : ""} SOV-SOM=${s.excessSov}`);
}

const md = await hit<any>("/api/market/ACCL");
console.log(`\n/api/market/ACCL → ${md.status} | shareRows=${md.body.shareRows?.length} | recon flags=${md.body.reconciliation?.flags?.length}`);

const bd = await hit<{ rows: any[]; totalBudget: number; totalSpend: number }>("/api/budget");
console.log(`\n/api/budget → ${bd.status} | totalBudget=${bd.body.totalBudget} totalSpend=${bd.body.totalSpend}`);
for (const r of bd.body.rows.slice(0, 4)) {
  console.log(`  ${r.code.padEnd(5)} budget=${r.budget} spend=${r.campaignSpend} vsPlan=${r.spendVsPlan}% romi=${r.romi} intensity=${r.intensity}%`);
}

const st = await hit<any>("/api/strategy/ACCL");
console.log(`\n/api/strategy/ACCL → ${st.status} | dims=${st.body.dimSummary?.length} | weightProposals=${st.body.weightProposals?.length}`);

const h = await hit<any>("/api/health/ACCL");
console.log(`/api/health/ACCL → ${h.status} | funnel=${h.body.funnel?.map((f: any) => `${f.label}=${f.value}`).join(", ")} | nps=${h.body.nps?.value}`);

const fp = await hit<{ rows: any[]; ps: string[] }>("/api/fourp");
console.log(`/api/fourp → ${fp.status} | ps=${fp.body.ps?.join(",")} | rows=${fp.body.rows?.length}`);
console.log(`  ACCL: ${JSON.stringify(fp.body.rows?.find((r: any) => r.code === "ACCL")?.p4)}`);

const an = await hit<any>("/api/analytics");
console.log(`\n/api/analytics → ${an.status} | sbus=${an.body.sbus?.length} | totals=${JSON.stringify(an.body.totals)}`);

await (db.$client as Pool).end();
