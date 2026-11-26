import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

type Conf = "High" | "Med" | "Low" | "Web";
type FourP = "Product" | "Price" | "Place" | "Promotion";

// Shared benchmark-placeholder KPIs (17) — same for every SBU; "Low" = estimate.
const SHARED: [string, number, number, number[], string, Conf, FourP][] = [
  ["aided_awareness", 5, 62, [68, 72, 76, 80, 83], "%", "Low", "Promotion"],
  ["toma", 4, 16, [19, 22, 26, 30, 34], "%", "Low", "Promotion"],
  ["perceived_quality", 5, 68, [72, 76, 79, 82, 85], "index", "Low", "Product"],
  ["brand_preference", 5, 20, [24, 28, 32, 36, 40], "%", "Low", "Promotion"],
  ["brand_loyalty", 4, 55, [60, 65, 70, 75, 80], "%", "Low", "Place"],
  ["reco", 3, 45, [52, 58, 64, 70, 75], "%", "Low", "Product"],
  ["trust_credibility", 2, 70, [74, 78, 81, 84, 87], "%", "Low", "Product"],
  ["consideration", 7, 30, [34, 38, 42, 46, 50], "%", "Low", "Promotion"],
  ["nps", 6, 28, [32, 36, 40, 44, 48], "score", "Low", "Product"],
  ["sov", 9, 8, [9, 10, 11, 12, 13], "%", "Low", "Promotion"],
  ["distribution_reach", 5, 65, [70, 75, 80, 85, 90], "%", "Low", "Place"],
  ["romi", 4, 3.5, [4.0, 4.5, 5.0, 5.5, 6.0], "x", "Low", "Promotion"],
  ["share_of_search", 2, 7, [8, 9, 10, 11, 12], "%", "Low", "Promotion"],
  ["digital_sov", 2, 2.5, [3.0, 3.3, 3.7, 4.0, 4.3], "/5", "Web", "Promotion"],
  ["guideline_compliance", 4, 75, [85, 90, 93, 95, 97], "%", "Low", "Product"],
  ["campaign_effectiveness", 4, 70, [75, 80, 85, 88, 90], "%", "Low", "Promotion"],
  ["budget_efficiency", 3, 85, [90, 92, 94, 95, 96], "%", "Med", "Price"],
];

// Per-SBU finance/market data (12 non-Cement SBUs). np may have nulls.
interface SbuFin {
  code: string;
  revenue: number[]; // [base, fy1..fy5]
  np: (number | null)[]; // [base, fy1..fy5]
  share: number;
  shareReal: boolean;
  marketCAGR: number;
  budget: number;
  competitors: [string, number | null][];
}

