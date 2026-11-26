import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@akij-mms/schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

// ===========================================================================
// 1. Dimensions (7, CBDO weights)
// ===========================================================================
const DIMENSIONS = [
  { id: "d1", name: "Brand Equity", weight: 25 },
  { id: "d2", name: "Brand Health", weight: 15 },
  { id: "d3", name: "Brand Positioning & Competitive Strength", weight: 10 },
  { id: "d4", name: "Market Performance & Penetration", weight: 20 },
  { id: "d5", name: "Brand Financial Value", weight: 15 },
  { id: "d6", name: "Digital Brand Strength", weight: 5 },
  { id: "d7", name: "Brand Execution & Governance", weight: 10 },
] as const;

// ===========================================================================
// 2. Fiscal periods (baseline FY25-26 + FY26-27..FY30-31 + quarters)
// ===========================================================================
const FYS = ["FY25-26", "FY26-27", "FY27-28", "FY28-29", "FY29-30", "FY30-31"];
const Q = ["Q1 (Jul–Sep)", "Q2 (Oct–Dec)", "Q3 (Jan–Mar)", "Q4 (Apr–Jun)"];

function buildPeriods() {
  const periods: (typeof schema.fiscalPeriod.$inferInsert)[] = [];
  let order = 0;
  for (const fy of FYS) {
    periods.push({ id: fy, label: fy, fy, kind: "fy", sortOrder: order++ });
    if (fy !== "FY25-26") {
      for (let q = 1; q <= 4; q++) {
        periods.push({ id: `${fy}-Q${q}`, label: `${fy} ${Q[q - 1]}`, fy, kind: "quarter", quarter: q, sortOrder: order++ });
      }
    }
  }
  return periods;
}

