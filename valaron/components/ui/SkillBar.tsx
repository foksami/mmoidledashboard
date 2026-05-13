import React from "react"
import { Delta } from "./Delta"

interface SkillBarProps {
  name: string
  level: number
  experience: number
  delta?: number
  className?: string
}

/**
 * Approximate XP required to reach level N.
 * Formula: floor(50 * 1.15^N)
 */
function xpForLevel(level: number): number {
  return Math.max(1, Math.floor(50 * Math.pow(1.15, level)))
}

export function SkillBar({
  name,
  level,
  experience,
  delta,
  className = "",
}: SkillBarProps) {
  const needed = xpForLevel(level)
  const progress = experience % needed
  const pct = Math.min(100, Math.round((progress / needed) * 100))

  const displayName =
    name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--color-text-secondary)] truncate">
          {displayName}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {delta !== undefined && (
            <Delta value={delta} suffix="/h" className="text-xs" />
          )}
          <span
            className="text-sm font-bold text-[var(--color-gold)] min-w-[2.5rem] text-right"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {level}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-[var(--color-bg-inner)] rounded-full overflow-hidden">
          <div
            className="skill-bar-fill h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="text-xs text-[var(--color-text-muted)] min-w-[2.5rem] text-right"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {pct}%
        </span>
      </div>
    </div>
  )
}
