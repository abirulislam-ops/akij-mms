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
const email = `mms-p4-${Date.now()}@akijresource.com`;
const password = "MmsTestPass123!";

async function getJwt() {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  let res = await fetch(`${BASE}/sign-up/email`, { method: "POST", headers, body: JSON.stringify({ email, password, name: "P4" }) });
  if (res.status >= 400) res = await fetch(`${BASE}/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const tok = await fetch(`${BASE}/token`, { method: "GET", headers: { Origin: "http://localhost:5173", Cookie: cookie } });
  return ((await tok.json()) as { token: string }).token;
}
const auth: Record<string, string> = { "Content-Type": "application/json" };
auth.Authorization = `Bearer ${await getJwt()}`;
await db.insert(schema.user).values({ email, name: "P4" }).onConflictDoNothing();
const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
const [spa] = await db.select({ id: schema.role.id }).from(schema.role).where(eq(schema.role.code, "SPA"));
if (u && spa) await db.insert(schema.userRole).values({ userId: u.id, roleId: spa.id }).onConflictDoNothing();

async function hit<T = any>(path: string, method = "GET", body?: unknown): Promise<{ status: number; body: T }> {
  const r = await app.request(path, { method, headers: auth, body: body != null ? JSON.stringify(body) : undefined });
  return { status: r.status, body: (await r.json()) as T };
}

const al = await hit<{ alerts: any[] }>("/api/alerts");
console.log(`/api/alerts → ${al.status} | ${al.body.alerts.length} alerts`);
for (const a of al.body.alerts.slice(0, 5)) console.log(`  [${a.severity}] ${a.sbuName}: ${a.message}${a.impactBdtCr != null ? ` (~${a.impactBdtCr} Cr)` : ""}`);

const dec = await hit<{ decisions: any[] }>("/api/decisions");
console.log(`\n/api/decisions → ${dec.status} | ${dec.body.decisions.length} decisions`);
for (const d of dec.body.decisions) console.log(`  [${d.status}] ${d.sbuName ?? "Group"}: ${d.title}`);

const wi = await hit<any>("/api/whatif", "POST", { code: "ARMCL", brandGrowth: 20 });
console.log(`\n/api/whatif ARMCL @20% → ${wi.status} | current ${wi.body.currentShare}% → proj ${wi.body.projectedShare}% (${wi.body.shareChangePp}pp) [${wi.body.verdict}]`);

const csv = await app.request("/api/export/cockpit.csv", { headers: auth });
const csvText = await csv.text();
console.log(`\n/api/export/cockpit.csv → ${csv.status} | ${csvText.split("\n").length} lines | starts "${csvText.slice(0, 40)}"`);

// transition a decision (SPA = admin tier)
if (dec.body.decisions.length) {
  const tr = await hit<any>(`/api/decisions/${dec.body.decisions[0].id}/transition`, "POST", { action: "assign", assignTo: "SPA" });
  console.log(`\n/api/decisions/${dec.body.decisions[0].id}/transition assign → ${tr.status} | status=${tr.body.status} owner=${tr.body.owner}`);
  // revert to open to keep seed clean
  await hit<any>(`/api/decisions/${dec.body.decisions[0].id}/transition`, "POST", { action: "ask" });
}

await (db.$client as Pool).end();
