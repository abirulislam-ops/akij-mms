import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Neon writes env vars into `.env.local`. Migrations use the direct (unpooled) URL.
config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set — run `neon env pull` first");
}

export default defineConfig({
  schema: "./packages/schema/src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
