import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { db, schema } from "./db.js";
import type { AppVariables } from "./auth.js";

/** Tiers, ordered by privilege. A role in a higher tier passes any lower-tier gate. */
export const TIER_ORDER = ["moderator", "admin", "editor", "functional", "viewer"] as const;
export type Tier = (typeof TIER_ORDER)[number];

export interface UserRoles {
  email: string;
  roles: string[]; // role codes
  tiers: Tier[];
}

/** Look up the MMS user's roles by their Better Auth email. */
export async function getUserRoles(email: string): Promise<UserRoles> {
  const user = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email)).limit(1);
  if (!user.length) return { email, roles: [], tiers: [] };
  const rows = await db
    .select({ code: schema.role.code, tier: schema.role.tier })
    .from(schema.userRole)
    .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
    .where(eq(schema.userRole.userId, user[0].id));
  return {
    email,
    roles: rows.map((r) => r.code),
    tiers: rows.map((r) => r.tier as Tier),
  };
}

/** Middleware: require the authenticated user to hold at least one of `allowedRoles` (or a moderator/admin tier). */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
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

/** Middleware: require the authenticated user to hold at least the given tier (or higher). */
export function requireTier(minTier: Tier) {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const auth = c.get("auth");
    if (!auth?.email) return c.json({ error: "Unauthorized" }, 401);
    const { tiers } = await getUserRoles(auth.email);
    const minIndex = TIER_ORDER.indexOf(minTier);
    const ok = tiers.some((t) => TIER_ORDER.indexOf(t) <= minIndex);
    if (!ok) return c.json({ error: "Forbidden" }, 403);
    await next();
  };
}
