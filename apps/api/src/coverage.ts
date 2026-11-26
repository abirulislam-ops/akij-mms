import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";

const BASELINE = "FY25-26";

type Status = "measured" | "estimate" | "missing";

interface ModuleCell {
  key: string;
  label: string;
  status: Status;
  detail: string;
  /** 0–1 measured coverage (for KPI dimensions). */
  measured?: number;
}

/**
 * Group coverage table: every SBU × every data module, with a
 * measured / estimate / missing status. Drives the "insufficient data"
 * register and the CBDO/MD data-completeness approval.
 */
export async function getCoverage() {
  const sbus = await db.select().from(schema.sbu).where(eq(schema.sbu.active, true));
  const sbuKpis = await db.select().from(schema.sbuKpi).where(eq(schema.sbuKpi.active, true));
  const kpiDefs = await db.select().from(schema.kpiDefinition);
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));

  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db
    .select()
    .from(schema.kpiActual)
    .where(and(inArray(schema.kpiActual.sbuKpiId, sbuKpiIds), eq(schema.kpiActual.periodId, BASELINE)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));

  const brands = await db.select().from(schema.brand);
  const brandIds = brands.map((b) => b.id);
  const shares = brandIds.length
    ? await db.select().from(schema.marketShare).where(and(inArray(schema.marketShare.brandId, brandIds), eq(schema.marketShare.periodId, BASELINE)))
    : [];
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));

  const campaigns = await db.select().from(schema.campaign);
  const revenues = await db.select().from(schema.revenueActual).where(eq(schema.revenueActual.periodId, BASELINE));
  const budgets = await db.select().from(schema.budgetPlan);
  const maturities = await db.select().from(schema.maturityAssessment);

  const sbuKpisBySbu = new Map<number, typeof sbuKpis>();
  for (const k of sbuKpis) {
    const arr = sbuKpisBySbu.get(k.sbuId) ?? [];
    arr.push(k);
    sbuKpisBySbu.set(k.sbuId, arr);
  }
  const brandsBySbu = new Map<number, typeof brands>();
  for (const b of brands) {
    const arr = brandsBySbu.get(b.sbuId!) ?? [];
    arr.push(b);
    brandsBySbu.set(b.sbuId!, arr);
  }
  const campaignsBySbu = new Map<number, typeof campaigns>();
  for (const c of campaigns) {
    const arr = campaignsBySbu.get(c.sbuId) ?? [];
    arr.push(c);
    campaignsBySbu.set(c.sbuId, arr);
  }
  const revBySbu = new Map(revenues.map((r) => [r.sbuId, r]));
  const budgetBySbu = new Map(budgets.map((b) => [b.sbuId, b]));
  const maturityBySbu = new Map(maturities.map((m) => [m.sbuId, m]));

  const DIM_LABEL: Record<string, string> = {
    d1: "Brand Equity",
    d2: "Brand Health",
    d3: "Positioning & Competitive",
    d4: "Market Performance",
    d5: "Financial Value",
    d6: "Digital Strength",
    d7: "Execution & Governance",
  };
  const DIM_ORDER = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"];

  const rows = sbus.map((s) => {
    const sk = sbuKpisBySbu.get(s.id) ?? [];
    const modules: ModuleCell[] = [];

    for (const dim of DIM_ORDER) {
      const inDim = sk.filter((k) => (defById.get(k.kpiId)?.dimensionId ?? "") === dim);
      if (inDim.length === 0) {
        modules.push({ key: dim, label: DIM_LABEL[dim], status: "missing", detail: "no KPIs" });
        continue;
      }
      let measuredWeight = 0;
      let totalWeight = 0;
      let estimateOnly = 0;
      for (const k of inDim) {
        totalWeight += Number(k.weightInDimension);
        const a = actualBySbuKpi.get(k.id);
        if (k.isEstimate) {
          estimateOnly++;
          continue;
        }
        if (a) measuredWeight += Number(k.weightInDimension);
      }
      const measured = totalWeight > 0 ? measuredWeight / totalWeight : 0;
      let status: Status;
      if (measuredWeight > 0) status = "measured";
      else if (estimateOnly > 0) status = "estimate";
      else status = "missing";
      const detail =
        status === "measured" ? `${(measured * 100).toFixed(0)}% measured` : status === "estimate" ? `${estimateOnly} estimate` : "no actuals";
      modules.push({ key: dim, label: DIM_LABEL[dim], status, detail, measured });
    }

    // Campaigns
    const sbCampaigns = campaignsBySbu.get(s.id) ?? [];
    const ownCamps = sbCampaigns.filter((c) => !c.isCompetitor);
    const compCamps = sbCampaigns.filter((c) => c.isCompetitor);
    modules.push({
      key: "campaigns",
      label: "Campaigns",
      status: ownCamps.length ? "measured" : compCamps.length ? "estimate" : "missing",
      detail: `${ownCamps.length} own / ${compCamps.length} competitor`,
    });

    // Market share
    const sbBrands = brandsBySbu.get(s.id) ?? [];
    const ownBrand = sbBrands.find((b) => b.isOwn);
    const ownShare = ownBrand ? shareByBrand.get(ownBrand.id) : undefined;
    const compBrands = sbBrands.filter((b) => b.isCompetitor);
    modules.push({
      key: "market",
      label: "Market & Share",
      status: ownShare ? (ownShare.isEstimate ? "estimate" : "measured") : "missing",
      detail: `${compBrands.length} competitors${ownShare?.valueShare != null ? ` · own ${ownShare.valueShare.toFixed(2)}%` : ""}`,
    });

    // Revenue
    const rev = revBySbu.get(s.id);
    modules.push({
      key: "revenue",
      label: "Revenue",
      status: rev ? "measured" : "missing",
      detail: rev ? `${Number(rev.value).toLocaleString("en-IN")} BDT Cr` : "no data",
    });

    // Budget
    const bud = budgetBySbu.get(s.id);
    modules.push({
      key: "budget",
      label: "Budget",
      status: bud ? "measured" : "missing",
      detail: bud ? `${Number(bud.value).toLocaleString("en-IN")} BDT Cr` : "no data",
    });

    // Maturity
    const mat = maturityBySbu.get(s.id);
    modules.push({
      key: "maturity",
      label: "Maturity",
      status: mat ? "measured" : "missing",
      detail: mat ? `L${mat.level ?? "—"} · ${(mat.score ?? 0).toFixed(2)}` : "no audit",
    });

    const measuredCount = modules.filter((m) => m.status === "measured").length;
    const estimateCount = modules.filter((m) => m.status === "estimate").length;
    const missingCount = modules.filter((m) => m.status === "missing").length;

    return {
      code: s.code,
      name: s.name,
      custodian: s.custodian,
      modules,
      measuredCount,
      estimateCount,
      missingCount,
      completeness: modules.length ? measuredCount / modules.length : 0,
    };
  });

  const moduleKeys = rows[0]?.modules.map((m) => m.key) ?? [];
  const totalCells = rows.length * moduleKeys.length;
  const measuredCells = rows.reduce((a, r) => a + r.measuredCount, 0);
  const estimateCells = rows.reduce((a, r) => a + r.estimateCount, 0);

  return {
    sbus: rows,
    moduleKeys,
    summary: {
      totalSbus: rows.length,
      totalModules: moduleKeys.length,
      measuredCells,
      estimateCells,
      missingCells: totalCells - measuredCells - estimateCells,
      groupCompleteness: totalCells ? measuredCells / totalCells : 0,
    },
  };
}
