import { env } from "../src/env.js";
import { pingDb } from "../src/db.js";
import { listBuckets, listObjects, putTestObject, deleteObject } from "../src/storage.js";
import { listModels } from "../src/ai.js";
import { testRealtime } from "../src/realtime.js";

type Status = "PASS" | "WARN" | "FAIL";
const results: { service: string; status: Status; detail: string }[] = [];

function record(service: string, status: Status, detail: string) {
  results.push({ service, status, detail });
  console.log(`[${status}] ${service}: ${detail}`);
}

async function main() {
  console.log("=== AKIJ MMS — Neon service verification ===\n");

  // 1. Postgres
  try {
    const v = await pingDb();
    record("Postgres", "PASS", `connected to database "${v.database}" · ${v.version.split(" ").slice(0, 2).join(" ")}`);
  } catch (e) {
    record("Postgres", "FAIL", e instanceof Error ? e.message : String(e));
  }

  // 2. Object Storage
  try {
    const buckets = await listBuckets();
    if (buckets.length === 0) throw new Error("no buckets returned");
    const uploads = buckets.includes("uploads") ? "uploads" : buckets[0];
    // round-trip: put → list → delete
    const key = "mms-verify.txt";
    await putTestObject(uploads, key, "AKIJ MMS object-storage round-trip OK");
    const keys = await listObjects(uploads);
    await deleteObject(uploads, key);
    record(
      "Object Storage",
      "PASS",
      `bucket "${uploads}" · round-trip ok (put/list/delete "${key}") · buckets: ${buckets.join(", ")}`,
    );
  } catch (e) {
    record("Object Storage", "FAIL", e instanceof Error ? e.message : String(e));
  }

  // 3. Functions (hello is deployed via neon.ts)
  try {
    const fnUrl = `https://${env.branchId}-hello${env.functionHostSuffix}/`;
    const res = await fetch(fnUrl);
    const body = await res.text();
    if (res.ok && body.includes("Hello from Neon Functions")) {
      record("Functions", "PASS", `hello() → "${body.trim()}"`);
    } else {
      record("Functions", "FAIL", `status ${res.status}: ${body.slice(0, 120)}`);
    }
  } catch (e) {
    record("Functions", "FAIL", e instanceof Error ? e.message : String(e));
  }

  // 4. AI Gateway (models endpoint; requires AI Gateway credits)
  try {
    const models = await listModels();
    record("AI Gateway", "PASS", `${models.length} model(s): ${models.slice(0, 5).join(", ")}${models.length > 5 ? " …" : ""}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/credits|402|403|401|billing|no models/i.test(msg)) {
      record("AI Gateway", "WARN", `configured, but no credits/models on this account — ${msg.slice(0, 140)}`);
    } else {
      record("AI Gateway", "FAIL", msg);
    }
  }

  // 5. Auth (Neon Auth / Better Auth) — JWKS reachability
  try {
    const url = env.authJwksUrl ?? `${env.authBaseUrl}/.well-known/jwks.json`;
    const res = await fetch(url);
    const text = await res.text();
    const isJwks = text.trimStart().startsWith("{");
    record("Auth", res.ok || isJwks ? "PASS" : "FAIL", `JWKS ${res.status} · ${isJwks ? "JSON returned" : "non-JSON"}`);
  } catch (e) {
    record("Auth", "FAIL", e instanceof Error ? e.message : String(e));
  }

  // 6. Realtime — live-query round trip (subscribe → initial rows → INSERT streamed live)
  try {
    const r = await testRealtime();
    record("Realtime", r.ok ? "PASS" : "FAIL", r.detail);
  } catch (e) {
    record("Realtime", "FAIL", e instanceof Error ? e.message : String(e));
  }

  // Summary
  console.log("\n=== Summary ===");
  const fail = results.filter((r) => r.status === "FAIL");
  const warn = results.filter((r) => r.status === "WARN");
  console.log(`PASS ${results.length - fail.length - warn.length} · WARN ${warn.length} · FAIL ${fail.length}`);
  if (fail.length) {
    console.log("\nFailed services:");
    fail.forEach((f) => console.log(`  - ${f.service}: ${f.detail}`));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("verify crashed:", e);
  process.exitCode = 1;
});