const SBU_FIN: SbuFin[] = [
  { code: "AIL", revenue: [1329.01, 1973, 2900, 4100, 5700, 7292], np: [209.4, 10.3, 120, 240, 360, 477.8], share: 3.5, shareReal: true, marketCAGR: 6, budget: 32.96, competitors: [["BSRM", 33], ["Abul Khair Steel", null], ["GPH Ispat", null], ["KSRM", null]] },
  { code: "ARMCL", revenue: [330.51, 634.88, 737.88, 811.67, 904.28, 994.71], np: [null, null, null, null, null, null], share: 11.2, shareReal: true, marketCAGR: 6, budget: 2.59, competitors: [["Shah Cement RMC", 22.8], ["LafargeHolcim RMC", null], ["Fresh RMC", null]] },
  { code: "AEL", revenue: [3234.75, 3885.4, 4479.8, 4938.3, 5406.8, 5998.1], np: [-180.06, 19.2, 33.4, 53.5, 68.8, 101], share: 2.0, shareReal: false, marketCAGR: 6, budget: 20.18, competitors: [["Meghna Group", null], ["City Group", null], ["PRAN Group", null], ["Square Group", null]] },
  { code: "AAFL", revenue: [920.1, 1230, 1754, 2376, 3264, 4200], np: [-33.37, 7, 29.7, 64.2, 95.2, 147.7], share: 3.0, shareReal: false, marketCAGR: 6, budget: 10.0, competitors: [["ACI Godrej", null], ["Quality Feeds", null], ["Paragon", null], ["Nourish", null]] },
  { code: "ALEL", revenue: [124.56, 350.13, 739.27, 1222.27, 1843.41, 2528.62], np: [-1.85, 7.97, 63.74, 102.03, 147.57, 202.56], share: 1.5, shareReal: false, marketCAGR: 8, budget: 14.52, competitors: [["Walton", null], ["Singer", null], ["Butterfly", null]] },
  { code: "ABSL", revenue: [116.36, 405.75, 527.14, 659.79, 836.25, 1005.09], np: [4.56, 32.37, 76.38, 106.3, 139.64, 175.13], share: 2.0, shareReal: false, marketCAGR: 6, budget: 3.46, competitors: [["Mobil", null], ["Shell", null], ["Castrol", null]] },
  { code: "AAIL", revenue: [12.78, 81.8, 335.2, 655.1, 1519, 1955.7], np: [0.7, 1.1, 3.9, null, null, null], share: 0.5, shareReal: false, marketCAGR: 8, budget: 1.14, competitors: [["Gazi Tyres", null], ["Meghna Tyres", null], ["CEAT", null], ["MRF", null]] },
  { code: "ACEL", revenue: [3.96, 14.5, 37.6, 67.1, 101.7, 144.7], np: [null, null, null, null, null, null], share: 0.1, shareReal: true, marketCAGR: 10, budget: 3.16, competitors: [["Transcom Digital", 23], ["Rangs", null], ["Electro Mart", null]] },
  { code: "AASL", revenue: [1.73, 21.11, 28.54, 32.36, 40.84, 49.57], np: [-16.3, 0.78, 2.13, 1.91, 3.15, 4.66], share: 0.1, shareReal: false, marketCAGR: 8, budget: 2.03, competitors: [["Biman Bangladesh", null], ["US-Bangla", null], ["Novoair", null], ["Air Astra", null]] },
  { code: "NJL", revenue: [0.24, 5, 16.1, 42, 96.2, 154.5], np: [-1.56, null, null, 0.4, 12.2, 24.6], share: 0.1, shareReal: false, marketCAGR: 10, budget: 4.11, competitors: [["Bdjobs", null], ["Chakri.com", null], ["LinkedIn", null]] },
  { code: "ALCL", revenue: [34.02, 217.78, 482.97, 900, 1500, 2323.26], np: [null, null, null, null, null, null], share: 0.5, shareReal: false, marketCAGR: 10, budget: 1.41, competitors: [["Lazz Pharma", null], ["Prescription Aide", null], ["MediPlus", null]] },
  { code: "AMPL", revenue: [0.03, 14.48, 17.91, 24.18, 30.9, 40.07], np: [null, null, null, null, null, null], share: 0.1, shareReal: false, marketCAGR: 10, budget: 0.63, competitors: [["Popular Diagnostic", null], ["Labaid", null], ["Ibn Sina", null]] },
];

const FYS = ["FY26-27", "FY27-28", "FY28-29", "FY29-30", "FY30-31"];
const DIM_OF: Record<string, string> = {};
for (const [code, , dim] of [
  ["aided_awareness", "", "d1"], ["toma", "", "d1"], ["perceived_quality", "", "d1"], ["brand_preference", "", "d1"], ["brand_loyalty", "", "d1"], ["reco", "", "d1"], ["trust_credibility", "", "d1"],
  ["consideration", "", "d2"], ["nps", "", "d2"],
  ["sov", "", "d3"], ["share_of_search", "", "d3"],
  ["market_share", "", "d4"], ["volume_growth", "", "d4"], ["distribution_reach", "", "d4"],
  ["brand_revenue", "", "d5"], ["brand_profitability", "", "d5"], ["romi", "", "d5"],
  ["digital_sov", "", "d6"],
  ["guideline_compliance", "", "d7"], ["campaign_effectiveness", "", "d7"], ["budget_efficiency", "", "d7"],
]) DIM_OF[code] = dim;

function shareTraj(s: SbuFin): number[] {
  return FYS.map((_, i) => Math.round((s.share * (s.revenue[i + 1] / s.revenue[0]) / Math.pow(1 + s.marketCAGR / 100, i + 1)) * 100) / 100);
}

function npMargins(s: SbuFin): (number | null)[] {
  return s.np.map((v, i) => (v != null && s.revenue[i]) ? Math.round((v / s.revenue[i]) * 1000) / 10 : null);
}

