# Next Move Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Next Move" dashboard panel that ranks pending gear upgrades by weighted stat gain per hour of grind time, with per-skill activity suggestions.

**Architecture:** Pure calculation functions in `lib/nextMove.ts` (XP curve + ranking), a server component `components/NextMovePanel.tsx` for display, and minimal wiring in `app/page.tsx` using already-fetched `bisSlots` + `activityEfficiency` data — no extra DB calls.

**Tech Stack:** TypeScript, React 19 (RSC), Tailwind CSS v4, existing `BISSlot`/`ActivityEfficiency` types from `lib/queries.ts`.

---

### Task 1: Pure calculation module `lib/nextMove.ts`

**Files:**
- Create: `lib/nextMove.ts`

This module contains only pure functions and types — no DB access. It is the heart of the feature.

- [ ] **Step 1: Create `lib/nextMove.ts` with XP table and helper functions**

```typescript
// lib/nextMove.ts
import type { BISSlot, BISItem } from "./queries"
import type { ActivityEfficiency } from "./queries"

/**
 * Cumulative XP required to reach each level (OSRS formula).
 * Index 0 → level 1 (0 XP), index 1 → level 2 (83 XP), etc.
 * NOTE: IdleMMO may differ slightly; replace with actual table if known.
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

/** XP needed to go from currentLevel to targetLevel (level boundaries only, slight overestimate). */
export function xpToGrind(currentLevel: number, targetLevel: number): number {
  return Math.max(0, xpForLevel(targetLevel) - xpForLevel(currentLevel))
}

/** Weighted stat score — higher-priority stats count more. */
export function classScore(stats: Record<string, number>, priority: string[]): number {
  return priority.reduce((sum, stat, i) => sum + (stats[stat] ?? 0) * (priority.length - i), 0)
}

export interface UpgradeRequirement {
  skill: string
  current: number
  required: number
  levelsNeeded: number
  xpToGrind: number
  bestActivityType: string | null  // activity with highest XP/h for this skill
  xpPerHour: number | null         // null = no grind history
  hours: number | null             // null = no grind history
}

export interface UpgradeCandidate {
  slotType: string
  item: BISItem
  statBoost: number                // class-weighted stat sum
  requirements: UpgradeRequirement[]
  totalHours: number | null        // null if any required skill has no history
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
          xpToGrind: xpNeeded,
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
      : totalHours != null && totalHours > 0
      ? statBoost / totalHours
      : -1

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
    // 2. Sort by score desc (higher pts/h = better)
    if (b.score !== a.score) return b.score - a.score
    // 3. No-history items last, sorted by total gap asc
    const aGap = a.requirements.reduce((s, r) => s + r.levelsNeeded, 0)
    const bGap = b.requirements.reduce((s, r) => s + r.levelsNeeded, 0)
    return aGap - bGap
  })
}
```

- [ ] **Step 2: Export `CLASS_STAT_PRIORITY` from `lib/queries.ts`**

Find the line in `lib/queries.ts` that reads:
```typescript
const CLASS_STAT_PRIORITY: Record<string, string[]> = {
```
Change `const` to `export const`:
```typescript
export const CLASS_STAT_PRIORITY: Record<string, string[]> = {
  RANGER: ["accuracy", "agility", "attack_power"],
  WARRIOR: ["attack_power", "protection", "accuracy"],
  MAGE: ["attack_power", "accuracy"],
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/michalfoksa/Desktop/idlerpg/valaron && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/michalfoksa/Desktop/idlerpg/valaron
git add lib/nextMove.ts lib/queries.ts
git commit -m "feat: add nextMove ranking logic and export CLASS_STAT_PRIORITY"
```

---

### Task 2: `components/NextMovePanel.tsx`

**Files:**
- Create: `components/NextMovePanel.tsx`

Server component. Receives `UpgradeCandidate[]` and renders the ranked list.

- [ ] **Step 1: Create `components/NextMovePanel.tsx`**

```tsx
// components/NextMovePanel.tsx
import React from "react"
import type { UpgradeCandidate, UpgradeRequirement } from "@/lib/nextMove"
import { fmtNum } from "@/lib/fmt"

const SLOT_LABEL: Record<string, string> = {
  HELMET: "Helmet", CHESTPLATE: "Chest", GAUNTLETS: "Gauntlets",
  BOOTS: "Boots", SWORD: "Sword", BOW: "Bow", DAGGER: "Dagger", SHIELD: "Shield",
}

const QUALITY_COLOR: Record<string, string> = {
  STANDARD:  "text-[var(--color-text-muted)]",
  REFINED:   "text-green-400",
  PREMIUM:   "text-[var(--color-blue)]",
  EPIC:      "text-[var(--color-purple)]",
  LEGENDARY: "text-[var(--color-gold)]",
  MYTHIC:    "text-pink-400",
}

function formatHours(h: number): string {
  if (h < 1 / 60) return "<1m"
  if (h < 1) return `${Math.round(h * 60)}m`
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`
}

