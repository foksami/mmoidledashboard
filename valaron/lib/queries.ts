import { db } from "./db";
import { desc, asc, eq, and, gte, isNotNull, isNull, sql } from "drizzle-orm";
import {
  characters,
  characterSnapshots,
  skillSnapshots,
  statSnapshots,
  actionLog,
  activitySessions,
  itemsCatalog,
  marketSnapshots,
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

export async function getCharacterByName(name: string): Promise<Character | null> {
  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.name, name))
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

// ── BIS (Best in Slot) ────────────────────────────────────────────────────────

export const QUALITY_RANK: Record<string, number> = {
  STANDARD: 1,
  REFINED: 2,
  PREMIUM: 3,
  EPIC: 4,
  LEGENDARY: 5,
  MYTHIC: 6,
}

// Weapon and shield slots by class
const CLASS_SLOTS: Record<string, string[]> = {
  RANGER: ["BOW", "DAGGER", "SHIELD"],
  WARRIOR: ["SWORD", "SHIELD"],
  MAGE: ["SWORD", "SHIELD"], // extend when mage weapon confirmed
}

const ARMOR_SLOTS = ["HELMET", "CHESTPLATE", "GAUNTLETS", "BOOTS"] as const

// Stats to prefer when ranking items of equal quality, per class
export const CLASS_STAT_PRIORITY: Record<string, string[]> = {
  RANGER: ["accuracy", "agility", "attack_power"],
  WARRIOR: ["attack_power", "protection", "accuracy"],
  MAGE: ["attack_power", "accuracy"],
}

export interface BISItem {
  hashedId: string
  name: string
  quality: string
  stats: Record<string, number>
  requirements: Record<string, number>
  marketPrice: number | null
  imageUrl: string | null
}

export interface BISSlot {
  slotType: string
  equipped: BISItem | null
  nextTier: BISItem | null
  /** all requirements for nextTier with actual current values */
  requirements: Record<string, { current: number; required: number }>
  /** subset of requirements where current < required */
  missing: Record<string, { current: number; required: number }>
  totalGap: number
}

export function classScore(stats: Record<string, number>, priority: string[]): number {
  return priority.reduce((sum, stat, i) => sum + (stats[stat] ?? 0) * (priority.length - i), 0)
}

