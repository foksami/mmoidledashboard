import React from "react"
import { Delta } from "./Delta"

interface SkillBarProps {
  name: string
  level: number
  experience: number
  delta?: number
  targetLevel?: number
  className?: string
}

function xpForLevel(level: number): number {
  return Math.max(1, Math.floor(50 * Math.pow(1.15, level)))
}

function formatEta(hours: number): string {
  if (hours < 1 / 60) return "<1m"
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(hours / 24)
  const h = Math.round(hours % 24)
  return h > 0 ? `${d}d ${h}h` : `${d}d`
}

export function SkillBar({ name, level, experience, delta, targetLevel, className = "" }: SkillBarProps) {
  const needed = xpForLevel(level)
  const progress = experience % needed
  const pct = Math.min(100, Math.round((progress / needed) * 100))

  const target = targetLevel ?? level + 1
  let etaHours: number | null = null
  if (delta && delta > 0) {
    let xpNeeded = needed - progress
    for (let l = level + 1; l < target; l++) xpNeeded += xpForLevel(l)
    etaHours = xpNeeded / delta
  }

  const displayName = name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Name row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--color-text-secondary)] truncate">{displayName}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {delta !== undefined && (
            <Delta value={delta} suffix="/h" className="text-xs" />
          )}
          <span
            className="text-sm font-bold text-[var(--color-gold)] min-w-[2ch] text-right tabular-nums"
            style={{
              fontFamily: "var(--font-mono)",
              textShadow: "0 0 10px rgba(240,193,74,0.35)",
            }}
          >
            {level}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[var(--color-bg-inner)] rounded-full overflow-hidden">
          <div
            className="skill-bar-fill h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="text-[11px] text-[var(--color-text-dim)] min-w-[3ch] text-right tabular-nums"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {pct}%
        </span>
      </div>

      {/* ETA */}
      {etaHours !== null && (
        <span
          className="text-[10px] text-[var(--color-text-dim)] leading-none"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {targetLevel ? `Lv ${targetLevel} in` : "next lv in"} {formatEta(etaHours)}
        </span>
      )}
    </div>
  )
}