function ScoreBadge({ score, unlockable }: { score: number; unlockable: boolean }) {
  if (unlockable) {
    return (
      <span className="text-[10px] font-semibold text-[var(--color-green)] bg-[var(--color-green)]/10 px-1.5 py-0.5 rounded border border-[var(--color-green)]/30 flex-shrink-0">
        ✓ ready
      </span>
    )
  }
  if (score === -1) {
    return (
      <span className="text-[10px] text-[var(--color-text-dim)] flex-shrink-0">no data</span>
    )
  }
  return (
    <span
      className="text-[10px] font-semibold text-[var(--color-gold)] flex-shrink-0"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {score.toFixed(1)} pts/h
    </span>
  )
}

function ReqRow({ req }: { req: UpgradeRequirement }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="text-[10px] capitalize text-[var(--color-text-secondary)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {req.skill} {req.current}→{req.required}
      </span>
      <span className="text-[10px] text-[var(--color-text-dim)]">
        · {req.levelsNeeded} lvl
      </span>
      {req.hours != null ? (
        <>
          <span className="text-[10px] text-[var(--color-text-dim)]">· {formatHours(req.hours)}</span>
          {req.bestActivityType && (
            <span className="text-[10px] text-[var(--color-blue)]">
              via {req.bestActivityType.toLowerCase()}
            </span>
          )}
        </>
      ) : (
        <span className="text-[10px] text-[var(--color-text-dim)] italic">· no grind history</span>
      )}
    </div>
  )
}

