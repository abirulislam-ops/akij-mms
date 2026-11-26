var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { and as and11, eq as eq14, inArray as inArray9 } from "drizzle-orm";

// src/db.ts
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// ../../packages/schema/src/index.ts
var src_exports = {};
__export(src_exports, {
  activityKpiLink: () => activityKpiLink,
  alert: () => alert,
  auditLog: () => auditLog,
  brand: () => brand,
  budgetActual: () => budgetActual,
  budgetPlan: () => budgetPlan,
  campaign: () => campaign,
  campaignMetric: () => campaignMetric,
  dataGap: () => dataGap,
  decision: () => decision,
  dimension: () => dimension,
  distribution: () => distribution,
  fiscalPeriod: () => fiscalPeriod,
  kpiActual: () => kpiActual,
  kpiDefinition: () => kpiDefinition,
  kpiTarget: () => kpiTarget,
  marketShare: () => marketShare,
  marketSize: () => marketSize,
  maturityAssessment: () => maturityAssessment,
  pricePoint: () => pricePoint,
  researchMetric: () => researchMetric,
  researchWave: () => researchWave,
  revenueActual: () => revenueActual,
  revenueTarget: () => revenueTarget,
  role: () => role,
  sbu: () => sbu,
  sbuKpi: () => sbuKpi,
  strategicObjective: () => strategicObjective,
  strategy: () => strategy,
  uploadBatch: () => uploadBatch,
  user: () => user,
  userRole: () => userRole,
  weightSet: () => weightSet
});

// ../../packages/schema/src/schema.ts
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index
} from "drizzle-orm/pg-core";
var sbu = pgTable(
  "sbu",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    // ACCL, AIL, AEL, ...
    name: text("name").notNull(),
    // Akij Cement
    legalName: text("legal_name"),
    category: text("category"),
    // "Cement · Building Material"
    businessModel: text("business_model").$type().notNull(),
    archetype: text("archetype"),
    // B2C FMCG / construction-industrial / agri / B2B services / healthcare
    custodian: text("custodian"),
    custodianNote: text("custodian_note"),
    businessHead: text("business_head"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("sbu_code_idx").on(t.code)]
);
var brand = pgTable(
  "brand",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").references(() => sbu.id),
    name: text("name").notNull(),
    isCompetitor: boolean("is_competitor").notNull().default(false),
    isOwn: boolean("is_own").notNull().default(true),
    website: text("website"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("brand_sbu_idx").on(t.sbuId),
    uniqueIndex("brand_sbu_name_idx").on(t.sbuId, t.name)
  ]
);
var dimension = pgTable(
  "dimension",
  {
    id: text("id").primaryKey(),
    // "d1" .. "d7"
    name: text("name").notNull(),
    weight: doublePrecision("weight").notNull(),
    // default group weight %
    sortOrder: integer("sort_order").notNull().default(0)
  }
);
var weightSet = pgTable(
  "weight_set",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    version: integer("version").notNull().default(1),
    status: text("status").$type().notNull().default("proposed"),
    weights: jsonb("weights").notNull(),
    // { d1: 28, d2: 13, ... }
    proposedBy: text("proposed_by"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("weight_set_sbu_version_idx").on(t.sbuId, t.version)]
);
var fiscalPeriod = pgTable(
  "fiscal_period",
  {
    id: text("id").primaryKey(),
    // "FY26-27", "FY26-27-Q1", "2026-07"
    label: text("label").notNull(),
    fy: text("fy").notNull(),
    // "FY26-27"
    kind: text("kind").$type().notNull(),
    quarter: integer("quarter"),
    // 1..4 (for quarter/month rows)
    month: integer("month"),
    // 1..12 (for month rows)
    startDate: text("start_date"),
    endDate: text("end_date"),
    sortOrder: integer("sort_order").notNull().default(0)
  }
);
var kpiDefinition = pgTable(
  "kpi_definition",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    // "brand_awareness_aided"
    name: text("name").notNull(),
    dimensionId: text("dimension_id").notNull().references(() => dimension.id),
    definition: text("definition"),
    formula: text("formula"),
    unit: text("unit"),
    // %, index, score, x, BDT Cr, /5, % YoY
    direction: text("direction").$type().notNull().default("higher"),
    leading: boolean("leading").notNull().default(false),
    core: boolean("core").notNull().default(true),
    measurementMethod: text("measurement_method"),
    frequency: text("frequency"),
    // Monthly / Quarterly / Annual
    ownerRole: text("owner_role")
    // Media, Brand, Trade Marketing, ...
  }
);
var sbuKpi = pgTable(
  "sbu_kpi",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    kpiId: integer("kpi_id").notNull().references(() => kpiDefinition.id),
    weightInDimension: doublePrecision("weight_in_dimension").notNull(),
    fourP: text("four_p").$type(),
    isEstimate: boolean("is_estimate").notNull().default(false),
    active: boolean("active").notNull().default(true)
  },
  (t) => [uniqueIndex("sbu_kpi_unique_idx").on(t.sbuId, t.kpiId)]
);
var kpiTarget = pgTable(
  "kpi_target",
  {
    id: serial("id").primaryKey(),
    sbuKpiId: integer("sbu_kpi_id").notNull().references(() => sbuKpi.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: doublePrecision("value").notNull(),
    status: text("status").$type().notNull().default("draft"),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("kpi_target_unique_idx").on(t.sbuKpiId, t.periodId)]
);
var kpiActual = pgTable(
  "kpi_actual",
  {
    id: serial("id").primaryKey(),
    sbuKpiId: integer("sbu_kpi_id").notNull().references(() => sbuKpi.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: doublePrecision("value").notNull(),
    confidence: text("confidence").$type().notNull().default("Low"),
    source: text("source"),
    asOf: text("as_of"),
    evidenceFile: text("evidence_file"),
    enteredBy: text("entered_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("kpi_actual_unique_idx").on(t.sbuKpiId, t.periodId)]
);
var strategy = pgTable(
  "strategy",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    fy: text("fy").notNull(),
    // "FY26-27" .. "FY30-31"
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("strategy_sbu_fy_idx").on(t.sbuId, t.fy)]
);
var strategicObjective = pgTable(
  "strategic_objective",
  {
    id: serial("id").primaryKey(),
    strategyId: integer("strategy_id").notNull().references(() => strategy.id),
    title: text("title").notNull(),
    detail: text("detail"),
    numericTarget: numeric("numeric_target", { precision: 18, scale: 2 }),
    unit: text("unit")
  }
);
var revenueTarget = pgTable(
  "revenue_target",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    // BDT Cr
    volume: numeric("volume", { precision: 18, scale: 2 }),
    unit: text("unit"),
    status: text("status").$type().notNull().default("draft")
  },
  (t) => [uniqueIndex("revenue_target_unique_idx").on(t.sbuId, t.periodId)]
);
var revenueActual = pgTable(
  "revenue_actual",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    volume: numeric("volume", { precision: 18, scale: 2 }),
    unit: text("unit"),
    source: text("source").default("ERP/GL"),
    asOf: text("as_of")
  },
  (t) => [uniqueIndex("revenue_actual_unique_idx").on(t.sbuId, t.periodId)]
);
var marketSize = pgTable(
  "market_size",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    volume: numeric("volume", { precision: 18, scale: 2 }),
    growth: doublePrecision("growth"),
    // market growth rate
    source: text("source"),
    isEstimate: boolean("is_estimate").notNull().default(false)
  },
  (t) => [uniqueIndex("market_size_unique_idx").on(t.category, t.periodId)]
);
var marketShare = pgTable(
  "market_share",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    category: text("category").notNull(),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    region: text("region"),
    valueShare: doublePrecision("value_share"),
    // %
    volumeShare: doublePrecision("volume_share"),
    // %
    source: text("source"),
    isEstimate: boolean("is_estimate").notNull().default(false)
  },
  (t) => [uniqueIndex("market_share_unique_idx").on(t.brandId, t.category, t.periodId, t.region)]
);
var pricePoint = pgTable(
  "price_point",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    sku: text("sku"),
    channel: text("channel"),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    price: numeric("price", { precision: 18, scale: 2 }).notNull()
  }
);
var distribution = pgTable(
  "distribution",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    district: text("district"),
    upazila: text("upazila"),
    numericDistribution: doublePrecision("numeric_distribution"),
    weightedDistribution: doublePrecision("weighted_distribution"),
    dealers: integer("dealers"),
    retailers: integer("retailers"),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id)
  }
);
var maturityAssessment = pgTable(
  "maturity_assessment",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    assessedAt: text("assessed_at").notNull(),
    level: integer("level"),
    // 1..5
    score: doublePrecision("score"),
    // 0..5
    dimScores: jsonb("dim_scores"),
    // per-dimension scores
    criteriaResults: jsonb("criteria_results")
  }
);
var researchWave = pgTable(
  "research_wave",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    waveDate: text("wave_date").notNull(),
    agency: text("agency")
  }
);
var researchMetric = pgTable(
  "research_metric",
  {
    id: serial("id").primaryKey(),
    waveId: integer("wave_id").notNull().references(() => researchWave.id),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    metric: text("metric").notNull(),
    // aided awareness, TOMA, NPS, perceived quality, ...
    value: doublePrecision("value").notNull(),
    sampleSize: integer("sample_size")
  }
);
var campaign = pgTable(
  "campaign",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    brandId: integer("brand_id").references(() => brand.id),
    name: text("name").notNull(),
    objective: text("objective"),
    mode: text("mode").$type().notNull(),
    // Offline | Online sub-tabs
    channel: text("channel"),
    // TV, OOH, BTL, Facebook, YouTube, ...
    region: text("region"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    message: text("message"),
    creativeLink: text("creative_link"),
    status: text("status").$type().notNull().default("plan"),
    isCompetitor: boolean("is_competitor").notNull().default(false),
    spendPlanned: numeric("spend_planned", { precision: 18, scale: 2 }),
    spendActual: numeric("spend_actual", { precision: 18, scale: 2 }),
    spendEstimated: boolean("spend_estimated").notNull().default(false),
    source: text("source"),
    confidence: text("confidence").$type().notNull().default("Low")
  },
  (t) => [index("campaign_sbu_mode_idx").on(t.sbuId, t.mode)]
);
var campaignMetric = pgTable(
  "campaign_metric",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id").notNull().references(() => campaign.id),
    reach: doublePrecision("reach"),
    grp: doublePrecision("grp"),
    impressions: doublePrecision("impressions"),
    views: doublePrecision("views"),
    engagement: doublePrecision("engagement"),
    ctr: doublePrecision("ctr"),
    leads: integer("leads"),
    conversions: integer("conversions"),
    costPerResult: numeric("cost_per_result", { precision: 18, scale: 2 }),
    brandLift: doublePrecision("brand_lift")
  }
);
var activityKpiLink = pgTable(
  "activity_kpi_link",
  {
    id: serial("id").primaryKey(),
    activity: text("activity").notNull(),
    // "TVC — mass-media awareness"
    kpiId: integer("kpi_id").notNull().references(() => kpiDefinition.id),
    mode: text("mode").$type().notNull().default("standalone")
  }
);
var budgetPlan = pgTable(
  "budget_plan",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    channel: text("channel"),
    // ATL / BTL / Digital / PR / Trade / total
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    status: text("status").$type().notNull().default("draft")
  },
  (t) => [uniqueIndex("budget_plan_unique_idx").on(t.sbuId, t.periodId, t.channel)]
);
var budgetActual = pgTable(
  "budget_actual",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    channel: text("channel"),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    source: text("source")
  },
  (t) => [uniqueIndex("budget_actual_unique_idx").on(t.sbuId, t.periodId, t.channel)]
);
var user = pgTable(
  "user",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    /** Better Auth user id (from the neon_auth schema) — the link to Managed Auth. */
    neonAuthUserId: text("neon_auth_user_id").unique(),
    name: text("name"),
    /** Legacy single primary role; the source of truth for RBAC is the `user_role` mapping. */
    role: text("role"),
    /** SBUs this user can access (jsonb array of SBU codes; null/empty = all). */
    sbuIds: jsonb("sbu_ids"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  }
);
var role = pgTable(
  "role",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    // "MD", "CBDO", "BRAND_CUSTODIAN", ...
    name: text("name").notNull(),
    /** One of: moderator, admin, editor, functional, viewer. */
    tier: text("tier").$type().notNull(),
    description: text("description")
  }
);
var userRole = pgTable(
  "user_role",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => user.id),
    roleId: integer("role_id").notNull().references(() => role.id)
  },
  (t) => [uniqueIndex("user_role_unique_idx").on(t.userId, t.roleId)]
);
var auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    action: text("action").notNull(),
    // create / update / delete / approve / lock
    before: jsonb("before"),
    after: jsonb("after"),
    byUser: text("by_user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)]
);
var alert = pgTable(
  "alert",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").references(() => sbu.id),
    severity: text("severity").$type().notNull(),
    rule: text("rule").notNull(),
    message: text("message").notNull(),
    impactBdtCr: numeric("impact_bdt_cr", { precision: 18, scale: 2 }),
    status: text("status").$type().notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  }
);
var decision = pgTable(
  "decision",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").references(() => sbu.id),
    title: text("title").notNull(),
    whatHappened: text("what_happened"),
    why: text("why"),
    impact: text("impact"),
    options: jsonb("options"),
    recommendation: text("recommendation"),
    owner: text("owner"),
    dueDate: text("due_date"),
    status: text("status").$type().notNull().default("open"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  }
);
var dataGap = pgTable(
  "data_gap",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").references(() => sbu.id),
    item: text("item").notNull(),
    whyNeeded: text("why_needed"),
    source: text("source"),
    owner: text("owner"),
    priority: text("priority").$type().notNull().default("medium"),
    status: text("status").$type().notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  }
);
var uploadBatch = pgTable(
  "upload_batch",
  {
    id: serial("id").primaryKey(),
    entity: text("entity").notNull(),
    fileName: text("file_name").notNull(),
    status: text("status").$type().notNull().default("validated"),
    rowCount: integer("row_count"),
    errorCount: integer("error_count"),
    errors: jsonb("errors"),
    byUser: text("by_user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  }
);

// src/db.ts
config({ path: ".env.local" });
config({ path: ".env" });
var pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
var db = drizzle(pool, { schema: src_exports });

// src/auth.ts
import { config as config2 } from "dotenv";
import { createRemoteJWKSet, jwtVerify } from "jose";
config2({ path: ".env.local" });
config2({ path: ".env" });
var NEON_AUTH_JWKS_URL = process.env.NEON_AUTH_JWKS_URL;
var NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;
var jwks = null;
function getJwks() {
  if (!jwks) {
    if (!NEON_AUTH_JWKS_URL) throw new Error("NEON_AUTH_JWKS_URL is not set");
    jwks = createRemoteJWKSet(new URL(NEON_AUTH_JWKS_URL));
  }
  return jwks;
}
async function verifyToken(token) {
  try {
    const issuer = NEON_AUTH_BASE_URL ? new URL(NEON_AUTH_BASE_URL).origin : void 0;
    const { payload } = await jwtVerify(token, getJwks(), issuer ? { issuer } : {});
    return {
      sub: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : void 0,
      payload
    };
  } catch {
    return null;
  }
}
function requireAuth() {
  return async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const user2 = await verifyToken(header.slice(7));
    if (!user2) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("auth", user2);
    await next();
  };
}

// src/rbac.ts
import { eq } from "drizzle-orm";
var TIER_ORDER = ["moderator", "admin", "editor", "functional", "viewer"];
async function getUserRoles(email) {
  const user2 = await db.select({ id: src_exports.user.id }).from(src_exports.user).where(eq(src_exports.user.email, email)).limit(1);
  if (!user2.length) return { email, roles: [], tiers: [] };
  const rows = await db.select({ code: src_exports.role.code, tier: src_exports.role.tier }).from(src_exports.userRole).innerJoin(src_exports.role, eq(src_exports.role.id, src_exports.userRole.roleId)).where(eq(src_exports.userRole.userId, user2[0].id));
  return {
    email,
    roles: rows.map((r) => r.code),
    tiers: rows.map((r) => r.tier)
  };
}
function requireRole(...allowedRoles) {
  return async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.email) return c.json({ error: "Unauthorized" }, 401);
    const { roles, tiers } = await getUserRoles(auth.email);
    const privileged = tiers.includes("moderator") || tiers.includes("admin");
    const allowed = privileged || roles.some((r) => allowedRoles.includes(r));
    if (!allowed) return c.json({ error: "Forbidden" }, 403);
    c.set("roles", roles);
    await next();
  };
}
function requireTier(minTier) {
  return async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.email) return c.json({ error: "Unauthorized" }, 401);
    const { tiers } = await getUserRoles(auth.email);
    const minIndex = TIER_ORDER.indexOf(minTier);
    const ok = tiers.some((t) => TIER_ORDER.indexOf(t) <= minIndex);
    if (!ok) return c.json({ error: "Forbidden" }, 403);
    await next();
  };
}

