import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import { requireAuth, type AppVariables } from "./auth.js";
import { getUserRoles, requireRole, requireTier } from "./rbac.js";
import { computeSbuIndices, getCockpit } from "./scores.js";
import { validateKpiActuals, commitKpiActuals, kpiActualsTemplate } from "./upload.js";
import { getFreshness } from "./freshness.js";
import { getSbuHub } from "./hub.js";
import { getCoverage } from "./coverage.js";
import { getMarketOverview, getMarketDetail } from "./market.js";
import { getBudgetOverview, getBudgetDetail } from "./budget.js";
import { getStrategy } from "./strategy.js";
import { getBrandHealth } from "./health.js";
import { getFourPOverview, getFourPDetail } from "./fourp.js";
import { getPortfolio } from "./analytics.js";
import { runAlertEngine } from "./alerts.js";
import { getDecisions, createDecision, transitionDecision, type DecisionAction } from "./decisions.js";
import { whatIfShare } from "./market.js";
import { exportCockpitCsv, exportCoverageCsv, exportScorecardCsv } from "./reports.js";
import { upsertRevenue, getSyncLog } from "./sync.js";

const app = new Hono<{ Variables: AppVariables }>();

// CORS: restrict to the configured frontend origin(s) (dev: Vite on 5173; prod: Vercel app).
// Auth is a Bearer JWT in the Authorization header, so no cookies/credentials are needed.
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((s) => s.trim());
      if (allowed.includes("*")) return "*";
      if (!origin) return allowed[0];
      return allowed.includes(origin) ? origin : allowed[0];
    },
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "akij-mms-api" }));

// Protected: requires a valid Neon Auth JWT.
app.get("/api/me", requireAuth(), async (c) => {
  const auth = c.get("auth");
  const roles = auth.email ? await getUserRoles(auth.email) : { email: auth.email, roles: [], tiers: [] };
  return c.json({ sub: auth.sub, ...roles });
});

// Protected + role-gated: admin/editor only (SPA, Brand Custodian, SBU Head) or moderator/admin tier.
app.get("/api/sbus", requireAuth(), async (c) => {
  const rows = await db.select({ code: schema.sbu.code, name: schema.sbu.name, category: schema.sbu.category, active: schema.sbu.active }).from(schema.sbu);
  return c.json({ sbus: rows });
});

// Protected + admin only (Strategic Planner & Analysis; moderators pass automatically).
app.get("/api/roles", requireAuth(), requireRole("SPA"), async (c) => {
  const rows = await db.select({ code: schema.role.code, name: schema.role.name, tier: schema.role.tier }).from(schema.role);
  return c.json({ roles: rows });
});

// Group cockpit: every SBU with composite score + revenue.
app.get("/api/cockpit", requireAuth(), async (c) => {
  const rows = await getCockpit();
  return c.json({ sbus: rows });
});

// Portfolio (Executive Cockpit): scores + market reconciliation + budget in one payload.
app.get("/api/analytics", requireAuth(), async (c) => {
  return c.json(await getPortfolio());
});

// Decision Support Center: live alert engine (rules over reconciliation, coverage, SOV/SOM, budget).
app.get("/api/alerts", requireAuth(), async (c) => {
  return c.json({ alerts: await runAlertEngine() });
});

// Decision cards: list (optional ?status=) + create + transition (approve/reject/assign/ask/done).
app.get("/api/decisions", requireAuth(), async (c) => {
  const status = c.req.query("status");
  return c.json({ decisions: await getDecisions(status) });
});
app.post("/api/decisions", requireAuth(), requireRole("SPA", "BRAND_CUSTODIAN", "SBU_HEAD"), async (c) => {
  const body = (await c.req.json()) as Parameters<typeof createDecision>[0];
  if (!body?.title || !body.title.trim()) return c.json({ error: "title is required" }, 400);
  const id = await createDecision(body);
  return c.json({ id });
});
app.post("/api/decisions/:id/transition", requireAuth(), requireTier("admin"), async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const body = (await c.req.json()) as { action?: DecisionAction; assignTo?: string };
  if (!body.action || !["approve", "reject", "assign", "ask", "done"].includes(body.action)) {
    return c.json({ error: "invalid action" }, 400);
  }
  const byUser = c.get("auth").email ?? "unknown";
  const result = await transitionDecision(id, body.action, byUser, body.assignTo);
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});

// What-if: project market share for a hypothetical brand revenue-growth rate.
app.post("/api/whatif", requireAuth(), async (c) => {
  const body = (await c.req.json()) as { code?: string; brandGrowth?: number };
  if (!body.code || typeof body.code !== "string") return c.json({ error: "code is required" }, 400);
  if (typeof body.brandGrowth !== "number" || !Number.isFinite(body.brandGrowth) || body.brandGrowth < -100 || body.brandGrowth > 1000) {
    return c.json({ error: "brandGrowth must be a number between -100 and 1000" }, 400);
  }
  const result = await whatIfShare(body.code, body.brandGrowth);
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});

