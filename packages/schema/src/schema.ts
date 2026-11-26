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
  index,
} from "drizzle-orm/pg-core";

// ===========================================================================
// Identity & framework
// ===========================================================================

/** A Strategic Business Unit (13 in scope; Mediquip excluded). Active flag = soft delete. */
export const sbu = pgTable(
  "sbu",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(), // ACCL, AIL, AEL, ...
    name: text("name").notNull(), // Akij Cement
    legalName: text("legal_name"),
    category: text("category"), // "Cement · Building Material"
    businessModel: text("business_model").$type<"B2C" | "B2B" | "B2B2C" | "B2B/B2C">().notNull(),
    archetype: text("archetype"), // B2C FMCG / construction-industrial / agri / B2B services / healthcare
    custodian: text("custodian"),
    custodianNote: text("custodian_note"),
    businessHead: text("business_head"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sbu_code_idx").on(t.code)],
);

/** A brand — own or competitor — under an SBU. */
export const brand = pgTable(
  "brand",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").references(() => sbu.id),
    name: text("name").notNull(),
    isCompetitor: boolean("is_competitor").notNull().default(false),
    isOwn: boolean("is_own").notNull().default(true),
    website: text("website"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("brand_sbu_idx").on(t.sbuId),
    uniqueIndex("brand_sbu_name_idx").on(t.sbuId, t.name),
  ],
);

/** The 7 CBDO dimensions with default weights. */
export const dimension = pgTable(
  "dimension",
  {
    id: text("id").primaryKey(), // "d1" .. "d7"
    name: text("name").notNull(),
    weight: doublePrecision("weight").notNull(), // default group weight %
    sortOrder: integer("sort_order").notNull().default(0),
  },
);

/** Per-SBU dimension weight proposal (versioned, requires MD approval). */
export const weightSet = pgTable(
  "weight_set",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    version: integer("version").notNull().default(1),
    status: text("status").$type<"proposed" | "approved" | "rejected">().notNull().default("proposed"),
    weights: jsonb("weights").notNull(), // { d1: 28, d2: 13, ... }
    proposedBy: text("proposed_by"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("weight_set_sbu_version_idx").on(t.sbuId, t.version)],
);

/** Fiscal period (July–June FY). Quarter/month reference rows. */
export const fiscalPeriod = pgTable(
  "fiscal_period",
  {
    id: text("id").primaryKey(), // "FY26-27", "FY26-27-Q1", "2026-07"
    label: text("label").notNull(),
    fy: text("fy").notNull(), // "FY26-27"
    kind: text("kind").$type<"fy" | "quarter" | "month">().notNull(),
    quarter: integer("quarter"), // 1..4 (for quarter/month rows)
    month: integer("month"), // 1..12 (for month rows)
    startDate: text("start_date"),
    endDate: text("end_date"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
);

// ===========================================================================
// KPI library, targets & actuals
// ===========================================================================

/** The 61-KPI dictionary (dimension-scoped). */
export const kpiDefinition = pgTable(
  "kpi_definition",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // "brand_awareness_aided"
    name: text("name").notNull(),
    dimensionId: text("dimension_id").notNull().references(() => dimension.id),
    definition: text("definition"),
    formula: text("formula"),
    unit: text("unit"), // %, index, score, x, BDT Cr, /5, % YoY
    direction: text("direction").$type<"higher" | "lower">().notNull().default("higher"),
    leading: boolean("leading").notNull().default(false),
    core: boolean("core").notNull().default(true),
    measurementMethod: text("measurement_method"),
    frequency: text("frequency"), // Monthly / Quarterly / Annual
    ownerRole: text("owner_role"), // Media, Brand, Trade Marketing, ...
  },
);

/** A KPI active for an SBU, with within-dimension weight + 4P lever. */
export const sbuKpi = pgTable(
  "sbu_kpi",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    kpiId: integer("kpi_id").notNull().references(() => kpiDefinition.id),
    weightInDimension: doublePrecision("weight_in_dimension").notNull(),
    fourP: text("four_p").$type<"Product" | "Price" | "Place" | "Promotion">(),
    isEstimate: boolean("is_estimate").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("sbu_kpi_unique_idx").on(t.sbuId, t.kpiId)],
);

/** KPI target per SBU-KPI per period (versioned, approval workflow). */
export const kpiTarget = pgTable(
  "kpi_target",
  {
    id: serial("id").primaryKey(),
    sbuKpiId: integer("sbu_kpi_id").notNull().references(() => sbuKpi.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: doublePrecision("value").notNull(),
    status: text("status").$type<"draft" | "approved" | "locked">().notNull().default("draft"),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("kpi_target_unique_idx").on(t.sbuKpiId, t.periodId)],
);

/** KPI actual per SBU-KPI per period, with confidence + source + audit. */
export const kpiActual = pgTable(
  "kpi_actual",
  {
    id: serial("id").primaryKey(),
    sbuKpiId: integer("sbu_kpi_id").notNull().references(() => sbuKpi.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: doublePrecision("value").notNull(),
    confidence: text("confidence").$type<"High" | "Med" | "Low" | "Web" | "Estimate">().notNull().default("Low"),
    source: text("source"),
    asOf: text("as_of"),
    evidenceFile: text("evidence_file"),
    enteredBy: text("entered_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("kpi_actual_unique_idx").on(t.sbuKpiId, t.periodId)],
);

// ===========================================================================
// Strategy
// ===========================================================================

export const strategy = pgTable(
  "strategy",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    fy: text("fy").notNull(), // "FY26-27" .. "FY30-31"
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("strategy_sbu_fy_idx").on(t.sbuId, t.fy)],
);

export const strategicObjective = pgTable(
  "strategic_objective",
  {
    id: serial("id").primaryKey(),
    strategyId: integer("strategy_id").notNull().references(() => strategy.id),
    title: text("title").notNull(),
    detail: text("detail"),
    numericTarget: numeric("numeric_target", { precision: 18, scale: 2 }),
    unit: text("unit"),
  },
);

// ===========================================================================
// Revenue & market
// ===========================================================================

export const revenueTarget = pgTable(
  "revenue_target",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(), // BDT Cr
    volume: numeric("volume", { precision: 18, scale: 2 }),
    unit: text("unit"),
    status: text("status").$type<"draft" | "approved" | "locked">().notNull().default("draft"),
  },
  (t) => [uniqueIndex("revenue_target_unique_idx").on(t.sbuId, t.periodId)],
);

export const revenueActual = pgTable(
  "revenue_actual",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    volume: numeric("volume", { precision: 18, scale: 2 }),
    unit: text("unit"),
    source: text("source").default("ERP/GL"),
    asOf: text("as_of"),
  },
  (t) => [uniqueIndex("revenue_actual_unique_idx").on(t.sbuId, t.periodId)],
);

export const marketSize = pgTable(
  "market_size",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    volume: numeric("volume", { precision: 18, scale: 2 }),
    growth: doublePrecision("growth"), // market growth rate
    source: text("source"),
    isEstimate: boolean("is_estimate").notNull().default(false),
  },
  (t) => [uniqueIndex("market_size_unique_idx").on(t.category, t.periodId)],
);

export const marketShare = pgTable(
  "market_share",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    category: text("category").notNull(),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    region: text("region"),
    valueShare: doublePrecision("value_share"), // %
    volumeShare: doublePrecision("volume_share"), // %
    source: text("source"),
    isEstimate: boolean("is_estimate").notNull().default(false),
  },
  (t) => [uniqueIndex("market_share_unique_idx").on(t.brandId, t.category, t.periodId, t.region)],
);

