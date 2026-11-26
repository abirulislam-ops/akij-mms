/**
 * Core types and the CBDO framework constants for the AKIJ MMS calculation engine.
 * Everything here is pure data + pure functions — no I/O, no framework.
 */

/** "higher-is-better" or "lower-is-better" (lower-is-better inverts attainment). */
export type Direction = "higher" | "lower";

/** Data confidence labels (Estimate = benchmark/assumption, excluded from official scores unless approved). */
export type Confidence = "High" | "Med" | "Low" | "Web" | "Estimate";

export type DimensionId = "d1" | "d2" | "d3" | "d4" | "d5" | "d6" | "d7";

export interface Dimension {
  id: DimensionId;
  name: string;
  /** Group default weight (%). The 7 weights sum to 100. */
  weight: number;
}

/** The CBDO framework — 7 dimensions with the MD-approved weights 25/15/10/20/15/5/10. */
export const DIMENSIONS: readonly Dimension[] = [
  { id: "d1", name: "Brand Equity", weight: 25 },
  { id: "d2", name: "Brand Health", weight: 15 },
  { id: "d3", name: "Brand Positioning & Competitive Strength", weight: 10 },
  { id: "d4", name: "Market Performance & Penetration", weight: 20 },
  { id: "d5", name: "Brand Financial Value", weight: 15 },
  { id: "d6", name: "Digital Brand Strength", weight: 5 },
  { id: "d7", name: "Brand Execution & Governance", weight: 10 },
] as const;

export const DIMENSION_WEIGHT: Record<DimensionId, number> = {
  d1: 25,
  d2: 15,
  d3: 10,
  d4: 20,
  d5: 15,
  d6: 5,
  d7: 10,
};

/**
 * Index mapping (CBDO framework — fixed):
 *   BEI = D1
 *   BHI = D2 + D3 + D6
 *   BPI = D4 + D5 + D7
 *   Composite = all 7 dimensions
 */
export type IndexId = "BEI" | "BHI" | "BPI" | "Composite";

export const INDEX_DIMENSIONS: Record<IndexId, readonly DimensionId[]> = {
  BEI: ["d1"],
  BHI: ["d2", "d3", "d6"],
  BPI: ["d4", "d5", "d7"],
  Composite: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"],
};

export interface KpiActual {
  value: number;
  confidence?: Confidence;
  source?: string;
  asOf?: string;
}

export interface KpiTarget {
  value: number;
  /** draft / approved / locked (locked targets need an approval workflow to change). */
  status?: "draft" | "approved" | "locked";
}

export interface Kpi {
  code: string;
  name: string;
  dimension: DimensionId;
  direction: Direction;
  /** Weight within its dimension (the within-dimension weights should sum to 100). */
  weightInDimension: number;
  /** Estimate-marked KPIs are excluded from official scores unless approved. */
  isEstimate?: boolean;
  actual?: KpiActual | null;
  target?: KpiTarget | null;
}

/** A score with its measurement coverage (0–1). */
export interface Scored {
  /** 0–5 score, or null when there is no measured data. */
  score: number | null;
  /** Share (0–1) of the eligible weight that is measured. */
  coverage: number;
}

export const RAG = ["green", "amber", "red", "grey"] as const;
export type Rag = (typeof RAG)[number];

/** Scoring bands (attainment % → 0–5). Configurable, defaults per the framework. */
export const DEFAULT_BANDS: readonly [number, number][] = [
  [110, 5],
  [100, 4],
  [90, 3],
  [80, 2],
  [0, 1],
];
