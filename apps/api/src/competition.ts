import { eq, and } from "drizzle-orm";
import { db, schema } from "./db.js";
import { assessActivity, competitionHHI, ACTIVITY_LABEL, type CompetitorActivityType } from "@akij-mms/calc";

const BASELINE = "FY25-26";

interface RegistryRow {
  brandId: number;
  name: string;
  own: boolean;
  share: number | null;
  isEstimate: boolean;
  positioning: string | null;
  threatLevel: "low" | "med" | "high";
  priceIndex: number | null;
  strengths: string | null;
  weaknesses: string | null;
}

async function loadSbu(code: string) {
  const [sbu] = await db.select().from(schema.sbu).where(eq(schema.sbu.code, code)).limit(1);
  return sbu ?? null;
}

async function loadRegistry(sbuId: number) {
  const brands = await db.select().from(schema.brand).where(eq(schema.brand.sbuId, sbuId));
  const shares = await db.select().from(schema.marketShare).where(eq(schema.marketShare.periodId, BASELINE));
  const profileRows = await db.select().from(schema.competitorProfile);
  const profileByBrand = new Map(profileRows.map((p) => [p.brandId, p]));
  const shareByBrand = new Map(shares.map((s) => [s.brandId, s]));

  const rows: RegistryRow[] = brands.map((b) => {
    const sh = shareByBrand.get(b.id);
    const pr = profileByBrand.get(b.id);
    return {
      brandId: b.id,
      name: b.name,
      own: b.isOwn,
      share: sh?.valueShare != null ? Number(sh.valueShare) : null,
      isEstimate: sh?.isEstimate ?? true,
      positioning: pr?.positioning ?? null,
      threatLevel: (pr?.threatLevel as RegistryRow["threatLevel"]) ?? "med",
      priceIndex: pr?.priceIndex != null ? Number(pr.priceIndex) : null,
      strengths: pr?.strengths ?? null,
      weaknesses: pr?.weaknesses ?? null,
    };
  });
  return { rows, brands, shareByBrand };
}

export async function getCompetitionOverview() {
  const sbus = await db.select().from(schema.sbu).where(eq(schema.sbu.active, true));
  const allActivities = await db.select().from(schema.competitorActivity);
  const out = [];

  for (const s of sbus) {
    const { rows } = await loadRegistry(s.id);
    const own = rows.find((r) => r.own);
    const comps = rows.filter((r) => !r.own);
    const shares = rows.map((r) => r.share ?? 0).filter((v) => v > 0);
    const sorted = [...rows].filter((r) => r.share != null).sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
    const rank = own && own.share != null && comps.some((c) => c.share != null) ? sorted.findIndex((r) => r.own) + 1 : null;
    const threatScore = { low: 1, med: 2, high: 3 } as const;
    const worst = comps.reduce((m, c) => Math.max(m, threatScore[c.threatLevel]), 0);
    const threat = worst === 3 ? "high" : worst === 2 ? "med" : "low";
    const acts = allActivities.filter((a) => a.sbuId === s.id);
    out.push({
      code: s.code,
      name: s.name,
      category: s.category,
      ownShare: own?.share ?? null,
      ownShareEstimate: own?.isEstimate ?? true,
      rank,
      competitorCount: comps.length,
      threat,
      activityCount: acts.length,
      latestActivity: acts.length ? acts.map((a) => a.activityDate).sort().slice(-1)[0] : null,
      hhi: shares.length ? competitionHHI(shares) : null,
    });
  }
  return out;
}

