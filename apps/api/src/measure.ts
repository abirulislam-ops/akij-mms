import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import { computeSbuIndicesForPeriod } from "./scores.js";
import { commitKpiActuals, type UploadRow } from "./upload.js";

export interface MeasureRowInput {
  kpiCode: string;
  value: number | string;
  confidence?: string;
  source?: string;
}

/** KPI actuals for one SBU × period, with target and the same-period indices. */
export async function getSbuMeasure(code: string, period = "FY26-27") {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code)).limit(1);
  if (!sbu) return null;

  const sbuKpis = await db
    .select()
    .from(schema.sbuKpi)
    .where(and(eq(schema.sbuKpi.sbuId, sbu.id), eq(schema.sbuKpi.active, true)));
  if (!sbuKpis.length) return { sbu: { code: sbu.code, name: sbu.name }, period, rows: [], indices: null };

  const defs = await db.select().from(schema.kpiDefinition).where(inArray(schema.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(defs.map((d) => [d.id, d]));
  const ids = sbuKpis.map((k) => k.id);

  const actuals = await db.select().from(schema.kpiActual).where(and(inArray(schema.kpiActual.sbuKpiId, ids), eq(schema.kpiActual.periodId, period)));
  const targets = await db.select().from(schema.kpiTarget).where(and(inArray(schema.kpiTarget.sbuKpiId, ids), eq(schema.kpiTarget.periodId, period)));
  const aBy = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const tBy = new Map(targets.map((t) => [t.sbuKpiId, t]));

  const rows = sbuKpis
    .map((sk) => {
      const d = defById.get(sk.kpiId);
      const a = aBy.get(sk.id);
      const t = tBy.get(sk.id);
      return {
        kpiCode: d?.code ?? String(sk.kpiId),
        name: d?.name ?? "",
        dimension: d?.dimensionId ?? "d1",
        unit: d?.unit ?? null,
        direction: d?.direction ?? "higher",
        weightInDimension: Number(sk.weightInDimension),
        isEstimate: sk.isEstimate,
        target: t ? Number(t.value) : null,
        actual: a ? Number(a.value) : null,
        confidence: a?.confidence ?? null,
        source: a?.source ?? null,
      };
    })
    .sort((a, b) => a.dimension.localeCompare(b.dimension) || a.name.localeCompare(b.name));

  const indices = await computeSbuIndicesForPeriod(sbu.id, period);
  return { sbu: { code: sbu.code, name: sbu.name }, period, rows, indices };
}

/** Upsert custodian-entered actuals, then re-compute the same-period indices. */
export async function saveSbuMeasure(code: string, period: string, rows: MeasureRowInput[], byUser: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code)).limit(1);
  if (!sbu) return null;

  const upload: UploadRow[] = rows
    .filter((r) => r && r.kpiCode && r.value !== "" && r.value != null && !Number.isNaN(Number(r.value)))
    .map((r, i) => ({
      line: i + 1,
      sbuCode: code,
      kpiCode: r.kpiCode,
      periodId: period,
      value: Number(r.value),
      confidence: (r.confidence || "Med") as UploadRow["confidence"],
      source: r.source || "Custodian input",
    }));

  const saved = await commitKpiActuals(upload, byUser);
  const indices = await computeSbuIndicesForPeriod(sbu.id, period);
  return { saved, period, indices };
}
