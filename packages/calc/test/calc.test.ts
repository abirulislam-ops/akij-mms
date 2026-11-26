import { describe, expect, it } from "vitest";
import {
  attainment,
  kpiScore,
  rag,
  trend,
  dimensionScore,
  indexScore,
  allIndices,
  groupScore,
  dataConfidence,
  reconcile,
  runRate,
  pacing,
  romi,
  marketingIntensity,
  excessSov,
  DIMENSIONS,
  type Kpi,
} from "../src/index";

describe("attainment", () => {
  it("higher-is-better: actual/target", () => {
    expect(attainment(110, 100, "higher")).toBeCloseTo(1.1);
    expect(attainment(90, 100, "higher")).toBeCloseTo(0.9);
  });

  it("lower-is-better: inverted target/actual", () => {
    // e.g. CAC: target 100, actual 80 → better → 100/80 = 1.25
    expect(attainment(80, 100, "lower")).toBeCloseTo(1.25);
    expect(attainment(120, 100, "lower")).toBeCloseTo(0.8333, 3);
  });

  it("returns null for missing or zero target", () => {
    expect(attainment(100, 0, "higher")).toBeNull();
    expect(attainment(100, NaN, "higher")).toBeNull();
  });
});

describe("kpiScore bands", () => {
  it("maps attainment % to 0–5", () => {
    expect(kpiScore(1.15)).toBe(5); // ≥110%
    expect(kpiScore(1.05)).toBe(4); // 100–110%
    expect(kpiScore(0.95)).toBe(3); // 90–100%
    expect(kpiScore(0.85)).toBe(2); // 80–90%
    expect(kpiScore(0.5)).toBe(1); // <80%
  });

  it("returns null when not measured", () => {
    expect(kpiScore(null)).toBeNull();
  });
});

describe("rag", () => {
  it("green/amber/red/grey", () => {
    expect(rag(1.0)).toBe("green");
    expect(rag(0.95)).toBe("amber");
    expect(rag(0.5)).toBe("red");
    expect(rag(null)).toBe("grey");
  });
});

describe("trend", () => {
  it("up/down/flat/null", () => {
    expect(trend(5, 4)).toBe("up");
    expect(trend(4, 5)).toBe("down");
    expect(trend(4, 4)).toBe("flat");
    expect(trend(null, 4)).toBeNull();
  });
});

describe("dimensionScore", () => {
  const kpis: Kpi[] = [
    { code: "aw", name: "Awareness", dimension: "d1", direction: "higher", weightInDimension: 50, actual: { value: 68 }, target: { value: 72 } },
    { code: "pref", name: "Preference", dimension: "d1", direction: "higher", weightInDimension: 50, actual: { value: 24 }, target: { value: 28 } },
  ];

  it("weighted average of measured KPIs", () => {
    // awareness 68/72 = 94.4% → 3 ; preference 24/28 = 85.7% → 2 → (3+2)/2 = 2.5
    const r = dimensionScore(kpis);
    expect(r.score).toBeCloseTo(2.5);
    expect(r.coverage).toBeCloseTo(1.0);
  });

  it("coverage excludes unmeasured KPIs", () => {
    const r = dimensionScore([
      ...kpis,
      { code: "x", name: "X", dimension: "d1", direction: "higher", weightInDimension: 100, actual: null, target: null },
    ]);
    // total weight 200, measured 100 → coverage 0.5
    expect(r.coverage).toBeCloseTo(0.5);
  });

  it("excludes estimate-marked KPIs unless includeEstimates", () => {
    const withEstimate = [
      { code: "aw", name: "Awareness", dimension: "d1" as const, direction: "higher" as const, weightInDimension: 50, actual: { value: 68 }, target: { value: 72 } },
      { code: "est", name: "Est", dimension: "d1" as const, direction: "higher" as const, weightInDimension: 50, isEstimate: true, actual: { value: 100 }, target: { value: 100 } },
    ];
    const no = dimensionScore(withEstimate, false);
    expect(no.coverage).toBeCloseTo(0.5); // estimate excluded → only 50/100 measured
    const yes = dimensionScore(withEstimate, true);
    expect(yes.coverage).toBeCloseTo(1.0);
  });
});

