/**
 * Reconciliation, forecast and budget logic — pure functions.
 */
import type { Rag } from "./types";

// ---------------------------------------------------------------------------
// Revenue ↔ market share
// ---------------------------------------------------------------------------

/** Market share = brand revenue / market size (0–1). */
export function marketShare(revenue: number, marketSize: number): number | null {
  if (marketSize == null || marketSize === 0) return null;
  return revenue / marketSize;
}

/** Project next-period share: MS(t+1) = MS(t) × (1 + brand growth) / (1 + market growth). */
export function projectShare(
  currentShare: number,
  brandGrowth: number,
  marketGrowth: number,
): number {
  return currentShare * ((1 + brandGrowth) / (1 + marketGrowth));
}

export type ReconciliationFlag =
  | "revenue-growth-below-market"
  | "share-loss"
  | "unattainable-target"
  | "implausible-ceiling";

export interface ReconciliationInput {
  currentShare: number; // 0–1
  brandGrowth: number; // FY growth rate, e.g. 0.21
  marketGrowth: number; // e.g. 0.06
  targetShare?: number; // 0–1, strategy target for the period
  shareCeiling?: number; // plausible max share (0–1), default 0.6
}

export interface ReconciliationResult {
  projectedShare: number;
  shareChangePp: number; // percentage points
  flags: ReconciliationFlag[];
  verdict: "gain" | "flat" | "loss";
}

/**
 * Reconcile revenue and market share, and raise the strategy flags:
 *  - revenue-growth-below-market: revenue grows but slower than the market → share falls.
 *  - share-loss: projected share < current share.
 *  - unattainable-target: the revenue plan can't deliver the target share at the market growth.
 *  - implausible-ceiling: implied share above the plausible ceiling.
 */
export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const { currentShare, brandGrowth, marketGrowth } = input;
  const projected = projectShare(currentShare, brandGrowth, marketGrowth);
  const changePp = (projected - currentShare) * 100;

  const flags: ReconciliationFlag[] = [];
  if (brandGrowth < marketGrowth) flags.push("revenue-growth-below-market");
  if (projected < currentShare) flags.push("share-loss");

  if (input.targetShare != null && input.targetShare > projected) {
    flags.push("unattainable-target");
  }

  const ceiling = input.shareCeiling ?? 0.6;
  if (projected > ceiling) flags.push("implausible-ceiling");

  const verdict = changePp > 0.01 ? "gain" : changePp < -0.01 ? "loss" : "flat";
  return { projectedShare: projected, shareChangePp: changePp, flags, verdict };
}

// ---------------------------------------------------------------------------
// Forecast / run-rate
// ---------------------------------------------------------------------------

export type ForecastProbability = "on-track" | "at-risk" | "off-track";

export interface ForecastInput {
  ytdActual: number;
  /** Fraction of the year elapsed so far (0–1). */
  ytdPeriodWeight: number; // e.g. Q1 = 0.22 for cement
  fullYearTarget: number;
}

export interface ForecastResult {
  projected: number;
  attainment: number | null; // projected / target
  probability: ForecastProbability;
}

/**
 * Run-rate forecast: projected full-year = YTD actual + (remaining period × YTD run-rate).
 * Uses the seasonality profile via ytdPeriodWeight.
 */
export function runRate(input: ForecastInput): ForecastResult {
  const { ytdActual, ytdPeriodWeight, fullYearTarget } = input;
  if (ytdPeriodWeight <= 0 || ytdPeriodWeight >= 1) {
    throw new Error("ytdPeriodWeight must be in (0, 1)");
  }
  const projected = ytdActual / ytdPeriodWeight;
  const attainment = fullYearTarget > 0 ? projected / fullYearTarget : null;
  let probability: ForecastProbability;
  if (attainment == null) probability = "at-risk";
  else if (attainment >= 1) probability = "on-track";
  else if (attainment >= 0.9) probability = "at-risk";
  else probability = "off-track";
  return { projected, attainment, probability };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export type PacingStatus = "on-track" | "over" | "under";

/** Budget pacing: compare spend % vs time %. Flag when spend is >10% off the time elapsed. */
export function pacing(spendPct: number, timePct: number, tolerance = 0.1): PacingStatus {
  const diff = spendPct - timePct;
  if (diff > tolerance) return "over";
  if (diff < -tolerance) return "under";
  return "on-track";
}

/** ROMI = incremental gross margin attributable / marketing spend. Null when spend ≤ 0. */
export function romi(incrementalGrossMargin: number, spend: number): number | null {
  if (spend == null || spend <= 0) return null;
  return incrementalGrossMargin / spend;
}

/** Marketing intensity = marketing spend / revenue (as % of revenue). */
export function marketingIntensity(spend: number, revenue: number): number | null {
  if (revenue == null || revenue === 0) return null;
  return spend / revenue;
}

/** Excess SOV = SOV − SOM. Positive = growth headroom; negative = share-loss risk. */
export function excessSov(sov: number, som: number): number {
  return sov - som;
}

/** RAG for a ratio against 100% (reused for budget efficiency and attainment). */
export function ratioRag(ratio: number | null): Rag {
  if (ratio == null) return "grey";
  if (ratio >= 1) return "green";
  if (ratio >= 0.9) return "amber";
  return "red";
}
