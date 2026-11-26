import { and, eq, desc } from "drizzle-orm";
import { db, schema } from "./db.js";

/**
 * ERP sync: upsert live iBOSDDD revenue into the MMS Postgres, with an audit log.
 * The ERP rows come from the enterprise-api-gateway (iBOSDDD GL) — either pushed
 * via POST /api/sync/revenue by a cron/worker, or written by scripts/sync-erp.ts.
 */
export async function upsertRevenue(sbuCode: string, periodId: string, value: number, source: string, byUser: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, sbuCode));
  if (!sbu) return { sbuCode, periodId, status: "skip: unknown SBU" };

  const [existing] = await db
    .select()
    .from(schema.revenueActual)
    .where(and(eq(schema.revenueActual.sbuId, sbu.id), eq(schema.revenueActual.periodId, periodId)));

  if (existing) {
    await db.update(schema.revenueActual).set({ value: String(value), source, asOf: new Date().toISOString().slice(0, 10) }).where(eq(schema.revenueActual.id, existing.id));
    await db.insert(schema.auditLog).values({ entity: "revenue_actual", entityId: `${sbuCode}/${periodId}`, action: "update", before: { value: Number(existing.value) }, after: { value, source }, byUser });
    return { sbuCode, periodId, status: "updated" };
  }

  await db.insert(schema.revenueActual).values({ sbuId: sbu.id, periodId, value: String(value), source, asOf: new Date().toISOString().slice(0, 10) });
  await db.insert(schema.auditLog).values({ entity: "revenue_actual", entityId: `${sbuCode}/${periodId}`, action: "create", after: { value, source }, byUser });
  return { sbuCode, periodId, status: "created" };
}

export async function getSyncLog(limit = 50) {
  return db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.entity, "revenue_actual"))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
}
