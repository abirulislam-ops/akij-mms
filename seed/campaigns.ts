import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

// ---- CSV parse + campaign-sheet parse (same logic as the HTML generator) ----
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (ch !== "\r") f += ch;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function keyOf(h: string): string | null {
  const s = h.toLowerCase();
  if (s.includes("company") || s.includes("brand")) return "company";
  if (s.includes("spend")) return "spend";
  if (s.includes("impr")) return "impr";
  if (s.includes("reach")) return "reach";
  if (s.includes("clicks")) return "clicks";
  if (s.includes("channel")) return "channels";
  if (s.includes("strategy")) return "strategy";
  return null;
}

interface CampSheet {
  ours: string;
  digital: { company: string; spend: number; impr: number; reach: number; clicks: number; channels: string; strategy: string }[];
  offline: { company: string; spend: number; channels: string; strategy: string }[];
}

function parseCamp(csv: string): CampSheet {
  const rows = parseCsv(csv).map((r) => r.map((c) => c.trim()));
  const out: CampSheet = { ours: "", digital: [], offline: [] };
  let mode: "digital" | "offline" | null = null;
  let map: Record<string, number> = {};
  for (const r of rows) {
    const j = r.join(" ");
    if (/Agency/.test(j)) { mode = null; continue; }
    if (r[0] === "Digital" && /Spend/.test(j)) { mode = "digital"; map = {}; r.forEach((h, i) => { const k = keyOf(h); if (k && map[k] === undefined) map[k] = i; }); continue; }
    if (r[0] === "Offline" && /Spend/.test(j)) { mode = "offline"; map = {}; r.forEach((h, i) => { const k = keyOf(h); if (k && map[k] === undefined) map[k] = i; }); continue; }
    if (/Revenue Wise|Total Spend|Total Revenue/.test(j)) { mode = null; continue; }
    if (!mode) continue;
    const company = map.company !== undefined ? r[map.company] ?? "" : "";
    if (!company || company === "Company" || company === "Brand" || company.startsWith("#")) continue;
    const pick = (k: string) => (map[k] !== undefined ? r[map[k]] ?? "" : "");
    const num = (s: string) => (s === "" ? 0 : Number(s));
    if (mode === "digital") {
      out.digital.push({ company, spend: num(pick("spend")), impr: num(pick("impr")), reach: num(pick("reach")), clicks: num(pick("clicks")), channels: pick("channels"), strategy: pick("strategy") });
    } else {
      out.offline.push({ company, spend: num(pick("spend")), channels: pick("channels"), strategy: pick("strategy") });
    }
  }
  out.ours = out.digital[0]?.company ?? out.offline[0]?.company ?? "";
  return out;
}

const CAMP_GIDS: Record<string, number> = {
  ACCL: 1178291686, AIL: 685984000, AEL: 191463693, AAFL: 0, AASL: 1822863590,
  ALEL: 163953483, ALCL: 363633079, ACEL: 660078482, ABSL: 1028081454,
};
const CAMP_URL = "https://docs.google.com/spreadsheets/d/1R4LGFHLB4_2NesA5ssIBMFkX_E-EVj5uqgS0PIg8Cuk/export?format=csv&gid=";

async function main() {
  const sbus = await db.select().from(schema.sbu);
  const sbuIdByCode = new Map(sbus.map((s) => [s.code, s.id]));

  for (const [code, gid] of Object.entries(CAMP_GIDS)) {
    const sbuId = sbuIdByCode.get(code);
    if (!sbuId) continue;

    // skip if already seeded
    const existing = await db.select().from(schema.campaign).where(eq(schema.campaign.sbuId, sbuId)).limit(1);
    if (existing.length) { console.log(`skip ${code}: campaigns already seeded`); continue; }

    let sheet: CampSheet;
    try {
      const res = await fetch(CAMP_URL + gid, { redirect: "follow" });
      sheet = parseCamp(await res.text());
    } catch (e) {
      console.log(`skip ${code}: fetch/parse failed (${e instanceof Error ? e.message : e})`);
      continue;
    }

    const all = [...sheet.digital, ...sheet.offline];
    if (!all.length) { console.log(`skip ${code}: no campaign rows`); continue; }

    let n = 0;
    for (const d of sheet.digital) {
      const isOurs = d.company === sheet.ours;
      const [c] = await db.insert(schema.campaign).values({
        sbuId,
        name: `${d.company} — digital`,
        mode: "online",
        channel: d.channels || "Digital",
        status: "done",
        isCompetitor: !isOurs,
        spendActual: String(d.spend),
        spendEstimated: !isOurs,
        source: "AR Marketing Campaigns & Activities sheet",
        confidence: isOurs ? "Med" : "Estimate",
      }).returning({ id: schema.campaign.id });
      if (d.impr || d.reach || d.clicks) {
        await db.insert(schema.campaignMetric).values({ campaignId: c.id, impressions: d.impr, reach: d.reach });
      }
      n++;
    }
    for (const o of sheet.offline) {
      const isOurs = o.company === sheet.ours;
      await db.insert(schema.campaign).values({
        sbuId,
        name: `${o.company} — offline`,
        mode: "offline",
        channel: o.channels || "Offline",
        status: "done",
        isCompetitor: !isOurs,
        spendActual: String(o.spend),
        spendEstimated: !isOurs,
        source: "AR Marketing Campaigns & Activities sheet",
        confidence: isOurs ? "Med" : "Estimate",
      });
      n++;
    }
    console.log(`seeded ${code}: ${n} campaigns (${sheet.digital.length} online / ${sheet.offline.length} offline)`);
  }

  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("campaign seed failed:", e);
  process.exitCode = 1;
});