export async function getBISEquipment(
  skills: SkillSnapshot[],
  stats: (typeof statSnapshots.$inferSelect)[],
  characterClass: string | null | undefined
): Promise<BISSlot[]> {
  const [allCatalogItems, allMarketRows] = await Promise.all([
    db.select().from(itemsCatalog).all(),
    db.select({
      itemHashedId: marketSnapshots.itemHashedId,
      latestPrice: marketSnapshots.latestPrice,
      takenAt: marketSnapshots.takenAt,
    }).from(marketSnapshots).all(),
  ])
  if (allCatalogItems.length === 0) return []

  // Latest market price per item (most recent snapshot wins)
  const marketPriceMap = new Map<string, number | null>()
  for (const row of allMarketRows) {
    const existing = marketPriceMap.get(row.itemHashedId)
    if (existing === undefined) marketPriceMap.set(row.itemHashedId, row.latestPrice ?? null)
  }

  // Build level map: lowercase skill/stat name → level
  const levels = new Map<string, number>()
  for (const s of skills) {
    if (s.skillName && s.level != null) levels.set(s.skillName.toLowerCase(), s.level)
  }
  for (const s of stats) {
    if (s.statName && s.level != null) levels.set(s.statName.toLowerCase(), s.level)
  }

  const cls = characterClass?.toUpperCase() ?? ""
  const weaponSlots = CLASS_SLOTS[cls] ?? ["SWORD", "BOW", "DAGGER", "SHIELD"]
  const allSlots = [...ARMOR_SLOTS, ...weaponSlots]
  const statPriority = CLASS_STAT_PRIORITY[cls] ?? []

  function canEquip(req: Record<string, number>): boolean {
    return Object.entries(req).every(([skill, required]) => (levels.get(skill.toLowerCase()) ?? 0) >= required)
  }

  function rankItem(item: { quality: string; stats: Record<string, number> }): [number, number] {
    return [QUALITY_RANK[item.quality] ?? 0, classScore(item.stats, statPriority)]
  }

  const result: BISSlot[] = []

  for (const slot of allSlots) {
    const slotItems = allCatalogItems
      .filter((i) => i.type === slot)
      .map((i) => ({
        hashedId: i.hashedId,
        name: i.name ?? "",
        quality: i.quality ?? "",
        stats: i.stats ? (JSON.parse(i.stats) as Record<string, number>) : {},
        requirements: i.requirements ? (JSON.parse(i.requirements) as Record<string, number>) : {},
        marketPrice: marketPriceMap.get(i.hashedId) ?? null,
        imageUrl: i.imageUrl ?? null,
      }))
      .sort((a, b) => {
        const [qA, sA] = rankItem(a)
        const [qB, sB] = rankItem(b)
        return qB !== qA ? qB - qA : sB - sA
      })

    if (slotItems.length === 0) continue

    const equippable = slotItems.filter((i) => canEquip(i.requirements))
    const equipped = equippable[0] ?? null
    const equippedRank = equipped ? (QUALITY_RANK[equipped.quality] ?? 0) : 0

    // Next tier: lowest quality item above current BIS that can't be equipped (closest to unlocking)
    const nextTier =
      slotItems
        .filter((i) => !canEquip(i.requirements) && (QUALITY_RANK[i.quality] ?? 0) > equippedRank)
        .sort((a, b) => {
          const [qA, sA] = rankItem(a)
          const [qB, sB] = rankItem(b)
          return qA !== qB ? qA - qB : sB - sA // lowest quality first, best class score within tier
        })[0] ?? null

    const requirements: Record<string, { current: number; required: number }> = {}
    const missing: Record<string, { current: number; required: number }> = {}
    if (nextTier) {
      for (const [skill, required] of Object.entries(nextTier.requirements)) {
        const current = levels.get(skill.toLowerCase()) ?? 0
        requirements[skill] = { current, required }
        if (current < required) missing[skill] = { current, required }
      }
    }

    // Proximity: total gap across all missing requirements (lower = closer to equipping)
    const totalGap = Object.values(missing).reduce((sum, { current, required }) => sum + (required - current), 0)
    result.push({ slotType: slot, equipped, nextTier, requirements, missing, totalGap })
  }

  // Sort: slots with an upgrade path first (by totalGap asc), then fully-capped / no-upgrade slots
  result.sort((a, b) => {
    const aHas = a.nextTier !== null
    const bHas = b.nextTier !== null
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    return a.totalGap - b.totalGap
  })

  return result
}

// ── Daily delta ───────────────────────────────────────────────────────────────

export interface SkillGain {
  skill: string
  xpDelta: number
  levelDelta: number
}

export interface DailyDelta {
  goldDelta: number
  levelDelta: number
  xpGains: SkillGain[]
  fromTime: string
  toTime: string
}

export async function getDailyDelta(hashedId: string): Promise<DailyDelta | null> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [snapOldRows, snapNowRows] = await Promise.all([
    db.select().from(characterSnapshots)
      .where(and(eq(characterSnapshots.hashedId, hashedId), gte(characterSnapshots.takenAt, cutoff)))
      .orderBy(asc(characterSnapshots.takenAt))
      .limit(1),
    db.select().from(characterSnapshots)
      .where(eq(characterSnapshots.hashedId, hashedId))
      .orderBy(desc(characterSnapshots.takenAt))
      .limit(1),
  ])

  const snapOld = snapOldRows[0]
  const snapNow = snapNowRows[0]
  if (!snapOld || !snapNow || snapOld.takenAt === snapNow.takenAt) return null

  const [skillsOld, skillsNow] = await Promise.all([
    db.select().from(skillSnapshots).where(and(eq(skillSnapshots.hashedId, hashedId), eq(skillSnapshots.takenAt, snapOld.takenAt))),
    db.select().from(skillSnapshots).where(and(eq(skillSnapshots.hashedId, hashedId), eq(skillSnapshots.takenAt, snapNow.takenAt))),
  ])

  const oldMap = new Map(skillsOld.map((s) => [s.skillName, s]))
  const xpGains: SkillGain[] = []
  for (const s of skillsNow) {
    const old = oldMap.get(s.skillName)
    if (!old) continue
    const xpDelta = (s.experience ?? 0) - (old.experience ?? 0)
    if (xpDelta <= 0) continue
    xpGains.push({ skill: s.skillName ?? "", xpDelta, levelDelta: (s.level ?? 0) - (old.level ?? 0) })
  }
  xpGains.sort((a, b) => b.xpDelta - a.xpDelta)

  return {
    goldDelta: (snapNow.gold ?? 0) - (snapOld.gold ?? 0),
    levelDelta: (snapNow.totalLevel ?? 0) - (snapOld.totalLevel ?? 0),
    xpGains,
    fromTime: snapOld.takenAt,
    toTime: snapNow.takenAt,
  }
}

