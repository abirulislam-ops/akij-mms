import { handle } from "@hono/vercel";
import app from "../src/index.js";

// Vercel serverless entry point for the Hono API.
export default handle(app);
