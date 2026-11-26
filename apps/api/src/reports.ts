import { getPortfolio } from "./analytics.js";
import { getCoverage } from "./coverage.js";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(cols: unknown[]): string {
  return cols.map(csvCell).join(",");
}

/** Monthly MD pack — cockpit/portfolio CSV export. */
export async function exportCockpitCsv(): Promise<string> {
  const { sbus, totals } = await getPortfolio();
  const lines = [
    csvRow(["AKIJ Resource — Marketing Management System", "", ""]),
    csvRow(["Executive Cockpit export", new Date().toISOString().slice(0, 10), ""]),
    csvRow([]),
    csvRow(["SBU", "Category", "Composite", "BEI", "BHI", "BPI", "Coverage", "Revenue base (Cr)", "Revenue target (Cr)", "Market share", "Rank", "Brand growth", "Market growth", "Projected share", "Share change (pp)", "Verdict", "Flags", "Budget (Cr)", "Campaign spend (Cr)"]),
    ...sbus.map((s) =>
      csvRow([
        s.name,
        s.category,
        s.composite?.toFixed(2) ?? "",
        s.bei?.toFixed(2) ?? "",
        s.bhi?.toFixed(2) ?? "",
        s.bpi?.toFixed(2) ?? "",
        `${(s.coverage * 100).toFixed(0)}%`,
        s.revenueBase,
        s.revenueTarget,
        s.market?.ownShare,
        s.market?.rank ?? "",
        s.market?.brandGrowth,
        s.market?.marketGrowth,
        s.market?.projectedShare,
        s.market?.shareChangePp,
        s.market?.verdict ?? "",
        s.market?.flags.join("; ") ?? "",
        s.budget?.budget ?? "",
        s.budget?.campaignSpend ?? "",
      ]),
    ),
    csvRow([]),
    csvRow(["Total budget (Cr)", totals.totalBudget, "Tracked spend (Cr)", totals.totalSpend]),
  ];
  return lines.join("\r\n");
}

/** Coverage table CSV export (SBU × module). */
export async function exportCoverageCsv(): Promise<string> {
  const cov = await getCoverage();
  const lines = [
    csvRow(["AKIJ Resource — MMS Coverage table", new Date().toISOString().slice(0, 10)]),
    csvRow([]),
    csvRow(["SBU", "Custodian", ...cov.moduleKeys, "Measured", "Estimate", "Missing", "Completeness"]),
    ...cov.sbus.map((s) =>
      csvRow([
        s.name,
        s.custodian,
        ...cov.moduleKeys.map((k) => s.modules.find((m) => m.key === k)?.status ?? ""),
        s.measuredCount,
        s.estimateCount,
        s.missingCount,
        `${(s.completeness * 100).toFixed(0)}%`,
      ]),
    ),
  ];
  return lines.join("\r\n");
}
