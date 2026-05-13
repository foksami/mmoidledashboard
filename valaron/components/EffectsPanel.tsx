import React from "react"
import type { CharacterEffect } from "@/lib/idlemmo"

interface EffectsPanelProps {
  effects: CharacterEffect[]
}

function formatTarget(target: string, attribute: string): string {
  const key = `${target}.${attribute}`.toLowerCase()
  const map: Record<string, string> = {
    "primary_skill.experience": "All Skills XP",
    "combat.experience": "Combat XP",
    "pet-mastery.experience": "Pet XP",
    "battle.experience": "Combat XP",
    "strength.experience": "Strength XP",
    "defence.experience": "Defence XP",
    "speed.experience": "Speed XP",
    "dexterity.experience": "Dex XP",
    "mining.experience": "Mining XP",
    "woodcutting.experience": "Woodcutting XP",
    "fishing.experience": "Fishing XP",
    "cooking.experience": "Cooking XP",
    "smelting.experience": "Smelting XP",
    "alchemy.experience": "Alchemy XP",
    "hunting-mastery.experience": "Hunting XP",
    "meditation.experience": "Meditation XP",
    "guild-mastery.experience": "Guild XP",
    "construction.experience": "Construction XP",
  }
  if (map[key]) return map[key]
  // Fallback: capitalize target + attribute
  const t = target.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const a = attribute === "experience" ? "XP" : attribute
  return `${t} ${a}`
}

function formatSource(source: string): string {
  const map: Record<string, string> = {
    class: "Class Bonus",
    shrine: "Shrine",
    pet: "Pet",
    guild: "Guild",
    weather: "Weather",
    item: "Item",
  }
  return map[source] ?? source.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(value: number, valueType: string): string {
  if (valueType === "percentage") return `+${value}%`
  return `+${value}`
}

export function EffectsPanel({ effects }: EffectsPanelProps) {
  if (effects.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No active effects.</p>
  }

  // Group by source
  const groups = new Map<string, CharacterEffect[]>()
  for (const e of effects) {
    const list = groups.get(e.source) ?? []
    list.push(e)
    groups.set(e.source, list)
  }

  return (
    <div className="flex flex-col gap-3">
      {Array.from(groups.entries()).map(([source, items], gi) => (
        <div key={source}>
          {gi > 0 && <div className="border-t border-[var(--color-border-subtle)] mb-3" />}
          <p
            className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatSource(source)}
          </p>
          <div className="flex flex-col gap-1">
            {items.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {formatTarget(e.target, e.attribute)}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs font-semibold text-[var(--color-green)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {formatValue(e.value, e.value_type)}
                  </span>
                  {e.expire_at && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      until {new Date(e.expire_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
