"use client"

import React, { useEffect, useState } from "react"

interface ActionCountdownProps {
  actionType: string | null
  actionTitle: string | null
  expiresAt: string | null
  startedAt: string | null
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
  if (ms <= 0) return "00:00"
  const totalSec = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
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
  startedAt,
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
  const startedMs = startedAt ? new Date(startedAt).getTime() : null

  const remaining = expiresMs != null ? expiresMs - now : null
  const isExpired = remaining != null && remaining <= 0

  // Progress percentage (0-100)
  let progressPct = 0
  if (startedMs != null && expiresMs != null) {
    const total = expiresMs - startedMs
    const elapsed = now - startedMs
    progressPct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 100
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
        />
      </div>

      {/* Footer: timestamps */}
      {startedAt && expiresAt && (
        <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-mono)" }}>
          <span>{new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{progressPct}%</span>
          <span>{new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      )}
    </div>
  )
}
