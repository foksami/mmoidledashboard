import React from "react"
import type { ShrineProgress } from "@/lib/idlemmo"

interface ShrinePanelProps {
  tiers: ShrineProgress[]
}

function formatEffect(target: string, attribute: string, value: number, valueType: string): string {
  const key = `${target}.${attribute}`.toLowerCase()
  const labels: Record<string, string> = {
    "primary_skill.experience": "All Skills XP",
    "combat.experience": "Combat XP",
    "pet-mastery.experience": "Pet XP",
    "battle.experience": "Combat XP",
    "strength.experience": "Strength XP",
  }
  const label = labels[key] ?? target.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const val = valueType === "percentage" ? `+${value}%` : `+${value}`
  return `${val} ${label}`
}

function StatusPip({ tier }: { tier: ShrineProgress }) {
  if (tier.is_active) {
    return (
      <span className="flex items-center gap-1 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
        <span className="text-[10px] font-semibold text-[var(--color-green)] uppercase tracking-wider">Active</span>
      </span>
    )
  }
  if (tier.can_activate) {
    return (
      <span className="flex items-center gap-1 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple)]" />
        <span className="text-[10px] font-semibold text-[var(--color-purple)] uppercase tracking-wider">Ready</span>
      </span>
    )
  }
  if (tier.in_progress) {
    return (
      <span className="flex items-center gap-1 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
        <span className="text-[10px] font-semibold text-[var(--color-gold)] uppercase tracking-wider">In Progress</span>
      </span>
    )
  }
  return null
}

function barColor(tier: ShrineProgress): string {
  if (tier.is_active) return "linear-gradient(90deg, #c89540 0%, #f0c14a 100%)"
  if (tier.in_progress) return "var(--color-blue)"
  return "var(--color-border-subtle)"
}

export function ShrinePanel({ tiers }: ShrinePanelProps) {
  if (tiers.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No shrine data.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
      {tiers.map((tier) => (
        <div key={tier.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs text-[var(--color-text-dim)] uppercase tracking-widest"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {tier.tier.name}
            </span>
            <StatusPip tier={tier} />
          </div>

          {/* Effects summary */}
          {tier.effects.length > 0 && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              {tier.effects.map((e) => formatEffect(e.target, e.attribute, e.value, e.value_type)).join(" · ")}
            </p>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--color-bg-inner)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, tier.percentage)}%`,
                  background: barColor(tier),
                }}
              />
            </div>
            <span
              className="text-[10px] text-[var(--color-text-muted)] min-w-[3rem] text-right"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {tier.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
