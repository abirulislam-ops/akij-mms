import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Context, Next } from "hono";

const NEON_AUTH_JWKS_URL = process.env.NEON_AUTH_JWKS_URL;
const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    if (!NEON_AUTH_JWKS_URL) throw new Error("NEON_AUTH_JWKS_URL is not set");
    jwks = createRemoteJWKSet(new URL(NEON_AUTH_JWKS_URL));
  }
  return jwks;
}

/** The verified identity stored on the Hono context. */
export interface AuthUser {
  sub: string; // Better Auth user id
  email: string | undefined;
  payload: JWTPayload;
}

/** Hono context variables (auth identity + resolved roles). */
export interface AppVariables {
  auth: AuthUser;
  roles: string[];
}

/** Verify a Better Auth JWT (Ed25519) against Neon Auth's JWKS. Returns null if invalid. */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    // The JWT issuer is the Auth origin (host), not the full base URL with its /neondb/auth path.
    const issuer = NEON_AUTH_BASE_URL ? new URL(NEON_AUTH_BASE_URL).origin : undefined;
    const { payload } = await jwtVerify(token, getJwks(), issuer ? { issuer } : {});
    return {
      sub: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : undefined,
      payload,
    };
  } catch {
    return null;
  }
}

/** Hono middleware: require a valid Bearer token; sets `c.get("auth")`. */
export function requireAuth() {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const user = await verifyToken(header.slice(7));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("auth", user);
    await next();
  };
}
