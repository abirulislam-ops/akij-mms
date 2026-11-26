import { db } from "./db.js";
import { sql } from "drizzle-orm";

/** Data freshness board: row count + latest period per dataset. */
export async function getFreshness() {
  const datasets = [
    { name: "KPI actuals", table: "kpi_actual" },
    { name: "Revenue actuals", table: "revenue_actual" },
    { name: "Market share", table: "market_share" },
    { name: "Budget plan", table: "budget_plan" },
  ];

  const rows = [];
  for (const d of datasets) {
    const res = await db.execute(
      sql`SELECT count(*)::int AS n, max(period_id) AS latest_period FROM ${sql.raw(d.table)}`,
    );
    const r = res.rows[0] as { n: number; latest_period: string | null };
    rows.push({ dataset: d.name, rows: r?.n ?? 0, latestPeriod: r?.latest_period ?? null });
  }
  return rows;
}
