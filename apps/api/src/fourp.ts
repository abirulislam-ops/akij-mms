import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import { attainment, kpiScore } from "@akij-mms/calc";

const BASELINE = "FY25-26";
const TARGET = "FY26-27";

const PS = ["Product", "Price", "Place", "Promotion"] as const;

/** Cross-SBU 4P studio: average score + coverage per P for every SBU. */
export async function getFourPOverview() {
  const sbus = await db.select().from(schema.sbu).where(eq(schema.sbu.active, true));
  const sbuKpis = await db.select().from(schema.sbuKpi).where(eq(schema.sbuKpi.active, true));
  const kpiDefs = await db.select().from(schema.kpiDefinition);
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));

  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db.select().from(schema.kpiActual).where(and(inArray(schema.kpiActual.sbuKpiId, sbuKpiIds), eq(schema.kpiActual.periodId, BASELINE)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const targets = await db.select().from(schema.kpiTarget).where(and(inArray(schema.kpiTarget.sbuKpiId, sbuKpiIds), eq(schema.kpiTarget.periodId, TARGET)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));

  const rows = sbus.map((s) => {
    const sk = sbuKpis.filter((k) => k.sbuId === s.id);
    const p4 = {} as Record<(typeof PS)[number], { score: number | null; coverage: number; measured: number; total: number }>;
    for (const p of PS) {
      const inP = sk.filter((k) => k.fourP === p);
      let scoreSum = 0;
      let measuredWeight = 0;
      let totalWeight = 0;
      let measuredCount = 0;
      for (const k of inP) {
        totalWeight += Number(k.weightInDimension);
        if (k.isEstimate) continue;
        const a = actualBySbuKpi.get(k.id);
        const t = targetBySbuKpi.get(k.id);
        if (!a || !t) continue;
        const def = defById.get(k.kpiId);
        const att = attainment(Number(a.value), Number(t.value), (def?.direction ?? "higher") as "higher" | "lower");
        const sc = kpiScore(att);
        if (att == null || sc == null) continue;
        scoreSum += sc * Number(k.weightInDimension);
        measuredWeight += Number(k.weightInDimension);
        measuredCount++;
      }
      const score = measuredWeight > 0 ? scoreSum / measuredWeight : null;
      const coverage = totalWeight > 0 ? measuredWeight / totalWeight : 0;
      p4[p] = { score, coverage, measured: measuredCount, total: inP.length };
    }
    return { code: s.code, name: s.name, category: s.category, p4 };
  });

  return { rows, ps: PS };
}

/** Single-SBU 4P detail with KPI-level rows. */
export async function getFourPDetail(code: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return null;

  const sbuKpis = await db.select().from(schema.sbuKpi).where(and(eq(schema.sbuKpi.sbuId, sbu.id), eq(schema.sbuKpi.active, true)));
  const kpiDefs = await db.select().from(schema.kpiDefinition).where(inArray(schema.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const actuals = await db.select().from(schema.kpiActual).where(and(inArray(schema.kpiActual.sbuKpiId, sbuKpis.map((k) => k.id)), eq(schema.kpiActual.periodId, BASELINE)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const targets = await db.select().from(schema.kpiTarget).where(and(inArray(schema.kpiTarget.sbuKpiId, sbuKpis.map((k) => k.id)), eq(schema.kpiTarget.periodId, TARGET)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));

  const p4 = PS.map((p) => {
    const inP = sbuKpis.filter((k) => k.fourP === p);
    return {
      p,
      kpis: inP.map((k) => {
        const def = defById.get(k.kpiId);
        const a = actualBySbuKpi.get(k.id);
        const t = targetBySbuKpi.get(k.id);
        const att = a && t ? attainment(Number(a.value), Number(t.value), (def?.direction ?? "higher") as "higher" | "lower") : null;
        return {
          code: def?.code ?? "",
          name: def?.name ?? "",
          unit: def?.unit ?? "",
          isEstimate: k.isEstimate,
          actual: a ? Number(a.value) : null,
          target: t ? Number(t.value) : null,
          attainment: att,
          score: kpiScore(att),
        };
      }),
    };
  });

  return { sbu: { code: sbu.code, name: sbu.name }, p4 };
}
