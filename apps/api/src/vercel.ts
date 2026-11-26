import { handle } from "@hono/vercel";
import app from "./index.js";

// Vercel serverless entry point for the Hono API (bundled by scripts/bundle-api.mjs).
export default handle(app);
