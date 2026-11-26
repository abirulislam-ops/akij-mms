/**
 * Competition intelligence — pure impact model.
 * Given a competitor activity (price cut, promo, TVC, digital, dealer scheme, new product)
 * this estimates the threat, the likely share shift (us vs them) and the recommended response.
 * Planning estimates — label as such in the UI; calibrate with the tracker.
 */

export type CompetitorActivityType =
  | "price_cut" | "promotion" | "tvc" | "digital" | "dealer_scheme" | "new_product" | "other";

export interface ActivityImpactInput {
  activityType: CompetitorActivityType;
  competitorShare: number;   // % value share
  ourShare: number;          // % value share
  spend?: number | null;     // competitor spend on the activity (BDT)
  categorySpend?: number | null; // total category marketing spend (BDT)
  reach?: number | null;     // 0..1 (share of target audience reached)
  priceChangePct?: number | null; // e.g. -5 for a 5% price cut
}

export interface ActivityImpact {
  threatScore: number;            // 0..100
  threatLevel: "low" | "med" | "high";
  ourShareDeltaPp: number;        // estimated pp change for us
  theirShareDeltaPp: number;      // estimated pp change for them
  implicationsUs: string[];
  implicationsThem: string[];
  recommendedAction: string;
}

const BASE: Record<CompetitorActivityType, number> = {
  price_cut: 0.62, promotion: 0.46, tvc: 0.40, digital: 0.30,
  dealer_scheme: 0.52, new_product: 0.56, other: 0.25,
};

const LABEL: Record<CompetitorActivityType, string> = {
  price_cut: "price cut", promotion: "consumer promotion", tvc: "TV / mass-media campaign",
  digital: "digital / social push", dealer_scheme: "dealer / trade scheme",
  new_product: "new product / SKU", other: "market activity",
};

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function r2(v: number): number { return Math.round(v * 100) / 100; }

export function threatLevel(score: number): "low" | "med" | "high" {
  return score >= 65 ? "high" : score >= 40 ? "med" : "low";
}

export function assessActivity(i: ActivityImpactInput): ActivityImpact {
  const type = (i.activityType in BASE ? i.activityType : "other") as CompetitorActivityType;
  const base = BASE[type];
  const spendShare = i.spend != null && i.categorySpend ? clamp(i.spend / i.categorySpend, 0, 1) : 0.15;
  const reachF = i.reach == null ? 0.5 : clamp(i.reach, 0, 1);
  const priceF = i.priceChangePct == null ? 0 : clamp(Math.abs(i.priceChangePct) / 10, 0, 1);

  const intensity = clamp(base * 0.5 + spendShare * 0.2 + reachF * 0.15 + priceF * 0.15, 0, 1);
  const threatScore = Math.round(intensity * 100);

  // share shift is proportional to the attacked player's own share (smaller brands lose fewer pp in absolute terms)
  const ourShareDeltaPp = -r2(intensity * 0.12 * i.ourShare);
  const theirShareDeltaPp = r2(intensity * 0.10 * i.ourShare);

  const implicationsUs: string[] = [];
  const implicationsThem: string[] = [];
  let recommendedAction = "Monitor; re-measure next wave.";

  switch (type) {
    case "price_cut":
      implicationsUs.push("Downward price pressure at the counter; margin and price-premium at risk.");
      implicationsThem.push("Short-term volume grab but margin erosion and premium-perception risk.");
      recommendedAction = "Do NOT match the price. Defend on value/quality proof and dealer loyalty; protect the premium.";
      break;
    case "promotion":
      implicationsUs.push("Trial/switch spike; watch repeat and discount dependency.");
      implicationsThem.push("Margin-funded share; often decays after the promo.");
      recommendedAction = "Counter with value + availability, not a discount war; reinforce repeat.";
      break;
    case "tvc":
      implicationsUs.push("Awareness/SOV pressure; TOMA and consideration may dip.");
      implicationsThem.push("Awareness gain; conversion depends on their distribution.");
      recommendedAction = "Protect SOV in core segments; pair our ATL with trade/distribution to convert.";
      break;
    case "digital":
      implicationsUs.push("Share-of-search and digital SOV pressure; lead flow risk.");
      implicationsThem.push("Cheap reach; weak if they lack conversion/CRM.");
      recommendedAction = "Raise digital performance and search visibility; defend conversion.";
      break;
    case "dealer_scheme":
      implicationsUs.push("Dealer/retailer push and shelf share risk in covered territories.");
      implicationsThem.push("Channel loyalty gain, but costly and reversible.");
      recommendedAction = "Protect dealer loyalty (terms, service, availability); target contested territories.";
      break;
    case "new_product":
      implicationsUs.push("New segment/SKU encroachment; watch the specific price band.");
      implicationsThem.push("Portfolio expansion; needs distribution to scale.");
      recommendedAction = "Assess overlap; respond with targeted NPD or a differentiated claim, not broad cuts.";
      break;
    default:
      implicationsUs.push("General competitive activity; limited direct impact assumed.");
      implicationsThem.push("Unclear impact without more detail.");
  }

  return {
    threatScore,
    threatLevel: threatLevel(threatScore),
    ourShareDeltaPp,
    theirShareDeltaPp,
    implicationsUs,
    implicationsThem,
    recommendedAction,
  };
}

/** Herfindahl-Hirschman Index (0–10,000) from % shares — concentration / fragmentation. */
export function competitionHHI(sharesPct: number[]): number {
  return Math.round(sharesPct.reduce((a, s) => a + Math.pow(s, 2), 0));
}

export const ACTIVITY_LABEL = LABEL;