function CandidateRow({ c }: { c: UpgradeCandidate }) {
  const qColor = QUALITY_COLOR[c.item.quality] ?? QUALITY_COLOR.STANDARD

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-[var(--color-border-subtle)] last:border-b-0 last:pb-0 first:pt-0">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${qColor}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {c.item.quality}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
              {SLOT_LABEL[c.slotType] ?? c.slotType}
            </span>
          </div>
          <span className="text-xs font-medium text-[var(--color-text-primary)] leading-tight">
            {c.item.name}
          </span>
        </div>
        <ScoreBadge score={c.score} unlockable={c.alreadyUnlockable} />
      </div>

      {/* Stat boost */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] text-[var(--color-text-dim)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          weighted boost{" "}
          <span className="text-[var(--color-text-secondary)]">+{c.statBoost}</span>
        </span>
        {c.totalHours != null && !c.alreadyUnlockable && (
          <span
            className="text-[10px] text-[var(--color-text-dim)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            · {formatHours(c.totalHours)} total
          </span>
        )}
      </div>

      {/* Requirements */}
      {c.requirements.length > 0 && (
        <div className="flex flex-col gap-1 pl-1 border-l border-[var(--color-border-subtle)]">
          {c.requirements.map((r) => (
            <ReqRow key={r.skill} req={r} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Compact single-line summary for collapsed panel state */
export function NextMoveCollapsed({ candidates }: { candidates: UpgradeCandidate[] }) {
  const top = candidates[0]
  if (!top) return <span className="text-xs text-[var(--color-text-dim)]">No upgrades pending</span>
  if (top.alreadyUnlockable) {
    return (
      <span className="text-xs text-[var(--color-green)]">
        ✓ {top.item.name} ready to equip
      </span>
    )
  }
  const label = top.totalHours != null ? `${formatHours(top.totalHours)}` : `${top.requirements.reduce((s, r) => s + r.levelsNeeded, 0)} lvls`
  return (
    <span className="text-xs text-[var(--color-text-dim)]">
      Next: <span className="text-[var(--color-text-secondary)]">{top.item.name}</span> · {label}
    </span>
  )
}

export function NextMovePanel({ candidates }: { candidates: UpgradeCandidate[] }) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No pending upgrades. Either all slots are maxed or BIS catalog is empty.
      </p>
    )
  }

  const top5 = candidates.slice(0, 5)

  return (
    <div className="flex flex-col">
      {top5.map((c) => (
        <CandidateRow key={`${c.slotType}-${c.item.hashedId}`} c={c} />
      ))}
      {candidates.length > 5 && (
        <p className="text-[10px] text-[var(--color-text-dim)] pt-2">
          +{candidates.length - 5} more upgrades not shown
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michalfoksa/Desktop/idlerpg/valaron && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/michalfoksa/Desktop/idlerpg/valaron
git add components/NextMovePanel.tsx
git commit -m "feat: add NextMovePanel component"
```

---

### Task 3: Wire up in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

Three changes: (1) import new items, (2) compute ranking after the parallel fetch block, (3) add the panel to `leftPanels`.

- [ ] **Step 1: Add imports at the top of `app/page.tsx`**

Find the existing import block and add:

```typescript
// after: import { GoalTrackerPanel } from "@/components/GoalTrackerPanel"
import { NextMovePanel, NextMoveCollapsed } from "@/components/NextMovePanel"
// after: import { fmtNum } from "@/lib/fmt"
import { rankUpgrades } from "@/lib/nextMove"
import { CLASS_STAT_PRIORITY } from "@/lib/queries"
```

- [ ] **Step 2: Compute the ranking after the parallel fetch block**

Find this block in `app/page.tsx` (around line 177):
```typescript
  const [bisSlots, dailyDelta, activityEfficiency, goalProgress] = await Promise.all([
    getBISEquipment(skills, stats, activeCharacter.class),
    getDailyDelta(hashedId),
    getActivityEfficiency(hashedId),
    getGoalsWithProgress(hashedId, skills, stats, snapshot, skillRates),
  ])
```

Add directly after it (no new DB calls):
```typescript
  // Next Move ranking — pure computation, no DB, uses already-fetched data
  const cls = activeCharacter.class?.toUpperCase() ?? ""
  const nextMoveCandidates = rankUpgrades(
    bisSlots,
    activityEfficiency,
    CLASS_STAT_PRIORITY[cls] ?? []
  )
```

- [ ] **Step 3: Add the panel to `leftPanels`**

Find the `leftPanels` array (around line 342) and add a new entry after the BIS panel entry:

```typescript
// existing BIS entry:
{
  id: "bis",
  title: "Best in Slot",
  icon: "⚔️",
  badge: bisSlots.length > 0 ? `${bisSlots.length} slots` : undefined,
  badgeColor: "text-[var(--color-text-muted)]",
  content: <BISPanel slots={bisSlots} />,
},
// ADD after:
{
  id: "next-move",
  title: "Next Move",
  icon: "🎯",
  badge: nextMoveCandidates[0]?.alreadyUnlockable
    ? "ready"
    : nextMoveCandidates[0]?.totalHours != null
    ? formatHours(nextMoveCandidates[0].totalHours)
    : undefined,
  badgeColor: nextMoveCandidates[0]?.alreadyUnlockable
    ? "text-[var(--color-green)]"
    : "text-[var(--color-text-muted)]",
  content: <NextMovePanel candidates={nextMoveCandidates} />,
  collapsedContent: <NextMoveCollapsed candidates={nextMoveCandidates} />,
},
```

Note: `formatHours` is already defined in `NextMovePanel.tsx` but is not exported. Either:
- Export it from `lib/nextMove.ts` (preferred — it's a formatting utility)
- Or duplicate the logic inline in `page.tsx`

**Preferred:** Add this export to `lib/nextMove.ts` (add to Step 1 of Task 1 if not already there, or add now):

```typescript
// lib/nextMove.ts — add this export
export function formatHours(h: number): string {
  if (h < 1 / 60) return "<1m"
  if (h < 1) return `${Math.round(h * 60)}m`
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`
}
```

Then in `NextMovePanel.tsx`, import it:
```typescript
import { fmtNum } from "@/lib/fmt"
import { formatHours } from "@/lib/nextMove"
// remove the local formatHours function definition
```

And in `app/page.tsx`:
```typescript
import { rankUpgrades, formatHours } from "@/lib/nextMove"
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/michalfoksa/Desktop/idlerpg/valaron && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify visually**

```bash
cd /Users/michalfoksa/Desktop/idlerpg/valaron && npm run dev
```

Open `http://localhost:3000`. Check:
1. "Next Move" panel appears in left column below BIS
2. Items are sorted — "ready to equip" items (green badge) appear first
3. Items with grind history show hours and activity type (e.g. "via mining")
4. Items without history show "no grind history"
5. Badge in collapsed panel header shows time or "ready"
6. Collapsed panel shows `NextMoveCollapsed` summary line

- [ ] **Step 6: Commit**

```bash
cd /Users/michalfoksa/Desktop/idlerpg/valaron
git add app/page.tsx lib/nextMove.ts components/NextMovePanel.tsx
git commit -m "feat: wire up Next Move panel in dashboard"
```