// src/scores.ts
import { and, eq as eq2, inArray } from "drizzle-orm";

// ../../packages/calc/src/types.ts
var DIMENSION_WEIGHT = {
  d1: 25,
  d2: 15,
  d3: 10,
  d4: 20,
  d5: 15,
  d6: 5,
  d7: 10
};
var INDEX_DIMENSIONS = {
  BEI: ["d1"],
  BHI: ["d2", "d3", "d6"],
  BPI: ["d4", "d5", "d7"],
  Composite: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"]
};
var DEFAULT_BANDS = [
  [110, 5],
  [100, 4],
  [90, 3],
  [80, 2],
  [0, 1]
];

// ../../packages/calc/src/calc.ts
function attainment(actual, target, direction) {
  if (actual == null || target == null || target === 0) return null;
  if (Number.isNaN(actual) || Number.isNaN(target)) return null;
  return direction === "lower" ? target / actual : actual / target;
}
function kpiScore(attainmentValue, bands = DEFAULT_BANDS) {
  if (attainmentValue == null) return null;
  const pct = attainmentValue * 100;
  for (const [threshold, score] of bands) {
    if (pct >= threshold) return score;
  }
  return 1;
}
function rag(attainmentValue) {
  if (attainmentValue == null) return "grey";
  const pct = attainmentValue * 100;
  if (pct >= 100) return "green";
  if (pct >= 90) return "amber";
  return "red";
}
function dimensionScore(kpis, includeEstimates = false) {
  let scoreSum = 0;
  let measuredWeight = 0;
  let totalWeight = 0;
  for (const kpi of kpis) {
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
function indexScore(dimensionScores, index2) {
  const dims = INDEX_DIMENSIONS[index2];
  let scoreSum = 0;
  let measuredDimWeight = 0;
  let totalWeight = 0;
  let coverageWeight = 0;
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
function allIndices(kpis, includeEstimates = false) {
  const dimScores = {};
  for (const dim of ["d1", "d2", "d3", "d4", "d5", "d6", "d7"]) {
    dimScores[dim] = dimensionScore(kpis.filter((k) => k.dimension === dim), includeEstimates);
  }
  return {
    BEI: indexScore(dimScores, "BEI"),
    BHI: indexScore(dimScores, "BHI"),
    BPI: indexScore(dimScores, "BPI"),
    Composite: indexScore(dimScores, "Composite")
  };
}

// ../../packages/calc/src/reconciliation.ts
function projectShare(currentShare, brandGrowth, marketGrowth) {
  return currentShare * ((1 + brandGrowth) / (1 + marketGrowth));
}
function reconcile(input) {
  const { currentShare, brandGrowth, marketGrowth } = input;
  const projected = projectShare(currentShare, brandGrowth, marketGrowth);
  const changePp = (projected - currentShare) * 100;
  const flags = [];
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
function excessSov(sov, som) {
  return sov - som;
}

// src/scores.ts
var BASELINE = "FY25-26";
var TARGET = "FY26-27";
async function computeSbuIndices(sbuId) {
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(and(eq2(src_exports.sbuKpi.sbuId, sbuId), eq2(src_exports.sbuKpi.active, true)));
  if (!sbuKpis.length) return null;
  const kpiDefs = await db.select().from(src_exports.kpiDefinition).where(inArray(src_exports.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db.select().from(src_exports.kpiActual).where(and(inArray(src_exports.kpiActual.sbuKpiId, sbuKpiIds), eq2(src_exports.kpiActual.periodId, BASELINE)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const targets = await db.select().from(src_exports.kpiTarget).where(and(inArray(src_exports.kpiTarget.sbuKpiId, sbuKpiIds), eq2(src_exports.kpiTarget.periodId, TARGET)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));
  const kpis = sbuKpis.map((sk) => {
    const def = defById.get(sk.kpiId);
    const actual = actualBySbuKpi.get(sk.id);
    const target = targetBySbuKpi.get(sk.id);
    return {
      code: def?.code ?? String(sk.kpiId),
      name: def?.name ?? "",
      dimension: def?.dimensionId ?? "d1",
      direction: def?.direction ?? "higher",
      weightInDimension: Number(sk.weightInDimension),
      isEstimate: sk.isEstimate,
      actual: actual ? { value: Number(actual.value), confidence: actual.confidence ?? void 0 } : null,
      target: target ? { value: Number(target.value) } : null
    };
  });
  return allIndices(kpis, false);
}
async function getCockpit() {
  const sbus = await db.select().from(src_exports.sbu).where(eq2(src_exports.sbu.active, true));
  const rows = [];
  for (const s of sbus) {
    const indices = await computeSbuIndices(s.id);
    const [revActual] = await db.select().from(src_exports.revenueActual).where(and(eq2(src_exports.revenueActual.sbuId, s.id), eq2(src_exports.revenueActual.periodId, BASELINE)));
    const [revTarget] = await db.select().from(src_exports.revenueTarget).where(and(eq2(src_exports.revenueTarget.sbuId, s.id), eq2(src_exports.revenueTarget.periodId, TARGET)));
    rows.push({
      code: s.code,
      name: s.name,
      category: s.category,
      custodian: s.custodian,
      composite: indices?.Composite.score ?? null,
      bei: indices?.BEI.score ?? null,
      bhi: indices?.BHI.score ?? null,
      bpi: indices?.BPI.score ?? null,
      coverage: indices?.Composite.coverage ?? 0,
      revenueBase: revActual ? Number(revActual.value) : null,
      revenueTarget: revTarget ? Number(revTarget.value) : null
    });
  }
  return rows;
}

// src/upload.ts
import { and as and2, eq as eq3 } from "drizzle-orm";

// src/csv.ts
function parseCsv(text2) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text2.length; i++) {
    const ch = text2[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text2[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// src/upload.ts
var CONFIDENCE = ["High", "Med", "Low", "Web", "Estimate"];
async function validateKpiActuals(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return { valid: [], errors: [{ line: 0, message: "CSV must have a header row plus at least one data row" }], affectedSbus: [] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const required = ["sbu_code", "kpi_code", "period", "value"];
  const missing = required.filter((r) => idx(r) < 0);
  if (missing.length) return { valid: [], errors: [{ line: 0, message: `Missing column(s): ${missing.join(", ")}` }], affectedSbus: [] };
  const [sbusRows, kpiDefs, periods, sbuKpiRows] = await Promise.all([
    db.select().from(src_exports.sbu),
    db.select().from(src_exports.kpiDefinition),
    db.select().from(src_exports.fiscalPeriod),
    db.select().from(src_exports.sbuKpi)
  ]);
  const sbuByCode = new Map(sbusRows.map((s) => [s.code, s]));
  const kpiByCode = new Map(kpiDefs.map((k) => [k.code, k]));
  const periodIds = new Set(periods.map((p) => p.id));
  const activeSbuKpi = new Set(sbuKpiRows.filter((k) => k.active).map((k) => `${k.sbuId}:${k.kpiId}`));
  const valid = [];
  const errors = [];
  const seen = /* @__PURE__ */ new Set();
  const affected = /* @__PURE__ */ new Set();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    const sbuCode = (r[idx("sbu_code")] ?? "").trim();
    const kpiCode = (r[idx("kpi_code")] ?? "").trim();
    const periodId = (r[idx("period")] ?? "").trim();
    const valueRaw = (r[idx("value")] ?? "").trim();
    const confidence = (r[idx("confidence")] ?? "").trim() || "Low";
    const source = (r[idx("source")] ?? "").trim();
    if (!sbuCode) {
      errors.push({ line, message: "sbu_code is empty" });
      continue;
    }
    if (!kpiCode) {
      errors.push({ line, message: "kpi_code is empty" });
      continue;
    }
    if (!periodId) {
      errors.push({ line, message: "period is empty" });
      continue;
    }
    const sbu2 = sbuByCode.get(sbuCode);
    if (!sbu2) {
      errors.push({ line, message: `unknown SBU code "${sbuCode}"` });
      continue;
    }
    const kpi = kpiByCode.get(kpiCode);
    if (!kpi) {
      errors.push({ line, message: `unknown KPI code "${kpiCode}"` });
      continue;
    }
    if (!periodIds.has(periodId)) {
      errors.push({ line, message: `unknown period "${periodId}"` });
      continue;
    }
    if (!activeSbuKpi.has(`${sbu2.id}:${kpi.id}`)) {
      errors.push({ line, message: `KPI "${kpiCode}" is not active for ${sbuCode}` });
      continue;
    }
    const value = Number(valueRaw);
    if (valueRaw === "" || Number.isNaN(value)) {
      errors.push({ line, message: `value "${valueRaw}" is not a number` });
      continue;
    }
    if (!CONFIDENCE.includes(confidence)) {
      errors.push({ line, message: `invalid confidence "${confidence}"` });
      continue;
    }
    const dupKey = `${sbuCode}:${kpiCode}:${periodId}`;
    if (seen.has(dupKey)) {
      errors.push({ line, message: `duplicate ${sbuCode}/${kpiCode}/${periodId}` });
      continue;
    }
    seen.add(dupKey);
    valid.push({ line, sbuCode, kpiCode, periodId, value, confidence, source });
    affected.add(sbuCode);
  }
  return { valid, errors, affectedSbus: [...affected] };
}
async function commitKpiActuals(rows, byUser) {
  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const [sbu2] = await db.select().from(src_exports.sbu).where(eq3(src_exports.sbu.code, row.sbuCode));
    const [kpi] = await db.select().from(src_exports.kpiDefinition).where(eq3(src_exports.kpiDefinition.code, row.kpiCode));
    if (!sbu2 || !kpi) continue;
    const [sk] = await db.select().from(src_exports.sbuKpi).where(and2(eq3(src_exports.sbuKpi.sbuId, sbu2.id), eq3(src_exports.sbuKpi.kpiId, kpi.id)));
    if (!sk) continue;
    const [existing] = await db.select().from(src_exports.kpiActual).where(and2(eq3(src_exports.kpiActual.sbuKpiId, sk.id), eq3(src_exports.kpiActual.periodId, row.periodId)));
    if (existing) {
      await db.update(src_exports.kpiActual).set({ value: row.value, confidence: row.confidence, source: row.source, asOf: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), enteredBy: byUser }).where(eq3(src_exports.kpiActual.id, existing.id));
      updated++;
    } else {
      await db.insert(src_exports.kpiActual).values({
        sbuKpiId: sk.id,
        periodId: row.periodId,
        value: row.value,
        confidence: row.confidence,
        source: row.source,
        asOf: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        enteredBy: byUser
      });
      inserted++;
    }
    if (row.confidence === "High" || row.confidence === "Med" || row.confidence === "Web") {
      await db.update(src_exports.sbuKpi).set({ isEstimate: false }).where(eq3(src_exports.sbuKpi.id, sk.id));
    }
    await db.insert(src_exports.auditLog).values({
      entity: "kpi_actual",
      entityId: `${row.sbuCode}/${row.kpiCode}/${row.periodId}`,
      action: existing ? "update" : "create",
      before: existing ? { value: Number(existing.value), confidence: existing.confidence } : null,
      after: { value: row.value, confidence: row.confidence },
      byUser
    });
  }
  return { inserted, updated };
}
function kpiActualsTemplate() {
  return [
    "sbu_code,kpi_code,period,value,confidence,source",
    "ACCL,aided_awareness,FY26-27,72,Med,Quantum study",
    "ACCL,market_share,FY26-27,5.60,High,ERP/GL",
    "ACCL,brand_revenue,FY26-27,2300,High,ERP/GL"
  ].join("\n");
}

// src/freshness.ts
import { sql } from "drizzle-orm";
async function getFreshness() {
  const datasets = [
    { name: "KPI actuals", table: "kpi_actual" },
    { name: "Revenue actuals", table: "revenue_actual" },
    { name: "Market share", table: "market_share" },
    { name: "Budget plan", table: "budget_plan" }
  ];
  const rows = [];
  for (const d of datasets) {
    const res = await db.execute(
      sql`SELECT count(*)::int AS n, max(period_id) AS latest_period FROM ${sql.raw(d.table)}`
    );
    const r = res.rows[0];
    rows.push({ dataset: d.name, rows: r?.n ?? 0, latestPeriod: r?.latest_period ?? null });
  }
  return rows;
}

// src/hub.ts
import { and as and3, eq as eq4, inArray as inArray2 } from "drizzle-orm";
var BASELINE2 = "FY25-26";
var TARGET2 = "FY26-27";
var FYS = ["FY26-27", "FY27-28", "FY28-29", "FY29-30", "FY30-31"];
async function getSbuHub(sbuId) {
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq4(src_exports.sbu.id, sbuId));
  if (!sbu2) return null;
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(and3(eq4(src_exports.sbuKpi.sbuId, sbuId), eq4(src_exports.sbuKpi.active, true)));
  const kpiDefs = await db.select().from(src_exports.kpiDefinition).where(inArray2(src_exports.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db.select().from(src_exports.kpiActual).where(and3(inArray2(src_exports.kpiActual.sbuKpiId, sbuKpiIds), eq4(src_exports.kpiActual.periodId, BASELINE2)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const targets = await db.select().from(src_exports.kpiTarget).where(and3(inArray2(src_exports.kpiTarget.sbuKpiId, sbuKpiIds), eq4(src_exports.kpiTarget.periodId, TARGET2)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));
  const fyTargets = await db.select().from(src_exports.kpiTarget).where(and3(inArray2(src_exports.kpiTarget.sbuKpiId, sbuKpiIds), inArray2(src_exports.kpiTarget.periodId, FYS)));
  const fyTargetsBySbuKpi = /* @__PURE__ */ new Map();
  for (const t of fyTargets) {
    if (!fyTargetsBySbuKpi.has(t.sbuKpiId)) fyTargetsBySbuKpi.set(t.sbuKpiId, /* @__PURE__ */ new Map());
    fyTargetsBySbuKpi.get(t.sbuKpiId).set(t.periodId, Number(t.value));
  }
  const dims = await db.select().from(src_exports.dimension);
  const dimById = new Map(dims.map((d) => [d.id, d]));
  const indices = await computeSbuIndices(sbuId);
  const kpisForCalc = sbuKpis.map((sk) => {
    const def = defById.get(sk.kpiId);
    const actual = actualBySbuKpi.get(sk.id);
    const target = targetBySbuKpi.get(sk.id);
    return {
      code: def?.code ?? String(sk.kpiId),
      name: def?.name ?? "",
      dimension: def?.dimensionId ?? "d1",
      direction: def?.direction ?? "higher",
      weightInDimension: Number(sk.weightInDimension),
      isEstimate: sk.isEstimate,
      actual: actual ? { value: Number(actual.value), confidence: actual.confidence ?? void 0 } : null,
      target: target ? { value: Number(target.value) } : null
    };
  });
  const allIdx = allIndices(kpisForCalc, false);
  const dimensions = dims.sort((a, b) => a.sortOrder - b.sortOrder).map((d) => {
    const inDim = kpisForCalc.filter((k) => k.dimension === d.id);
    const sc = dimensionScore(inDim, false);
    return { id: d.id, name: d.name, weight: d.weight, score: sc.score, coverage: sc.coverage };
  });
  const kpis = sbuKpis.map((sk) => {
    const def = defById.get(sk.kpiId);
    const actual = actualBySbuKpi.get(sk.id);
    const target = targetBySbuKpi.get(sk.id);
    const att = actual && target ? attainment(Number(actual.value), Number(target.value), def?.direction ?? "higher") : null;
    const score = kpiScore(att);
    return {
      code: def?.code ?? "",
      name: def?.name ?? "",
      dimension: def?.dimensionId ?? "",
      dimensionName: dimById.get(def?.dimensionId ?? "")?.name ?? "",
      unit: def?.unit ?? "",
      direction: def?.direction ?? "higher",
      fourP: sk.fourP,
      weightInDimension: Number(sk.weightInDimension),
      isEstimate: sk.isEstimate,
      actual: actual ? Number(actual.value) : null,
      target: target ? Number(target.value) : null,
      targets: FYS.map((fy) => ({ period: fy, value: fyTargetsBySbuKpi.get(sk.id)?.get(fy) ?? null })),
      confidence: actual?.confidence ?? null,
      source: actual?.source ?? null,
      asOf: actual?.asOf ?? null,
      attainment: att,
      score,
      rag: rag(att)
    };
  });
  const campaigns = await db.select().from(src_exports.campaign).where(eq4(src_exports.campaign.sbuId, sbuId));
  const campaignIds = campaigns.map((c) => c.id);
  const metrics = campaignIds.length ? await db.select().from(src_exports.campaignMetric).where(inArray2(src_exports.campaignMetric.campaignId, campaignIds)) : [];
  const metricByCampaign = new Map(metrics.map((m) => [m.campaignId, m]));
  const campaignRow = (c) => {
    const m = metricByCampaign.get(c.id);
    const company = c.name.split(" \u2014 ")[0] ?? c.name;
    return {
      id: c.id,
      name: c.name,
      company,
      channel: c.channel,
      status: c.status,
      isCompetitor: c.isCompetitor,
      spend: c.spendActual != null ? Number(c.spendActual) : null,
      spendEstimated: c.spendEstimated,
      confidence: c.confidence,
      reach: m?.reach ?? null,
      impressions: m?.impressions ?? null,
      ctr: m?.ctr ?? null
    };
  };
  const campaignList = {
    online: campaigns.filter((c) => c.mode === "online").map(campaignRow),
    offline: campaigns.filter((c) => c.mode === "offline").map(campaignRow)
  };
  const ownBrands = await db.select().from(src_exports.brand).where(and3(eq4(src_exports.brand.sbuId, sbuId), eq4(src_exports.brand.isOwn, true)));
  const compBrands = await db.select().from(src_exports.brand).where(and3(eq4(src_exports.brand.sbuId, sbuId), eq4(src_exports.brand.isCompetitor, true)));
  const brandIds = [...ownBrands, ...compBrands].map((b) => b.id);
  const shares = brandIds.length ? await db.select().from(src_exports.marketShare).where(and3(inArray2(src_exports.marketShare.brandId, brandIds), eq4(src_exports.marketShare.periodId, BASELINE2))) : [];
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));
  const ownShare = ownBrands.map((b) => {
    const s = shareByBrand.get(b.id);
    return s ? { name: b.name, share: s.valueShare, isEstimate: s.isEstimate } : { name: b.name, share: null, isEstimate: true };
  });
  const competitors = compBrands.map((b) => {
    const s = shareByBrand.get(b.id);
    return { name: b.name, share: s?.valueShare ?? null, isEstimate: s?.isEstimate ?? true };
  });
  const market = { own: ownShare, competitors };
  const [revBase] = await db.select().from(src_exports.revenueActual).where(and3(eq4(src_exports.revenueActual.sbuId, sbuId), eq4(src_exports.revenueActual.periodId, BASELINE2)));
  const revTargets = await db.select().from(src_exports.revenueTarget).where(and3(eq4(src_exports.revenueTarget.sbuId, sbuId), inArray2(src_exports.revenueTarget.periodId, FYS)));
  const revTargetByPeriod = new Map(revTargets.map((t) => [t.periodId, t]));
  const revenue = {
    base: revBase ? Number(revBase.value) : null,
    targets: FYS.map((fy) => ({ period: fy, value: revTargetByPeriod.get(fy) ? Number(revTargetByPeriod.get(fy).value) : null }))
  };
  const budgetRows = await db.select().from(src_exports.budgetPlan).where(eq4(src_exports.budgetPlan.sbuId, sbuId));
  const budget = budgetRows.find((b) => b.channel === "total") ?? budgetRows[0] ?? null;
  const [maturity] = await db.select().from(src_exports.maturityAssessment).where(eq4(src_exports.maturityAssessment.sbuId, sbuId));
  return {
    sbu: {
      code: sbu2.code,
      name: sbu2.name,
      legalName: sbu2.legalName,
      category: sbu2.category,
      businessModel: sbu2.businessModel,
      archetype: sbu2.archetype,
      custodian: sbu2.custodian,
      businessHead: sbu2.businessHead
    },
    indices: indices ?? allIdx,
    dimensions,
    kpis,
    campaigns: campaignList,
    market,
    revenue,
    budget: budget ? { period: budget.periodId, value: Number(budget.value), status: budget.status } : null,
    maturity: maturity ? { assessedAt: maturity.assessedAt, level: maturity.level, score: maturity.score, dimScores: maturity.dimScores } : null
  };
}

// src/coverage.ts
import { and as and4, eq as eq5, inArray as inArray3 } from "drizzle-orm";
var BASELINE3 = "FY25-26";
async function getCoverage() {
  const sbus = await db.select().from(src_exports.sbu).where(eq5(src_exports.sbu.active, true));
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(eq5(src_exports.sbuKpi.active, true));
  const kpiDefs = await db.select().from(src_exports.kpiDefinition);
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db.select().from(src_exports.kpiActual).where(and4(inArray3(src_exports.kpiActual.sbuKpiId, sbuKpiIds), eq5(src_exports.kpiActual.periodId, BASELINE3)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const brands = await db.select().from(src_exports.brand);
  const brandIds = brands.map((b) => b.id);
  const shares = brandIds.length ? await db.select().from(src_exports.marketShare).where(and4(inArray3(src_exports.marketShare.brandId, brandIds), eq5(src_exports.marketShare.periodId, BASELINE3))) : [];
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));
  const campaigns = await db.select().from(src_exports.campaign);
  const revenues = await db.select().from(src_exports.revenueActual).where(eq5(src_exports.revenueActual.periodId, BASELINE3));
  const budgets = await db.select().from(src_exports.budgetPlan);
  const maturities = await db.select().from(src_exports.maturityAssessment);
  const sbuKpisBySbu = /* @__PURE__ */ new Map();
  for (const k of sbuKpis) {
    const arr = sbuKpisBySbu.get(k.sbuId) ?? [];
    arr.push(k);
    sbuKpisBySbu.set(k.sbuId, arr);
  }
  const brandsBySbu = /* @__PURE__ */ new Map();
  for (const b of brands) {
    const arr = brandsBySbu.get(b.sbuId) ?? [];
    arr.push(b);
    brandsBySbu.set(b.sbuId, arr);
  }
  const campaignsBySbu = /* @__PURE__ */ new Map();
  for (const c of campaigns) {
    const arr = campaignsBySbu.get(c.sbuId) ?? [];
    arr.push(c);
    campaignsBySbu.set(c.sbuId, arr);
  }
  const revBySbu = new Map(revenues.map((r) => [r.sbuId, r]));
  const budgetBySbu = new Map(budgets.map((b) => [b.sbuId, b]));
  const maturityBySbu = new Map(maturities.map((m) => [m.sbuId, m]));
  const DIM_LABEL = {
    d1: "Brand Equity",
    d2: "Brand Health",
    d3: "Positioning & Competitive",
    d4: "Market Performance",
    d5: "Financial Value",
    d6: "Digital Strength",
    d7: "Execution & Governance"
  };
  const DIM_ORDER = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"];
  const rows = sbus.map((s) => {
    const sk = sbuKpisBySbu.get(s.id) ?? [];
    const modules = [];
    for (const dim of DIM_ORDER) {
      const inDim = sk.filter((k) => (defById.get(k.kpiId)?.dimensionId ?? "") === dim);
      if (inDim.length === 0) {
        modules.push({ key: dim, label: DIM_LABEL[dim], status: "missing", detail: "no KPIs" });
        continue;
      }
      let measuredWeight = 0;
      let totalWeight = 0;
      let estimateOnly = 0;
      for (const k of inDim) {
        totalWeight += Number(k.weightInDimension);
        const a = actualBySbuKpi.get(k.id);
        if (k.isEstimate) {
          estimateOnly++;
          continue;
        }
        if (a) measuredWeight += Number(k.weightInDimension);
      }
      const measured = totalWeight > 0 ? measuredWeight / totalWeight : 0;
      let status;
      if (measuredWeight > 0) status = "measured";
      else if (estimateOnly > 0) status = "estimate";
      else status = "missing";
      const detail = status === "measured" ? `${(measured * 100).toFixed(0)}% measured` : status === "estimate" ? `${estimateOnly} estimate` : "no actuals";
      modules.push({ key: dim, label: DIM_LABEL[dim], status, detail, measured });
    }
    const sbCampaigns = campaignsBySbu.get(s.id) ?? [];
    const ownCamps = sbCampaigns.filter((c) => !c.isCompetitor);
    const compCamps = sbCampaigns.filter((c) => c.isCompetitor);
    modules.push({
      key: "campaigns",
      label: "Campaigns",
      status: ownCamps.length ? "measured" : compCamps.length ? "estimate" : "missing",
      detail: `${ownCamps.length} own / ${compCamps.length} competitor`
    });
    const sbBrands = brandsBySbu.get(s.id) ?? [];
    const ownBrand = sbBrands.find((b) => b.isOwn);
    const ownShare = ownBrand ? shareByBrand.get(ownBrand.id) : void 0;
    const compBrands = sbBrands.filter((b) => b.isCompetitor);
    modules.push({
      key: "market",
      label: "Market & Share",
      status: ownShare ? ownShare.isEstimate ? "estimate" : "measured" : "missing",
      detail: `${compBrands.length} competitors${ownShare?.valueShare != null ? ` \xB7 own ${ownShare.valueShare.toFixed(2)}%` : ""}`
    });
    const rev = revBySbu.get(s.id);
    modules.push({
      key: "revenue",
      label: "Revenue",
      status: rev ? "measured" : "missing",
      detail: rev ? `${Number(rev.value).toLocaleString("en-IN")} BDT Cr` : "no data"
    });
    const bud = budgetBySbu.get(s.id);
    modules.push({
      key: "budget",
      label: "Budget",
      status: bud ? "measured" : "missing",
      detail: bud ? `${Number(bud.value).toLocaleString("en-IN")} BDT Cr` : "no data"
    });
    const mat = maturityBySbu.get(s.id);
    modules.push({
      key: "maturity",
      label: "Maturity",
      status: mat ? "measured" : "missing",
      detail: mat ? `L${mat.level ?? "\u2014"} \xB7 ${(mat.score ?? 0).toFixed(2)}` : "no audit"
    });
    const measuredCount = modules.filter((m) => m.status === "measured").length;
    const estimateCount = modules.filter((m) => m.status === "estimate").length;
    const missingCount = modules.filter((m) => m.status === "missing").length;
    return {
      code: s.code,
      name: s.name,
      custodian: s.custodian,
      modules,
      measuredCount,
      estimateCount,
      missingCount,
      completeness: modules.length ? measuredCount / modules.length : 0
    };
  });
  const moduleKeys = rows[0]?.modules.map((m) => m.key) ?? [];
  const totalCells = rows.length * moduleKeys.length;
  const measuredCells = rows.reduce((a, r) => a + r.measuredCount, 0);
  const estimateCells = rows.reduce((a, r) => a + r.estimateCount, 0);
  return {
    sbus: rows,
    moduleKeys,
    summary: {
      totalSbus: rows.length,
      totalModules: moduleKeys.length,
      measuredCells,
      estimateCells,
      missingCells: totalCells - measuredCells - estimateCells,
      groupCompleteness: totalCells ? measuredCells / totalCells : 0
    }
  };
}

// src/market.ts
import { and as and5, eq as eq6, inArray as inArray4 } from "drizzle-orm";
var BASELINE4 = "FY25-26";
var TARGET3 = "FY26-27";
var FLAG_LABEL = {
  "revenue-growth-below-market": "Revenue grows slower than market",
  "share-loss": "Projected share loss",
  "unattainable-target": "Plan cannot reach target share",
  "implausible-ceiling": "Implied share above plausible ceiling"
};
async function loadShareData() {
  const sbus = await db.select().from(src_exports.sbu).where(eq6(src_exports.sbu.active, true));
  const brands = await db.select().from(src_exports.brand);
  const shares = await db.select().from(src_exports.marketShare).where(eq6(src_exports.marketShare.periodId, BASELINE4));
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));
  const revs = await db.select().from(src_exports.revenueActual).where(eq6(src_exports.revenueActual.periodId, BASELINE4));
  const revBySbu = new Map(revs.map((r) => [r.sbuId, r]));
  const revTargets = await db.select().from(src_exports.revenueTarget).where(eq6(src_exports.revenueTarget.periodId, TARGET3));
  const revTargetBySbu = new Map(revTargets.map((t) => [t.sbuId, t]));
  const marketSizes = await db.select().from(src_exports.marketSize).where(eq6(src_exports.marketSize.periodId, BASELINE4));
  const marketByCategory = new Map(marketSizes.map((m) => [m.category, m]));
  const kpiDefs = await db.select().from(src_exports.kpiDefinition).where(inArray4(src_exports.kpiDefinition.code, ["market_share", "sov"]));
  const defIdByCode = new Map(kpiDefs.map((d) => [d.code, d.id]));
  const shareKpiId = defIdByCode.get("market_share");
  const sovKpiId = defIdByCode.get("sov");
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(eq6(src_exports.sbuKpi.active, true));
  const sbuKpiById = new Map(sbuKpis.map((k) => [k.id, k]));
  const shareKpiBySbu = /* @__PURE__ */ new Map();
  const sovKpiBySbu = /* @__PURE__ */ new Map();
  for (const k of sbuKpis) {
    if (shareKpiId && k.kpiId === shareKpiId) shareKpiBySbu.set(k.sbuId, k.id);
    if (sovKpiId && k.kpiId === sovKpiId) sovKpiBySbu.set(k.sbuId, k.id);
  }
  const shareTargets = await db.select().from(src_exports.kpiTarget).where(and5(inArray4(src_exports.kpiTarget.sbuKpiId, [...shareKpiBySbu.values()]), eq6(src_exports.kpiTarget.periodId, TARGET3)));
  const shareTargetBySbuKpi = new Map(shareTargets.map((t) => [t.sbuKpiId, t]));
  const sovActuals = await db.select().from(src_exports.kpiActual).where(and5(inArray4(src_exports.kpiActual.sbuKpiId, [...sovKpiBySbu.values()]), eq6(src_exports.kpiActual.periodId, BASELINE4)));
  const sovBySbuKpi = new Map(sovActuals.map((a) => [a.sbuKpiId, a]));
  return { sbus, brands, shareByBrand, revBySbu, revTargetBySbu, marketByCategory, shareKpiBySbu, sovKpiBySbu, shareTargetBySbuKpi, sovBySbuKpi };
}
function pctShare(v) {
  return v == null ? null : v / 100;
}
async function getMarketOverview() {
  const d = await loadShareData();
  const rows = [];
  for (const s of d.sbus) {
    const own = d.brands.find((b) => b.sbuId === s.id && b.isOwn);
    const comps = d.brands.filter((b) => b.sbuId === s.id && b.isCompetitor);
    const ownShare = own ? d.shareByBrand.get(own.id) : void 0;
    const compShares = comps.map((c) => ({ name: c.name, share: d.shareByBrand.get(c.id)?.valueShare ?? null })).filter((x) => x.share != null);
    const rev = d.revBySbu.get(s.id);
    const revTarget = d.revTargetBySbu.get(s.id);
    const brandGrowth = rev && revTarget ? Number(revTarget.value) / Number(rev.value) - 1 : null;
    const market = d.marketByCategory.get(s.code);
    const marketGrowth = market?.growth != null ? Number(market.growth) / 100 : null;
    const ownShareVal = ownShare?.valueShare != null ? Number(ownShare.valueShare) : null;
    const rec = ownShareVal != null && brandGrowth != null && marketGrowth != null ? reconcile({ currentShare: pctShare(ownShareVal), brandGrowth, marketGrowth, shareCeiling: 0.6 }) : null;
    const allShares = [
      ...ownShareVal != null ? [{ name: s.name, share: ownShareVal, own: true }] : [],
      ...compShares.map((c) => ({ ...c, own: false }))
    ].sort((a, b) => b.share - a.share);
    const rank = ownShareVal != null && compShares.length > 0 ? allShares.findIndex((x) => x.own) + 1 : null;
    const sovKpiId = d.sovKpiBySbu.get(s.id);
    const sovActual = sovKpiId ? d.sovBySbuKpi.get(sovKpiId) : void 0;
    const sov = sovActual ? Number(sovActual.value) : null;
    const som = ownShareVal;
    const sovSom = sov != null && som != null ? excessSov(sov, som) : null;
    rows.push({
      code: s.code,
      name: s.name,
      category: s.category,
      ownShare: ownShareVal,
      ownShareEstimate: ownShare?.isEstimate ?? true,
      rank,
      competitorCount: comps.length,
      marketSize: market ? Number(market.value) : null,
      marketSizeEstimate: market?.isEstimate ?? true,
      marketGrowth: market?.growth != null ? Number(market.growth) : null,
      brandGrowth: brandGrowth != null ? Math.round(brandGrowth * 1e3) / 10 : null,
      projectedShare: rec ? Math.round(rec.projectedShare * 1e4) / 100 : null,
      shareChangePp: rec ? Math.round(rec.shareChangePp * 100) / 100 : null,
      verdict: rec?.verdict ?? null,
      flags: rec?.flags.map((f) => FLAG_LABEL[f]) ?? [],
      sov,
      excessSov: sovSom != null ? Math.round(sovSom * 100) / 100 : null
    });
  }
  return rows;
}
async function getMarketDetail(code) {
  const d = await loadShareData();
  const s = d.sbus.find((x) => x.code === code);
  if (!s) return null;
  const own = d.brands.find((b) => b.sbuId === s.id && b.isOwn);
  const comps = d.brands.filter((b) => b.sbuId === s.id && b.isCompetitor);
  const shareRows = [
    ...own ? [{ name: own.name, own: true, share: d.shareByBrand.get(own.id)?.valueShare ?? null, isEstimate: d.shareByBrand.get(own.id)?.isEstimate ?? true }] : [],
    ...comps.map((c) => {
      const sh = d.shareByBrand.get(c.id);
      return { name: c.name, own: false, share: sh?.valueShare ?? null, isEstimate: sh?.isEstimate ?? true };
    })
  ].sort((a, b) => (b.share ?? -1) - (a.share ?? -1));
  const rev = d.revBySbu.get(s.id);
  const revTarget = d.revTargetBySbu.get(s.id);
  const brandGrowth = rev && revTarget ? Number(revTarget.value) / Number(rev.value) - 1 : null;
  const market = d.marketByCategory.get(s.code);
  const marketGrowth = market?.growth != null ? Number(market.growth) / 100 : null;
  const ownShareVal = own ? d.shareByBrand.get(own.id)?.valueShare ?? null : null;
  const shareTargetKpiId = d.shareKpiBySbu.get(s.id);
  const shareTarget = shareTargetKpiId ? d.shareTargetBySbuKpi.get(shareTargetKpiId) : void 0;
  const targetShare = shareTarget ? Number(shareTarget.value) : null;
  const rec = ownShareVal != null && brandGrowth != null && marketGrowth != null ? reconcile({ currentShare: pctShare(Number(ownShareVal)), brandGrowth, marketGrowth, targetShare: targetShare != null ? pctShare(targetShare) ?? void 0 : void 0, shareCeiling: 0.6 }) : null;
  const sovKpiId = d.sovKpiBySbu.get(s.id);
  const sov = sovKpiId ? Number(d.sovBySbuKpi.get(sovKpiId)?.value ?? 0) || null : null;
  return {
    sbu: { code: s.code, name: s.name, category: s.category },
    shareRows,
    ownShare: ownShareVal != null ? Number(ownShareVal) : null,
    brandGrowth: brandGrowth != null ? Math.round(brandGrowth * 1e3) / 10 : null,
    marketGrowth: market?.growth != null ? Number(market.growth) : null,
    marketSize: market ? Number(market.value) : null,
    marketSizeEstimate: market?.isEstimate ?? true,
    targetShare,
    sov,
    excessSov: sov != null && ownShareVal != null ? Math.round(excessSov(sov, Number(ownShareVal)) * 100) / 100 : null,
    reconciliation: rec ? {
      projectedShare: Math.round(rec.projectedShare * 1e4) / 100,
      shareChangePp: Math.round(rec.shareChangePp * 100) / 100,
      verdict: rec.verdict,
      flags: rec.flags.map((f) => ({ key: f, label: FLAG_LABEL[f] }))
    } : null
  };
}
async function whatIfShare(code, brandGrowthPct) {
  const d = await loadShareData();
  const s = d.sbus.find((x) => x.code === code);
  if (!s) return null;
  const own = d.brands.find((b) => b.sbuId === s.id && b.isOwn);
  const ownShare = own ? d.shareByBrand.get(own.id) : void 0;
  const ownShareVal = ownShare?.valueShare != null ? Number(ownShare.valueShare) : null;
  const market = d.marketByCategory.get(s.code);
  const marketGrowth = market?.growth != null ? Number(market.growth) / 100 : null;
  if (ownShareVal == null || marketGrowth == null) return null;
  const brandGrowth = brandGrowthPct / 100;
  const shareTargetKpiId = d.shareKpiBySbu.get(s.id);
  const shareTarget = shareTargetKpiId ? d.shareTargetBySbuKpi.get(shareTargetKpiId) : void 0;
  const targetShare = shareTarget ? Number(shareTarget.value) : null;
  const rec = reconcile({
    currentShare: pctShare(ownShareVal),
    brandGrowth,
    marketGrowth,
    targetShare: targetShare != null ? pctShare(targetShare) ?? void 0 : void 0,
    shareCeiling: 0.6
  });
  return {
    code: s.code,
    name: s.name,
    currentShare: ownShareVal,
    marketGrowth: market?.growth != null ? Number(market.growth) : null,
    brandGrowth: brandGrowthPct,
    targetShare,
    projectedShare: Math.round(rec.projectedShare * 1e4) / 100,
    shareChangePp: Math.round(rec.shareChangePp * 100) / 100,
    verdict: rec.verdict,
    flags: rec.flags.map((f) => ({ key: f, label: FLAG_LABEL[f] }))
  };
}

// src/budget.ts
import { and as and6, eq as eq7, inArray as inArray5 } from "drizzle-orm";
var BASELINE5 = "FY25-26";
async function getBudgetOverview() {
  const sbus = await db.select().from(src_exports.sbu).where(eq7(src_exports.sbu.active, true));
  const budgets = await db.select().from(src_exports.budgetPlan);
  const budgetBySbu = /* @__PURE__ */ new Map();
  for (const b of budgets) {
    if (!budgetBySbu.has(b.sbuId) || b.channel === "total") budgetBySbu.set(b.sbuId, b);
  }
  const campaigns = await db.select().from(src_exports.campaign).where(eq7(src_exports.campaign.isCompetitor, false));
  const spendBySbu = /* @__PURE__ */ new Map();
  for (const c of campaigns) {
    const v = c.spendActual != null ? Number(c.spendActual) : 0;
    spendBySbu.set(c.sbuId, (spendBySbu.get(c.sbuId) ?? 0) + v);
  }
  const revs = await db.select().from(src_exports.revenueActual).where(eq7(src_exports.revenueActual.periodId, BASELINE5));
  const revBySbu = new Map(revs.map((r) => [r.sbuId, Number(r.value)]));
  const [romiDef] = await db.select().from(src_exports.kpiDefinition).where(eq7(src_exports.kpiDefinition.code, "romi"));
  const romiKpis = romiDef ? await db.select().from(src_exports.sbuKpi).where(and6(eq7(src_exports.sbuKpi.kpiId, romiDef.id), eq7(src_exports.sbuKpi.active, true))) : [];
  const romiKpiBySbu = new Map(romiKpis.map((k) => [k.sbuId, k.id]));
  const romiActuals = romiKpis.length ? await db.select().from(src_exports.kpiActual).where(and6(inArray5(src_exports.kpiActual.sbuKpiId, romiKpis.map((k) => k.id)), eq7(src_exports.kpiActual.periodId, BASELINE5))) : [];
  const romiBySbuKpi = new Map(romiActuals.map((a) => [a.sbuKpiId, a]));
  const rows = sbus.map((s) => {
    const budget = budgetBySbu.get(s.id);
    const budgetVal = budget ? Number(budget.value) : null;
    const spend = spendBySbu.get(s.id) ?? 0;
    const revenue = revBySbu.get(s.id) ?? null;
    const romiKpiId = romiKpiBySbu.get(s.id);
    const romiActual = romiKpiId ? romiBySbuKpi.get(romiKpiId) : void 0;
    const romiVal = romiActual ? Number(romiActual.value) : null;
    return {
      code: s.code,
      name: s.name,
      budget: budgetVal,
      campaignSpend: spend,
      spendVsPlan: budgetVal && budgetVal > 0 ? Math.round(spend / budgetVal * 1e3) / 10 : null,
      romi: romiVal,
      romiEstimate: romiActual ? romiActual.confidence === "Low" || romiActual.confidence === "Estimate" : true,
      intensity: revenue && revenue > 0 ? Math.round(spend / revenue * 1e4) / 100 : null
    };
  });
  const totalBudget = rows.reduce((a, r) => a + (r.budget ?? 0), 0);
  const totalSpend = rows.reduce((a, r) => a + r.campaignSpend, 0);
  return { rows, totalBudget, totalSpend };
}
async function getBudgetDetail(code) {
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq7(src_exports.sbu.code, code));
  if (!sbu2) return null;
  const budgets = await db.select().from(src_exports.budgetPlan).where(eq7(src_exports.budgetPlan.sbuId, sbu2.id));
  const campaigns = await db.select().from(src_exports.campaign).where(and6(eq7(src_exports.campaign.sbuId, sbu2.id), eq7(src_exports.campaign.isCompetitor, false)));
  const online = campaigns.filter((c) => c.mode === "online");
  const offline = campaigns.filter((c) => c.mode === "offline");
  const onlineSpend = online.reduce((a, c) => a + (c.spendActual != null ? Number(c.spendActual) : 0), 0);
  const offlineSpend = offline.reduce((a, c) => a + (c.spendActual != null ? Number(c.spendActual) : 0), 0);
  return {
    sbu: { code: sbu2.code, name: sbu2.name },
    budgets: budgets.map((b) => ({ channel: b.channel, value: Number(b.value), status: b.status })),
    campaignSpend: { online: onlineSpend, offline: offlineSpend, total: onlineSpend + offlineSpend }
  };
}

// src/strategy.ts
import { and as and7, eq as eq8, inArray as inArray6 } from "drizzle-orm";
var BASELINE6 = "FY25-26";
var FYS2 = ["FY26-27", "FY27-28", "FY28-29", "FY29-30", "FY30-31"];
async function getStrategy(code) {
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq8(src_exports.sbu.code, code));
  if (!sbu2) return null;
  const [revBase] = await db.select().from(src_exports.revenueActual).where(and7(eq8(src_exports.revenueActual.sbuId, sbu2.id), eq8(src_exports.revenueActual.periodId, BASELINE6)));
  const revTargets = await db.select().from(src_exports.revenueTarget).where(and7(eq8(src_exports.revenueTarget.sbuId, sbu2.id), inArray6(src_exports.revenueTarget.periodId, FYS2)));
  const revTargetByPeriod = new Map(revTargets.map((t) => [t.periodId, t]));
  const revenue = {
    base: revBase ? Number(revBase.value) : null,
    targets: FYS2.map((fy) => ({ period: fy, value: revTargetByPeriod.get(fy) ? Number(revTargetByPeriod.get(fy).value) : null, status: revTargetByPeriod.get(fy)?.status ?? null }))
  };
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(and7(eq8(src_exports.sbuKpi.sbuId, sbu2.id), eq8(src_exports.sbuKpi.active, true)));
  const kpiDefs = await db.select().from(src_exports.kpiDefinition).where(inArray6(src_exports.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const dims = await db.select().from(src_exports.dimension);
  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const targets = sbuKpiIds.length ? await db.select().from(src_exports.kpiTarget).where(and7(inArray6(src_exports.kpiTarget.sbuKpiId, sbuKpiIds), eq8(src_exports.kpiTarget.periodId, FYS2[0]))) : [];
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));
  const dimSummary = dims.sort((a, b) => a.sortOrder - b.sortOrder).map((dim) => {
    const inDim = sbuKpis.filter((k) => defById.get(k.kpiId)?.dimensionId === dim.id);
    const withTarget = inDim.filter((k) => targetBySbuKpi.has(k.id)).length;
    return { id: dim.id, name: dim.name, weight: dim.weight, kpiCount: inDim.length, withTarget, approved: withTarget };
  });
  const weightSets = await db.select().from(src_exports.weightSet).where(eq8(src_exports.weightSet.sbuId, sbu2.id));
  const weightProposals = weightSets.map((w) => ({ version: w.version, status: w.status, weights: w.weights, proposedBy: w.proposedBy, approvedBy: w.approvedBy }));
  const strategies = await db.select().from(src_exports.strategy).where(eq8(src_exports.strategy.sbuId, sbu2.id));
  const strategyIds = strategies.map((s) => s.id);
  const objectives = strategyIds.length ? await db.select().from(src_exports.strategicObjective).where(inArray6(src_exports.strategicObjective.strategyId, strategyIds)) : [];
  const objectivesOut = objectives.map((o) => ({ title: o.title, detail: o.detail, target: o.numericTarget != null ? Number(o.numericTarget) : null, unit: o.unit }));
  return {
    sbu: { code: sbu2.code, name: sbu2.name },
    revenue,
    dimSummary,
    weightProposals,
    objectives: objectivesOut
  };
}

// src/health.ts
import { and as and8, eq as eq9, inArray as inArray7 } from "drizzle-orm";
var BASELINE7 = "FY25-26";
var FUNNEL = [
  { code: "aided_awareness", label: "Awareness" },
  { code: "consideration", label: "Consideration" },
  { code: "brand_preference", label: "Preference" },
  { code: "brand_loyalty", label: "Loyalty" },
  { code: "reco", label: "Advocacy" }
];
async function getBrandHealth(code) {
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq9(src_exports.sbu.code, code));
  if (!sbu2) return null;
  const kpiDefs = await db.select().from(src_exports.kpiDefinition).where(inArray7(src_exports.kpiDefinition.code, [...FUNNEL.map((f) => f.code), "nps"]));
  const defIdByCode = new Map(kpiDefs.map((d) => [d.code, d]));
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(and8(eq9(src_exports.sbuKpi.sbuId, sbu2.id), eq9(src_exports.sbuKpi.active, true)));
  const sbuKpiByKpiId = new Map(sbuKpis.map((k) => [k.kpiId, k]));
  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = sbuKpiIds.length ? await db.select().from(src_exports.kpiActual).where(and8(inArray7(src_exports.kpiActual.sbuKpiId, sbuKpiIds), eq9(src_exports.kpiActual.periodId, BASELINE7))) : [];
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const npsDef = defIdByCode.get("nps");
  const npsKpi = npsDef ? sbuKpiByKpiId.get(npsDef.id) : void 0;
  const npsActual = npsKpi ? actualBySbuKpi.get(npsKpi.id) : void 0;
  const funnel = FUNNEL.map((f) => {
    const def = defIdByCode.get(f.code);
    const sk = def ? sbuKpiByKpiId.get(def.id) : void 0;
    const a = sk ? actualBySbuKpi.get(sk.id) : void 0;
    return {
      code: f.code,
      label: f.label,
      value: a ? Number(a.value) : null,
      confidence: a?.confidence ?? null,
      isEstimate: sk?.isEstimate ?? true
    };
  });
  return {
    sbu: { code: sbu2.code, name: sbu2.name },
    funnel,
    nps: npsActual ? { value: Number(npsActual.value), confidence: npsActual.confidence, isEstimate: npsKpi?.isEstimate ?? true } : null
  };
}

// src/fourp.ts
import { and as and9, eq as eq10, inArray as inArray8 } from "drizzle-orm";
var BASELINE8 = "FY25-26";
var TARGET4 = "FY26-27";
var PS = ["Product", "Price", "Place", "Promotion"];
async function getFourPOverview() {
  const sbus = await db.select().from(src_exports.sbu).where(eq10(src_exports.sbu.active, true));
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(eq10(src_exports.sbuKpi.active, true));
  const kpiDefs = await db.select().from(src_exports.kpiDefinition);
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const sbuKpiIds = sbuKpis.map((k) => k.id);
  const actuals = await db.select().from(src_exports.kpiActual).where(and9(inArray8(src_exports.kpiActual.sbuKpiId, sbuKpiIds), eq10(src_exports.kpiActual.periodId, BASELINE8)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const targets = await db.select().from(src_exports.kpiTarget).where(and9(inArray8(src_exports.kpiTarget.sbuKpiId, sbuKpiIds), eq10(src_exports.kpiTarget.periodId, TARGET4)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));
  const rows = sbus.map((s) => {
    const sk = sbuKpis.filter((k) => k.sbuId === s.id);
    const p4 = {};
    for (const p of PS) {
      const inP = sk.filter((k) => k.fourP === p);
      let scoreSum = 0;
      let measuredWeight = 0;
      let totalWeight = 0;
      let measuredCount = 0;
      for (const k of inP) {
        totalWeight += Number(k.weightInDimension);
        if (k.isEstimate) continue;
        const a = actualBySbuKpi.get(k.id);
        const t = targetBySbuKpi.get(k.id);
        if (!a || !t) continue;
        const def = defById.get(k.kpiId);
        const att = attainment(Number(a.value), Number(t.value), def?.direction ?? "higher");
        const sc = kpiScore(att);
        if (att == null || sc == null) continue;
        scoreSum += sc * Number(k.weightInDimension);
        measuredWeight += Number(k.weightInDimension);
        measuredCount++;
      }
      const score = measuredWeight > 0 ? scoreSum / measuredWeight : null;
      const coverage = totalWeight > 0 ? measuredWeight / totalWeight : 0;
      p4[p] = { score, coverage, measured: measuredCount, total: inP.length };
    }
    return { code: s.code, name: s.name, category: s.category, p4 };
  });
  return { rows, ps: PS };
}
async function getFourPDetail(code) {
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq10(src_exports.sbu.code, code));
  if (!sbu2) return null;
  const sbuKpis = await db.select().from(src_exports.sbuKpi).where(and9(eq10(src_exports.sbuKpi.sbuId, sbu2.id), eq10(src_exports.sbuKpi.active, true)));
  const kpiDefs = await db.select().from(src_exports.kpiDefinition).where(inArray8(src_exports.kpiDefinition.id, sbuKpis.map((k) => k.kpiId)));
  const defById = new Map(kpiDefs.map((d) => [d.id, d]));
  const actuals = await db.select().from(src_exports.kpiActual).where(and9(inArray8(src_exports.kpiActual.sbuKpiId, sbuKpis.map((k) => k.id)), eq10(src_exports.kpiActual.periodId, BASELINE8)));
  const actualBySbuKpi = new Map(actuals.map((a) => [a.sbuKpiId, a]));
  const targets = await db.select().from(src_exports.kpiTarget).where(and9(inArray8(src_exports.kpiTarget.sbuKpiId, sbuKpis.map((k) => k.id)), eq10(src_exports.kpiTarget.periodId, TARGET4)));
  const targetBySbuKpi = new Map(targets.map((t) => [t.sbuKpiId, t]));
  const p4 = PS.map((p) => {
    const inP = sbuKpis.filter((k) => k.fourP === p);
    return {
      p,
      kpis: inP.map((k) => {
        const def = defById.get(k.kpiId);
        const a = actualBySbuKpi.get(k.id);
        const t = targetBySbuKpi.get(k.id);
        const att = a && t ? attainment(Number(a.value), Number(t.value), def?.direction ?? "higher") : null;
        return {
          code: def?.code ?? "",
          name: def?.name ?? "",
          unit: def?.unit ?? "",
          isEstimate: k.isEstimate,
          actual: a ? Number(a.value) : null,
          target: t ? Number(t.value) : null,
          attainment: att,
          score: kpiScore(att)
        };
      })
    };
  });
  return { sbu: { code: sbu2.code, name: sbu2.name }, p4 };
}

// src/analytics.ts
async function getPortfolio() {
  const [cockpit, market, budget] = await Promise.all([getCockpit(), getMarketOverview(), getBudgetOverview()]);
  const marketByCode = new Map(market.map((m) => [m.code, m]));
  const budgetByCode = new Map(budget.rows.map((b) => [b.code, b]));
  const sbus = cockpit.map((c) => ({
    ...c,
    market: marketByCode.get(c.code) ?? null,
    budget: budgetByCode.get(c.code) ?? null
  }));
  return { sbus, totals: { totalBudget: budget.totalBudget, totalSpend: budget.totalSpend } };
}

// src/alerts.ts
var SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
async function runAlertEngine() {
  const [market, cockpit, budget] = await Promise.all([getMarketOverview(), getCockpit(), getBudgetOverview()]);
  const cockpitByCode = new Map(cockpit.map((c) => [c.code, c]));
  const budgetByCode = new Map(budget.rows.map((b) => [b.code, b]));
  const alerts = [];
  const push = (sbuCode, sbuName, severity, rule, message, impact) => {
    alerts.push({ id: `${sbuCode}:${rule}`, sbuCode, sbuName, severity, rule, message, impactBdtCr: impact });
  };
  for (const m of market) {
    const c = cockpitByCode.get(m.code);
    const b = budgetByCode.get(m.code);
    if (m.verdict === "loss" || m.shareChangePp != null && m.shareChangePp < -0.5) {
      const impact = m.shareChangePp != null && m.marketSize != null ? Math.round(Math.abs(m.shareChangePp) / 100 * m.marketSize * 10) / 10 : null;
      push(m.code, m.name, "high", "share-loss", `Projected market-share loss of ${Math.abs(m.shareChangePp).toFixed(1)}pp at current growth plan`, impact);
    } else if (m.brandGrowth != null && m.marketGrowth != null && m.brandGrowth < m.marketGrowth) {
      push(m.code, m.name, "medium", "revenue-below-market", `Revenue growth ${m.brandGrowth}% trails market ${m.marketGrowth}% \u2014 share will erode`, null);
    }
    if (m.flags.includes("unattainable-target")) {
      push(m.code, m.name, "high", "unattainable-target", "Revenue plan cannot deliver the target share at the assumed market growth", null);
    }
    if (m.flags.includes("implausible-ceiling")) {
      push(m.code, m.name, "medium", "implausible-ceiling", "Implied share exceeds the plausible ceiling \u2014 plan likely over-stated", null);
    }
    if (m.excessSov != null && m.excessSov < 0) {
      push(m.code, m.name, "medium", "sov-below-som", `Share of voice is ${Math.abs(m.excessSov).toFixed(1)}pp below share of market \u2014 under-investment risk`, null);
    }
    if (c && c.coverage < 0.4) {
      push(m.code, m.name, "medium", "low-coverage", `Only ${(c.coverage * 100).toFixed(0)}% of brand KPIs measured \u2014 scores are provisional`, null);
    }
    if (m.rank == null && m.competitorCount > 0) {
      push(m.code, m.name, "low", "no-competitor-share", `Competitor shares unknown \u2014 cannot rank (${m.competitorCount} competitors tracked)`, null);
    }
    if (b && b.spendVsPlan != null && b.spendVsPlan > 100) {
      push(m.code, m.name, "critical", "budget-overrun", `Campaign spend is ${b.spendVsPlan}% of plan \u2014 over budget`, null);
    }
  }
  return alerts.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

// src/decisions.ts
import { eq as eq11, desc } from "drizzle-orm";
var ACTION_STATUS = {
  approve: "approved",
  reject: "rejected",
  assign: "assigned",
  ask: "open",
  done: "done"
};
async function getDecisions(status) {
  const q = db.select({
    id: src_exports.decision.id,
    sbuCode: src_exports.sbu.code,
    sbuName: src_exports.sbu.name,
    title: src_exports.decision.title,
    whatHappened: src_exports.decision.whatHappened,
    why: src_exports.decision.why,
    impact: src_exports.decision.impact,
    options: src_exports.decision.options,
    recommendation: src_exports.decision.recommendation,
    owner: src_exports.decision.owner,
    dueDate: src_exports.decision.dueDate,
    status: src_exports.decision.status,
    decidedBy: src_exports.decision.decidedBy,
    decidedAt: src_exports.decision.decidedAt,
    createdAt: src_exports.decision.createdAt
  }).from(src_exports.decision).leftJoin(src_exports.sbu, eq11(src_exports.decision.sbuId, src_exports.sbu.id));
  const rows = await (status ? q.where(eq11(src_exports.decision.status, status)) : q).orderBy(desc(src_exports.decision.createdAt));
  return rows.map((r) => ({ ...r, options: r.options }));
}
async function createDecision(input) {
  let sbuId = null;
  if (input.sbuCode) {
    const [sbu2] = await db.select().from(src_exports.sbu).where(eq11(src_exports.sbu.code, input.sbuCode)).limit(1);
    if (sbu2) sbuId = sbu2.id;
  }
  const [row] = await db.insert(src_exports.decision).values({
    sbuId,
    title: input.title,
    whatHappened: input.whatHappened,
    why: input.why,
    impact: input.impact,
    options: input.options ?? null,
    recommendation: input.recommendation,
    owner: input.owner,
    dueDate: input.dueDate,
    status: "open"
  }).returning({ id: src_exports.decision.id });
  return row.id;
}
async function transitionDecision(id, action, byUser, assignTo) {
  const [existing] = await db.select().from(src_exports.decision).where(eq11(src_exports.decision.id, id));
  if (!existing) return null;
  const nextStatus = ACTION_STATUS[action];
  const patch = { status: nextStatus };
  if (action === "approve" || action === "reject" || action === "done") {
    patch.decidedBy = byUser;
    patch.decidedAt = /* @__PURE__ */ new Date();
  }
  if (action === "assign" && assignTo) patch.owner = assignTo;
  await db.update(src_exports.decision).set(patch).where(eq11(src_exports.decision.id, id));
  await db.insert(src_exports.auditLog).values({
    entity: "decision",
    entityId: String(id),
    action,
    before: { status: existing.status, owner: existing.owner },
    after: { status: nextStatus, owner: patch.owner ?? existing.owner },
    byUser
  });
  return { id, status: nextStatus, owner: patch.owner ?? existing.owner };
}

// src/reports.ts
import { eq as eq12 } from "drizzle-orm";
function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(cols) {
  return cols.map(csvCell).join(",");
}
async function exportCockpitCsv() {
  const { sbus, totals } = await getPortfolio();
  const lines = [
    csvRow(["AKIJ Resource \u2014 Marketing Management System", "", ""]),
    csvRow(["Executive Cockpit export", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), ""]),
    csvRow([]),
    csvRow(["SBU", "Category", "Composite", "BEI", "BHI", "BPI", "Coverage", "Revenue base (Cr)", "Revenue target (Cr)", "Market share", "Rank", "Brand growth", "Market growth", "Projected share", "Share change (pp)", "Verdict", "Flags", "Budget (Cr)", "Campaign spend (Cr)"]),
    ...sbus.map(
      (s) => csvRow([
        s.name,
        s.category,
        s.composite?.toFixed(2) ?? "",
        s.bei?.toFixed(2) ?? "",
        s.bhi?.toFixed(2) ?? "",
        s.bpi?.toFixed(2) ?? "",
        `${(s.coverage * 100).toFixed(0)}%`,
        s.revenueBase,
        s.revenueTarget,
        s.market?.ownShare,
        s.market?.rank ?? "",
        s.market?.brandGrowth,
        s.market?.marketGrowth,
        s.market?.projectedShare,
        s.market?.shareChangePp,
        s.market?.verdict ?? "",
        s.market?.flags.join("; ") ?? "",
        s.budget?.budget ?? "",
        s.budget?.campaignSpend ?? ""
      ])
    ),
    csvRow([]),
    csvRow(["Total budget (Cr)", totals.totalBudget, "Tracked spend (Cr)", totals.totalSpend])
  ];
  return lines.join("\r\n");
}
async function exportCoverageCsv() {
  const cov = await getCoverage();
  const lines = [
    csvRow(["AKIJ Resource \u2014 MMS Coverage table", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)]),
    csvRow([]),
    csvRow(["SBU", "Custodian", ...cov.moduleKeys, "Measured", "Estimate", "Missing", "Completeness"]),
    ...cov.sbus.map(
      (s) => csvRow([
        s.name,
        s.custodian,
        ...cov.moduleKeys.map((k) => s.modules.find((m) => m.key === k)?.status ?? ""),
        s.measuredCount,
        s.estimateCount,
        s.missingCount,
        `${(s.completeness * 100).toFixed(0)}%`
      ])
    )
  ];
  return lines.join("\r\n");
}
async function exportScorecardCsv(code) {
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq12(src_exports.sbu.code, code));
  if (!sbu2) return null;
  const hub = await getSbuHub(sbu2.id);
  if (!hub) return null;
  const lines = [
    csvRow([`AKIJ Resource \u2014 MMS KPI Scorecard: ${hub.sbu.name}`, (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)]),
    csvRow([`CBDO framework \u2014 BEI = D1 \xB7 BHI = D2+D3+D6 \xB7 BPI = D4+D5+D7 \xB7 Composite = all 7`]),
    csvRow([]),
    csvRow(["KPI", "Dimension", "4P", "Unit", "Baseline (FY25-26)", ...hub.kpis[0]?.targets.map((t) => t.period) ?? [], "Attainment %", "Score (0-5)", "RAG", "Confidence", "Source"]),
    ...hub.kpis.map(
      (k) => csvRow([
        k.name,
        k.dimensionName,
        k.fourP ?? "",
        k.unit,
        k.actual ?? "",
        ...k.targets.map((t) => t.value ?? ""),
        k.attainment != null ? `${(k.attainment * 100).toFixed(0)}%` : "",
        k.score ?? "",
        k.rag,
        k.confidence ?? "",
        k.source ?? ""
      ])
    ),
    csvRow([]),
    csvRow(["Index", "Score", "Coverage"]),
    ...["BEI", "BHI", "BPI", "Composite"].map(
      (ix) => csvRow([ix, hub.indices[ix].score?.toFixed(2) ?? "\u2014", `${(hub.indices[ix].coverage * 100).toFixed(0)}%`])
    )
  ];
  return lines.join("\r\n");
}

// src/sync.ts
import { and as and10, eq as eq13, desc as desc2 } from "drizzle-orm";
async function upsertRevenue(sbuCode, periodId, value, source, byUser) {
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq13(src_exports.sbu.code, sbuCode));
  if (!sbu2) return { sbuCode, periodId, status: "skip: unknown SBU" };
  const [existing] = await db.select().from(src_exports.revenueActual).where(and10(eq13(src_exports.revenueActual.sbuId, sbu2.id), eq13(src_exports.revenueActual.periodId, periodId)));
  if (existing) {
    await db.update(src_exports.revenueActual).set({ value: String(value), source, asOf: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) }).where(eq13(src_exports.revenueActual.id, existing.id));
    await db.insert(src_exports.auditLog).values({ entity: "revenue_actual", entityId: `${sbuCode}/${periodId}`, action: "update", before: { value: Number(existing.value) }, after: { value, source }, byUser });
    return { sbuCode, periodId, status: "updated" };
  }
  await db.insert(src_exports.revenueActual).values({ sbuId: sbu2.id, periodId, value: String(value), source, asOf: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
  await db.insert(src_exports.auditLog).values({ entity: "revenue_actual", entityId: `${sbuCode}/${periodId}`, action: "create", after: { value, source }, byUser });
  return { sbuCode, periodId, status: "created" };
}
async function getSyncLog(limit = 50) {
  return db.select().from(src_exports.auditLog).where(eq13(src_exports.auditLog.entity, "revenue_actual")).orderBy(desc2(src_exports.auditLog.createdAt)).limit(limit);
}

// src/index.ts
var app = new Hono();
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((s) => s.trim());
      if (allowed.includes("*")) return "*";
      if (!origin) return allowed[0];
      return allowed.includes(origin) ? origin : allowed[0];
    }
  })
);
app.get("/health", (c) => c.json({ ok: true, service: "akij-mms-api" }));
app.get("/api/me", requireAuth(), async (c) => {
  const auth = c.get("auth");
  const roles = auth.email ? await getUserRoles(auth.email) : { email: auth.email, roles: [], tiers: [] };
  return c.json({ sub: auth.sub, ...roles });
});
app.get("/api/sbus", requireAuth(), async (c) => {
  const rows = await db.select({ code: src_exports.sbu.code, name: src_exports.sbu.name, category: src_exports.sbu.category, active: src_exports.sbu.active }).from(src_exports.sbu);
  return c.json({ sbus: rows });
});
app.get("/api/roles", requireAuth(), requireRole("SPA"), async (c) => {
  const rows = await db.select({ code: src_exports.role.code, name: src_exports.role.name, tier: src_exports.role.tier }).from(src_exports.role);
  return c.json({ roles: rows });
});
app.get("/api/cockpit", requireAuth(), async (c) => {
  const rows = await getCockpit();
  return c.json({ sbus: rows });
});
app.get("/api/analytics", requireAuth(), async (c) => {
  return c.json(await getPortfolio());
});
app.get("/api/alerts", requireAuth(), async (c) => {
  return c.json({ alerts: await runAlertEngine() });
});
app.get("/api/decisions", requireAuth(), async (c) => {
  const status = c.req.query("status");
  return c.json({ decisions: await getDecisions(status) });
});
app.post("/api/decisions", requireAuth(), requireRole("SPA", "BRAND_CUSTODIAN", "SBU_HEAD"), async (c) => {
  const body = await c.req.json();
  if (!body?.title || !body.title.trim()) return c.json({ error: "title is required" }, 400);
  const id = await createDecision(body);
  return c.json({ id });
});
app.post("/api/decisions/:id/transition", requireAuth(), requireTier("admin"), async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const body = await c.req.json();
  if (!body.action || !["approve", "reject", "assign", "ask", "done"].includes(body.action)) {
    return c.json({ error: "invalid action" }, 400);
  }
  const byUser = c.get("auth").email ?? "unknown";
  const result = await transitionDecision(id, body.action, byUser, body.assignTo);
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});
app.post("/api/whatif", requireAuth(), async (c) => {
  const body = await c.req.json();
  if (!body.code || typeof body.code !== "string") return c.json({ error: "code is required" }, 400);
  if (typeof body.brandGrowth !== "number" || !Number.isFinite(body.brandGrowth) || body.brandGrowth < -100 || body.brandGrowth > 1e3) {
    return c.json({ error: "brandGrowth must be a number between -100 and 1000" }, 400);
  }
  const result = await whatIfShare(body.code, body.brandGrowth);
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});
app.get("/api/export/cockpit.csv", requireAuth(), async (c) => {
  return c.text(await exportCockpitCsv(), 200, { "Content-Type": "text/csv; charset=utf-8" });
});
app.get("/api/export/coverage.csv", requireAuth(), async (c) => {
  return c.text(await exportCoverageCsv(), 200, { "Content-Type": "text/csv; charset=utf-8" });
});
app.get("/api/export/scorecard/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const csv = await exportScorecardCsv(code);
  if (csv == null) return c.json({ error: "Not found" }, 404);
  return c.text(csv, 200, { "Content-Type": "text/csv; charset=utf-8" });
});
app.post("/api/sync/revenue", requireAuth(), requireTier("admin"), async (c) => {
  const body = await c.req.json();
  if (!Array.isArray(body.rows)) return c.json({ error: "rows must be an array" }, 400);
  const byUser = c.get("auth").email ?? "unknown";
  const results = [];
  for (const r of body.rows) {
    if (!r.sbuCode || !r.periodId || typeof r.value !== "number" || !Number.isFinite(r.value)) {
      results.push({ ...r, status: "skip: invalid row (need sbuCode, periodId, numeric value)" });
      continue;
    }
    results.push(await upsertRevenue(r.sbuCode, r.periodId, r.value, r.source ?? "ERP/GL (iBOSDDD)", byUser));
  }
  return c.json({ results });
});
app.get("/api/sync/log", requireAuth(), async (c) => {
  return c.json({ log: await getSyncLog() });
});
app.get("/api/datagaps", requireAuth(), async (c) => {
  const rows = await db.select({
    id: src_exports.dataGap.id,
    sbuCode: src_exports.sbu.code,
    sbuName: src_exports.sbu.name,
    item: src_exports.dataGap.item,
    whyNeeded: src_exports.dataGap.whyNeeded,
    source: src_exports.dataGap.source,
    owner: src_exports.dataGap.owner,
    priority: src_exports.dataGap.priority,
    status: src_exports.dataGap.status
  }).from(src_exports.dataGap).leftJoin(src_exports.sbu, eq14(src_exports.dataGap.sbuId, src_exports.sbu.id)).orderBy(eq14(src_exports.dataGap.status, "open"), src_exports.dataGap.priority);
  return c.json({ gaps: rows });
});
app.get("/api/market", requireAuth(), async (c) => {
  return c.json({ sbus: await getMarketOverview() });
});
app.get("/api/market/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const detail = await getMarketDetail(code);
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});
app.get("/api/budget", requireAuth(), async (c) => {
  return c.json(await getBudgetOverview());
});
app.get("/api/budget/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const detail = await getBudgetDetail(code);
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});
app.get("/api/strategy/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const detail = await getStrategy(code);
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});
app.get("/api/health/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const detail = await getBrandHealth(code);
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});
app.get("/api/fourp", requireAuth(), async (c) => {
  return c.json(await getFourPOverview());
});
app.get("/api/fourp/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const detail = await getFourPDetail(code);
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});
app.get("/api/sbus/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq14(src_exports.sbu.code, code));
  if (!sbu2) return c.json({ error: "Not found" }, 404);
  const indices = await computeSbuIndices(sbu2.id);
  return c.json({ sbu: { code: sbu2.code, name: sbu2.name, category: sbu2.category, custodian: sbu2.custodian }, indices });
});
app.get("/api/sbus/:code/hub", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq14(src_exports.sbu.code, code));
  if (!sbu2) return c.json({ error: "Not found" }, 404);
  const hub = await getSbuHub(sbu2.id);
  if (!hub) return c.json({ error: "Not found" }, 404);
  return c.json(hub);
});
app.get("/api/templates/kpi-actuals", requireAuth(), (c) => c.text(kpiActualsTemplate(), 200, { "Content-Type": "text/csv" }));
app.post("/api/upload/kpi-actuals", requireAuth(), requireRole("BRAND_CUSTODIAN", "SBU_HEAD", "SPA"), async (c) => {
  const body = await c.req.json();
  const csv = body.csv ?? "";
  const byUser = c.get("auth").email ?? "unknown";
  const result = await validateKpiActuals(csv);
  if (body.commit) {
    const committed = result.valid.length ? await commitKpiActuals(result.valid, byUser) : { inserted: 0, updated: 0 };
    return c.json({ ...result, committed });
  }
  return c.json(result);
});
app.get("/api/freshness", requireAuth(), async (c) => {
  return c.json({ datasets: await getFreshness() });
});
app.get("/api/coverage", requireAuth(), async (c) => {
  return c.json(await getCoverage());
});
app.post("/api/sbus/:code/approve-estimates", requireAuth(), requireTier("admin"), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const byUser = c.get("auth").email ?? "unknown";
  const [sbu2] = await db.select().from(src_exports.sbu).where(eq14(src_exports.sbu.code, code));
  if (!sbu2) return c.json({ error: "Not found" }, 404);
  const estimates = await db.select().from(src_exports.sbuKpi).where(and11(eq14(src_exports.sbuKpi.sbuId, sbu2.id), eq14(src_exports.sbuKpi.isEstimate, true), eq14(src_exports.sbuKpi.active, true)));
  if (!estimates.length) return c.json({ approved: 0, message: "No estimate baselines to approve" });
  const ids = estimates.map((e) => e.id);
  await db.update(src_exports.sbuKpi).set({ isEstimate: false }).where(inArray9(src_exports.sbuKpi.id, ids));
  await db.insert(src_exports.auditLog).values({
    entity: "sbu_kpi",
    entityId: sbu2.code,
    action: "approve",
    before: { isEstimate: true },
    after: { isEstimate: false },
    byUser
  });
  return c.json({ approved: estimates.length, message: `${estimates.length} estimate baseline(s) approved and now included in official scores` });
});
var index_default = app;

// src/vercel.ts
async function handler(req, res) {
  try {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue;
      headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
    }
    const init = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      init.body = Buffer.concat(chunks);
    }
    const response = await index_default.fetch(new Request(url, init));
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  } catch (err) {
    console.error("handler error", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
export {
  handler as default
};
