/** YoY / QoQ ramp helpers — realistic, gradual glides from a baseline to annual targets. */

function r2(v: number): number { return Math.round(v * 100) / 100; }

export interface RampRow { fyIndex: number; value: number; delta: number; pct: number }

/** Progress a level metric (e.g. share %) from baseline to each annual target in equal steps. */
export function levelRamp(baseline: number, targets: number[]): RampRow[] {
  let prev = baseline;
  return targets.map((t, i) => {
    const row = { fyIndex: i, value: r2(t), delta: r2(t - prev), pct: prev ? r2(((t - prev) / Math.abs(prev)) * 100) : 0 };
    prev = t;
    return row;
  });
}

/** Progress a flow metric (e.g. revenue) from a base year to each annual target (geometric). */
export function flowRamp(base: number, targets: number[]): RampRow[] {
  let prev = base;
  return targets.map((t, i) => {
    const row = { fyIndex: i, value: r2(t), delta: r2(t - prev), pct: prev ? r2(((t - prev) / prev) * 100) : 0 };
    prev = t;
    return row;
  });
}

/** Split one year's change across quarters with seasonal weights (default peaks in Q3). */
export function quarterSplit(start: number, end: number, weights: number[] = [0.18, 0.24, 0.33, 0.25]): number[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const change = end - start;
  const out: number[] = [];
  let cur = start;
  for (let i = 0; i < weights.length; i++) {
    cur = cur + (change * weights[i]) / total;
    out.push(r2(cur));
  }
  return out;
}

/** YoY rows (annual targets vs base) + QoQ matrix (end-of-quarter values per year). */
export function rampModel(baseValue: number, annualTargets: number[], mode: "level" | "flow" = "level") {
  const yoy = mode === "flow" ? flowRamp(baseValue, annualTargets) : levelRamp(baseValue, annualTargets);
  let prev = baseValue;
  const qoq = annualTargets.map((t) => {
    const q = quarterSplit(prev, t);
    prev = t;
    return q;
  });
  const maxQuarterMove = Math.max(
    0,
    ...qoq.flatMap((q, i) => {
      const start = i === 0 ? baseValue : annualTargets[i - 1];
      let last = start;
      return q.map((v) => { const d = Math.abs(v - last); last = v; return d; });
    }),
  );
  return { yoy, qoq, maxQuarterMove: r2(maxQuarterMove) };
}