export const pricePoint = pgTable(
  "price_point",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    sku: text("sku"),
    channel: text("channel"),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    price: numeric("price", { precision: 18, scale: 2 }).notNull(),
  },
);

export const distribution = pgTable(
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
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
  },
);

// ===========================================================================
// Brand health & research
// ===========================================================================

export const maturityAssessment = pgTable(
  "maturity_assessment",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    assessedAt: text("assessed_at").notNull(),
    level: integer("level"), // 1..5
    score: doublePrecision("score"), // 0..5
    dimScores: jsonb("dim_scores"), // per-dimension scores
    criteriaResults: jsonb("criteria_results"),
  },
);

export const researchWave = pgTable(
  "research_wave",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    waveDate: text("wave_date").notNull(),
    agency: text("agency"),
  },
);

export const researchMetric = pgTable(
  "research_metric",
  {
    id: serial("id").primaryKey(),
    waveId: integer("wave_id").notNull().references(() => researchWave.id),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    metric: text("metric").notNull(), // aided awareness, TOMA, NPS, perceived quality, ...
    value: doublePrecision("value").notNull(),
    sampleSize: integer("sample_size"),
  },
);

// ===========================================================================
// Campaigns & budget
// ===========================================================================

export const campaign = pgTable(
  "campaign",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    brandId: integer("brand_id").references(() => brand.id),
    name: text("name").notNull(),
    objective: text("objective"),
    mode: text("mode").$type<"offline" | "online">().notNull(), // Offline | Online sub-tabs
    channel: text("channel"), // TV, OOH, BTL, Facebook, YouTube, ...
    region: text("region"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    message: text("message"),
    creativeLink: text("creative_link"),
    status: text("status").$type<"plan" | "live" | "done">().notNull().default("plan"),
    isCompetitor: boolean("is_competitor").notNull().default(false),
    spendPlanned: numeric("spend_planned", { precision: 18, scale: 2 }),
    spendActual: numeric("spend_actual", { precision: 18, scale: 2 }),
    spendEstimated: boolean("spend_estimated").notNull().default(false),
    source: text("source"),
    confidence: text("confidence").$type<"High" | "Med" | "Low" | "Web" | "Estimate">().notNull().default("Low"),
  },
  (t) => [index("campaign_sbu_mode_idx").on(t.sbuId, t.mode)],
);

