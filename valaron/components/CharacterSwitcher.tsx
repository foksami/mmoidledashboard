"use client"

import React from "react"
import { useRouter } from "next/navigation"

interface CharacterTab {
  hashedId: string
  name: string
  class: string
  totalLevel?: number
  isPrimary: boolean
}

interface CharacterSwitcherProps {
  characters: CharacterTab[]
  activeName: string
}

const CLASS_COLOR: Record<string, { text: string; border: string }> = {
  WARRIOR: { text: "text-orange-400",                border: "border-orange-400/40" },
  RANGER:  { text: "text-[var(--color-green)]",       border: "border-[var(--color-green)]/40" },
  MAGE:    { text: "text-[var(--color-purple)]",      border: "border-[var(--color-purple)]/40" },
}

function classBadge(cls: string) {
  return CLASS_COLOR[cls.toUpperCase()] ?? { text: "text-[var(--color-text-dim)]", border: "border-[var(--color-border-subtle)]" }
}

export function CharacterSwitcher({ characters, activeName }: CharacterSwitcherProps) {
  const router = useRouter()

  return (
    <div
      className="relative w-full bg-[var(--color-bg-panel)] border-b border-[var(--color-border-subtle)] overflow-x-auto"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Bottom gold gradient line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,64,0.3) 20%, rgba(200,149,64,0.3) 80%, transparent)" }}
      />

      <div className="flex items-stretch min-w-max px-3 gap-1">
        {characters.map((char) => {
          const isActive = char.name === activeName
          const badge = classBadge(char.class ?? "")
          return (
            <button
              key={char.hashedId}
              onClick={() => router.push(`?char=${encodeURIComponent(char.name)}`)}
              className={[
                "relative flex items-center gap-2.5 px-4 py-3 text-sm transition-all duration-200 rounded-t-lg",
                isActive
                  ? "text-[var(--color-text-primary)] bg-[var(--color-bg-panel-hover)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.03)]",
              ].join(" ")}
            >
              {/* Active indicator: gold underline with glow */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, #f0c14a 30%, #f0c14a 70%, transparent)",
                    boxShadow: "0 0 8px rgba(240,193,74,0.6), 0 0 16px rgba(240,193,74,0.2)",
                  }}
                />
              )}

              <span
                className={`font-semibold tracking-wide ${isActive ? "text-[var(--color-gold-bright)]" : ""}`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {char.name}
              </span>

              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge.text} ${badge.border} bg-black/20`}
              >
                {char.class ?? "—"}
              </span>

              {char.totalLevel != null && (
                <span
                  className={`text-xs tabular-nums ${isActive ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-dim)]"}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {char.totalLevel}
                </span>
              )}

              {char.isPrimary && (
                <span className="text-[var(--color-gold)]/50 text-xs">★</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
