import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import app from "../apps/api/src/index.js";

const BASE = process.env.NEON_AUTH_BASE_URL!;
const email = `mms-test-${Date.now()}@akijresource.com`;
const password = "MmsTestPass123!";

// sign up/in → session cookie → JWT
async function getJwt() {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  let res = await fetch(`${BASE}/sign-up/email`, { method: "POST", headers, body: JSON.stringify({ email, password, name: "MMS Test" }) });
  if (res.status >= 400) {
    res = await fetch(`${BASE}/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  }
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const tok = await fetch(`${BASE}/token`, { method: "GET", headers: { Origin: "http://localhost:5173", Cookie: cookie } });
  const tb = (await tok.json()) as { token?: string };
  return tb.token!;
}

const jwt = await getJwt();
const auth = { Authorization: `Bearer ${jwt}` };

const cockpit = await app.request("/api/cockpit", { headers: auth });
const cb = (await cockpit.json()) as { sbus: { code: string; name: string; composite: number | null; coverage: number; revenueBase: number | null; revenueTarget: number | null }[] };
console.log(`GET /api/cockpit → ${cockpit.status} · ${cb.sbus.length} SBUs`);
for (const s of cb.sbus) {
  console.log(`  ${s.code.padEnd(5)} ${s.name.padEnd(18)} composite=${s.composite?.toFixed(2) ?? "—"} cov=${(s.coverage * 100).toFixed(0)}% rev=${s.revenueBase ?? "—"}→${s.revenueTarget ?? "—"}`);
}

const acc = await app.request("/api/sbus/ACCL", { headers: auth });
const ab = (await acc.json()) as { sbu: { name: string }; indices: Record<string, { score: number | null; coverage: number }> };
console.log(`\nGET /api/sbu/ACCL → ${acc.status} · ${ab.sbu.name}`);
for (const [k, v] of Object.entries(ab.indices)) {
  console.log(`  ${k.padEnd(10)} score=${v.score?.toFixed(2) ?? "—"} cov=${(v.coverage * 100).toFixed(0)}%`);
}
