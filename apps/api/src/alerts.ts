import { getMarketOverview } from "./market.js";
import { getCockpit } from "./scores.js";
import { getBudgetOverview } from "./budget.js";

export type Severity = "critical" | "high" | "medium" | "low";

export interface Alert {
  id: string;
  sbuCode: string;
  sbuName: string;
  severity: Severity;
  rule: string;
  message: string;
  impactBdtCr: number | null;
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Rules-based alert engine. Evaluates live data (reconciliation, coverage,
 * SOV/SOM, budget) and returns the current alert set — always computed, never stale.
 */
export async function runAlertEngine(): Promise<Alert[]> {
  const [market, cockpit, budget] = await Promise.all([getMarketOverview(), getCockpit(), getBudgetOverview()]);
  const cockpitByCode = new Map(cockpit.map((c) => [c.code, c]));
  const budgetByCode = new Map(budget.rows.map((b) => [b.code, b]));

  const alerts: Alert[] = [];
  const push = (sbuCode: string, sbuName: string, severity: Severity, rule: string, message: string, impact: number | null) => {
    alerts.push({ id: `${sbuCode}:${rule}`, sbuCode, sbuName, severity, rule, message, impactBdtCr: impact });
  };

  for (const m of market) {
    const c = cockpitByCode.get(m.code);
    const b = budgetByCode.get(m.code);

    // share loss / revenue below market
    if (m.verdict === "loss" || (m.shareChangePp != null && m.shareChangePp < -0.5)) {
      const impact = m.shareChangePp != null && m.marketSize != null ? Math.round((Math.abs(m.shareChangePp) / 100) * m.marketSize * 10) / 10 : null;
      push(m.code, m.name, "high", "share-loss", `Projected market-share loss of ${Math.abs(m.shareChangePp!).toFixed(1)}pp at current growth plan`, impact);
    } else if (m.brandGrowth != null && m.marketGrowth != null && m.brandGrowth < m.marketGrowth) {
      push(m.code, m.name, "medium", "revenue-below-market", `Revenue growth ${m.brandGrowth}% trails market ${m.marketGrowth}% — share will erode`, null);
    }

    if (m.flags.includes("unattainable-target")) {
      push(m.code, m.name, "high", "unattainable-target", "Revenue plan cannot deliver the target share at the assumed market growth", null);
    }
    if (m.flags.includes("implausible-ceiling")) {
      push(m.code, m.name, "medium", "implausible-ceiling", "Implied share exceeds the plausible ceiling — plan likely over-stated", null);
    }

    // SOV vs SOM
    if (m.excessSov != null && m.excessSov < 0) {
      push(m.code, m.name, "medium", "sov-below-som", `Share of voice is ${Math.abs(m.excessSov).toFixed(1)}pp below share of market — under-investment risk`, null);
    }

    // data completeness
    if (c && c.coverage < 0.4) {
      push(m.code, m.name, "medium", "low-coverage", `Only ${(c.coverage * 100).toFixed(0)}% of brand KPIs measured — scores are provisional`, null);
    }
    if (m.rank == null && m.competitorCount > 0) {
      push(m.code, m.name, "low", "no-competitor-share", `Competitor shares unknown — cannot rank (${m.competitorCount} competitors tracked)`, null);
    }

    // budget
    if (b && b.spendVsPlan != null && b.spendVsPlan > 100) {
      push(m.code, m.name, "critical", "budget-overrun", `Campaign spend is ${b.spendVsPlan}% of plan — over budget`, null);
    }
  }

  return alerts.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}
