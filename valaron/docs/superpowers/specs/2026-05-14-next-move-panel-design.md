# Next Move Panel — Design Spec

**Date:** 2026-05-14  
**Status:** Approved

## Overview

A new "Next Move" dashboard panel that ranks pending gear upgrades by **weighted stat gain per hour of grind time**. Tells the player which upgrade to chase next and which activity to run for it.

## Problem

The existing BIS panel shows what's upgradeable and what's missing, but it doesn't tell you *in which order* to pursue upgrades. The optimal order is not sorted by gold cost or stat delta alone — it's sorted by how much effective stat gain you get per hour of real grind time. A cheap unlock that requires 3 levels of a fast skill beats an expensive unlock that requires 18 levels of a slow skill.

## Data Sources

| Source | Data |
|--------|------|
| `getBISEquipment()` | Pending upgrades, per-slot missing requirements (skill → {current, required}) |
| `getActivityEfficiency()` | `xpPerHour` per skill per activity type (last 7 days of sessions) |
| XP curve (hardcoded) | XP needed per level for IdleMMO's progression formula |
| `CLASS_STAT_PRIORITY` (existing) | Per-class stat weights for scoring items |

## Ranking Formula

For each pending upgrade (slot → nextTier item):

```
statBoost     = classScore(item.stats, CLASS_STAT_PRIORITY[class])
levelsNeeded  = { skill: required - current }  (only missing ones)
xpToGrind     = sum of xp_per_level for each missing level (from XP curve)
xpRateForSkill = best xpPerHour observed for that skill across all activity types
hoursForSkill  = xpToGrind / xpRateForSkill    (null if no history)
totalHours     = sum(hoursForSkill) across all missing skills
score          = statBoost / totalHours         (higher = more efficient)
```

Special cases:
- **Already unlockable** (no missing reqs): `score = Infinity`, shown at top with "ready to equip" badge
- **No XP history** for a required skill: `hoursForSkill = null`, row shows level gap only with "no grind data" disclaimer
- **No pending upgrades**: panel shows "all slots maxed" message

## XP Curve

IdleMMO uses a known progression table (levels 1–100). Hardcode as a `XP_TABLE: number[]` array in `lib/nextMove.ts`. The value at index `i` is the total cumulative XP needed to reach level `i+1`. XP to go from level L to L+1 = `XP_TABLE[L] - XP_TABLE[L-1]`.

If the exact IdleMMO table is unavailable at implementation time, use the OSRS formula as a close approximation:
```
xp_for_level(n) = floor(sum_{i=1}^{n-1} floor(i + 300 * 2^(i/7)) / 4)
```

## New Code

### `lib/nextMove.ts` (pure functions, no DB)

```ts
export interface UpgradeCandidate {
  slotType: string
  item: BISItem
  statBoost: number
  requirements: {
    skill: string
    levelsNeeded: number
    xpToGrind: number
    xpPerHour: number | null    // null = no history
    hours: number | null
  }[]
  totalHours: number | null
  score: number                  // Infinity if already unlockable
  alreadyUnlockable: boolean
}

export function rankUpgrades(
  slots: BISSlot[],
  xpRates: Map<string, number>,   // skill → best xp/h across activities
  statPriority: string[]
): UpgradeCandidate[]
```

### `lib/queries.ts` additions

```ts
export async function getNextMoveRanking(
  hashedId: string,
  skills: SkillSnapshot[],
  stats: StatSnapshot[],
  characterClass: string
): Promise<UpgradeCandidate[]>
```

Calls `getBISEquipment()` + `getActivityEfficiency()`, aggregates xp/h per skill (best across activity types), then calls `rankUpgrades()`.

### `components/NextMovePanel.tsx`

Server component. Props: `candidates: UpgradeCandidate[]`.

**Layout:**

```
[panel header: "Next Move"]

[row per candidate, sorted by score desc:]
  [quality badge] [slot label]  [item name]     [score: X.X pts/h]
  Weighted boost: +42
  STR 12→15 · 3 lvl · 4.2h   DEX 8→9 · 1 lvl · 1.1h   = 5.3h total
  → Best activity: MINING (STR: 12,400 xp/h)

[if alreadyUnlockable:]
  ✓ ready to equip — no grind needed

[bottom: activity summary]
  "Focus on: MINING — unlocks 2 upgrades"
```

Shows top 5 candidates. Items with `score = Infinity` (ready to equip) always shown first.

### `app/page.tsx`

Add `getNextMoveRanking()` call alongside existing data fetches. Pass result to new `NextMovePanel` as a right-column panel.

## What We Don't Build

- No interactive filters or sorting controls (YAGNI — static ranked list is enough)
- No "time to unlock" progress tracking over time (that's a goal tracker job)
- No multi-character comparison
- No recalculation on skill XP/h changes in real-time (page refresh is sufficient)

## Success Criteria

1. Panel shows ranked list of pending upgrades with score visible
2. Each row shows: item name, quality, slot, stat boost, per-skill grind breakdown, total hours
3. "Ready to equip" items appear at top
4. Activity suggestion per top upgrade is correct (matches highest xp/h for the bottleneck skill)
5. Rows with no XP history degrade gracefully (show level gap, skip hours/score)
