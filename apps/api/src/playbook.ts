import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import { rampModel } from "@akij-mms/calc";

const FYS = ["FY26-27", "FY27-28", "FY28-29", "FY29-30", "FY30-31"];
const BASELINE = "FY25-26";

export async function getPlaybook(code: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code)).limit(1);
  if (!sbu) return null;

  const [pb] = await db
    .select()
    .from(schema.playbook)
    .where(and(eq(schema.playbook.sbuId, sbu.id), eq(schema.playbook.fy, "FY26-27")))
    .limit(1);

  // share baseline + targets
  const brands = await db.select().from(schema.brand).where(eq(schema.brand.sbuId, sbu.id));
  const shares = await db.select().from(schema.marketShare).where(eq(schema.marketShare.periodId, BASELINE));
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));
  const own = brands.find((b) => b.isOwn);
  const shareNow = own ? (shareByBrand.get(own.id)?.valueShare != null ? Number(shareByBrand.get(own.id)!.valueShare) : null) : null;

  const [shareDef] = await db.select().from(schema.kpiDefinition).where(eq(schema.kpiDefinition.code, "market_share")).limit(1);
  let shareTargets: number[] | null = null;
  if (shareDef) {
    const sks = await db.select().from(schema.sbuKpi).where(and(eq(schema.sbuKpi.sbuId, sbu.id), eq(schema.sbuKpi.kpiId, shareDef.id))).limit(1);
    if (sks.length) {
      const ts = await db.select().from(schema.kpiTarget).where(and(eq(schema.kpiTarget.sbuKpiId, sks[0].id), inArray(schema.kpiTarget.periodId, FYS)));
      const map = new Map(ts.map((t) => [t.periodId, Number(t.value)]));
      if (FYS.every((f) => map.has(f))) shareTargets = FYS.map((f) => map.get(f) as number);
    }
  }
  const shareRamp = shareNow != null && shareTargets ? rampModel(shareNow, shareTargets, "level") : null;

  // revenue baseline + targets
  const revBase = await db.select().from(schema.revenueActual).where(and(eq(schema.revenueActual.sbuId, sbu.id), eq(schema.revenueActual.periodId, BASELINE))).limit(1);
  const revTs = await db.select().from(schema.revenueTarget).where(and(eq(schema.revenueTarget.sbuId, sbu.id), inArray(schema.revenueTarget.periodId, FYS)));
  const revMap = new Map(revTs.map((t) => [t.periodId, Number(t.value)]));
  const baseRev = revBase.length ? Number(revBase[0].value) : null;
  const revTargets = FYS.every((f) => revMap.has(f)) ? FYS.map((f) => revMap.get(f) as number) : null;
  const revRamp = baseRev != null && revTargets ? rampModel(baseRev, revTargets, "flow") : null;

  // priority KPIs (highest within-dimension weight)
  const priorityKpis = await db
    .select({
      code: schema.kpiDefinition.code,
      name: schema.kpiDefinition.name,
      dimensionId: schema.kpiDefinition.dimensionId,
      unit: schema.kpiDefinition.unit,
      weightInDimension: schema.sbuKpi.weightInDimension,
      fourP: schema.sbuKpi.fourP,
    })
    .from(schema.sbuKpi)
    .innerJoin(schema.kpiDefinition, eq(schema.sbuKpi.kpiId, schema.kpiDefinition.id))
    .where(eq(schema.sbuKpi.sbuId, sbu.id))
    .orderBy(desc(schema.sbuKpi.weightInDimension))
    .limit(8);

  // digital benchmark
  const presence = await db.select().from(schema.digitalPresence).where(eq(schema.digitalPresence.periodId, BASELINE));
  const pByBrand = new Map(presence.map((p) => [p.brandId, p]));
  const digital = brands.map((b) => {
    const pr = pByBrand.get(b.id);
    return {
      name: b.name,
      own: b.isOwn,
      score: pr?.presenceScore != null ? Number(pr.presenceScore) : null,
      website: pr?.website ?? b.website ?? null,
      channels: pr?.socialChannels ?? null,
      content: pr?.contentDepth ?? null,
    };
  });

  return {
    sbu: { code: sbu.code, name: sbu.name, category: sbu.category },
    playbook: pb ?? null,
    shareNow,
    shareRamp,
    baseRev,
    revRamp,
    priorityKpis,
    digital,
  };
}
