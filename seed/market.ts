import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

// Market growth assumption per SBU (to confirm with research — labelled estimate).
// These are the same assumptions used to project the 5-yr share trajectory in seed/sbus.ts.
const GROWTH: Record<string, number> = {
  ACCL: 6, AIL: 6, ARMCL: 6, AEL: 6, AAFL: 6, ALEL: 8, ABSL: 6,
  AAIL: 8, ACEL: 10, AASL: 8, NJL: 10, ALCL: 10, AMPL: 10,
};

const BASELINE = "FY25-26";

async function main() {
  const sbus = await db.select().from(schema.sbu).where(eq(schema.sbu.active, true));
  for (const s of sbus) {
    const existing = await db
      .select()
      .from(schema.marketSize)
      .where(and(eq(schema.marketSize.category, s.code), eq(schema.marketSize.periodId, BASELINE)))
      .limit(1);
    if (existing.length) continue;

    const [rev] = await db.select().from(schema.revenueActual).where(and(eq(schema.revenueActual.sbuId, s.id), eq(schema.revenueActual.periodId, BASELINE)));
    const ownBrand = await db.select().from(schema.brand).where(and(eq(schema.brand.sbuId, s.id), eq(schema.brand.isOwn, true))).limit(1);
    const share = ownBrand.length
      ? await db.select().from(schema.marketShare).where(and(eq(schema.marketShare.brandId, ownBrand[0].id), eq(schema.marketShare.periodId, BASELINE))).limit(1)
      : [];

    const shareVal = share.length && share[0].valueShare != null ? Number(share[0].valueShare) : null;
    const shareEstimate = share.length ? share[0].isEstimate : true;
    const revenue = rev ? Number(rev.value) : null;

    // implied market size = brand revenue / market share (derived, not fabricated)
    const marketValue = revenue != null && shareVal != null && shareVal > 0 ? Math.round((revenue / (shareVal / 100)) * 100) / 100 : null;

    await db.insert(schema.marketSize).values({
      category: s.code,
      periodId: BASELINE,
      value: marketValue != null ? String(marketValue) : "0",
      growth: GROWTH[s.code] ?? null,
      source: "implied from own revenue ÷ own share; growth = assumption (to confirm)",
      isEstimate: shareEstimate,
    });
    console.log(`seeded market size ${s.code}: ${marketValue?.toLocaleString("en-IN")} BDT Cr (growth ${GROWTH[s.code]}%${shareEstimate ? ", estimate" : ""})`);
  }
  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("market seed failed:", e);
  process.exitCode = 1;
});
