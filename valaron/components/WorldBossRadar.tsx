"use client"

import React, { useEffect, useState } from "react"
import type { WorldBoss } from "@/lib/idlemmo"

interface WorldBossRadarProps {
  bosses: WorldBoss[]
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now"
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`
  return `${sec}s`
}

function StatusBadge({ boss, now }: { boss: WorldBoss; now: number }) {
  const { status, battle_starts_at, battle_ends_at } = boss

  if (status === "IN_PROGRESS") {
    const remaining = battle_ends_at ? new Date(battle_ends_at).getTime() - now : null
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)] flex-shrink-0" />
        <span className="text-xs font-semibold text-[var(--color-red)] uppercase tracking-wider">
          In Battle
        </span>
        {remaining != null && remaining > 0 && (
          <span
            className="text-xs text-[var(--color-text-muted)]"
            style={{ fontFamily: "var(--font-mono)" }}
            suppressHydrationWarning
          >
            {formatCountdown(remaining)}
          </span>
        )}
      </div>
    )
  }

  if (status === "READY_FOR_LOBBY") {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] flex-shrink-0" />
        <span className="text-xs font-semibold text-[var(--color-green)] uppercase tracking-wider">
          Open
        </span>
      </div>
    )
  }

  // RESPAWNING
  const remaining = battle_starts_at ? new Date(battle_starts_at).getTime() - now : null
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] flex-shrink-0" />
      <span className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider">
        Respawning
      </span>
      {remaining != null && remaining > 0 && (
        <span
          className="text-xs text-[var(--color-text-muted)]"
          style={{ fontFamily: "var(--font-mono)" }}
          suppressHydrationWarning
        >
          {formatCountdown(remaining)}
        </span>
      )}
    </div>
  )
}

export function WorldBossRadar({ bosses }: WorldBossRadarProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (bosses.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No boss data.</p>
  }

  return (
    <div className="divide-y divide-[var(--color-border-subtle)]">
      {bosses.map((boss) => (
        <div key={boss.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm text-[var(--color-text-primary)] truncate"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {boss.name}
                </span>
                <span
                  className="text-xs text-[var(--color-text-muted)] flex-shrink-0"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Lv {boss.level}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-dim)]">{boss.location.name}</span>
            </div>
          </div>
          <StatusBadge boss={boss} now={now} />
        </div>
      ))}
    </div>
  )
}
