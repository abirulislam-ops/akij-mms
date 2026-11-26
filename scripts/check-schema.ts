import { createPool } from "../src/db.js";

const pool = createPool();
const res = await pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
);
console.log(`${res.rows.length} tables in Neon (public schema):`);
for (const r of res.rows) console.log(`  - ${r.table_name}`);
await pool.end();
