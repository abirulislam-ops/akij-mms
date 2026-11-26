import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import app from "../apps/api/src/index.js";
import { verifyToken } from "../apps/api/src/auth.js";

const BASE = process.env.NEON_AUTH_BASE_URL!;
const JWKS = process.env.NEON_AUTH_JWKS_URL!;

const results: { check: string; ok: boolean; detail: string }[] = [];
function record(check: string, ok: boolean, detail: string) {
  results.push({ check, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${check}: ${detail}`);
}

async function main() {
  console.log("=== MMS Auth verification ===\n");

  // 1. JWKS reachable
  try {
    const res = await fetch(JWKS);
    const body = (await res.json()) as { keys?: unknown[] };
    const n = body.keys?.length ?? 0;
    record("JWKS reachable", res.ok && n > 0, `${n} key(s) at ${JWKS}`);
  } catch (e) {
    record("JWKS reachable", false, e instanceof Error ? e.message : String(e));
  }

  // 2. verifyToken rejects a garbage token
  const bad = await verifyToken("not-a-real-token");
  record("reject invalid token", bad === null, "garbage token → null");

  // 3. API routes: unauthenticated → 401
  const me401 = await app.request("/api/me");
  record("GET /api/me unauthenticated → 401", me401.status === 401, `status ${me401.status}`);

  const health = await app.request("/health");
  record("GET /health → 200 (public)", health.status === 200, `status ${health.status}`);

  // 4. Real sign-up/sign-in via Managed Auth REST → token → verify → protected route
  const email = `mms-test-${Date.now()}@akijresource.com`;
  const password = "MmsTestPass123!";
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  try {
    let res = await fetch(`${BASE}/sign-up/email`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password, name: "MMS Test User" }),
    });
    // If sign-up fails because verification is required, fall back to sign-in (may not exist yet).
    if (res.status >= 400) {
      res = await fetch(`${BASE}/sign-in/email`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password }),
      });
    }
    const body = (await res.json()) as Record<string, unknown>;
    // Better Auth returns a session token (random string), not the JWT.
    // Exchange the session cookie for a JWT via GET /token.
    const setCookie = res.headers.get("set-cookie") ?? "";
    const cookieName = setCookie.split("=")[0];
    let jwtToken = (body.token as string) ?? "";
    if (cookieName) {
      const tokenRes = await fetch(`${BASE}/token`, {
        method: "GET",
        headers: { Origin: "http://localhost:5173", Cookie: setCookie.split(";")[0] },
      });
      const tokenBody = (await tokenRes.json()) as { token?: string };
      if (tokenBody.token) jwtToken = tokenBody.token;
    }
    if (!jwtToken || jwtToken === (body.token as string)) {
      // fall back: maybe sign-in already returned a JWT in another field
    }
    const token = jwtToken;
    console.log(`   [debug] cookie=${cookieName || "(none)"} tokenPrefix=${String(token).slice(0, 40)}`);
    if (!token) {
      record("sign-up/in returns token", false, `status ${res.status}: ${JSON.stringify(body).slice(0, 160)}`);
      return;
    }
    record("sign-up/in returns token", true, `user ${(body.user as { email?: string } | undefined)?.email ?? email}`);

    // inspect the token claims (unverified) to debug issuer
    try {
      const claims = decodeJwt(token);
      console.log(`   [debug] token claims: iss=${claims.iss} sub=${claims.sub} aud=${claims.aud} email=${claims.email}`);
      console.log(`   [debug] NEON_AUTH_BASE_URL=${BASE}`);
    } catch (e) {
      console.log(`   [debug] decode failed: ${e instanceof Error ? e.message : e}`);
    }

    // verify the real token
    const verified = await verifyToken(token);
    record("verify real token", verified !== null, verified ? `sub ${verified.sub}` : "null");

    // call protected route with the token
    const me = await app.request("/api/me", { headers: { Authorization: `Bearer ${token}` } });
    record("GET /api/me with token → 200", me.status === 200, `status ${me.status}`);
  } catch (e) {
    record("real sign-in flow", false, e instanceof Error ? e.message : String(e));
  }

  console.log("\n=== Summary ===");
  const fail = results.filter((r) => !r.ok);
  console.log(`PASS ${results.length - fail.length} · FAIL ${fail.length}`);
  if (fail.length) process.exitCode = 1;
}

void (async () => {
  // warm the JWKS set (used by jose remote JWKS) — first verify may fetch it
  const jwks = createRemoteJWKSet(new URL(JWKS));
  void jwks;
  await main().catch((e) => {
    console.error("auth-check crashed:", e);
    process.exitCode = 1;
  });
})();