// ===========================================================================
// 3. KPI library (~63 KPIs) — [code, name, dim, unit, direction, frequency, ownerRole]
// ===========================================================================
type KpiSeed = [string, string, string, string, "higher" | "lower", string, string];
const KPI_LIBRARY: KpiSeed[] = [
  // D1 Brand Equity
  ["aided_awareness", "Brand Awareness (Aided)", "d1", "%", "higher", "Annual", "Media"],
  ["unaided_awareness", "Brand Awareness (Unaided)", "d1", "%", "higher", "Annual", "Media"],
  ["toma", "Top-of-Mind Awareness", "d1", "%", "higher", "Annual", "Media"],
  ["recall_recognition", "Recall & Recognition", "d1", "%", "higher", "Annual", "Media"],
  ["associations", "Brand Associations", "d1", "index", "higher", "Annual", "Brand"],
  ["perceived_quality", "Perceived Quality", "d1", "index", "higher", "Annual", "Brand"],
  ["brand_loyalty", "Brand Loyalty", "d1", "%", "higher", "Annual", "Brand"],
  ["brand_preference", "Brand Preference", "d1", "%", "higher", "Annual", "Brand"],
  ["trust_credibility", "Brand Trust & Credibility", "d1", "%", "higher", "Annual", "PR"],
  ["reco", "Customer/Dealer Recommendation", "d1", "%", "higher", "Annual", "Trade Marketing"],
  ["differentiation", "Brand Differentiation", "d1", "index", "higher", "Annual", "Brand"],
  ["salience", "Brand Salience", "d1", "index", "higher", "Annual", "Brand"],
  ["proprietary_assets", "Proprietary Brand Assets", "d1", "index", "higher", "Annual", "Brand"],
  // D2 Brand Health
  ["consideration", "Brand Consideration", "d2", "%", "higher", "Annual", "Brand"],
  ["purchase_intent", "Purchase Intent", "d2", "%", "higher", "Annual", "Brand"],
  ["satisfaction", "Customer Satisfaction", "d2", "score", "higher", "Quarterly", "Brand"],
  ["nps", "Net Promoter Score (NPS)", "d2", "score", "higher", "Quarterly", "Brand"],
  ["retention", "Customer Retention", "d2", "%", "higher", "Quarterly", "Sales"],
  ["churn", "Customer Churn", "d2", "%", "lower", "Quarterly", "Sales"],
  ["sentiment", "Brand Sentiment", "d2", "index", "higher", "Quarterly", "Digital"],
  ["advocacy", "Customer Advocacy", "d2", "%", "higher", "Quarterly", "Brand"],
  ["relevance", "Brand Relevance", "d2", "index", "higher", "Annual", "Brand"],
  // D3 Positioning & Competitive
  ["positioning_clarity", "Positioning Clarity", "d3", "index", "higher", "Annual", "Brand"],
  ["usp_recognition", "USP Recognition", "d3", "%", "higher", "Annual", "Brand"],
  ["sov", "Share of Voice (SOV)", "d3", "%", "higher", "Quarterly", "Media"],
  ["share_of_search", "Share of Search", "d3", "%", "higher", "Monthly", "Digital"],
  ["competitive_preference", "Competitive Brand Preference", "d3", "%", "higher", "Annual", "Brand"],
  ["relative_quality", "Relative Perceived Quality", "d3", "index", "higher", "Annual", "Brand"],
  ["market_leadership", "Market Leadership & Ranking", "d3", "rank", "lower", "Quarterly", "Strategy"],
  ["competitive_differentiation", "Competitive Differentiation", "d3", "index", "higher", "Annual", "Brand"],
  // D4 Market Performance
  ["market_share", "Market Share", "d4", "%", "higher", "Quarterly", "Strategy"],
  ["market_share_growth", "Market Share Growth", "d4", "pp", "higher", "Quarterly", "Strategy"],
  ["volume_growth", "Sales Volume Growth", "d4", "% YoY", "higher", "Monthly", "Sales"],
  ["geographic_penetration", "Geographic Penetration", "d4", "%", "higher", "Quarterly", "Sales"],
  ["distribution_reach", "Distribution Reach", "d4", "%", "higher", "Quarterly", "Sales"],
  ["numeric_distribution", "Numeric Distribution", "d4", "%", "higher", "Quarterly", "Sales"],
  ["weighted_distribution", "Weighted Distribution", "d4", "%", "higher", "Quarterly", "Sales"],
  ["category_penetration", "Category Penetration", "d4", "%", "higher", "Quarterly", "Strategy"],
  ["repeat_purchase", "Repeat Purchase Rate", "d4", "%", "higher", "Quarterly", "Sales"],
  // D5 Financial Value
  ["brand_revenue", "Brand Revenue Contribution", "d5", "BDT Cr", "higher", "Monthly", "Finance"],
  ["brand_profitability", "Brand Profitability", "d5", "%", "higher", "Quarterly", "Finance"],
  ["price_premium", "Price Premium", "d5", "index", "higher", "Quarterly", "Finance"],
  ["brand_valuation", "Brand Valuation", "d5", "BDT Cr", "higher", "Annual", "Finance"],
  ["growth_contribution", "Contribution to Business Growth", "d5", "%", "higher", "Quarterly", "Finance"],
  ["clv", "Customer Lifetime Value (CLV)", "d5", "BDT", "higher", "Annual", "Finance"],
  ["romi", "Marketing ROI / ROMI", "d5", "x", "higher", "Quarterly", "Finance"],
  ["cac", "Customer Acquisition Cost (CAC)", "d5", "BDT", "lower", "Quarterly", "Finance"],
  // D6 Digital Brand Strength
  ["digital_awareness", "Digital Awareness", "d6", "%", "higher", "Monthly", "Digital"],
  ["social_engagement", "Social Engagement", "d6", "index", "higher", "Monthly", "Digital"],
  ["digital_sov", "Digital Share of Voice", "d6", "%", "higher", "Monthly", "Digital"],
  ["search_visibility", "Search Visibility", "d6", "%", "higher", "Monthly", "Digital"],
  ["website_traffic", "Website Traffic", "d6", "visits", "higher", "Monthly", "Digital"],
  ["online_reputation", "Online Reputation", "d6", "score", "higher", "Monthly", "Digital"],
  ["reviews_ratings", "Reviews & Ratings", "d6", "score", "higher", "Monthly", "Digital"],
  ["digital_leadgen", "Digital Lead Gen & Conversion", "d6", "count", "higher", "Monthly", "Digital"],
  // D7 Execution & Governance
  ["guideline_compliance", "Brand Guideline Compliance", "d7", "%", "higher", "Quarterly", "Brand"],
  ["brand_consistency", "Brand Consistency", "d7", "index", "higher", "Quarterly", "Brand"],
  ["campaign_effectiveness", "Campaign Effectiveness", "d7", "%", "higher", "Quarterly", "Brand"],
  ["plan_achievement", "Marketing Plan Achievement", "d7", "%", "higher", "Quarterly", "Brand"],
  ["budget_efficiency", "Budget Efficiency", "d7", "%", "higher", "Monthly", "Finance"],
  ["creative_effectiveness", "Creative Effectiveness", "d7", "index", "higher", "Quarterly", "Creative"],
  ["activation_effectiveness", "Activation Effectiveness", "d7", "index", "higher", "Quarterly", "Brand"],
  ["portfolio_governance", "Portfolio Governance", "d7", "index", "higher", "Annual", "Group Brand"],
];

