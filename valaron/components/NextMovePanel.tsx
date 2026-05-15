// components/NextMovePanel.tsx
import React from "react"
import type { UpgradeCandidate, UpgradeRequirement } from "@/lib/nextMove"
import { formatHours } from "@/lib/nextMove"

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

      {/* Stat boost + total hours */}
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

      {/* Per-skill requirements */}
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

/** One-line summary shown in collapsed panel header */
export function NextMoveCollapsed({ candidates }: { candidates: UpgradeCandidate[] }) {
  const top = candidates[0]
  if (!top) {
    return <span className="text-xs text-[var(--color-text-dim)]">No upgrades pending</span>
  }
  if (top.alreadyUnlockable) {
    return (
      <span className="text-xs text-[var(--color-green)]">
        ✓ {top.item.name} ready to equip
      </span>
    )
  }
  const totalGap = top.requirements.reduce((s, r) => s + r.levelsNeeded, 0)
  const label = top.totalHours != null ? formatHours(top.totalHours) : `${totalGap} lvls`
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
        No pending upgrades — all slots maxed or BIS catalog empty.
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