// ── Activity efficiency ───────────────────────────────────────────────────────

export interface ActivityEfficiency {
  actionType: string
  sessions: number
  totalHours: number
  goldPerHour: number
  xpPerHour: Record<string, number>
}

export async function getActivityEfficiency(
  hashedId: string,
  limitDays = 7
): Promise<ActivityEfficiency[]> {
  const cutoff = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString()

  const sessions = await db
    .select()
    .from(activitySessions)
    .where(
      and(
        eq(activitySessions.hashedId, hashedId),
        isNotNull(activitySessions.endedAt),
        isNotNull(activitySessions.durationSec),
        gte(activitySessions.startedAt, cutoff)
      )
    )

  const byType = new Map<string, { sessions: number; totalSec: number; goldTotal: number; xpTotal: Map<string, number> }>()

  for (const s of sessions) {
    if (!s.durationSec || s.durationSec < 120) continue
    const goldDelta = Math.max(0, (s.goldEnd ?? 0) - (s.goldStart ?? 0))

    const entry = byType.get(s.actionType) ?? { sessions: 0, totalSec: 0, goldTotal: 0, xpTotal: new Map() }
    entry.sessions++
    entry.totalSec += s.durationSec
    entry.goldTotal += goldDelta

    if (s.xpSnapStart && s.xpSnapEnd) {
      const xpStart = JSON.parse(s.xpSnapStart) as Record<string, number>
      const xpEnd = JSON.parse(s.xpSnapEnd) as Record<string, number>
      for (const [skill, endXp] of Object.entries(xpEnd)) {
        const delta = endXp - (xpStart[skill] ?? 0)
        if (delta > 0) entry.xpTotal.set(skill, (entry.xpTotal.get(skill) ?? 0) + delta)
      }
    }

    byType.set(s.actionType, entry)
  }

  return Array.from(byType.entries())
    .map(([actionType, data]) => {
      const hours = data.totalSec / 3600
      return {
        actionType,
        sessions: data.sessions,
        totalHours: Math.round(hours * 10) / 10,
        goldPerHour: hours > 0 ? Math.round(data.goldTotal / hours) : 0,
        xpPerHour: Object.fromEntries(
          Array.from(data.xpTotal.entries()).map(([skill, xp]) => [skill, Math.round(xp / hours)])
        ),
      }
    })
    .sort((a, b) => b.goldPerHour - a.goldPerHour)
}

// ── Goal tracker ─────────────────────────────────────────────────────────────

import { goals } from "./schema"

export interface GoalProgress {
  id: string
  name: string
  metric: string
  metricArgs: Record<string, string>
  target: number
  current: number
  pct: number
  ratePerHour: number | null
  etaHours: number | null
  deadline: string | null
  completedAt: string | null
}

export async function getGoalsWithProgress(
  hashedId: string,
  skills: SkillSnapshot[],
  stats: (typeof statSnapshots.$inferSelect)[],
  snapshot: CharacterSnapshot | null,
  skillRates: Map<string, number>
): Promise<GoalProgress[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.hashedId, hashedId))

  return rows.map((g) => {
    const args = g.metricArgs ? (JSON.parse(g.metricArgs) as Record<string, string>) : {}
    const target = g.target ?? 0
    let current = 0
    let ratePerHour: number | null = null

    switch (g.metric) {
      case "skill_level": {
        const s = skills.find((sk) => sk.skillName?.toLowerCase() === (args.skill ?? "").toLowerCase())
        current = s?.level ?? 0
        break
      }
      case "skill_xp": {
        const s = skills.find((sk) => sk.skillName?.toLowerCase() === (args.skill ?? "").toLowerCase())
        current = s?.experience ?? 0
        const rate = skillRates.get(s?.skillName ?? "")
        if (rate) ratePerHour = rate
        break
      }
      case "stat_level": {
        const s = stats.find((st) => st.statName?.toLowerCase() === (args.stat ?? "").toLowerCase())
        current = s?.level ?? 0
        break
      }
      case "gold":
        current = snapshot?.gold ?? 0
        break
      case "total_level":
        current = snapshot?.totalLevel ?? 0
        break
    }

    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
    const remaining = Math.max(0, target - current)
    const etaHours = ratePerHour && ratePerHour > 0 ? remaining / ratePerHour : null

    return {
      id: g.id,
      name: g.name ?? "",
      metric: g.metric ?? "",
      metricArgs: args,
      target,
      current,
      pct,
      ratePerHour,
      etaHours,
      deadline: g.deadline ?? null,
      completedAt: g.completedAt ?? null,
    }
  }).sort((a, b) => {
    if (a.completedAt && !b.completedAt) return 1
    if (!a.completedAt && b.completedAt) return -1
    return b.pct - a.pct
  })
}

