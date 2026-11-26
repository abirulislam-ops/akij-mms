import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import { db, schema } from "./db.js";
import { requireAuth, type AppVariables } from "./auth.js";
import { getUserRoles, requireRole } from "./rbac.js";
import { computeSbuIndices, getCockpit } from "./scores.js";
import { validateKpiActuals, commitKpiActuals, kpiActualsTemplate } from "./upload.js";
import { getFreshness } from "./freshness.js";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", cors());

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

// SBU detail: indices + KPI rows.
app.get("/api/sbus/:code", requireAuth(), async (c) => {
  const code = c.req.param("code");
  if (!code) return c.json({ error: "Not found" }, 404);
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code));
  if (!sbu) return c.json({ error: "Not found" }, 404);
  const indices = await computeSbuIndices(sbu.id);
  return c.json({ sbu: { code: sbu.code, name: sbu.name, category: sbu.category, custodian: sbu.custodian }, indices });
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

export default app;
export type AppType = typeof app;