export const campaignMetric = pgTable(
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
    brandLift: doublePrecision("brand_lift"),
  },
);

/** Activity/campaign → the KPIs it targets (standalone or combination). */
export const activityKpiLink = pgTable(
  "activity_kpi_link",
  {
    id: serial("id").primaryKey(),
    activity: text("activity").notNull(), // "TVC — mass-media awareness"
    kpiId: integer("kpi_id").notNull().references(() => kpiDefinition.id),
    mode: text("mode").$type<"standalone" | "combination">().notNull().default("standalone"),
  },
);

export const budgetPlan = pgTable(
  "budget_plan",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    channel: text("channel"), // ATL / BTL / Digital / PR / Trade / total
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    status: text("status").$type<"draft" | "approved">().notNull().default("draft"),
  },
  (t) => [uniqueIndex("budget_plan_unique_idx").on(t.sbuId, t.periodId, t.channel)],
);

export const budgetActual = pgTable(
  "budget_actual",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    channel: text("channel"),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    source: text("source"),
  },
  (t) => [uniqueIndex("budget_actual_unique_idx").on(t.sbuId, t.periodId, t.channel)],
);

// ===========================================================================
// Users, roles & governance
// ===========================================================================

export const user = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** The RBAC roles (MD, CBDO, Brand Custodian, functional owners, Viewer, …). */
export const role = pgTable(
  "role",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // "MD", "CBDO", "BRAND_CUSTODIAN", ...
    name: text("name").notNull(),
    /** One of: moderator, admin, editor, functional, viewer. */
    tier: text("tier").$type<"moderator" | "admin" | "editor" | "functional" | "viewer">().notNull(),
    description: text("description"),
  },
);