// ===========================================================================
// 4. SBUs (13, from Brand Marketing Pack; Mediquip excluded)
// ===========================================================================
const SBUS = [
  { code: "ACCL", name: "Akij Cement", legalName: "Akij Cement Company Ltd.", category: "Cement · Building Material", model: "B2B2C" as const, custodian: "Tariqul Hossain Tishad" },
  { code: "AIL", name: "Akij Ispat", legalName: "Akij Ispat Ltd.", category: "Steel · Rebar", model: "B2B2C" as const, custodian: "MD. Siam Sarowar" },
  { code: "ARMCL", name: "Akij Ready Mix", legalName: "Akij Ready Mix Concrete Ltd.", category: "Construction · RMC", model: "B2B" as const, custodian: "Md. Nasim Uddin" },
  { code: "AEL", name: "Akij Essentials", legalName: "Akij Essentials Ltd.", category: "FMCG · Food & Essentials", model: "B2C" as const, custodian: "Rakibul Islam" },
  { code: "AAFL", name: "Akij Agro Feed", legalName: "Akij Agro Feed Ltd.", category: "Agro · Poultry & Fish Feed", model: "B2B2C" as const, custodian: "—" },
  { code: "ALEL", name: "Enovar", legalName: "Akij Light Engineering Ltd.", category: "Durables · Home Appliances", model: "B2C" as const, custodian: "Md Arif Chowdhury" },
  { code: "ABSL", name: "Benzol Lubricants", legalName: "Akij Building Solutions Ltd.", category: "Lubricants · Bitumen", model: "B2B2C" as const, custodian: "Md. Yusuf" },
  { code: "AAIL", name: "Tyres", legalName: "AKIJ Automobile Industries Ltd.", category: "Automotive · Tyres", model: "B2C" as const, custodian: "Md. Yusuf" },
  { code: "ACEL", name: "ORCA", legalName: "AKIJ Consumer Electronics Ltd.", category: "Consumer Electronics", model: "B2C" as const, custodian: "Mobassher Hasan" },
  { code: "AASL", name: "AKIJ AIR", legalName: "Akij Air Service Ltd.", category: "Aviation · Air Service", model: "B2C" as const, custodian: "Tanvir Rahman Ratul" },
  { code: "NJL", name: "Nextjobz", legalName: "Nextjobz Ltd.", category: "HR Tech · Recruitment", model: "B2B/B2C" as const, custodian: "—" },
  { code: "ALCL", name: "AKIJ Pharmacy", legalName: "AKIJ LifeCare Ltd.", category: "Retail · Pharmacy", model: "B2C" as const, custodian: "Faiza Afrin Haque" },
  { code: "AMPL", name: "Akij Mediplex", legalName: "Akij Mediplex Ltd.", category: "Healthcare · Diagnostics", model: "B2C" as const, custodian: "Abhijit Das" },
];

// ===========================================================================
// 5. Cement (ACCL) — 21 active KPIs: [code, weight, base, fy[5], confidence, 4P]
// ===========================================================================
type Conf = "High" | "Med" | "Low" | "Web";
type FourP = "Product" | "Price" | "Place" | "Promotion";
const CEMENT_KPIS: [string, number, number, number[], Conf, FourP][] = [
  ["aided_awareness", 5, 62, [68, 72, 76, 80, 83], "Low", "Promotion"],
  ["toma", 4, 16, [19, 22, 26, 30, 34], "Low", "Promotion"],
  ["perceived_quality", 5, 68, [72, 76, 79, 82, 85], "Low", "Product"],
  ["brand_preference", 5, 20, [24, 28, 32, 36, 40], "Low", "Promotion"],
  ["brand_loyalty", 4, 55, [60, 65, 70, 75, 80], "Low", "Place"],
  ["reco", 3, 45, [52, 58, 64, 70, 75], "Low", "Product"],
  ["trust_credibility", 2, 70, [74, 78, 81, 84, 87], "Low", "Product"],
  ["consideration", 7, 30, [34, 38, 42, 46, 50], "Low", "Promotion"],
  ["nps", 6, 28, [32, 36, 40, 44, 48], "Low", "Product"],
  ["sov", 9, 8, [9, 10, 11, 12, 13], "Low", "Promotion"],
  ["market_share", 9, 4.51, [5.5, 6.06, 6.57, 7.73, 8.87], "Med", "Place"],
  ["volume_growth", 6, -8.85, [29.3, 16.8, 14.8, 24.8, 21.6], "Med", "Place"],
  ["distribution_reach", 5, 65, [70, 75, 80, 85, 90], "Low", "Place"],
  ["brand_revenue", 7, 1750.59, [2263, 2644, 3036, 3790, 4608], "High", "Price"],
  ["brand_profitability", 4, 10.7, [6.4, 7.9, 8.2, 8.0, 7.4], "High", "Price"],
  ["romi", 4, 3.5, [4.0, 4.5, 5.0, 5.5, 6.0], "Low", "Promotion"],
  ["share_of_search", 2, 7, [8, 9, 10, 11, 12], "Low", "Promotion"],
  ["digital_sov", 2, 2.5, [3.0, 3.3, 3.7, 4.0, 4.3], "Web", "Promotion"],
  ["guideline_compliance", 4, 75, [85, 90, 93, 95, 97], "Low", "Product"],
  ["campaign_effectiveness", 4, 70, [75, 80, 85, 88, 90], "Low", "Promotion"],
  ["budget_efficiency", 3, 85, [90, 92, 94, 95, 96], "Med", "Price"],
];

