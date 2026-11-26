import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import { computeSbuIndices } from "./scores.js";
import { attainment, kpiScore, rag, allIndices, dimensionScore } from "@akij-mms/calc";

const BASELINE = "FY25-26";
const TARGET = "FY26-27";
const FYS = ["FY26-27", "FY27-28", "FY28-29", "FY29-30", "FY30-31"];

/** Full SBU Brand Hub payload: indices, dimensions, KPIs, campaigns, market, revenue, budget, maturity. */
export async function getSbuHub(sbuId: number) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.id, sbuId));
  if (!sbu) return null;

  const sbuKpis = await db
    .select()
    .from(schema.sbuKpi)
    .where(and(eq(schema.sbuKpi.sbuId, sbuId), eq(schema.sbuKpi.active, true)));
  const kpiDefs = await db
    .select()
    .from(schema.kpiDefinition)
    .where(inArray(schema.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));

  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db
    .select()
    .from(schema.kpiActual)
    .where(and(inArray(schema.kpiActual.sbuKpiId, sbuKpiIds), eq(schema.kpiActual.periodId, BASELINE)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));

  const targets = await db
    .select()
    .from(schema.kpiTarget)
    .where(and(inArray(schema.kpiTarget.sbuKpiId, sbuKpiIds), eq(schema.kpiTarget.periodId, TARGET)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));

  // all 5 FY targets (FY26-27 .. FY30-31) for the KPI Scorecard detail view
  const fyTargets = await db
    .select()
    .from(schema.kpiTarget)
    .where(and(inArray(schema.kpiTarget.sbuKpiId, sbuKpiIds), inArray(schema.kpiTarget.periodId, FYS)));
  const fyTargetsBySbuKpi = new Map<number, Map<string, number>>();
  for (const t of fyTargets) {
    if (!fyTargetsBySbuKpi.has(t.sbuKpiId)) fyTargetsBySbuKpi.set(t.sbuKpiId, new Map());
    fyTargetsBySbuKpi.get(t.sbuKpiId)!.set(t.periodId, Number(t.value));
  }

  const dims = await db.select().from(schema.dimension);
  const dimById = new Map(dims.map((d) => [d.id, d]));

  const indices = await computeSbuIndices(sbuId);

  // per-dimension score + coverage (reuse the calc via computeSbuIndices' KPI list is internal;
  // compute directly here to expose per-dimension)
  const kpisForCalc = sbuKpis.map((sk) => {
    const def = defById.get(sk.kpiId);
    const actual = actualBySbuKpi.get(sk.id);
    const target = targetBySbuKpi.get(sk.id);
    return {
      code: def?.code ?? String(sk.kpiId),
      name: def?.name ?? "",
      dimension: (def?.dimensionId ?? "d1") as "d1" | "d2" | "d3" | "d4" | "d5" | "d6" | "d7",
      direction: (def?.direction ?? "higher") as "higher" | "lower",
      weightInDimension: Number(sk.weightInDimension),
      isEstimate: sk.isEstimate,
      actual: actual ? { value: Number(actual.value), confidence: actual.confidence ?? undefined } : null,
      target: target ? { value: Number(target.value) } : null,
    };
  });
  const allIdx = allIndices(kpisForCalc, false);

  // dimension-level roll-up
  const dimensions = dims
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => {
      const inDim = kpisForCalc.filter((k) => k.dimension === d.id);
      const sc = dimensionScore(inDim, false);
      return { id: d.id, name: d.name, weight: d.weight, score: sc.score, coverage: sc.coverage };
    });

  // KPI rows
  const kpis = sbuKpis.map((sk) => {
    const def = defById.get(sk.kpiId);
    const actual = actualBySbuKpi.get(sk.id);
    const target = targetBySbuKpi.get(sk.id);
    const att = actual && target ? attainment(Number(actual.value), Number(target.value), (def?.direction ?? "higher") as "higher" | "lower") : null;
    const score = kpiScore(att);
    return {
      code: def?.code ?? "",
      name: def?.name ?? "",
      dimension: def?.dimensionId ?? "",
      dimensionName: dimById.get(def?.dimensionId ?? "")?.name ?? "",
      unit: def?.unit ?? "",
      direction: def?.direction ?? "higher",
      fourP: sk.fourP,
      weightInDimension: Number(sk.weightInDimension),
      isEstimate: sk.isEstimate,
      actual: actual ? Number(actual.value) : null,
      target: target ? Number(target.value) : null,
      targets: FYS.map((fy) => ({ period: fy, value: fyTargetsBySbuKpi.get(sk.id)?.get(fy) ?? null })),
      confidence: actual?.confidence ?? null,
      source: actual?.source ?? null,
      asOf: actual?.asOf ?? null,
      attainment: att,
      score,
      rag: rag(att),
    };
  });

  // campaigns (online/offline, own vs competitor)
  const campaigns = await db.select().from(schema.campaign).where(eq(schema.campaign.sbuId, sbuId));
  const campaignIds = campaigns.map((c) => c.id);
  const metrics = campaignIds.length
    ? await db.select().from(schema.campaignMetric).where(inArray(schema.campaignMetric.campaignId, campaignIds))
    : [];
  const metricByCampaign = new Map(metrics.map((m) => [m.campaignId, m]));

  const campaignRow = (c: (typeof campaigns)[number]) => {
    const m = metricByCampaign.get(c.id);
    const company = c.name.split(" — ")[0] ?? c.name;
    return {
      id: c.id,
      name: c.name,
      company,
      channel: c.channel,
      status: c.status,
      isCompetitor: c.isCompetitor,
      spend: c.spendActual != null ? Number(c.spendActual) : null,
      spendEstimated: c.spendEstimated,
      confidence: c.confidence,
      reach: m?.reach ?? null,
      impressions: m?.impressions ?? null,
      ctr: m?.ctr ?? null,
    };
  };

  const campaignList = {
    online: campaigns.filter((c) => c.mode === "online").map(campaignRow),
    offline: campaigns.filter((c) => c.mode === "offline").map(campaignRow),
  };

  // market: own share + competitors + market size
  const ownBrands = await db.select().from(schema.brand).where(and(eq(schema.brand.sbuId, sbuId), eq(schema.brand.isOwn, true)));
  const compBrands = await db.select().from(schema.brand).where(and(eq(schema.brand.sbuId, sbuId), eq(schema.brand.isCompetitor, true)));
  const brandIds = [...ownBrands, ...compBrands].map((b) => b.id);
  const shares = brandIds.length
    ? await db.select().from(schema.marketShare).where(and(inArray(schema.marketShare.brandId, brandIds), eq(schema.marketShare.periodId, BASELINE)))
    : [];
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));

  const ownShare = ownBrands.map((b) => {
    const s = shareByBrand.get(b.id);
    return s ? { name: b.name, share: s.valueShare, isEstimate: s.isEstimate } : { name: b.name, share: null, isEstimate: true };
  });
  const competitors = compBrands.map((b) => {
    const s = shareByBrand.get(b.id);
    return { name: b.name, share: s?.valueShare ?? null, isEstimate: s?.isEstimate ?? true };
  });

  const market = { own: ownShare, competitors };

  // revenue
  const [revBase] = await db.select().from(schema.revenueActual).where(and(eq(schema.revenueActual.sbuId, sbuId), eq(schema.revenueActual.periodId, BASELINE)));
  const revTargets = await db.select().from(schema.revenueTarget).where(and(eq(schema.revenueTarget.sbuId, sbuId), inArray(schema.revenueTarget.periodId, FYS)));
  const revTargetByPeriod = new Map(revTargets.map((t) => [t.periodId, t]));
  const revenue = {
    base: revBase ? Number(revBase.value) : null,
    targets: FYS.map((fy) => ({ period: fy, value: revTargetByPeriod.get(fy) ? Number(revTargetByPeriod.get(fy)!.value) : null })),
  };

  // budget
  const budgetRows = await db.select().from(schema.budgetPlan).where(eq(schema.budgetPlan.sbuId, sbuId));
  const budget = budgetRows.find((b) => b.channel === "total") ?? budgetRows[0] ?? null;

  // maturity
  const [maturity] = await db.select().from(schema.maturityAssessment).where(eq(schema.maturityAssessment.sbuId, sbuId));

  return {
    sbu: {
      code: sbu.code,
      name: sbu.name,
      legalName: sbu.legalName,
      category: sbu.category,
      businessModel: sbu.businessModel,
      archetype: sbu.archetype,
      custodian: sbu.custodian,
      businessHead: sbu.businessHead,
    },
    indices: indices ?? allIdx,
    dimensions,
    kpis,
    campaigns: campaignList,
    market,
    revenue,
    budget: budget ? { period: budget.periodId, value: Number(budget.value), status: budget.status } : null,
    maturity: maturity
      ? { assessedAt: maturity.assessedAt, level: maturity.level, score: maturity.score, dimScores: maturity.dimScores }
      : null,
  };
}
