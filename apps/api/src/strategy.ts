import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";

const BASELINE = "FY25-26";
const FYS = ["FY26-27", "FY27-28", "FY28-29", "FY29-30", "FY30-31"];

/** Strategy & Targets: revenue glide path, KPI target coverage, weight proposals, reconciliation. */
export async function getStrategy(code: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return null;

  // revenue glide path
  const [revBase] = await db.select().from(schema.revenueActual).where(and(eq(schema.revenueActual.sbuId, sbu.id), eq(schema.revenueActual.periodId, BASELINE)));
  const revTargets = await db.select().from(schema.revenueTarget).where(and(eq(schema.revenueTarget.sbuId, sbu.id), inArray(schema.revenueTarget.periodId, FYS)));
  const revTargetByPeriod = new Map(revTargets.map((t) => [t.periodId, t]));
  const revenue = {
    base: revBase ? Number(revBase.value) : null,
    targets: FYS.map((fy) => ({ period: fy, value: revTargetByPeriod.get(fy) ? Number(revTargetByPeriod.get(fy)!.value) : null, status: revTargetByPeriod.get(fy)?.status ?? null })),
  };

  // KPI targets by dimension (count + approved)
  const sbuKpis = await db.select().from(schema.sbuKpi).where(and(eq(schema.sbuKpi.sbuId, sbu.id), eq(schema.sbuKpi.active, true)));
  const kpiDefs = await db.select().from(schema.kpiDefinition).where(inArray(schema.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const dims = await db.select().from(schema.dimension);

  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const targets = sbuKpiIds.length
    ? await db.select().from(schema.kpiTarget).where(and(inArray(schema.kpiTarget.sbuKpiId, sbuKpiIds), eq(schema.kpiTarget.periodId, FYS[0])))
    : [];
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));

  const dimSummary = dims.sort((a, b) => a.sortOrder - b.sortOrder).map((dim) => {
    const inDim = sbuKpis.filter((k) => defById.get(k.kpiId)?.dimensionId === dim.id);
    const withTarget = inDim.filter((k) => targetBySbuKpi.has(k.id)).length;
    return { id: dim.id, name: dim.name, weight: dim.weight, kpiCount: inDim.length, withTarget, approved: withTarget };
  });

  // weight proposals
  const weightSets = await db.select().from(schema.weightSet).where(eq(schema.weightSet.sbuId, sbu.id));
  const weightProposals = weightSets.map((w) => ({ version: w.version, status: w.status, weights: w.weights, proposedBy: w.proposedBy, approvedBy: w.approvedBy }));

  // strategic objectives
  const strategies = await db.select().from(schema.strategy).where(eq(schema.strategy.sbuId, sbu.id));
  const strategyIds = strategies.map((s) => s.id);
  const objectives = strategyIds.length
    ? await db.select().from(schema.strategicObjective).where(inArray(schema.strategicObjective.strategyId, strategyIds))
    : [];
  const objectivesOut = objectives.map((o) => ({ title: o.title, detail: o.detail, target: o.numericTarget != null ? Number(o.numericTarget) : null, unit: o.unit }));

  return {
    sbu: { code: sbu.code, name: sbu.name },
    revenue,
    dimSummary,
    weightProposals,
    objectives: objectivesOut,
  };
}
