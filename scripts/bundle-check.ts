import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// Import the bundled Vercel handler and exercise it like Vercel would.
// @ts-expect-error - api/index.js is a generated bundle with no type declarations
const { default: handler } = await import("../apps/api/api/index.js");

const health = await handler(new Request("http://localhost/health"));
console.log("GET /health →", health.status, await health.text());

const unauth = await handler(new Request("http://localhost/api/cockpit"));
console.log("GET /api/cockpit (no auth) →", unauth.status, await unauth.text());
