import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

interface DecisionSeed {
  sbu: string | null;
  title: string;
  whatHappened: string;
  why: string;
  impact: string;
  options: { label: string; description?: string }[];
  recommendation: string;
  owner: string;
}

// Data-driven decision cards for the MD/CBDO — derived from reconciliation flags,
// SOV/SOM gaps and low data coverage. Not fabricated: each points at a specific gap.
const DECISIONS: DecisionSeed[] = [
  {
    sbu: "ACCL",
    title: "Approve Cement brand-equity baselines",
    whatHappened: "Aided awareness (62%), TOMA (16%), preference (20%) and other D1 KPIs are benchmark estimates — BEI is scored only because a handful were entered as measured.",
    why: "Until real research lands, Cement's Brand Equity Index rests on assumptions (currently 54% measured).",
    impact: "BEI (currently 3.00) may be materially wrong — inflating the Composite (2.45) the MD reviews.",
    options: [
      { label: "Commission Quantum brand-health wave now", description: "Replace estimates with measured awareness/TOMA/preference" },
      { label: "Approve benchmarks as interim official", description: "Accept current estimates until FY27 research" },
    ],
    recommendation: "Commission the brand-health wave; keep benchmarks as estimates (excluded) until then.",
    owner: "Research / Insights",
  },
  {
    sbu: "AIL",
    title: "Validate Ispat market-size assumption",
    whatHappened: "Ispat revenue is planned +48.5% vs a 6% assumed market growth — implied share jumps 3.5% → 4.9%.",
    why: "The implied market size (≈38,000 Cr) and 6% growth are assumptions, not sourced.",
    impact: "A wrong market-growth assumption flips the share verdict from gain to loss.",
    options: [
      { label: "Source steel-industry market CAGR", description: "From Bangladesh Steel Manufacturers Association / industry reports" },
      { label: "Keep 6% assumption, re-check quarterly" },
    ],
    recommendation: "Source the industry CAGR before locking FY27 targets.",
    owner: "Strategic Planning & Analysis",
  },
  {
    sbu: "ARMCL",
    title: "Close the SOV gap vs share",
    whatHappened: "Ready Mix has 11.2% share but only ~8% share of voice — SOV is 3.2pp below SOM.",
    why: "Share of voice below share of market signals under-investment relative to the brand's size.",
    impact: "Risk of share erosion vs Shah Cement RMC and LafargeHolcim RMC.",
    options: [
      { label: "Increase RMC media SOV", description: "Reallocate budget to raise SOV toward 11%" },
      { label: "Hold SOV; defend via channel partnerships" },
    ],
    recommendation: "Raise SOV; monitor SOV/SOM ratio monthly.",
    owner: "PR & Media Management",
  },
  {
    sbu: "ACEL",
    title: "Build ORCA brand-health measurement",
    whatHappened: "ORCA has only 24% of brand KPIs measured — equity and health are all benchmark estimates.",
    why: "A young brand (ORCA, consumer electronics) has no research wave yet.",
    impact: "Composite (1.50) and BEI (—) are provisional and may mislead planning.",
    options: [
      { label: "Launch a brand-health tracker", description: "Quarterly waves for awareness→advocacy" },
      { label: "Use web/social signals as interim", description: "digital SOV, search share" },
    ],
    recommendation: "Start a lightweight quarterly tracker; use digital signals meanwhile.",
    owner: "Digital Management",
  },
  {
    sbu: null,
    title: "Confirm market-growth assumptions group-wide",
    whatHappened: "All 13 SBUs use market-growth assumptions (6–10%) to project share — none are sourced.",
    why: "Every revenue↔share reconciliation and strategy flag depends on these rates.",
    impact: "A group-wide error in market growth would misstate every share verdict.",
    options: [
      { label: "Source per-category CAGR from industry bodies" },
      { label: "Use conservative flat growth until sourced" },
    ],
    recommendation: "Source per-category CAGR; mark current rates as estimates in the interim.",
    owner: "Research / Insights",
  },
];

async function main() {
  const sbus = await db.select().from(schema.sbu);
  const sbuIdByCode = new Map(sbus.map((s) => [s.code, s.id]));

  for (const d of DECISIONS) {
    const existing = await db.select().from(schema.decision).where(eq(schema.decision.title, d.title)).limit(1);
    if (existing.length) continue;

    await db.insert(schema.decision).values({
      sbuId: d.sbu ? sbuIdByCode.get(d.sbu) ?? null : null,
      title: d.title,
      whatHappened: d.whatHappened,
      why: d.why,
      impact: d.impact,
      options: d.options,
      recommendation: d.recommendation,
      owner: d.owner,
      status: "open",
    });
    console.log(`seeded decision: ${d.title}`);
  }
  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("decision seed failed:", e);
  process.exitCode = 1;
});