/** Many-to-many user ↔ role. */
export const userRole = pgTable(
  "user_role",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => user.id),
    roleId: integer("role_id").notNull().references(() => role.id),
  },
  (t) => [uniqueIndex("user_role_unique_idx").on(t.userId, t.roleId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    action: text("action").notNull(), // create / update / delete / approve / lock
    before: jsonb("before"),
    after: jsonb("after"),
    byUser: text("by_user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);

export const alert = pgTable(
  "alert",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").references(() => sbu.id),
    severity: text("severity").$type<"critical" | "high" | "medium" | "low">().notNull(),
    rule: text("rule").notNull(),
    message: text("message").notNull(),
    impactBdtCr: numeric("impact_bdt_cr", { precision: 18, scale: 2 }),
    status: text("status").$type<"open" | "acknowledged" | "resolved">().notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const decision = pgTable(
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
    status: text("status").$type<"open" | "approved" | "rejected" | "assigned" | "done">().notNull().default("open"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const dataGap = pgTable(
  "data_gap",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").references(() => sbu.id),
    item: text("item").notNull(),
    whyNeeded: text("why_needed"),
    source: text("source"),
    owner: text("owner"),
    priority: text("priority").$type<"high" | "medium" | "low">().notNull().default("medium"),
    status: text("status").$type<"open" | "closed">().notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const uploadBatch = pgTable(
  "upload_batch",
  {
    id: serial("id").primaryKey(),
    entity: text("entity").notNull(),
    fileName: text("file_name").notNull(),
    status: text("status").$type<"validated" | "committed" | "rolled_back" | "failed">().notNull().default("validated"),
    rowCount: integer("row_count"),
    errorCount: integer("error_count"),
    errors: jsonb("errors"),
    byUser: text("by_user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ===========================================================================
// Competition intelligence
// ===========================================================================

/** Competitor profile (the registry detail beyond brand name/website). */
export const competitorProfile = pgTable(
  "competitor_profile",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    positioning: text("positioning"),
    threatLevel: text("threat_level").$type<"low" | "med" | "high">().notNull().default("med"),
    priceIndex: doublePrecision("price_index"), // vs category avg = 100
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("competitor_profile_brand_idx").on(t.brandId)],
);

/** Custodian-entered competitor activity (the "what did they do" log). */
export const competitorActivity = pgTable(
  "competitor_activity",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    activityDate: text("activity_date").notNull(), // YYYY-MM-DD
    activityType: text("activity_type")
      .$type<"price_cut" | "promotion" | "tvc" | "digital" | "dealer_scheme" | "new_product" | "other">()
      .notNull(),
    channel: text("channel"),
    spend: numeric("spend", { precision: 18, scale: 2 }),
    reach: doublePrecision("reach"), // 0..1
    priceChangePct: doublePrecision("price_change_pct"), // e.g. -5
    message: text("message"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("competitor_activity_sbu_idx").on(t.sbuId),
    index("competitor_activity_brand_idx").on(t.brandId),
  ],
);

// ===========================================================================
// Brand Playbook (Where to Play / How to Win · growth mechanism · activity→KPI)
// ===========================================================================

export const playbook = pgTable(
  "playbook",
  {
    id: serial("id").primaryKey(),
    sbuId: integer("sbu_id").notNull().references(() => sbu.id),
    fy: text("fy").notNull(),
    positioning: text("positioning"),
    objectives: jsonb("objectives"), // [{ text, target, fy }]
    wherePlay: jsonb("where_play"), // [{ segment }]
    howWin: text("how_win"),
    rightToWin: text("right_to_win"),
    icp: jsonb("icp"), // [{ code, label }]
    priorityKpis: jsonb("priority_kpis"), // [kpi code]
    growthMechanism: jsonb("growth_mechanism"), // [{ lever, kpi, outcome, fourP, mode, elasticity }]
    activityMatrix: jsonb("activity_matrix"), // [{ activity, kpis: string[], mode }]
    insights: jsonb("insights"), // string[]
    actions: jsonb("actions"), // string[]
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("playbook_sbu_fy_idx").on(t.sbuId, t.fy)],
);

/** Digital brand strength — competitor benchmark (web presence). */
export const digitalPresence = pgTable(
  "digital_presence",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    website: text("website"),
    socialChannels: integer("social_channels"),
    contentDepth: text("content_depth"),
    presenceScore: doublePrecision("presence_score"), // 0–5
    source: text("source"),
  },
  (t) => [uniqueIndex("digital_presence_brand_period_idx").on(t.brandId, t.periodId)],
);

/** Competitor intelligence repository — time-series metrics absorbed from custodians/uploads. */
export const competitorMetric = pgTable(
  "competitor_metric",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brand.id),
    periodId: text("period_id").notNull().references(() => fiscalPeriod.id),
    metric: text("metric")
      .$type<"share" | "sov" | "share_of_search" | "price_index" | "digital_presence">()
      .notNull(),
    value: doublePrecision("value").notNull(),
    unit: text("unit"),
    source: text("source"),
    isEstimate: boolean("is_estimate").notNull().default(false),
    enteredBy: text("entered_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("competitor_metric_brand_period_metric_idx").on(t.brandId, t.periodId, t.metric)],
);
