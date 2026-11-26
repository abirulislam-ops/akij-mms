import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import { reconcile, excessSov } from "@akij-mms/calc";

const BASELINE = "FY25-26";
const TARGET = "FY26-27";

const FLAG_LABEL: Record<string, string> = {
  "revenue-growth-below-market": "Revenue grows slower than market",
  "share-loss": "Projected share loss",
  "unattainable-target": "Plan cannot reach target share",
  "implausible-ceiling": "Implied share above plausible ceiling",
};

async function loadShareData() {
  const sbus = await db.select().from(schema.sbu).where(eq(schema.sbu.active, true));
  const brands = await db.select().from(schema.brand);
  const shares = await db.select().from(schema.marketShare).where(eq(schema.marketShare.periodId, BASELINE));
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));

  const revs = await db.select().from(schema.revenueActual).where(eq(schema.revenueActual.periodId, BASELINE));
  const revBySbu = new Map(revs.map((r) => [r.sbuId, r]));
  const revTargets = await db.select().from(schema.revenueTarget).where(eq(schema.revenueTarget.periodId, TARGET));
  const revTargetBySbu = new Map(revTargets.map((t) => [t.sbuId, t]));

  const marketSizes = await db.select().from(schema.marketSize).where(eq(schema.marketSize.periodId, BASELINE));
  const marketByCategory = new Map(marketSizes.map((m) => [m.category, m]));

  // market_share KPI targets (share trajectory) + sov baseline for SOV vs SOM
  const kpiDefs = await db.select().from(schema.kpiDefinition).where(inArray(schema.kpiDefinition.code, ["market_share", "sov"]));
  const defIdByCode = new Map(kpiDefs.map((d) => [d.code, d.id]));
  const shareKpiId = defIdByCode.get("market_share");
  const sovKpiId = defIdByCode.get("sov");

  const sbuKpis = await db.select().from(schema.sbuKpi).where(eq(schema.sbuKpi.active, true));
  const sbuKpiById = new Map(sbuKpis.map((k) => [k.id, k]));
  const shareKpiBySbu = new Map<number, number>();
  const sovKpiBySbu = new Map<number, number>();
  for (const k of sbuKpis) {
    if (shareKpiId && k.kpiId === shareKpiId) shareKpiBySbu.set(k.sbuId, k.id);
    if (sovKpiId && k.kpiId === sovKpiId) sovKpiBySbu.set(k.sbuId, k.id);
  }

  const shareTargets = await db
    .select()
    .from(schema.kpiTarget)
    .where(and(inArray(schema.kpiTarget.sbuKpiId, [...shareKpiBySbu.values()]), eq(schema.kpiTarget.periodId, TARGET)));
  const shareTargetBySbuKpi = new Map(shareTargets.map((t) => [t.sbuKpiId, t]));

  const sovActuals = await db
    .select()
    .from(schema.kpiActual)
    .where(and(inArray(schema.kpiActual.sbuKpiId, [...sovKpiBySbu.values()]), eq(schema.kpiActual.periodId, BASELINE)));
  const sovBySbuKpi = new Map(sovActuals.map((a) => [a.sbuKpiId, a]));

  return { sbus, brands, shareByBrand, revBySbu, revTargetBySbu, marketByCategory, shareKpiBySbu, sovKpiBySbu, shareTargetBySbuKpi, sovBySbuKpi };
}

function pctShare(v: number | null | undefined): number | null {
  return v == null ? null : v / 100;
}

