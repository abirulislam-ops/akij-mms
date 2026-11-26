import app from "./index.js";

/**
 * Vercel Node-runtime serverless entry (the `@hono/vercel` `handle` adapter is
 * Edge-only and breaks on Node's IncomingMessage — `headers.get is not a function`).
 * This adapter bridges Vercel's Node `(req, res)` signature to a Web Request and
 * streams the Hono Response back out.
 */
export default async function handler(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  try {
    const host = (req.headers.host as string) ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue;
      headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
    }

    const init: RequestInit = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      init.body = Buffer.concat(chunks);
    }

    const response = await app.fetch(new Request(url, init));

    res.statusCode = response.status;
    for (const [k, v] of response.headers.entries()) res.setHeader(k, v);
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  } catch (err) {
    console.error("handler error", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
