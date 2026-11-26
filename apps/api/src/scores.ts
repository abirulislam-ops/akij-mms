import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import { allIndices, type Kpi } from "@akij-mms/calc";

const BASELINE = "FY25-26";
const TARGET = "FY26-27";

/** Compute BEI/BHI/BPI/Composite for an SBU from live DB data (baseline actual vs FY26-27 target). */
async function computeIndices(sbuId: number, actualPeriodId: string) {
  const sbuKpis = await db
    .select()
    .from(schema.sbuKpi)
    .where(and(eq(schema.sbuKpi.sbuId, sbuId), eq(schema.sbuKpi.active, true)));
  if (!sbuKpis.length) return null;

  const kpiDefs = await db
    .select()
    .from(schema.kpiDefinition)
    .where(inArray(schema.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));

  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db
    .select()
    .from(schema.kpiActual)
    .where(and(inArray(schema.kpiActual.sbuKpiId, sbuKpiIds), eq(schema.kpiActual.periodId, actualPeriodId)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));

  const targets = await db
    .select()
    .from(schema.kpiTarget)
    .where(and(inArray(schema.kpiTarget.sbuKpiId, sbuKpiIds), eq(schema.kpiTarget.periodId, TARGET)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));

  const kpis: Kpi[] = sbuKpis.map((sk) => {
    const def = defById.get(sk.kpiId);
    const actual = actualBySbuKpi.get(sk.id);
    const target = targetBySbuKpi.get(sk.id);
    return {
      code: def?.code ?? String(sk.kpiId),
      name: def?.name ?? "",
      dimension: (def?.dimensionId ?? "d1") as Kpi["dimension"],
      direction: (def?.direction ?? "higher") as Kpi["direction"],
      weightInDimension: Number(sk.weightInDimension),
      isEstimate: sk.isEstimate,
      actual: actual ? { value: Number(actual.value), confidence: actual.confidence ?? undefined } : null,
      target: target ? { value: Number(target.value) } : null,
    };
  });

  return allIndices(kpis, false);
}

/** Baseline (FY25-26 actual) vs FY26-27 target — the cockpit score. */
export async function computeSbuIndices(sbuId: number) {
  return computeIndices(sbuId, BASELINE);
}

/** A chosen actual period vs the same-period target — used by Measurement. */
export async function computeSbuIndicesForPeriod(sbuId: number, actualPeriodId: string) {
  return computeIndices(sbuId, actualPeriodId);
}

/** Group cockpit: every active SBU with its Composite score + revenue + market share. */
export async function getCockpit() {
  const sbus = await db.select().from(schema.sbu).where(eq(schema.sbu.active, true));
  const rows = [];
  for (const s of sbus) {
    const indices = await computeSbuIndices(s.id);
    const [revActual] = await db
      .select()
      .from(schema.revenueActual)
      .where(and(eq(schema.revenueActual.sbuId, s.id), eq(schema.revenueActual.periodId, BASELINE)));
    const [revTarget] = await db
      .select()
      .from(schema.revenueTarget)
      .where(and(eq(schema.revenueTarget.sbuId, s.id), eq(schema.revenueTarget.periodId, TARGET)));
    rows.push({
      code: s.code,
      name: s.name,
      category: s.category,
      custodian: s.custodian,
      composite: indices?.Composite.score ?? null,
      bei: indices?.BEI.score ?? null,
      bhi: indices?.BHI.score ?? null,
      bpi: indices?.BPI.score ?? null,
      coverage: indices?.Composite.coverage ?? 0,
      revenueBase: revActual ? Number(revActual.value) : null,
      revenueTarget: revTarget ? Number(revTarget.value) : null,
    });
  }
  return rows;
}
