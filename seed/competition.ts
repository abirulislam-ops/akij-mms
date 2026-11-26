import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

const TODAY = new Date();
function daysAgo(d: number): string {
  const x = new Date(TODAY.getTime() - d * 86400000);
  return x.toISOString().slice(0, 10);
}

async function main() {
  const sbus = await db.select().from(schema.sbu);
  let profiles = 0;
  let activities = 0;

  for (const s of sbus) {
    const comps = await db.select().from(schema.brand).where(and(eq(schema.brand.sbuId, s.id), eq(schema.brand.isCompetitor, true)));
    if (!comps.length) continue;

    for (let i = 0; i < comps.length; i++) {
      const b = comps[i];
      const existing = await db.select().from(schema.competitorProfile).where(eq(schema.competitorProfile.brandId, b.id)).limit(1);
      if (!existing.length) {
        await db.insert(schema.competitorProfile).values({
          brandId: b.id,
          positioning: i === 0 ? "Market leader / scale" : "Tracked competitor",
          threatLevel: i === 0 ? "high" : "med",
          priceIndex: 100,
          strengths: i === 0 ? "Scale, distribution, brand recall" : "Active in category",
          weaknesses: "To validate with market-share file",
          updatedBy: "seed",
        });
        profiles++;
      }
    }

    // Sample activity log for ACCL (idempotent: only if none exist)
    if (s.code === "ACCL") {
      const have = await db.select({ id: schema.competitorActivity.id }).from(schema.competitorActivity).where(eq(schema.competitorActivity.sbuId, s.id)).limit(1);
      if (!have.length) {
        const pick = (i: number) => comps[i % comps.length].id;
        const rows: { brandId: number; activityType: "price_cut" | "dealer_scheme" | "tvc" | "digital"; days: number; channel: string; price?: number; reach?: number; message: string }[] = [
          { brandId: pick(0), activityType: "price_cut", days: 12, channel: "Retail", price: -5, reach: 0.7, message: "5% price cut on 50kg bag + dealer incentive" },
          { brandId: pick(1), activityType: "dealer_scheme", days: 20, channel: "Trade", reach: 0.6, message: "Dealer scheme: extra margin on bulk orders" },
          { brandId: pick(2), activityType: "tvc", days: 30, channel: "TV", reach: 0.8, message: "New TVC on strength/durability" },
          { brandId: pick(3), activityType: "digital", days: 8, channel: "Social", reach: 0.5, message: "Social push + search ads on 'best cement price'" },
        ];
        for (const r of rows) {
          await db.insert(schema.competitorActivity).values({
            sbuId: s.id,
            brandId: r.brandId,
            activityDate: daysAgo(r.days),
            activityType: r.activityType,
            channel: r.channel,
            spend: null,
            reach: r.reach,
            priceChangePct: r.price ?? null,
            message: r.message,
            createdBy: "seed",
          });
          activities++;
        }
      }
    }
  }

  console.log(`competition seed: ${profiles} profile(s), ${activities} activity row(s)`);
  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("competition seed failed:", e);
  process.exitCode = 1;
});
