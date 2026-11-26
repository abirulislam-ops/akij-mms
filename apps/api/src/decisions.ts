import { eq, desc } from "drizzle-orm";
import { db, schema } from "./db.js";

export type DecisionAction = "approve" | "reject" | "assign" | "ask" | "done";

const ACTION_STATUS: Record<DecisionAction, (typeof schema.decision.$inferInsert)["status"]> = {
  approve: "approved",
  reject: "rejected",
  assign: "assigned",
  ask: "open",
  done: "done",
};

export async function getDecisions(status?: string) {
  const q = db
    .select({
      id: schema.decision.id,
      sbuCode: schema.sbu.code,
      sbuName: schema.sbu.name,
      title: schema.decision.title,
      whatHappened: schema.decision.whatHappened,
      why: schema.decision.why,
      impact: schema.decision.impact,
      options: schema.decision.options,
      recommendation: schema.decision.recommendation,
      owner: schema.decision.owner,
      dueDate: schema.decision.dueDate,
      status: schema.decision.status,
      decidedBy: schema.decision.decidedBy,
      decidedAt: schema.decision.decidedAt,
      createdAt: schema.decision.createdAt,
    })
    .from(schema.decision)
    .leftJoin(schema.sbu, eq(schema.decision.sbuId, schema.sbu.id));

  const rows = await (status ? q.where(eq(schema.decision.status, status as (typeof schema.decision.$inferSelect)["status"])) : q).orderBy(desc(schema.decision.createdAt));

  return rows.map((r) => ({ ...r, options: r.options as { label: string; description?: string }[] | null }));
}

export async function createDecision(input: {
  sbuCode?: string;
  title: string;
  whatHappened?: string;
  why?: string;
  impact?: string;
  options?: { label: string; description?: string }[];
  recommendation?: string;
  owner?: string;
  dueDate?: string;
}) {
  let sbuId: number | null = null;
  if (input.sbuCode) {
    const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, input.sbuCode)).limit(1);
    if (sbu) sbuId = sbu.id;
  }
  const [row] = await db
    .insert(schema.decision)
    .values({
      sbuId,
      title: input.title,
      whatHappened: input.whatHappened,
      why: input.why,
      impact: input.impact,
      options: input.options ?? null,
      recommendation: input.recommendation,
      owner: input.owner,
      dueDate: input.dueDate,
      status: "open",
    })
    .returning({ id: schema.decision.id });
  return row.id;
}

/** Transition a decision card: approve / reject / assign / ask / done. */
export async function transitionDecision(id: number, action: DecisionAction, byUser: string, assignTo?: string) {
  const [existing] = await db.select().from(schema.decision).where(eq(schema.decision.id, id));
  if (!existing) return null;

  const nextStatus = ACTION_STATUS[action];
  const patch: Partial<typeof schema.decision.$inferInsert> = { status: nextStatus };
  if (action === "approve" || action === "reject" || action === "done") {
    patch.decidedBy = byUser;
    patch.decidedAt = new Date();
  }
  if (action === "assign" && assignTo) patch.owner = assignTo;

  await db.update(schema.decision).set(patch).where(eq(schema.decision.id, id));
  await db.insert(schema.auditLog).values({
    entity: "decision",
    entityId: String(id),
    action,
    before: { status: existing.status, owner: existing.owner },
    after: { status: nextStatus, owner: patch.owner ?? existing.owner },
    byUser,
  });

  return { id, status: nextStatus, owner: patch.owner ?? existing.owner };
}
