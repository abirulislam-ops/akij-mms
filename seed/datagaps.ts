import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

interface Gap {
  sbu: string | null;
  item: string;
  whyNeeded: string;
  source: string;
  owner: string;
  priority: "high" | "medium" | "low";
}

const GAPS: Gap[] = [
  // live revenue missing from the ERP for these SBUs (different system / not yet transacting)
  { sbu: "ACEL", item: "FY26-27 revenue (ERP)", whyNeeded: "Live current-FY revenue for run-rate vs target", source: "iBOSDDD sales order / GL", owner: "Finance", priority: "high" },
  { sbu: "AASL", item: "FY26-27 revenue (ERP)", whyNeeded: "Live current-FY revenue for run-rate vs target", source: "iBOSDDD sales order / GL", owner: "Finance", priority: "high" },
  { sbu: "NJL", item: "FY26-27 revenue (ERP)", whyNeeded: "Live current-FY revenue for run-rate vs target", source: "NextJobs / iBOSDDD", owner: "Finance", priority: "high" },
  { sbu: "ALCL", item: "FY26-27 revenue (ERP)", whyNeeded: "Live current-FY revenue for run-rate vs target", source: "Pharmacy POS / iBOSDDD", owner: "Finance", priority: "high" },
  { sbu: "AMPL", item: "FY26-27 revenue (ERP)", whyNeeded: "Live current-FY revenue for run-rate vs target", source: "iBOSDDD sales order / GL", owner: "Finance", priority: "high" },
  // group-level research / market gaps
  { sbu: null, item: "Brand-health research waves (awareness, TOMA, NPS, preference)", whyNeeded: "Replace benchmark estimates that currently drive BEI/BHI", source: "Quantum / research agency", owner: "Research / Insights", priority: "high" },
  { sbu: null, item: "Competitor market shares (9 SBUs have no sourced shares)", whyNeeded: "To rank brands and compute share-of-market", source: "Nielsen / industry reports", owner: "Research / Insights", priority: "medium" },
  { sbu: null, item: "Per-category market CAGR (6–10% are assumptions)", whyNeeded: "Every revenue↔share reconciliation depends on it", source: "Industry associations / reports", owner: "Research / Insights", priority: "high" },
  { sbu: null, item: "Brand maturity assessments (12 SBUs missing)", whyNeeded: "Maturity roadmap L1→L5 for non-Cement SBUs", source: "Brand Maturity Audit", owner: "Strategic Planning & Analysis", priority: "medium" },
  { sbu: null, item: "Price points & distribution (numeric/weighted, dealers/retailers)", whyNeeded: "4P 'Price' and 'Place' scorecards", source: "ERP price lists / distribution data", owner: "Sales / Trade Marketing", priority: "medium" },
];

async function main() {
  const sbus = await db.select().from(schema.sbu);
  const sbuIdByCode = new Map(sbus.map((s) => [s.code, s.id]));

  for (const g of GAPS) {
    const existing = await db.select().from(schema.dataGap).where(eq(schema.dataGap.item, g.item)).limit(1);
    // allow per-SBU duplicates on the same item (revenue gap is per SBU)
    const sbuId = g.sbu ? sbuIdByCode.get(g.sbu) ?? null : null;
    const dup = existing.find((e) => (e.sbuId ?? null) === sbuId);
    if (dup) continue;

    await db.insert(schema.dataGap).values({
      sbuId,
      item: g.item,
      whyNeeded: g.whyNeeded,
      source: g.source,
      owner: g.owner,
      priority: g.priority,
      status: "open",
    });
    console.log(`seeded gap${g.sbu ? ` [${g.sbu}]` : " [group]"}: ${g.item}`);
  }
  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("data-gap seed failed:", e);
  process.exitCode = 1;
});
