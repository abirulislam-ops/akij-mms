import { and, eq } from "drizzle-orm";
import { db, schema } from "./db.js";
import { parseCsv } from "./csv.js";

export const CONFIDENCE = ["High", "Med", "Low", "Web", "Estimate"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export interface UploadRow {
  line: number;
  sbuCode: string;
  kpiCode: string;
  periodId: string;
  value: number;
  confidence: Confidence;
  source: string;
}

export interface UploadResult {
  valid: UploadRow[];
  errors: { line: number; message: string }[];
  affectedSbus: string[];
}

/** Validate a KPI-actual CSV: `sbu_code,kpi_code,period,value,confidence,source`. */
export async function validateKpiActuals(csv: string): Promise<UploadResult> {
  const rows = parseCsv(csv);
  if (rows.length < 2) return { valid: [], errors: [{ line: 0, message: "CSV must have a header row plus at least one data row" }], affectedSbus: [] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const required = ["sbu_code", "kpi_code", "period", "value"];
  const missing = required.filter((r) => idx(r) < 0);
  if (missing.length) return { valid: [], errors: [{ line: 0, message: `Missing column(s): ${missing.join(", ")}` }], affectedSbus: [] };

  const [sbusRows, kpiDefs, periods, sbuKpiRows] = await Promise.all([
    db.select().from(schema.sbu),
    db.select().from(schema.kpiDefinition),
    db.select().from(schema.fiscalPeriod),
    db.select().from(schema.sbuKpi),
  ]);
  const sbuByCode = new Map(sbusRows.map((s) => [s.code, s]));
  const kpiByCode = new Map(kpiDefs.map((k) => [k.code, k]));
  const periodIds = new Set(periods.map((p) => p.id));
  // sbuKpi keyed by `${sbuId}:${kpiId}` for duplicate/active checks
  const activeSbuKpi = new Set(sbuKpiRows.filter((k) => k.active).map((k) => `${k.sbuId}:${k.kpiId}`));

  const valid: UploadRow[] = [];
  const errors: { line: number; message: string }[] = [];
  const seen = new Set<string>();
  const affected = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    const sbuCode = (r[idx("sbu_code")] ?? "").trim();
    const kpiCode = (r[idx("kpi_code")] ?? "").trim();
    const periodId = (r[idx("period")] ?? "").trim();
    const valueRaw = (r[idx("value")] ?? "").trim();
    const confidence = ((r[idx("confidence")] ?? "").trim() || "Low") as Confidence;
    const source = (r[idx("source")] ?? "").trim();

    if (!sbuCode) { errors.push({ line, message: "sbu_code is empty" }); continue; }
    if (!kpiCode) { errors.push({ line, message: "kpi_code is empty" }); continue; }
    if (!periodId) { errors.push({ line, message: "period is empty" }); continue; }

    const sbu = sbuByCode.get(sbuCode);
    if (!sbu) { errors.push({ line, message: `unknown SBU code "${sbuCode}"` }); continue; }
    const kpi = kpiByCode.get(kpiCode);
    if (!kpi) { errors.push({ line, message: `unknown KPI code "${kpiCode}"` }); continue; }
    if (!periodIds.has(periodId)) { errors.push({ line, message: `unknown period "${periodId}"` }); continue; }
    if (!activeSbuKpi.has(`${sbu.id}:${kpi.id}`)) { errors.push({ line, message: `KPI "${kpiCode}" is not active for ${sbuCode}` }); continue; }

    const value = Number(valueRaw);
    if (valueRaw === "" || Number.isNaN(value)) { errors.push({ line, message: `value "${valueRaw}" is not a number` }); continue; }
    if (!CONFIDENCE.includes(confidence)) { errors.push({ line, message: `invalid confidence "${confidence}"` }); continue; }

    const dupKey = `${sbuCode}:${kpiCode}:${periodId}`;
    if (seen.has(dupKey)) { errors.push({ line, message: `duplicate ${sbuCode}/${kpiCode}/${periodId}` }); continue; }
    seen.add(dupKey);

    valid.push({ line, sbuCode, kpiCode, periodId, value, confidence, source });
    affected.add(sbuCode);
  }

  return { valid, errors, affectedSbus: [...affected] };
}

/** Commit validated rows: upsert kpi_actual + write an audit log entry per row. */
export async function commitKpiActuals(rows: UploadRow[], byUser: string): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, row.sbuCode));
    const [kpi] = await db.select().from(schema.kpiDefinition).where(eq(schema.kpiDefinition.code, row.kpiCode));
    if (!sbu || !kpi) continue;
    const [sk] = await db.select().from(schema.sbuKpi).where(and(eq(schema.sbuKpi.sbuId, sbu.id), eq(schema.sbuKpi.kpiId, kpi.id)));
    if (!sk) continue;

    const [existing] = await db
      .select()
      .from(schema.kpiActual)
      .where(and(eq(schema.kpiActual.sbuKpiId, sk.id), eq(schema.kpiActual.periodId, row.periodId)));

    if (existing) {
      await db
        .update(schema.kpiActual)
        .set({ value: row.value, confidence: row.confidence, source: row.source, asOf: new Date().toISOString().slice(0, 10), enteredBy: byUser })
        .where(eq(schema.kpiActual.id, existing.id));
      updated++;
    } else {
      await db.insert(schema.kpiActual).values({
        sbuKpiId: sk.id,
        periodId: row.periodId,
        value: row.value,
        confidence: row.confidence,
        source: row.source,
        asOf: new Date().toISOString().slice(0, 10),
        enteredBy: byUser,
      });
      inserted++;
    }

    // A measured value (High/Med/Web) clears the "benchmark estimate" flag on the SBU KPI.
    if (row.confidence === "High" || row.confidence === "Med" || row.confidence === "Web") {
      await db.update(schema.sbuKpi).set({ isEstimate: false }).where(eq(schema.sbuKpi.id, sk.id));
    }

    await db.insert(schema.auditLog).values({
      entity: "kpi_actual",
      entityId: `${row.sbuCode}/${row.kpiCode}/${row.periodId}`,
      action: existing ? "update" : "create",
      before: existing ? { value: Number(existing.value), confidence: existing.confidence } : null,
      after: { value: row.value, confidence: row.confidence },
      byUser,
    });
  }

  return { inserted, updated };
}

export function kpiActualsTemplate(): string {
  return [
    "sbu_code,kpi_code,period,value,confidence,source",
    "ACCL,aided_awareness,FY26-27,72,Med,Quantum study",
    "ACCL,market_share,FY26-27,5.60,High,ERP/GL",
    "ACCL,brand_revenue,FY26-27,2300,High,ERP/GL",
  ].join("\n");
}