describe("indices", () => {
  it("BEI = D1 only, BHI = D2+D3+D6, BPI = D4+D5+D7, Composite = all", () => {
    // Build one KPI per dimension, all scoring 3, fully measured.
    const dims = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"] as const;
    const kpis: Kpi[] = dims.map((d) => ({
      code: d,
      name: d,
      dimension: d,
      direction: "higher",
      weightInDimension: 100,
      actual: { value: 100 },
      target: { value: 100 },
    }));
    const idx = allIndices(kpis);
    // every KPI scores 4 (100% attainment), so every index = 4, coverage 1
    expect(idx.BEI.score).toBeCloseTo(4);
    expect(idx.BHI.score).toBeCloseTo(4);
    expect(idx.BPI.score).toBeCloseTo(4);
    expect(idx.Composite.score).toBeCloseTo(4);
    // BEI coverage = only D1 measured → but D1 is fully measured → 1.0
    expect(idx.BEI.coverage).toBeCloseTo(1);
  });

  it("BPI does NOT include D1", () => {
    // D1 fully measured (score 4), D4..D7 fully measured (score 4) → BPI unaffected by D1.
    const kpis: Kpi[] = [
      { code: "d1", name: "d1", dimension: "d1", direction: "higher", weightInDimension: 100, actual: { value: 100 }, target: { value: 100 } },
      { code: "d4", name: "d4", dimension: "d4", direction: "higher", weightInDimension: 100, actual: { value: 100 }, target: { value: 100 } },
    ];
    const dimScores = {
      d1: dimensionScore(kpis.filter((k) => k.dimension === "d1")),
      d2: { score: null, coverage: 0 },
      d3: { score: null, coverage: 0 },
      d4: dimensionScore(kpis.filter((k) => k.dimension === "d4")),
      d5: { score: null, coverage: 0 },
      d6: { score: null, coverage: 0 },
      d7: { score: null, coverage: 0 },
    };
    const bpi = indexScore(dimScores, "BPI");
    // BPI = D4+D5+D7 → only D4 measured (20 weight out of 45) → score 4, coverage 20/45
    expect(bpi.score).toBeCloseTo(4);
    expect(bpi.coverage).toBeCloseTo(20 / 45);
  });

  it("index score is NOT inflated when a dimension is only partially measured", () => {
    // D6 has half its weight measured (coverage 0.5, score 4). BHI = D2+D3+D6.
    const dimScores = {
      d1: { score: null, coverage: 0 },
      d2: { score: null, coverage: 0 },
      d3: { score: null, coverage: 0 },
      d4: { score: null, coverage: 0 },
      d5: { score: null, coverage: 0 },
      d6: { score: 4, coverage: 0.5 },
      d7: { score: null, coverage: 0 },
    };
    const bhi = indexScore(dimScores, "BHI");
    // score stays 4 (weighted by D6's full weight 5, not coverage-adjusted 2.5)
    expect(bhi.score).toBeCloseTo(4);
    // coverage = (5 × 0.5) / (15 + 10 + 5) = 2.5 / 30
    expect(bhi.coverage).toBeCloseTo(2.5 / 30);
  });
});

describe("groupScore", () => {
  it("revenue-weighted", () => {
    const g = groupScore([
      { revenue: 1000, compositeScore: 4 },
      { revenue: 3000, compositeScore: 2 },
    ]);
    expect(g).toBeCloseTo((4 * 1000 + 2 * 3000) / 4000); // 2.5
  });
  it("equal weight", () => {
    const g = groupScore(
      [
        { revenue: 1000, compositeScore: 4 },
        { revenue: 3000, compositeScore: 2 },
      ],
      "equal",
    );
    expect(g).toBeCloseTo(3);
  });
});

describe("reconcile", () => {
  it("gain when brand grows faster than market", () => {
    const r = reconcile({ currentShare: 0.0451, brandGrowth: 0.293, marketGrowth: 0.06 });
    expect(r.projectedShare).toBeCloseTo(0.05501, 3);
    expect(r.verdict).toBe("gain");
    expect(r.flags).toHaveLength(0);
  });

  it("flags share-loss + revenue-below-market when brand lags market", () => {
    const r = reconcile({ currentShare: 0.1, brandGrowth: 0.03, marketGrowth: 0.06 });
    expect(r.flags).toContain("share-loss");
    expect(r.flags).toContain("revenue-growth-below-market");
    expect(r.verdict).toBe("loss");
  });

  it("flags unattainable-target when target share exceeds projected", () => {
    const r = reconcile({ currentShare: 0.0451, brandGrowth: 0.293, marketGrowth: 0.06, targetShare: 0.0887 });
    expect(r.flags).toContain("unattainable-target");
  });
});

describe("runRate", () => {
  it("projects full year from YTD + seasonality", () => {
    const r = runRate({ ytdActual: 480.8, ytdPeriodWeight: 0.22, fullYearTarget: 2263 });
    // 480.8 / 0.22 ≈ 2185.5 → 96.6% of target → at-risk (within 10% but short)
    expect(r.projected).toBeCloseTo(2185.45, 1);
    expect(r.attainment).toBeCloseTo(0.9657, 3);
    expect(r.probability).toBe("at-risk");
  });
});

describe("budget", () => {
  it("pacing over/under/on-track", () => {
    expect(pacing(0.55, 0.4)).toBe("over"); // 15pp over time (>10pp tolerance)
    expect(pacing(0.25, 0.4)).toBe("under");
    expect(pacing(0.45, 0.4)).toBe("on-track"); // within ±10pp
    expect(pacing(0.5, 0.4)).toBe("on-track"); // exactly 10pp = boundary, on-track
  });
  it("romi", () => {
    expect(romi(10, 5)).toBeCloseTo(2);
    expect(romi(10, 0)).toBeNull();
  });
  it("marketingIntensity + excessSov", () => {
    expect(marketingIntensity(22.98, 2263)).toBeCloseTo(0.01015, 4);
    expect(excessSov(0.12, 0.055)).toBeCloseTo(0.065);
  });
});

describe("framework constants", () => {
  it("7 dimensions and weights sum to 100", () => {
    expect(DIMENSIONS).toHaveLength(7);
    const total = DIMENSIONS.reduce((a, d) => a + d.weight, 0);
    expect(total).toBe(100);
  });

  it("dataConfidence reflects High/Med share", () => {
    const kpis: Kpi[] = [
      { code: "a", name: "a", dimension: "d1", direction: "higher", weightInDimension: 50, actual: { value: 1, confidence: "High" }, target: { value: 1 } },
      { code: "b", name: "b", dimension: "d1", direction: "higher", weightInDimension: 50, actual: { value: 1, confidence: "Estimate" }, target: { value: 1 } },
    ];
    expect(dataConfidence(kpis)).toBeCloseTo(0.5);
  });
});
