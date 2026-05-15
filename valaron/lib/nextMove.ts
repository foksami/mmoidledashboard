import { classScore } from "./queries"
import type { BISSlot, BISItem, ActivityEfficiency } from "./queries"

/**
 * Cumulative XP required to reach each level (OSRS formula approximation).
 * Index 0 → level 1 (0 XP), index 1 → level 2 (83 XP), etc.
 * Cumulative XP to reach levels 1–100. Extend if IdleMMO raises the cap.
 */
const XP_TABLE: number[] = [
  0, 83, 174, 276, 388, 512, 650, 801, 969, 1154,
  1358, 1584, 1833, 2107, 2411, 2746, 3115, 3523, 3973, 4470,
  5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 12031, 13363,
  14833, 16456, 18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224,
  41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014, 91721, 101333,
  111945, 123660, 136594, 150872, 166636, 184040, 203254, 224466, 247886, 273742,
  302288, 333804, 368599, 407015, 449428, 496254, 547953, 605032, 668051, 737627,
  814445, 899257, 992895, 1096278, 1210421, 1336443, 1475581, 1629200, 1798808, 1986068,
  2192818, 2421087, 2673114, 2951373, 3258594, 3597792, 3972294, 4385776, 4842295, 5346332,
  5902831, 6517253, 7195629, 7944614, 8771558, 9684577, 10692629, 11805606, 13034431, 14391160,
]

/** Total XP required to reach `level`. Level 1 = 0. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return XP_TABLE[Math.min(level - 1, XP_TABLE.length - 1)]
}

/** XP needed to go from currentLevel to targetLevel (uses level boundaries — slight overestimate if mid-level). */
export function xpToGrind(currentLevel: number, targetLevel: number): number {
  return Math.max(0, xpForLevel(targetLevel) - xpForLevel(currentLevel))
}

/** Format hours into a human-readable string. */
export function formatHours(h: number): string {
  if (h < 1 / 60) return "<1m"
  if (h < 1) return `${Math.round(h * 60)}m`
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`
}

export interface UpgradeRequirement {
  skill: string
  current: number
  required: number
  levelsNeeded: number
  xpNeeded: number
  bestActivityType: string | null  // activity with highest XP/h for this skill
  xpPerHour: number | null         // null = no grind history
  hours: number | null             // null = no grind history
}

export interface UpgradeCandidate {
  slotType: string
  item: BISItem
  statBoost: number                // class-weighted stat sum
  requirements: UpgradeRequirement[]
  totalHours: number | null        // null if any required skill has no history; 0 if unlockable
  score: number                    // statBoost / totalHours; Infinity if unlockable; -1 if no data
  alreadyUnlockable: boolean
}

function bestRateForSkill(
  skill: string,
  activities: ActivityEfficiency[]
): { xpPerHour: number; activityType: string } | null {
  let best: { xpPerHour: number; activityType: string } | null = null
  for (const a of activities) {
    const rate = a.xpPerHour[skill.toLowerCase()] ?? 0
    if (rate > 0 && (!best || rate > best.xpPerHour)) {
      best = { xpPerHour: rate, activityType: a.actionType }
    }
  }
  return best
}

export function rankUpgrades(
  slots: BISSlot[],
  activities: ActivityEfficiency[],
  statPriority: string[]
): UpgradeCandidate[] {
  const candidates: UpgradeCandidate[] = []

  for (const slot of slots) {
    if (!slot.nextTier) continue

    const item = slot.nextTier
    const statBoost = classScore(item.stats, statPriority)
    const alreadyUnlockable = Object.keys(slot.missing).length === 0

    const requirements: UpgradeRequirement[] = Object.entries(slot.missing).map(
      ([skill, { current, required }]) => {
        const levelsNeeded = required - current
        const xpNeeded = xpToGrind(current, required)
        const rate = bestRateForSkill(skill, activities)
        const hours = rate ? xpNeeded / rate.xpPerHour : null
        return {
          skill,
          current,
          required,
          levelsNeeded,
          xpNeeded,
          bestActivityType: rate?.activityType ?? null,
          xpPerHour: rate?.xpPerHour ?? null,
          hours,
        }
      }
    )

    const hasAllRates = requirements.every((r) => r.hours !== null)
    const totalHours = alreadyUnlockable
      ? 0
      : hasAllRates
      ? requirements.reduce((sum, r) => sum + (r.hours ?? 0), 0)
      : null

    const score = alreadyUnlockable
      ? Infinity
      : totalHours === null
      ? -1
      : totalHours === 0
      ? Infinity
      : statBoost / totalHours

    candidates.push({
      slotType: slot.slotType,
      item,
      statBoost,
      requirements,
      totalHours,
      score,
      alreadyUnlockable,
    })
  }

  return candidates.sort((a, b) => {
    // 1. Ready to equip first
    if (a.alreadyUnlockable && !b.alreadyUnlockable) return -1
    if (!a.alreadyUnlockable && b.alreadyUnlockable) return 1
    // 2. Sort by score desc
    if (b.score !== a.score) return b.score - a.score
    // 3. No-history items last, sorted by total gap asc
    const aGap = a.requirements.reduce((s, r) => s + r.levelsNeeded, 0)
    const bGap = b.requirements.reduce((s, r) => s + r.levelsNeeded, 0)
    return aGap - bGap
  })
}