const CEMENT_COMPETITORS: [string, number][] = [
  ["Shah Cement", 17.25],
  ["Fresh", 11.95],
  ["Crown", 11.51],
  ["Seven Rings", 11.51],
];

const CEMENT_WEIGHTS = { d1: 28, d2: 13, d3: 9, d4: 20, d5: 15, d6: 4, d7: 11 };

// ===========================================================================
// Roles (15, RBAC tiers)
// ===========================================================================
const ROLES: { code: string; name: string; tier: "moderator" | "admin" | "editor" | "functional" | "viewer" }[] = [
  { code: "MD", name: "Managing Director", tier: "moderator" },
  { code: "CBDO", name: "Chief Business Development Officer", tier: "moderator" },
  { code: "SPA", name: "Strategic Planner & Analysis", tier: "admin" },
  { code: "BRAND_CUSTODIAN", name: "Brand Custodian", tier: "editor" },
  { code: "SBU_HEAD", name: "SBU Business Head", tier: "editor" },
  { code: "FINANCE", name: "Finance", tier: "functional" },
  { code: "RESEARCH", name: "Research / Insights", tier: "functional" },
  { code: "OOH_ACTIVATION", name: "OOH & Activation", tier: "functional" },
  { code: "NETWORKING_BD", name: "Networking, Partnership & BD", tier: "functional" },
  { code: "DIGITAL", name: "Digital Management", tier: "functional" },
  { code: "CREATIVE", name: "Creative", tier: "functional" },
  { code: "MOTION", name: "Motion & Cinematography", tier: "functional" },
  { code: "PR_MEDIA", name: "PR & Media Management", tier: "functional" },
  { code: "CRM_ECOMMERCE", name: "CRM, E-Commerce & Contact Center", tier: "functional" },
  { code: "VIEWER", name: "Viewer", tier: "viewer" },
];

