import { Hono } from "hono";
import { cors } from "hono/cors";
import { db, schema } from "./db.js";
import { requireAuth, type AppVariables } from "./auth.js";
import { getUserRoles, requireRole } from "./rbac.js";

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

export default app;
export type AppType = typeof app;
