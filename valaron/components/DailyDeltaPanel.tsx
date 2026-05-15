import React from "react"
import type { DailyDelta } from "@/lib/queries"
import { CoinIcon } from "@/components/ui/CoinIcon"
import { fmtNum } from "@/lib/fmt"

interface DailyDeltaPanelProps {
  delta: DailyDelta | null
}

function sign(n: number): string {
  return n >= 0 ? `+${fmtNum(n)}` : fmtNum(n)
}

function signColor(n: number): string {
  if (n > 0) return "text-[var(--color-green)]"
  if (n < 0) return "text-[var(--color-red)]"
  return "text-[var(--color-text-muted)]"
}

function formatWindow(from: string, to: string): string {
  const h = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 3_600_000)
  if (h < 1) return "last <1h"
  if (h < 24) return `last ${h}h`
  return `last 24h`
}

export function DailyDeltaPanel({ delta }: DailyDeltaPanelProps) {
  if (!delta) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Not enough data yet — check back after the next poll.
      </p>
    )
  }

  const { goldDelta, levelDelta, xpGains, fromTime, toTime } = delta
  const window = formatWindow(fromTime, toTime)

  return (
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          <CoinIcon amount={Math.abs(goldDelta)} />
          <span className={`text-sm font-semibold ${signColor(goldDelta)}`} style={{ fontFamily: "var(--font-mono)" }}>
            {sign(goldDelta)}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">gold</span>
        </div>
        {levelDelta > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Total lv</span>
            <span className="text-sm font-semibold text-[var(--color-green)]" style={{ fontFamily: "var(--font-mono)" }}>
              +{levelDelta}
            </span>
          </div>
        )}
        <span className="text-[10px] text-[var(--color-text-dim)] ml-auto">{window}</span>
      </div>

      {/* XP gains per skill */}
      {xpGains.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-[var(--color-border-subtle)] pt-2">
          {xpGains.map((g) => (
            <div key={g.skill} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-[var(--color-text-secondary)] capitalize truncate">
                  {g.skill}
                </span>
                {g.levelDelta > 0 && (
                  <span className="text-[10px] font-semibold text-[var(--color-green)] bg-[var(--color-green)]/10 px-1 rounded flex-shrink-0">
                    +{g.levelDelta} lv
                  </span>
                )}
              </div>
              <span
                className="text-xs text-[var(--color-green)] flex-shrink-0"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                +{fmtNum(g.xpDelta)} xp
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
