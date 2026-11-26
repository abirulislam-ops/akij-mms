// Bundle the Vercel API entry (src/vercel.ts) into a single self-contained file at
// api/index.js. Only the local workspace packages (@akij-mms/*) are inlined; every npm
// package is external so Vercel installs them normally (avoids ESM/CJS dynamic-require
// interop problems from inlining CJS deps like dotenv).
import { build } from "esbuild";

await build({
  entryPoints: ["src/vercel.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "api/index.js",
  external: [
    "pg",
    "pg-native",
    "dotenv",
    "drizzle-orm",
    "drizzle-orm/*",
    "hono",
    "hono/*",
    "@hono/vercel",
    "jose",
  ],
  logLevel: "info",
});
console.log("Bundled api/index.js");