export async function getCompetitionDetail(code: string) {
  const sbu = await loadSbu(code);
  if (!sbu) return null;
  const { rows } = await loadRegistry(sbu.id);
  const own = rows.find((r) => r.own);
  const ourShare = own?.share ?? 0;

  const acts = await db
    .select()
    .from(schema.competitorActivity)
    .where(eq(schema.competitorActivity.sbuId, sbu.id));
  const brandName = new Map(rows.map((r) => [r.brandId, r.name]));
  const brandShare = new Map(rows.map((r) => [r.brandId, r.share ?? null]));

  const activities = acts
    .sort((a, b) => (a.activityDate < b.activityDate ? 1 : -1))
    .map((a) => {
      const cshare = brandShare.get(a.brandId) ?? (ourShare ? ourShare * 0.8 : 1);
      const impact = assessActivity({
        activityType: a.activityType as CompetitorActivityType,
        ourShare,
        competitorShare: cshare,
        spend: a.spend != null ? Number(a.spend) : null,
        reach: a.reach != null ? Number(a.reach) : null,
        priceChangePct: a.priceChangePct != null ? Number(a.priceChangePct) : null,
      });
      return {
        id: a.id,
        brandId: a.brandId,
        competitor: brandName.get(a.brandId) ?? "Competitor",
        competitorShare: cshare,
        activityDate: a.activityDate,
        activityType: a.activityType,
        activityLabel: ACTIVITY_LABEL[a.activityType as CompetitorActivityType] ?? a.activityType,
        channel: a.channel,
        spend: a.spend != null ? Number(a.spend) : null,
        reach: a.reach != null ? Number(a.reach) : null,
        priceChangePct: a.priceChangePct != null ? Number(a.priceChangePct) : null,
        message: a.message,
        notes: a.notes,
        impact,
      };
    });

  const aggregate = {
    maxThreatScore: activities.reduce((m, a) => Math.max(m, a.impact.threatScore), 0),
    projectedOurDeltaPp: Math.round(activities.reduce((s, a) => s + a.impact.ourShareDeltaPp, 0) * 100) / 100,
    projectedTheirDeltaPp: Math.round(activities.reduce((s, a) => s + a.impact.theirShareDeltaPp, 0) * 100) / 100,
  };

  return {
    sbu: { code: sbu.code, name: sbu.name, category: sbu.category },
    ownShare: own?.share ?? null,
    registry: rows.sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0) || (b.share ?? 0) - (a.share ?? 0)),
    hhi: competitionHHI(rows.map((r) => r.share ?? 0).filter((v) => v > 0)),
    activities,
    aggregate,
  };
}

export async function addCompetitorActivity(
  code: string,
  body: {
    brandId: number;
    activityDate: string;
    activityType: string;
    channel?: string;
    spend?: number;
    reach?: number;
    priceChangePct?: number;
    message?: string;
    notes?: string;
  },
  byUser: string,
) {
  const sbu = await loadSbu(code);
  if (!sbu) return { error: "Not found" as const };
  const [brand] = await db.select().from(schema.brand).where(and(eq(schema.brand.id, body.brandId), eq(schema.brand.sbuId, sbu.id))).limit(1);
  if (!brand) return { error: "Competitor brand not found for this SBU" as const };

  const [row] = await db
    .insert(schema.competitorActivity)
    .values({
      sbuId: sbu.id,
      brandId: body.brandId,
      activityDate: body.activityDate,
      activityType: body.activityType as CompetitorActivityType,
      channel: body.channel,
      spend: body.spend != null ? String(body.spend) : null,
      reach: body.reach,
      priceChangePct: body.priceChangePct,
      message: body.message,
      notes: body.notes,
      createdBy: byUser,
    })
    .returning({ id: schema.competitorActivity.id });

  await db.insert(schema.auditLog).values({
    entity: "competitor_activity",
    entityId: String(row.id),
    action: "create",
    before: null,
    after: { sbu: code, brandId: body.brandId, type: body.activityType },
    byUser,
  });
  return { id: row.id };
}

export async function upsertCompetitorProfile(
  code: string,
  body: {
    brandId: number;
    positioning?: string;
    threatLevel?: "low" | "med" | "high";
    priceIndex?: number;
    strengths?: string;
    weaknesses?: string;
  },
  byUser: string,
) {
  const sbu = await loadSbu(code);
  if (!sbu) return { error: "Not found" as const };
  const [brand] = await db.select().from(schema.brand).where(and(eq(schema.brand.id, body.brandId), eq(schema.brand.sbuId, sbu.id))).limit(1);
  if (!brand) return { error: "Competitor brand not found for this SBU" as const };

  const existing = await db.select().from(schema.competitorProfile).where(eq(schema.competitorProfile.brandId, body.brandId)).limit(1);
  if (existing.length) {
    await db
      .update(schema.competitorProfile)
      .set({
        positioning: body.positioning,
        threatLevel: body.threatLevel ?? existing[0].threatLevel,
        priceIndex: body.priceIndex ?? existing[0].priceIndex,
        strengths: body.strengths,
        weaknesses: body.weaknesses,
        updatedBy: byUser,
        updatedAt: new Date(),
      })
      .where(eq(schema.competitorProfile.brandId, body.brandId));
  } else {
    await db.insert(schema.competitorProfile).values({
      brandId: body.brandId,
      positioning: body.positioning,
      threatLevel: body.threatLevel ?? "med",
      priceIndex: body.priceIndex,
      strengths: body.strengths,
      weaknesses: body.weaknesses,
      updatedBy: byUser,
    });
  }
  await db.insert(schema.auditLog).values({
    entity: "competitor_profile",
    entityId: String(body.brandId),
    action: "upsert",
    before: null,
    after: { sbu: code, threatLevel: body.threatLevel },
    byUser,
  });
  return { ok: true };
}
