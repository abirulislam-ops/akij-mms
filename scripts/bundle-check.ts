import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// Exercise the bundled Vercel Node handler with a mock (req, res).
// @ts-expect-error - api/index.js is a generated bundle with no type declarations
const { default: handler } = await import("../apps/api/api/index.js");

async function call(method: string, path: string, body?: string) {
  const chunks: Buffer[] = [];
  let status = 0;
  let headers: Record<string, string> = {};
  const req: any = {
    method,
    url: path,
    headers: { host: "localhost" },
    [Symbol.asyncIterator]: async function* () { if (body) yield Buffer.from(body); },
  };
  const res: any = {
    setHeader: (k: string, v: string) => { headers[k] = v; },
    end: (b: Buffer) => { chunks.push(b); },
    statusCode: 200,
  };
  await handler(req, res);
  return { status: res.statusCode, body: Buffer.concat(chunks).toString(), headers };
}

const health = await call("GET", "/health");
console.log("GET /health →", health.status, health.body);

const cockpit = await call("GET", "/api/cockpit");
console.log("GET /api/cockpit (no auth) →", cockpit.status, cockpit.body);