// ── Gathering market data ─────────────────────────────────────────────────────

import { GATHERING_ITEMS, type GatheringItem } from "./gathering"
import { marketDaily } from "./schema"

export interface MarketTrend {
  /** % change in avg price: last 7d avg vs prior 7d avg. null if insufficient data. */
  priceDelta7d: number | null
  /** % change in volume: last 7d total vs prior 7d total */
  volumeDelta7d: number | null
  /** last 14 days of daily rows, oldest first — for sparkline rendering */
  history14d: Array<{ date: string; avgPrice: number | null; totalSold: number | null }>
}

export type GatheringMarketRow = GatheringItem & {
  avgPrice: number | null
  totalSold: number | null
  marketValue: number | null
  takenAt: string | null
  trend: MarketTrend | null
}

export async function getGatheringMarketData(): Promise<GatheringMarketRow[]> {
  const ids = GATHERING_ITEMS.map((i) => i.hashedId)

  // Pull last 14 days of daily data for all gathering items
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10) // YYYY-MM-DD

  const dailyRows = await db
    .select()
    .from(marketDaily)
    .where(gte(marketDaily.date, cutoff))
    .orderBy(asc(marketDaily.date))
    .all()

  // Group by item
  const byItem = new Map<string, typeof dailyRows>()
  for (const row of dailyRows) {
    if (!ids.includes(row.itemHashedId)) continue
    const bucket = byItem.get(row.itemHashedId) ?? []
    bucket.push(row)
    byItem.set(row.itemHashedId, bucket)
  }

  function computeTrend(rows: typeof dailyRows): MarketTrend | null {
    if (rows.length === 0) return null

    const history14d = rows.map((r) => ({
      date: r.date,
      avgPrice: r.avgPrice ?? null,
      totalSold: r.totalSold ?? null,
    }))

    // Split into recent 7 vs prior 7
    const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
    const recent = sorted.slice(0, 7)
    const prior  = sorted.slice(7, 14)

    function avgPrice(rs: typeof rows) {
      const valid = rs.filter((r) => r.avgPrice != null)
      if (valid.length === 0) return null
      return valid.reduce((s, r) => s + r.avgPrice!, 0) / valid.length
    }
    function sumVol(rs: typeof rows) {
      const valid = rs.filter((r) => r.totalSold != null)
      if (valid.length === 0) return null
      return valid.reduce((s, r) => s + r.totalSold!, 0)
    }

    const recentPrice = avgPrice(recent)
    const priorPrice  = avgPrice(prior)
    const recentVol   = sumVol(recent)
    const priorVol    = sumVol(prior)

    const priceDelta7d =
      recentPrice != null && priorPrice != null && priorPrice > 0
        ? Math.round(((recentPrice - priorPrice) / priorPrice) * 100)
        : null

    const volumeDelta7d =
      recentVol != null && priorVol != null && priorVol > 0
        ? Math.round(((recentVol - priorVol) / priorVol) * 100)
        : null

    return { priceDelta7d, volumeDelta7d, history14d }
  }

  return GATHERING_ITEMS.map((item) => {
    const rows = byItem.get(item.hashedId) ?? []
    const trend = computeTrend(rows)

    // Latest values from most recent daily row
    const latest = [...rows].sort((a, b) => b.date.localeCompare(a.date))[0]
    const avgPrice    = latest?.avgPrice ?? null
    const totalSold   = latest?.totalSold ?? null
    const marketValue = avgPrice != null && totalSold != null ? avgPrice * totalSold : null
    const takenAt     = latest?.date ?? null

    return { ...item, avgPrice, totalSold, marketValue, takenAt, trend }
  }).sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
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
