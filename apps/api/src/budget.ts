import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";

const BASELINE = "FY25-26";
const TARGET = "FY26-27";

/** Group budget & ROMI league table: budget plan, campaign spend, ROMI, intensity. */
export async function getBudgetOverview() {
  const sbus = await db.select().from(schema.sbu).where(eq(schema.sbu.active, true));
  const budgets = await db.select().from(schema.budgetPlan);
  const budgetBySbu = new Map<number, (typeof budgets)[number]>();
  for (const b of budgets) {
    if (!budgetBySbu.has(b.sbuId) || b.channel === "total") budgetBySbu.set(b.sbuId, b);
  }

  const campaigns = await db.select().from(schema.campaign).where(eq(schema.campaign.isCompetitor, false));
  const spendBySbu = new Map<number, number>();
  for (const c of campaigns) {
    const v = c.spendActual != null ? Number(c.spendActual) : 0;
    spendBySbu.set(c.sbuId, (spendBySbu.get(c.sbuId) ?? 0) + v);
  }

  const revs = await db.select().from(schema.revenueActual).where(eq(schema.revenueActual.periodId, BASELINE));
  const revBySbu = new Map(revs.map((r) => [r.sbuId, Number(r.value)]));

  // romi KPI actuals (baseline)
  const [romiDef] = await db.select().from(schema.kpiDefinition).where(eq(schema.kpiDefinition.code, "romi"));
  const romiKpis = romiDef ? await db.select().from(schema.sbuKpi).where(and(eq(schema.sbuKpi.kpiId, romiDef.id), eq(schema.sbuKpi.active, true))) : [];
  const romiKpiBySbu = new Map(romiKpis.map((k) => [k.sbuId, k.id]));
  const romiActuals = romiKpis.length
    ? await db.select().from(schema.kpiActual).where(and(inArray(schema.kpiActual.sbuKpiId, romiKpis.map((k) => k.id)), eq(schema.kpiActual.periodId, BASELINE)))
    : [];
  const romiBySbuKpi = new Map(romiActuals.map((a) => [a.sbuKpiId, a]));

  const rows = sbus.map((s) => {
    const budget = budgetBySbu.get(s.id);
    const budgetVal = budget ? Number(budget.value) : null;
    const spend = spendBySbu.get(s.id) ?? 0;
    const revenue = revBySbu.get(s.id) ?? null;
    const romiKpiId = romiKpiBySbu.get(s.id);
    const romiActual = romiKpiId ? romiBySbuKpi.get(romiKpiId) : undefined;
    const romiVal = romiActual ? Number(romiActual.value) : null;

    return {
      code: s.code,
      name: s.name,
      budget: budgetVal,
      campaignSpend: spend,
      spendVsPlan: budgetVal && budgetVal > 0 ? Math.round((spend / budgetVal) * 1000) / 10 : null,
      romi: romiVal,
      romiEstimate: romiActual ? romiActual.confidence === "Low" || romiActual.confidence === "Estimate" : true,
      intensity: revenue && revenue > 0 ? Math.round((spend / revenue) * 10000) / 100 : null,
    };
  });

  const totalBudget = rows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const totalSpend = rows.reduce((a, r) => a + r.campaignSpend, 0);

  return { rows, totalBudget, totalSpend };
}

/** SBU budget detail: channel breakdown (from budget_plan channels) + campaigns spend + ROMI. */
export async function getBudgetDetail(code: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return null;

  const budgets = await db.select().from(schema.budgetPlan).where(eq(schema.budgetPlan.sbuId, sbu.id));
  const campaigns = await db
    .select()
    .from(schema.campaign)
    .where(and(eq(schema.campaign.sbuId, sbu.id), eq(schema.campaign.isCompetitor, false)));

  const online = campaigns.filter((c) => c.mode === "online");
  const offline = campaigns.filter((c) => c.mode === "offline");
  const onlineSpend = online.reduce((a, c) => a + (c.spendActual != null ? Number(c.spendActual) : 0), 0);
  const offlineSpend = offline.reduce((a, c) => a + (c.spendActual != null ? Number(c.spendActual) : 0), 0);

  return {
    sbu: { code: sbu.code, name: sbu.name },
    budgets: budgets.map((b) => ({ channel: b.channel, value: Number(b.value), status: b.status })),
    campaignSpend: { online: onlineSpend, offline: offlineSpend, total: onlineSpend + offlineSpend },
  };
}
