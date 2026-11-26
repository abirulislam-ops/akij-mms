import { getPortfolio } from "./analytics.js";
import { getCoverage } from "./coverage.js";
import { getSbuHub } from "./hub.js";
import { db, schema } from "./db.js";
import { eq } from "drizzle-orm";

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

/** KPI Scorecard CSV export for one SBU (baseline + FY1–FY5 targets + score). */
export async function exportScorecardCsv(code: string): Promise<string | null> {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return null;
  const hub = await getSbuHub(sbu.id);
  if (!hub) return null;

  const lines = [
    csvRow([`AKIJ Resource — MMS KPI Scorecard: ${hub.sbu.name}`, new Date().toISOString().slice(0, 10)]),
    csvRow([`CBDO framework — BEI = D1 · BHI = D2+D3+D6 · BPI = D4+D5+D7 · Composite = all 7`]),
    csvRow([]),
    csvRow(["KPI", "Dimension", "4P", "Unit", "Baseline (FY25-26)", ...hub.kpis[0]?.targets.map((t) => t.period) ?? [], "Attainment %", "Score (0-5)", "RAG", "Confidence", "Source"]),
    ...hub.kpis.map((k) =>
      csvRow([
        k.name,
        k.dimensionName,
        k.fourP ?? "",
        k.unit,
        k.actual ?? "",
        ...k.targets.map((t) => t.value ?? ""),
        k.attainment != null ? `${(k.attainment * 100).toFixed(0)}%` : "",
        k.score ?? "",
        k.rag,
        k.confidence ?? "",
        k.source ?? "",
      ]),
    ),
    csvRow([]),
    csvRow(["Index", "Score", "Coverage"]),
    ...(["BEI", "BHI", "BPI", "Composite"] as const).map((ix) =>
      csvRow([ix, hub.indices[ix].score?.toFixed(2) ?? "—", `${(hub.indices[ix].coverage * 100).toFixed(0)}%`]),
    ),
  ];
  return lines.join("\r\n");
}
