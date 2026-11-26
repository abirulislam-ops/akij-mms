/**
 * Core scoring: attainment, KPI score bands, RAG, dimension score, and index roll-ups.
 * Pure functions — deterministic, no side effects.
 */
import {
  DEFAULT_BANDS,
  DIMENSION_WEIGHT,
  INDEX_DIMENSIONS,
  type DimensionId,
  type Direction,
  type IndexId,
  type Kpi,
  type Rag,
  type Scored,
} from "./types";

/**
 * Attainment = actual / target (as a ratio, e.g. 1.05 = 105%).
 * Lower-is-better KPIs are inverted: attainment = target / actual.
 * Returns null when actual/target is missing or the target is zero.
 */
export function attainment(actual: number, target: number, direction: Direction): number | null {
  if (actual == null || target == null || target === 0) return null;
  if (Number.isNaN(actual) || Number.isNaN(target)) return null;
  return direction === "lower" ? target / actual : actual / target;
}

/**
 * KPI score 0–5 from attainment. Bands are attainment-% thresholds, highest first.
 * Returns null when attainment is null ("not yet measured").
 */
export function kpiScore(
  attainmentValue: number | null,
  bands: readonly [number, number][] = DEFAULT_BANDS,
): number | null {
  if (attainmentValue == null) return null;
  const pct = attainmentValue * 100;
  for (const [threshold, score] of bands) {
    if (pct >= threshold) return score;
  }
  return 1; // below the lowest band
}

/** RAG: green ≥100%, amber 90–99%, red <90%, grey = not measured. */
export function rag(attainmentValue: number | null): Rag {
  if (attainmentValue == null) return "grey";
  const pct = attainmentValue * 100;
  if (pct >= 100) return "green";
  if (pct >= 90) return "amber";
  return "red";
}

/** Trend arrow vs the previous period. */
export function trend(current: number | null, previous: number | null): "up" | "down" | "flat" | null {
  if (current == null || previous == null) return null;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

/**
 * Dimension score = KPI scores weighted by weight-in-dimension, using measured KPIs only.
 * Also returns the coverage % (share of the within-dimension weight that is measured).
 * Estimate-marked KPIs are excluded unless `includeEstimates` is true.
 */
export function dimensionScore(kpis: readonly Kpi[], includeEstimates = false): Scored {
  let scoreSum = 0;
  let measuredWeight = 0;
  let totalWeight = 0;

  for (const kpi of kpis) {
    // Every KPI counts in the coverage denominator (estimates & unmeasured too),
    // so an estimate-heavy SBU shows low coverage ("insufficient data").
    totalWeight += kpi.weightInDimension;
    if (kpi.isEstimate && !includeEstimates) continue;
    if (!kpi.actual || !kpi.target) continue;
    const att = attainment(kpi.actual.value, kpi.target.value, kpi.direction);
    const s = kpiScore(att);
    if (att == null || s == null) continue;
    scoreSum += s * kpi.weightInDimension;
    measuredWeight += kpi.weightInDimension;
  }

  const coverage = totalWeight > 0 ? measuredWeight / totalWeight : 0;
  const score = measuredWeight > 0 ? scoreSum / measuredWeight : null;
  return { score, coverage };
}

/**
 * Index score = weighted roll-up of the constituent dimensions, weighted by the
 * group dimension weights (BEI=25, BHI=30, BPI=45, Composite=100 total).
 * Coverage = share of the index's total weight that is measured.
 */
export function indexScore(
  dimensionScores: Record<DimensionId, Scored>,
  index: IndexId,
): Scored {
  const dims = INDEX_DIMENSIONS[index];
  let scoreSum = 0;
  let measuredDimWeight = 0; // raw dimension weight of dimensions that have a score
  let totalWeight = 0;
  let coverageWeight = 0; // coverage-adjusted weight, for the coverage metric

  for (const dim of dims) {
    const w = DIMENSION_WEIGHT[dim];
    totalWeight += w;
    const d = dimensionScores[dim];
    coverageWeight += w * (d?.coverage ?? 0);
    if (d && d.score != null) {
      scoreSum += d.score * w;
      measuredDimWeight += w;
    }
  }

  const coverage = totalWeight > 0 ? coverageWeight / totalWeight : 0;
  const score = measuredDimWeight > 0 ? scoreSum / measuredDimWeight : null;
  return { score, coverage };
}

/**
 * Convenience: compute all four indices (BEI/BHI/BPI/Composite) for an SBU in one pass.
 */
export function allIndices(kpis: readonly Kpi[], includeEstimates = false): Record<IndexId, Scored> {
  const dimScores = {} as Record<DimensionId, Scored>;
  for (const dim of ["d1", "d2", "d3", "d4", "d5", "d6", "d7"] as const) {
    dimScores[dim] = dimensionScore(kpis.filter((k) => k.dimension === dim), includeEstimates);
  }
  return {
    BEI: indexScore(dimScores, "BEI"),
    BHI: indexScore(dimScores, "BHI"),
    BPI: indexScore(dimScores, "BPI"),
    Composite: indexScore(dimScores, "Composite"),
  };
}

/**
 * Group score = SBU scores weighted by revenue (or equal weight).
 * `sbus`: array of { revenue, compositeScore }.
 */
export function groupScore(
  sbus: readonly { revenue: number; compositeScore: number | null }[],
  mode: "revenue" | "equal" = "revenue",
): number | null {
  const measured = sbus.filter((s) => s.compositeScore != null);
  if (measured.length === 0) return null;

  if (mode === "equal") {
    return measured.reduce((a, s) => a + (s.compositeScore as number), 0) / measured.length;
  }

  const totalRevenue = measured.reduce((a, s) => a + s.revenue, 0);
  if (totalRevenue <= 0) return null;
  return measured.reduce((a, s) => a + (s.compositeScore as number) * s.revenue, 0) / totalRevenue;
}

/**
 * Data confidence score = weighted share of KPIs with High/Med data (vs Low/Web/Estimate/unknown).
 * Always shown next to scores. Returns 0–1.
 */
export function dataConfidence(kpis: readonly Kpi[]): number {
  let weight = 0;
  let confidentWeight = 0;
  for (const kpi of kpis) {
    weight += kpi.weightInDimension;
    const c = kpi.actual?.confidence;
    if (c === "High" || c === "Med") confidentWeight += kpi.weightInDimension;
  }
  return weight > 0 ? confidentWeight / weight : 0;
}
