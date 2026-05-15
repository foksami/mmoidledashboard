import React from "react"
import type { ActivityEfficiency } from "@/lib/queries"
import { fmtNum } from "@/lib/fmt"

interface EfficiencyPanelProps {
  activities: ActivityEfficiency[]
}

function actionIcon(type: string): string {
  const t = type.toUpperCase()
  if (t.includes("MINING")) return "⛏"
  if (t.includes("WOODCUTTING")) return "🌲"
  if (t.includes("FISHING")) return "🎣"
  if (t.includes("COMBAT")) return "🗡️"
  if (t.includes("COOKING")) return "🔥"
  if (t.includes("FORGE") || t.includes("SMITHING")) return "🛠"
  if (t.includes("HUNT")) return "🏹"
  if (t.includes("MEDITAT")) return "🧘"
  return "⚡"
}

export function EfficiencyPanel({ activities }: EfficiencyPanelProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No session data yet — efficiency tracking starts with the next activity switch.
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
      {activities.map((a) => {
        const topSkill = Object.entries(a.xpPerHour).sort(([, a], [, b]) => b - a)[0]
        return (
          <div key={a.actionType} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-base flex-shrink-0">{actionIcon(a.actionType)}</span>
            <div className="flex-1 min-w-0">
              <span
                className="text-xs text-[var(--color-text-primary)] uppercase tracking-wider"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {a.actionType}
              </span>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {topSkill && (
                  <span className="text-[10px] text-[var(--color-text-dim)]" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmtNum(topSkill[1])} xp/h
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-text-dim)]">
                  {a.sessions} sess · {a.totalHours}h
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {a.goldPerHour > 0 ? (
                <span
                  className="text-sm font-semibold text-[var(--color-gold)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {fmtNum(a.goldPerHour)} gp/h
                </span>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">no gold data</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
