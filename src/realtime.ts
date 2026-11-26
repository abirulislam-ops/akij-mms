import {
  createRealtime,
  rawSql,
  type RawSqlQuery,
  type RealtimeDirectServer,
} from "@neon/realtime/server";
import type { LiveQuerySnapshot, LiveQueryState } from "@neon/realtime/client";
import { env } from "./env.js";
import { createPool } from "./db.js";

type Row = { id: number; name: string };

export async function testRealtime(): Promise<{ ok: boolean; detail: string }> {
  const pool = createPool();
  const TABLE = "mms_realtime_test";
  let realtime: RealtimeDirectServer<RawSqlQuery<Row>> | undefined;
  try {
    await pool.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await pool.query(`CREATE TABLE ${TABLE} (id serial PRIMARY KEY, name text)`);
    await pool.query(`INSERT INTO ${TABLE} (name) VALUES ('seed')`);

    realtime = createRealtime({
      url: env.realtimeUrl ?? "",
      secret: env.realtimeSecret ?? "",
      db: "neondb",
    });

    const sub = await realtime.subscribe(rawSql<Row>(`SELECT id, name FROM ${TABLE} ORDER BY id`));

    const log: string[] = [];
    let resolveInitial: (v: number) => void;
    let rejectInitial: (e: Error) => void;
    let resolveLive: (v: number) => void;
    let rejectLive: (e: Error) => void;

    const initialP = new Promise<number>((res, rej) => {
      resolveInitial = res;
      rejectInitial = rej;
    });
    const liveP = new Promise<number>((res, rej) => {
      resolveLive = res;
      rejectLive = rej;
    });

    let initialCount = -1;

    sub.onChange((snap: LiveQuerySnapshot<Row>) => {
      const names = (snap.data ?? []).map((r) => r.name);
      log.push(`onChange status=${snap.status} rows=[${names.join(",")}]`);
      if (snap.status === "live" && initialCount < 0) {
        initialCount = names.length;
        resolveInitial(initialCount);
      }
      if (initialCount >= 0 && names.includes("live-row")) {
        resolveLive(names.length);
      }
    });
    sub.onStateChange((s: LiveQueryState) => {
      log.push(`onStateChange status=${s.status}${s.error ? ` err=${s.error.message}` : ""}`);
      if (s.status === "error") {
        const err = s.error ?? new Error("realtime subscription error");
        if (initialCount < 0) rejectInitial(err);
        else rejectLive(err);
      }
    });

    const tInitial = setTimeout(() => rejectInitial(new Error("timed out waiting for initial result")), 15000);
    const initial = await initialP;
    clearTimeout(tInitial);
    if (initial < 1) throw new Error("initial result was empty");

    const tLive = setTimeout(() => rejectLive(new Error("timed out waiting for live change")), 15000);
    await pool.query(`INSERT INTO ${TABLE} (name) VALUES ('live-row')`);
    const live = await liveP;
    clearTimeout(tLive);

    sub.unsubscribe();
    realtime.close();
    realtime = undefined;

    return {
      ok: true,
      detail: `initial ${initial} row(s) → ${live} row(s) after INSERT (live change streamed)`,
    };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  } finally {
    try {
      realtime?.close();
    } catch {
      /* ignore */
    }
    await pool.query(`DROP TABLE IF EXISTS ${TABLE}`).catch(() => {});
    await pool.end().catch(() => {});
  }
}
