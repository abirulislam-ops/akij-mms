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
const email = `mms-test-${Date.now()}@akijresource.com`;
const password = "MmsTestPass123!";

async function getJwt() {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  let res = await fetch(`${BASE}/sign-up/email`, { method: "POST", headers, body: JSON.stringify({ email, password, name: "MMS Test" }) });
  if (res.status >= 400) res = await fetch(`${BASE}/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const tok = await fetch(`${BASE}/token`, { method: "GET", headers: { Origin: "http://localhost:5173", Cookie: cookie } });
  return ((await tok.json()) as { token: string }).token;
}

const auth: Record<string, string> = { "Content-Type": "application/json" };
const jwt = await getJwt();
auth.Authorization = `Bearer ${jwt}`;

// Provision the MMS user + an admin role so RBAC allows the upload.
await db.insert(schema.user).values({ email, name: "MMS Test" }).onConflictDoNothing();
const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
const [spa] = await db.select({ id: schema.role.id }).from(schema.role).where(eq(schema.role.code, "SPA"));
if (u && spa) await db.insert(schema.userRole).values({ userId: u.id, roleId: spa.id }).onConflictDoNothing();

async function indices(): Promise<Record<string, { score: number | null; coverage: number }>> {
  const res = await app.request("/api/sbus/ACCL", { headers: auth });
  return ((await res.json()) as { indices: Record<string, { score: number | null; coverage: number }> }).indices;
}

// 1. before
const before = await indices();
console.log("BEFORE commit — Cement indices:");
for (const [k, v] of Object.entries(before)) console.log(`  ${k.padEnd(10)} score=${v.score?.toFixed(2) ?? "—"} cov=${(v.coverage * 100).toFixed(0)}%`);

// 2. validate (preview)
const csv = [
  "sbu_code,kpi_code,period,value,confidence,source",
  "ACCL,aided_awareness,FY25-26,68,Med,Quantum study",
  "ACCL,brand_preference,FY25-26,20,Med,Quantum study",
  "ACCL,perceived_quality,FY25-26,68,Med,Quantum study",
  "ACCL,BAD_KPI,FY25-26,99,Med,bad", // should error
].join("\n");

const preview = await app.request("/api/upload/kpi-actuals", { method: "POST", headers: auth, body: JSON.stringify({ csv }) });
const pb = (await preview.json()) as { valid: number[]; errors: { line: number; message: string }[]; affectedSbus: string[] };
console.log(`\nPREVIEW: ${pb.valid.length} valid, ${pb.errors.length} error(s), affected ${pb.affectedSbus.join(", ")}`);
pb.errors.forEach((e) => console.log(`  [line ${e.line}] ${e.message}`));

// 3. commit
const commit = await app.request("/api/upload/kpi-actuals", { method: "POST", headers: auth, body: JSON.stringify({ csv, commit: true }) });
const cb = (await commit.json()) as { committed?: { inserted: number; updated: number } };
console.log(`\nCOMMIT: inserted=${cb.committed?.inserted} updated=${cb.committed?.updated}`);

// 4. after
const after = await indices();
console.log("\nAFTER commit — Cement indices (estimates cleared → equity now scored):");
for (const [k, v] of Object.entries(after)) console.log(`  ${k.padEnd(10)} score=${v.score?.toFixed(2) ?? "—"} cov=${(v.coverage * 100).toFixed(0)}%`);

// 5. freshness
const fr = await app.request("/api/freshness", { headers: auth });
const fb = (await fr.json()) as { datasets: { dataset: string; rows: number; latestPeriod: string | null }[] };
console.log("\nData freshness board:");
fb.datasets.forEach((d) => console.log(`  ${d.dataset.padEnd(16)} ${String(d.rows).padStart(4)} rows · latest ${d.latestPeriod ?? "—"}`));
