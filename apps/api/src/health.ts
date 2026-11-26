import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";

const BASELINE = "FY25-26";

// Awareness → advocacy funnel KPIs (in order), all in D1/D2.
const FUNNEL: { code: string; label: string }[] = [
  { code: "aided_awareness", label: "Awareness" },
  { code: "consideration", label: "Consideration" },
  { code: "brand_preference", label: "Preference" },
  { code: "brand_loyalty", label: "Loyalty" },
  { code: "reco", label: "Advocacy" },
];

/** Brand Health & Research funnel for an SBU, from D1/D2 KPI baselines. */
export async function getBrandHealth(code: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return null;

  const kpiDefs = await db.select().from(schema.kpiDefinition).where(inArray(schema.kpiDefinition.code, [...FUNNEL.map((f) => f.code), "nps"]));
  const defIdByCode = new Map(kpiDefs.map((d) => [d.code, d]));

  const sbuKpis = await db.select().from(schema.sbuKpi).where(and(eq(schema.sbuKpi.sbuId, sbu.id), eq(schema.sbuKpi.active, true)));
  const sbuKpiByKpiId = new Map(sbuKpis.map((k) => [k.kpiId, k]));

  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = sbuKpiIds.length
    ? await db.select().from(schema.kpiActual).where(and(inArray(schema.kpiActual.sbuKpiId, sbuKpiIds), eq(schema.kpiActual.periodId, BASELINE)))
    : [];
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));

  const npsDef = defIdByCode.get("nps");
  const npsKpi = npsDef ? sbuKpiByKpiId.get(npsDef.id) : undefined;
  const npsActual = npsKpi ? actualBySbuKpi.get(npsKpi.id) : undefined;

  const funnel = FUNNEL.map((f) => {
    const def = defIdByCode.get(f.code);
    const sk = def ? sbuKpiByKpiId.get(def.id) : undefined;
    const a = sk ? actualBySbuKpi.get(sk.id) : undefined;
    return {
      code: f.code,
      label: f.label,
      value: a ? Number(a.value) : null,
      confidence: a?.confidence ?? null,
      isEstimate: sk?.isEstimate ?? true,
    };
  });

  return {
    sbu: { code: sbu.code, name: sbu.name },
    funnel,
    nps: npsActual ? { value: Number(npsActual.value), confidence: npsActual.confidence, isEstimate: npsKpi?.isEstimate ?? true } : null,
  };
}