export async function getMarketOverview() {
  const d = await loadShareData();
  const rows = [];

  for (const s of d.sbus) {
    const own = d.brands.find((b) => b.sbuId === s.id && b.isOwn);
    const comps = d.brands.filter((b) => b.sbuId === s.id && b.isCompetitor);
    const ownShare = own ? d.shareByBrand.get(own.id) : undefined;
    const compShares = comps
      .map((c) => ({ name: c.name, share: d.shareByBrand.get(c.id)?.valueShare ?? null }))
      .filter((x): x is { name: string; share: number } => x.share != null);

    const rev = d.revBySbu.get(s.id);
    const revTarget = d.revTargetBySbu.get(s.id);
    const brandGrowth = rev && revTarget ? Number(revTarget.value) / Number(rev.value) - 1 : null;
    const market = d.marketByCategory.get(s.code);
    const marketGrowth = market?.growth != null ? Number(market.growth) / 100 : null;

    const ownShareVal = ownShare?.valueShare != null ? Number(ownShare.valueShare) : null;
    const rec = ownShareVal != null && brandGrowth != null && marketGrowth != null
      ? reconcile({ currentShare: pctShare(ownShareVal)!, brandGrowth, marketGrowth, shareCeiling: 0.6 })
      : null;

    // rank vs competitors (only when competitor shares are known)
    const allShares = [
      ...(ownShareVal != null ? [{ name: s.name, share: ownShareVal, own: true }] : []),
      ...compShares.map((c) => ({ ...c, own: false })),
    ].sort((a, b) => b.share - a.share);
    const rank = ownShareVal != null && compShares.length > 0 ? allShares.findIndex((x) => x.own) + 1 : null;

    // SOV vs SOM
    const sovKpiId = d.sovKpiBySbu.get(s.id);
    const sovActual = sovKpiId ? d.sovBySbuKpi.get(sovKpiId) : undefined;
    const sov = sovActual ? Number(sovActual.value) : null;
    const som = ownShareVal;
    const sovSom = sov != null && som != null ? excessSov(sov, som) : null;

    rows.push({
      code: s.code,
      name: s.name,
      category: s.category,
      ownShare: ownShareVal,
      ownShareEstimate: ownShare?.isEstimate ?? true,
      rank,
      competitorCount: comps.length,
      marketSize: market ? Number(market.value) : null,
      marketSizeEstimate: market?.isEstimate ?? true,
      marketGrowth: market?.growth != null ? Number(market.growth) : null,
      brandGrowth: brandGrowth != null ? Math.round(brandGrowth * 1000) / 10 : null,
      projectedShare: rec ? Math.round(rec.projectedShare * 10000) / 100 : null,
      shareChangePp: rec ? Math.round(rec.shareChangePp * 100) / 100 : null,
      verdict: rec?.verdict ?? null,
      flags: rec?.flags.map((f) => FLAG_LABEL[f]) ?? [],
      sov,
      excessSov: sovSom != null ? Math.round(sovSom * 100) / 100 : null,
    });
  }
  return rows;
}

export async function getMarketDetail(code: string) {
  const d = await loadShareData();
  const s = d.sbus.find((x) => x.code === code);
  if (!s) return null;

  const own = d.brands.find((b) => b.sbuId === s.id && b.isOwn);
  const comps = d.brands.filter((b) => b.sbuId === s.id && b.isCompetitor);

  const shareRows = [
    ...(own ? [{ name: own.name, own: true, share: d.shareByBrand.get(own.id)?.valueShare ?? null, isEstimate: d.shareByBrand.get(own.id)?.isEstimate ?? true }] : []),
    ...comps.map((c) => {
      const sh = d.shareByBrand.get(c.id);
      return { name: c.name, own: false, share: sh?.valueShare ?? null, isEstimate: sh?.isEstimate ?? true };
    }),
  ].sort((a, b) => (b.share ?? -1) - (a.share ?? -1));

  const rev = d.revBySbu.get(s.id);
  const revTarget = d.revTargetBySbu.get(s.id);
  const brandGrowth = rev && revTarget ? Number(revTarget.value) / Number(rev.value) - 1 : null;
  const market = d.marketByCategory.get(s.code);
  const marketGrowth = market?.growth != null ? Number(market.growth) / 100 : null;
  const ownShareVal = own ? d.shareByBrand.get(own.id)?.valueShare ?? null : null;

  const shareTargetKpiId = d.shareKpiBySbu.get(s.id);
  const shareTarget = shareTargetKpiId ? d.shareTargetBySbuKpi.get(shareTargetKpiId) : undefined;
  const targetShare = shareTarget ? Number(shareTarget.value) : null;

  const rec = ownShareVal != null && brandGrowth != null && marketGrowth != null
    ? reconcile({ currentShare: pctShare(Number(ownShareVal))!, brandGrowth, marketGrowth, targetShare: targetShare != null ? (pctShare(targetShare) ?? undefined) : undefined, shareCeiling: 0.6 })
    : null;

  const sovKpiId = d.sovKpiBySbu.get(s.id);
  const sov = sovKpiId ? Number(d.sovBySbuKpi.get(sovKpiId)?.value ?? 0) || null : null;

  return {
    sbu: { code: s.code, name: s.name, category: s.category },
    shareRows,
    ownShare: ownShareVal != null ? Number(ownShareVal) : null,
    brandGrowth: brandGrowth != null ? Math.round(brandGrowth * 1000) / 10 : null,
    marketGrowth: market?.growth != null ? Number(market.growth) : null,
    marketSize: market ? Number(market.value) : null,
    marketSizeEstimate: market?.isEstimate ?? true,
    targetShare,
    sov,
    excessSov: sov != null && ownShareVal != null ? Math.round(excessSov(sov, Number(ownShareVal)) * 100) / 100 : null,
    reconciliation: rec
      ? {
          projectedShare: Math.round(rec.projectedShare * 10000) / 100,
          shareChangePp: Math.round(rec.shareChangePp * 100) / 100,
          verdict: rec.verdict,
          flags: rec.flags.map((f) => ({ key: f, label: FLAG_LABEL[f] })),
        }
      : null,
  };
}
