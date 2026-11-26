import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { Pool } from "pg";
import { allIndices, type Kpi } from "@akij-mms/calc";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. Counts
const counts = await pool.query(`
  SELECT
    (SELECT count(*) FROM dimension)       AS dimensions,
    (SELECT count(*) FROM kpi_definition)  AS kpi_library,
    (SELECT count(*) FROM sbu)             AS sbus,
    (SELECT count(*) FROM sbu_kpi)         AS sbu_kpis,
    (SELECT count(*) FROM kpi_actual)      AS actuals,
    (SELECT count(*) FROM kpi_target)      AS targets,
    (SELECT count(*) FROM brand)           AS brands,
    (SELECT count(*) FROM market_share)    AS market_shares
`);
console.log("=== Seeded counts ===");
console.log(counts.rows[0]);

// 2. Pull Cement's KPIs (baseline actual FY25-26 vs FY26-27 target) and score them
const rows = await pool.query(`
  SELECT
    kd.code, kd.dimension_id, kd.direction,
    sk.weight_in_dimension, sk.is_estimate,
    ka.value AS actual_value, ka.confidence,
    kt.value AS target_value
  FROM sbu_kpi sk
  JOIN kpi_definition kd ON kd.id = sk.kpi_id
  LEFT JOIN kpi_actual ka ON ka.sbu_kpi_id = sk.id AND ka.period_id = 'FY25-26'
  LEFT JOIN kpi_target kt ON kt.sbu_kpi_id = sk.id AND kt.period_id = 'FY26-27'
  WHERE sk.sbu_id = (SELECT id FROM sbu WHERE code = 'ACCL')
`);

const kpis: Kpi[] = rows.rows.map((r) => ({
  code: r.code,
  name: r.code,
  dimension: r.dimension_id,
  direction: r.direction,
  weightInDimension: Number(r.weight_in_dimension),
  isEstimate: r.is_estimate,
  actual: r.actual_value != null ? { value: Number(r.actual_value), confidence: r.confidence } : null,
  target: r.target_value != null ? { value: Number(r.target_value) } : null,
}));

console.log("\n=== Cement (ACCL) — Composite index from live DB ===");
const official = allIndices(kpis, false);
const withEstimates = allIndices(kpis, true);

const fmt = (s: number | null, cov: number) => `${s == null ? "—" : s.toFixed(2)} / 5  (coverage ${(cov * 100).toFixed(0)}%)`;
console.log("Index        Official (estimates excluded)   With estimates");
console.log(`BEI          ${fmt(official.BEI.score, official.BEI.coverage).padEnd(40)} ${fmt(withEstimates.BEI.score, withEstimates.BEI.coverage)}`);
console.log(`BHI          ${fmt(official.BHI.score, official.BHI.coverage).padEnd(40)} ${fmt(withEstimates.BHI.score, withEstimates.BHI.coverage)}`);
console.log(`BPI          ${fmt(official.BPI.score, official.BPI.coverage).padEnd(40)} ${fmt(withEstimates.BPI.score, withEstimates.BPI.coverage)}`);
console.log(`Composite    ${fmt(official.Composite.score, official.Composite.coverage).padEnd(40)} ${fmt(withEstimates.Composite.score, withEstimates.Composite.coverage)}`);

await pool.end();
