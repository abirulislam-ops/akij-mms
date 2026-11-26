import { Pool } from "pg";
import { env } from "./env.js";

// Neon Postgres via node-postgres (pooled URL for application traffic).
export function createPool(): Pool {
  return new Pool({
    connectionString: env.databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export async function pingDb(): Promise<{ version: string; database: string; now: string }> {
  const pool = createPool();
  try {
    const res = await pool.query(
      "SELECT version() AS version, current_database() AS database, now() AS now",
    );
    return res.rows[0] as { version: string; database: string; now: string };
  } finally {
    await pool.end();
  }
}