// Reports: CSV export (cockpit portfolio + coverage table).
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

// ERP sync: accept live revenue rows (from the iBOSDDD gateway) and upsert.
app.post("/api/sync/revenue", requireAuth(), requireTier("admin"), async (c) => {
  const body = (await c.req.json()) as { rows?: { sbuCode?: string; periodId?: string; value?: number; source?: string }[] };
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

// Data Gap Register.
app.get("/api/datagaps", requireAuth(), async (c) => {
  const rows = await db
    .select({
      id: schema.dataGap.id,
      sbuCode: schema.sbu.code,
      sbuName: schema.sbu.name,
      item: schema.dataGap.item,
      whyNeeded: schema.dataGap.whyNeeded,
      source: schema.dataGap.source,
      owner: schema.dataGap.owner,
      priority: schema.dataGap.priority,
      status: schema.dataGap.status,
    })
    .from(schema.dataGap)
    .leftJoin(schema.sbu, eq(schema.dataGap.sbuId, schema.sbu.id))
    .orderBy(eq(schema.dataGap.status, "open"), schema.dataGap.priority);
  return c.json({ gaps: rows });
});

// Market & Competition: group overview + SBU detail.
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

// Budget & ROMI: group league table + SBU detail.
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

// Strategy & Targets (per SBU).
app.get("/api/strategy/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const detail = await getStrategy(code);
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});

// Brand Health & Research (per SBU).
app.get("/api/health/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const detail = await getBrandHealth(code);
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});

// 4P Studio: cross-SBU overview + SBU detail.
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

// SBU detail: indices + KPI rows.
app.get("/api/sbus/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return c.json({ error: "Not found" }, 404);
  const indices = await computeSbuIndices(sbu.id);
  return c.json({ sbu: { code: sbu.code, name: sbu.name, category: sbu.category, custodian: sbu.custodian }, indices });
});

// SBU Brand Hub: full payload (indices, dimensions, KPIs, campaigns, market, revenue, budget, maturity).
app.get("/api/sbus/:code/hub", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return c.json({ error: "Not found" }, 404);
  const hub = await getSbuHub(sbu.id);
  if (!hub) return c.json({ error: "Not found" }, 404);
  return c.json(hub);
});

// Data Input Center: download the KPI-actual template.
app.get("/api/templates/kpi-actuals", requireAuth(), (c) => c.text(kpiActualsTemplate(), 200, { "Content-Type": "text/csv" }));

// Data Input Center: upload KPI actuals. Preview by default; commit with { commit: true }.
app.post("/api/upload/kpi-actuals", requireAuth(), requireRole("BRAND_CUSTODIAN", "SBU_HEAD", "SPA"), async (c) => {
  const body = (await c.req.json()) as { csv?: string; commit?: boolean };
  const csv = body.csv ?? "";
  const byUser = c.get("auth").email ?? "unknown";
  const result = await validateKpiActuals(csv);
  if (body.commit) {
    const committed = result.valid.length
      ? await commitKpiActuals(result.valid, byUser)
      : { inserted: 0, updated: 0 };
    return c.json({ ...result, committed });
  }
  return c.json(result);
});

// Data freshness board.
app.get("/api/freshness", requireAuth(), async (c) => {
  return c.json({ datasets: await getFreshness() });
});

// Group coverage table: SBU × module × data status (drives data-completeness approval).
app.get("/api/coverage", requireAuth(), async (c) => {
  return c.json(await getCoverage());
});

// Approve an SBU's estimate baselines → they enter official scores (moderator/admin only).
// Writes an audit-log entry and flips isEstimate=false on the SBU's estimate KPIs.
app.post("/api/sbus/:code/approve-estimates", requireAuth(), requireTier("admin"), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const byUser = c.get("auth").email ?? "unknown";
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return c.json({ error: "Not found" }, 404);

  const estimates = await db
    .select()
    .from(schema.sbuKpi)
    .where(and(eq(schema.sbuKpi.sbuId, sbu.id), eq(schema.sbuKpi.isEstimate, true), eq(schema.sbuKpi.active, true)));

  if (!estimates.length) return c.json({ approved: 0, message: "No estimate baselines to approve" });

  const ids = estimates.map((e) => e.id);
  await db.update(schema.sbuKpi).set({ isEstimate: false }).where(inArray(schema.sbuKpi.id, ids));
  await db.insert(schema.auditLog).values({
    entity: "sbu_kpi",
    entityId: sbu.code,
    action: "approve",
    before: { isEstimate: true },
    after: { isEstimate: false },
    byUser,
  });

  return c.json({ approved: estimates.length, message: `${estimates.length} estimate baseline(s) approved and now included in official scores` });
});

export default app;
export type AppType = typeof app;