// ===========================================================================
// Seed
// ===========================================================================
async function main() {
  console.log("Seeding dimensions…");
  for (const d of DIMENSIONS) {
    await db.insert(schema.dimension).values({ id: d.id, name: d.name, weight: d.weight, sortOrder: Number(d.id.slice(1)) }).onConflictDoNothing();
  }

  console.log("Seeding fiscal periods…");
  await db.insert(schema.fiscalPeriod).values(buildPeriods()).onConflictDoNothing();

  console.log(`Seeding ${KPI_LIBRARY.length} KPI definitions…`);
  for (const [code, name, dim, unit, direction, freq, owner] of KPI_LIBRARY) {
    await db.insert(schema.kpiDefinition).values({ code, name, dimensionId: dim, unit, direction, frequency: freq, ownerRole: owner }).onConflictDoNothing();
  }

  console.log("Seeding SBUs…");
  for (const s of SBUS) {
    await db
      .insert(schema.sbu)
      .values({ code: s.code, name: s.name, legalName: s.legalName, category: s.category, businessModel: s.model, custodian: s.custodian })
      .onConflictDoNothing();
  }

  console.log(`Seeding ${ROLES.length} roles…`);
  for (const r of ROLES) {
    await db.insert(schema.role).values({ code: r.code, name: r.name, tier: r.tier }).onConflictDoNothing();
  }

  // Build id maps (idempotent re-runs)
  const sbuRows = await db.select().from(schema.sbu);
  const sbuIdByCode = Object.fromEntries(sbuRows.map((r) => [r.code, r.id]));

  const kpiRows = await db.select().from(schema.kpiDefinition);
  const kpiIdByCode = Object.fromEntries(kpiRows.map((r) => [r.code, r.id]));
  const dimByCode = Object.fromEntries(KPI_LIBRARY.map((k) => [k[0], k[2]]));

  console.log("Seeding Cement (ACCL) KPIs, targets, revenue, competitors, budget & maturity…");
  const cementId = sbuIdByCode["ACCL"];

  // proposed weight set (awaiting MD approval)
  await db
    .insert(schema.weightSet)
    .values({ sbuId: cementId, version: 1, status: "proposed", weights: CEMENT_WEIGHTS, proposedBy: "CBDO" })
    .onConflictDoNothing();

  // own brand + competitors + market share
  const cementBrandId = (
    await db.insert(schema.brand).values({ sbuId: cementId, name: "Akij Cement", isOwn: true, isCompetitor: false }).returning({ id: schema.brand.id })
  )[0].id;
  for (const [name, share] of CEMENT_COMPETITORS) {
    const compBrandId = (await db.insert(schema.brand).values({ sbuId: cementId, name, isOwn: false, isCompetitor: true }).returning({ id: schema.brand.id }))[0].id;
    await db.insert(schema.marketShare).values({ brandId: compBrandId, category: "Cement", periodId: "FY25-26", valueShare: share, isEstimate: false }).onConflictDoNothing();
  }
  await db.insert(schema.marketShare).values({ brandId: cementBrandId, category: "Cement", periodId: "FY25-26", valueShare: 4.51, isEstimate: false }).onConflictDoNothing();

  // within-dimension totals for normalization
  const dimTotals: Record<string, number> = {};
  for (const [code, w] of CEMENT_KPIS) {
    const dim = dimByCode[code] ?? "d1";
    dimTotals[dim] = (dimTotals[dim] ?? 0) + w;
  }

  for (const [code, w, base, fy, conf, fourP] of CEMENT_KPIS) {
    const dim = dimByCode[code] ?? "d1";
    const kpiId = kpiIdByCode[code];
    if (!kpiId) throw new Error(`KPI definition not found for code "${code}"`);
    const weightInDim = Math.round((w / (dimTotals[dim] || 1)) * 10000) / 100;

    const [sbuKpiRow] = await db
      .insert(schema.sbuKpi)
      .values({ sbuId: cementId, kpiId, weightInDimension: weightInDim, fourP, isEstimate: conf === "Low" })
      .onConflictDoNothing()
      .returning({ id: schema.sbuKpi.id });

    if (!sbuKpiRow) continue; // already seeded

    await db.insert(schema.kpiActual).values({
      sbuKpiId: sbuKpiRow.id,
      periodId: "FY25-26",
      value: base,
      confidence: conf,
      source: conf === "Low" ? "benchmark (assumption)" : conf === "Web" ? "web-fetched" : "strategy/ERP",
      asOf: "FY25-26",
    });

    for (let i = 0; i < 5; i++) {
      await db.insert(schema.kpiTarget).values({ sbuKpiId: sbuKpiRow.id, periodId: FYS[i + 1], value: fy[i], status: "approved", version: 1 });
    }
  }

  // revenue
  await db.insert(schema.revenueActual).values({ sbuId: cementId, periodId: "FY25-26", value: "1750.59", source: "ERP/GL" }).onConflictDoNothing();
  for (let i = 0; i < 5; i++) {
    await db.insert(schema.revenueTarget).values({ sbuId: cementId, periodId: FYS[i + 1], value: String([2263, 2644, 3036, 3790, 4608][i]), status: "approved" }).onConflictDoNothing();
  }

  // budget
  await db.insert(schema.budgetPlan).values({ sbuId: cementId, periodId: "FY26-27", channel: "total", value: "22.98", status: "approved" }).onConflictDoNothing();

  // maturity
  await db
    .insert(schema.maturityAssessment)
    .values({ sbuId: cementId, assessedAt: "28/09/2026", level: 1, score: 1.56, dimScores: { strategy: 3.0, identity: 4.33, governance: 2.6, cx: 3.67, digital: 2.33, measurement: 2.5 } })
    .onConflictDoNothing();

  console.log("Seed complete.");
  await (db.$client as Pool).end();
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exitCode = 1;
});
