import { getCockpit } from "./scores.js";
import { getMarketOverview } from "./market.js";
import { getBudgetOverview } from "./budget.js";

/** Portfolio for the Executive Cockpit: scores + market reconciliation + budget in one payload. */
export async function getPortfolio() {
  const [cockpit, market, budget] = await Promise.all([getCockpit(), getMarketOverview(), getBudgetOverview()]);
  const marketByCode = new Map(market.map((m) => [m.code, m]));
  const budgetByCode = new Map(budget.rows.map((b) => [b.code, b]));

  const sbus = cockpit.map((c) => ({
    ...c,
    market: marketByCode.get(c.code) ?? null,
    budget: budgetByCode.get(c.code) ?? null,
  }));

  return { sbus, totals: { totalBudget: budget.totalBudget, totalSpend: budget.totalSpend } };
}