async function main() {
  const kpiRows = await db.select().from(schema.kpiDefinition);
  const kpiIdByCode = new Map(kpiRows.map((k) => [k.code, k.id]));
  const sbuRows = await db.select().from(schema.sbu);
  const sbuIdByCode = new Map(sbuRows.map((s) => [s.code, s.id]));

  for (const s of SBU_FIN) {
    const sbuId = sbuIdByCode.get(s.code);
    if (!sbuId) { console.log(`skip ${s.code}: no SBU row`); continue; }

    // already seeded?
    const existing = await db.select().from(schema.sbuKpi).where(eq(schema.sbuKpi.sbuId, sbuId)).limit(1);
    if (existing.length) { console.log(`skip ${s.code}: already seeded`); continue; }

    // build the 21 KPIs: 17 shared + 4 custom
    const sh = shareTraj(s);
    const margins = npMargins(s);
    const haveNp = margins.some((m) => m != null);
    const npBase = haveNp && margins[0] != null ? margins[0]! : (haveNp ? margins.find((m) => m != null)! : 8);
    const npFy = FYS.map((_, i) => margins[i + 1] != null ? margins[i + 1]! : (haveNp ? (margins.find((m) => m != null) ?? 8) : 8 + i));

    const kpis: [string, number, number, number[], string, Conf, FourP][] = [
      ...SHARED,
      ["market_share", 9, s.share, sh, "%", s.shareReal ? "Med" : "Low", "Place"],
      ["volume_growth", 6, 0, s.revenue.slice(1).map((r, i) => Math.round((r / s.revenue[i] - 1) * 1000) / 10), "% YoY", "Low", "Place"],
      ["brand_revenue", 7, s.revenue[0], s.revenue.slice(1), "BDT Cr", "High", "Price"],
      ["brand_profitability", 4, npBase, npFy, "%", haveNp ? "High" : "Low", "Price"],
    ];

    // within-dimension totals for normalization
    const dimTotals: Record<string, number> = {};
    for (const [code, w] of kpis) dimTotals[DIM_OF[code]] = (dimTotals[DIM_OF[code]] ?? 0) + w;

    // own brand + market share
    const [own] = await db.insert(schema.brand).values({ sbuId, name: s.code === "AIL" ? "Akij Ispat" : s.code === "AEL" ? "Akij Essentials" : s.code === "AAFL" ? "Akij Agro Feed" : s.code === "ALEL" ? "Enovar" : s.code === "ABSL" ? "Benzol" : s.code === "AAIL" ? "Tyres" : s.code === "ACEL" ? "ORCA" : s.code === "AASL" ? "AKIJ AIR" : s.code === "NJL" ? "Nextjobz" : s.code === "ALCL" ? "AKIJ Pharmacy" : "Akij Mediplex", isOwn: true, isCompetitor: false }).returning({ id: schema.brand.id });
    await db.insert(schema.marketShare).values({ brandId: own.id, category: s.code, periodId: "FY25-26", valueShare: s.share, isEstimate: !s.shareReal });

    for (const [name, share] of s.competitors) {
      const [c] = await db.insert(schema.brand).values({ sbuId, name, isOwn: false, isCompetitor: true }).returning({ id: schema.brand.id });
      if (share != null) await db.insert(schema.marketShare).values({ brandId: c.id, category: s.code, periodId: "FY25-26", valueShare: share, isEstimate: false });
    }

    // 21 KPIs → sbu_kpi + actual + targets
    for (const [code, w, base, fy, , conf, fourP] of kpis) {
      const kpiId = kpiIdByCode.get(code);
      if (!kpiId) continue;
      const weightInDim = Math.round((w / (dimTotals[DIM_OF[code]] || 1)) * 10000) / 100;
      const [sk] = await db.insert(schema.sbuKpi).values({ sbuId, kpiId, weightInDimension: weightInDim, fourP, isEstimate: conf === "Low" }).returning({ id: schema.sbuKpi.id });
      await db.insert(schema.kpiActual).values({ sbuKpiId: sk.id, periodId: "FY25-26", value: base, confidence: conf, source: conf === "Low" ? "benchmark (assumption)" : conf === "Web" ? "web-fetched" : "strategy/ERP", asOf: "FY25-26" });
      for (let i = 0; i < 5; i++) await db.insert(schema.kpiTarget).values({ sbuKpiId: sk.id, periodId: FYS[i], value: fy[i], status: "approved", version: 1 });
    }

    // revenue + budget
    await db.insert(schema.revenueActual).values({ sbuId, periodId: "FY25-26", value: String(s.revenue[0]), source: "ERP/GL" });
    for (let i = 0; i < 5; i++) await db.insert(schema.revenueTarget).values({ sbuId, periodId: FYS[i], value: String(s.revenue[i + 1]), status: "approved" });
    await db.insert(schema.budgetPlan).values({ sbuId, periodId: "FY26-27", channel: "total", value: String(s.budget), status: "approved" });

    console.log(`seeded ${s.code}: ${kpis.length} KPIs, ${s.competitors.length} competitors`);
  }

  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("sbus seed failed:", e);
  process.exitCode = 1;
});
