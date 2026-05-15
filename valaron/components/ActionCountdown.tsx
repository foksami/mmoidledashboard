"use client"

import React, { useEffect, useState } from "react"
import { fmtNum, fmtTime } from "@/lib/fmt"

interface ActionCountdownProps {
  actionType: string | null
  actionTitle: string | null
  expiresAt: string | null
  detectedAt: string | null
  skillLevel?: number | null
  skillExperience?: number | null
  skillXpRate?: number | null
}

function actionIcon(actionType: string | null): string {
  if (!actionType) return "⚡"
  const t = actionType.toUpperCase()
  if (t.includes("MINING")) return "⛏"
  if (t.includes("WOODCUTTING")) return "🌲"
  if (t.includes("FISHING")) return "🎣"
  if (t.includes("COMBAT")) return "🗡"
  if (t.includes("COOKING")) return "🔥"
  if (t.includes("FORGE") || t.includes("SMITHING")) return "🛠"
  return "⚡"
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s"
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
  return `${s}s`
}

function countdownColor(ms: number): string {
  if (ms <= 0) return "text-[var(--color-text-muted)]"
  const min = ms / 60_000
  if (min > 5) return "text-[var(--color-green)]"
  if (min > 1) return "text-yellow-400"
  return "text-[var(--color-red)]"
}

export function ActionCountdown({
  actionType,
  actionTitle,
  expiresAt,
  detectedAt,
  skillLevel,
  skillExperience,
  skillXpRate,
}: ActionCountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!actionType) {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="text-lg">⚡</span>
        <span
          className="text-sm uppercase tracking-widest text-[var(--color-text-muted)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Idle
        </span>
      </div>
    )
  }

  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null
  const detectedAtMs = detectedAt ? new Date(detectedAt).getTime() : null

  const remaining = expiresMs != null ? expiresMs - now : null
  const isExpired = remaining != null && remaining <= 0

  // Progress: use detectedAt (real UTC, recorded locally) as session start.
  // API's started_at/expires_at are per-tick (~23s) and offset by ~7.5h, so we ignore started_at.
  let progressPct = 0
  let displayStartMs: number | null = null
  if (detectedAtMs != null && expiresMs != null) {
    const total = expiresMs - detectedAtMs
    const elapsed = now - detectedAtMs
    progressPct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 100
    displayStartMs = detectedAtMs
  }

  const countdownMs = remaining != null && remaining > 0 ? remaining : 0
  const label = formatCountdown(countdownMs)
  const color = isExpired ? "text-[var(--color-text-muted)]" : countdownColor(countdownMs)

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span className="text-xl flex-shrink-0">{actionIcon(actionType)}</span>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="text-xs uppercase tracking-widest text-[var(--color-text-dim)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {actionType}
          </span>
          {actionTitle && (
            <span className="text-sm text-[var(--color-text-body)] truncate">
              {actionTitle}
            </span>
          )}
        </div>
        <span
          className={`text-xl font-bold tabular-nums flex-shrink-0 ${color}`}
          style={{ fontFamily: "var(--font-mono)" }}
          suppressHydrationWarning
        >
          {isExpired ? "Completing…" : label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--color-bg-inner)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progressPct}%`,
            background: isExpired
              ? "var(--color-text-muted)"
              : progressPct < 80
              ? "linear-gradient(90deg, #c89540 0%, #f0c14a 100%)"
              : "linear-gradient(90deg, #f0c14a 0%, #ffd766 100%)",
          }}
          suppressHydrationWarning
        />
      </div>

      {/* Footer: timestamps */}
      {displayStartMs != null && expiresAt && (
        <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-mono)" }} suppressHydrationWarning>
          <span suppressHydrationWarning>{fmtTime(new Date(displayStartMs).toISOString())}</span>
          <span suppressHydrationWarning>{progressPct}%</span>
          <span suppressHydrationWarning>{fmtTime(expiresAt)}</span>
        </div>
      )}

      {/* Skill snapshot */}
      {skillLevel != null && (
        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
              Lv
            </span>
            <span className="text-sm font-semibold text-[var(--color-gold)]" style={{ fontFamily: "var(--font-mono)" }}>
              {skillLevel}
            </span>
            {skillExperience != null && (
              <span className="text-xs text-[var(--color-text-dim)]" style={{ fontFamily: "var(--font-mono)" }}>
                {fmtNum(skillExperience)} xp
              </span>
            )}
          </div>
          {skillXpRate != null && skillXpRate > 0 && (
            <span className="text-xs text-[var(--color-green)]" style={{ fontFamily: "var(--font-mono)" }}>
              +{fmtNum(skillXpRate)} xp/h
            </span>
          )}
        </div>
      )}
    </div>
  )
}
