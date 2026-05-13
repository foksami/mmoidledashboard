import { db } from "./db";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import {
  characters,
  characterSnapshots,
  skillSnapshots,
  statSnapshots,
  actionLog,
} from "./schema";

export type Character = typeof characters.$inferSelect;
export type CharacterSnapshot = typeof characterSnapshots.$inferSelect;
export type SkillSnapshot = typeof skillSnapshots.$inferSelect;
export type ActionEntry = typeof actionLog.$inferSelect;

export async function getAllCharacters(): Promise<Character[]> {
  return db.select().from(characters).all();
}

export async function getPrimaryCharacter(): Promise<Character | null> {
  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.isPrimary, true))
    .limit(1);
  return rows[0] ?? (await db.select().from(characters).limit(1))[0] ?? null;
}

export async function getCharacterByHashedId(hashedId: string): Promise<Character | null> {
  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.hashedId, hashedId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatestSnapshot(hashedId: string): Promise<CharacterSnapshot | null> {
  const rows = await db
    .select()
    .from(characterSnapshots)
    .where(eq(characterSnapshots.hashedId, hashedId))
    .orderBy(desc(characterSnapshots.takenAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatestSkills(hashedId: string): Promise<SkillSnapshot[]> {
  // Get the most recent snapshot time for this character
  const latest = await db
    .select({ takenAt: characterSnapshots.takenAt })
    .from(characterSnapshots)
    .where(eq(characterSnapshots.hashedId, hashedId))
    .orderBy(desc(characterSnapshots.takenAt))
    .limit(1);

  if (!latest[0]) return [];

  return db
    .select()
    .from(skillSnapshots)
    .where(
      and(
        eq(skillSnapshots.hashedId, hashedId),
        eq(skillSnapshots.takenAt, latest[0].takenAt)
      )
    )
    .all();
}

export async function getLatestStats(hashedId: string): Promise<typeof statSnapshots.$inferSelect[]> {
  const latest = await db
    .select({ takenAt: characterSnapshots.takenAt })
    .from(characterSnapshots)
    .where(eq(characterSnapshots.hashedId, hashedId))
    .orderBy(desc(characterSnapshots.takenAt))
    .limit(1);

  if (!latest[0]) return [];

  return db
    .select()
    .from(statSnapshots)
    .where(
      and(
        eq(statSnapshots.hashedId, hashedId),
        eq(statSnapshots.takenAt, latest[0].takenAt)
      )
    )
    .all();
}

export async function getLatestAction(hashedId: string): Promise<ActionEntry | null> {
  const rows = await db
    .select()
    .from(actionLog)
    .where(eq(actionLog.hashedId, hashedId))
    .orderBy(desc(actionLog.detectedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Last N gold values for sparkline (most recent last) */
export async function getGoldHistory(hashedId: string, points = 60): Promise<number[]> {
  const rows = await db
    .select({ gold: characterSnapshots.gold })
    .from(characterSnapshots)
    .where(eq(characterSnapshots.hashedId, hashedId))
    .orderBy(desc(characterSnapshots.takenAt))
    .limit(points);
  return rows.map((r) => r.gold ?? 0).reverse();
}

/** Total XP over time for sparkline (sum of all skill XP per snapshot) */
export async function getTotalXpHistory(hashedId: string, points = 60): Promise<number[]> {
  // Get last N snapshot timestamps
  const timestamps = await db
    .select({ takenAt: characterSnapshots.takenAt })
    .from(characterSnapshots)
    .where(eq(characterSnapshots.hashedId, hashedId))
    .orderBy(desc(characterSnapshots.takenAt))
    .limit(points);

  if (timestamps.length === 0) return [];

  const results: number[] = [];
  for (const { takenAt } of timestamps.reverse()) {
    const row = await db
      .select({ total: sql<number>`sum(${skillSnapshots.experience})` })
      .from(skillSnapshots)
      .where(
        and(
          eq(skillSnapshots.hashedId, hashedId),
          eq(skillSnapshots.takenAt, takenAt)
        )
      )
      .get();
    results.push(row?.total ?? 0);
  }
  return results;
}

/** XP/h rate for ALL skills, based on last 2 snapshots each. Returns a map skillName → xp/h */
export async function getAllSkillRates(hashedId: string): Promise<Map<string, number>> {
  // Get last 2 distinct snapshot times
  const times = await db
    .selectDistinct({ takenAt: skillSnapshots.takenAt })
    .from(skillSnapshots)
    .where(eq(skillSnapshots.hashedId, hashedId))
    .orderBy(desc(skillSnapshots.takenAt))
    .limit(2);

  const rates = new Map<string, number>();
  if (times.length < 2) return rates;

  const [newerTime, olderTime] = times;
  const tDeltaH =
    (new Date(newerTime.takenAt).getTime() - new Date(olderTime.takenAt).getTime()) / 3_600_000;
  if (tDeltaH <= 0) return rates;

  const [newerRows, olderRows] = await Promise.all([
    db.select().from(skillSnapshots).where(
      and(eq(skillSnapshots.hashedId, hashedId), eq(skillSnapshots.takenAt, newerTime.takenAt))
    ),
    db.select().from(skillSnapshots).where(
      and(eq(skillSnapshots.hashedId, hashedId), eq(skillSnapshots.takenAt, olderTime.takenAt))
    ),
  ]);

  const olderMap = new Map(olderRows.map((r) => [r.skillName, r.experience ?? 0]));
  for (const row of newerRows) {
    const name = row.skillName ?? "";
    const delta = (row.experience ?? 0) - (olderMap.get(name) ?? 0);
    if (delta > 0) rates.set(name, Math.round(delta / tDeltaH));
  }
  return rates;
}

/** XP/h rate for a skill based on last 2 snapshots */
export async function getSkillXpRate(hashedId: string, skillName: string): Promise<number> {
  const rows = await db
    .select()
    .from(skillSnapshots)
    .where(
      and(
        eq(skillSnapshots.hashedId, hashedId),
        eq(skillSnapshots.skillName, skillName)
      )
    )
    .orderBy(desc(skillSnapshots.takenAt))
    .limit(2);

  if (rows.length < 2) return 0;

  const [newer, older] = rows;
  const xpDelta = (newer.experience ?? 0) - (older.experience ?? 0);
  if (xpDelta <= 0) return 0;

  const tDelta =
    (new Date(newer.takenAt).getTime() - new Date(older.takenAt).getTime()) / 3_600_000;
  if (tDelta <= 0) return 0;

  return Math.round(xpDelta / tDelta);
}
