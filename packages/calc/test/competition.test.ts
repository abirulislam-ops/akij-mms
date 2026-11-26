import { describe, it, expect } from "vitest";
import { assessActivity, competitionHHI, threatLevel } from "../src/competition";

describe("competition impact", () => {
  it("a price cut produces a negative share shift for us and a positive one for them", () => {
    const r = assessActivity({ activityType: "price_cut", ourShare: 4.5, competitorShare: 17, priceChangePct: -5, reach: 0.7 });
    expect(r.ourShareDeltaPp).toBeLessThan(0);
    expect(r.theirShareDeltaPp).toBeGreaterThan(0);
    expect(r.threatScore).toBeGreaterThan(0);
    expect(r.recommendedAction.toLowerCase()).toContain("price");
  });

  it("a bigger price cut is a bigger threat", () => {
    const small = assessActivity({ activityType: "price_cut", ourShare: 4.5, competitorShare: 17, priceChangePct: -2 });
    const big = assessActivity({ activityType: "price_cut", ourShare: 4.5, competitorShare: 17, priceChangePct: -10 });
    expect(big.threatScore).toBeGreaterThan(small.threatScore);
  });

  it("threat levels map to thresholds", () => {
    expect(threatLevel(70)).toBe("high");
    expect(threatLevel(50)).toBe("med");
    expect(threatLevel(20)).toBe("low");
  });

  it("HHI is the sum of squared shares", () => {
    expect(competitionHHI([50, 30, 20])).toBe(2500 + 900 + 400);
    expect(competitionHHI([])).toBe(0);
  });
});
