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
  activeHashedId: string
}

function classBadgeColor(cls: string): string {
  const c = cls.toUpperCase()
  if (c === "WARRIOR") return "text-orange-400 border-orange-400/40"
  if (c === "RANGER") return "text-[var(--color-green)] border-[var(--color-green)]/40"
  if (c === "MAGE") return "text-[var(--color-purple)] border-[var(--color-purple)]/40"
  return "text-[var(--color-text-dim)] border-[var(--color-border-subtle)]"
}

export function CharacterSwitcher({ characters, activeHashedId }: CharacterSwitcherProps) {
  const router = useRouter()

  function handleSelect(hashedId: string) {
    router.push(`?char=${hashedId}`)
  }

  return (
    <div
      className="w-full bg-[var(--color-bg-panel)] border-b border-[var(--color-border-subtle)] overflow-x-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex items-stretch min-w-max px-4 gap-0">
        {characters.map((char) => {
          const isActive = char.hashedId === activeHashedId
          return (
            <button
              key={char.hashedId}
              onClick={() => handleSelect(char.hashedId)}
              className={[
                "relative flex items-center gap-2 px-4 py-3 text-sm transition-colors",
                "border-b-2",
                isActive
                  ? "border-[var(--color-gold)] text-[var(--color-gold-bright)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel-hover)]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className="font-semibold tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {char.name}
              </span>

              <span
                className={[
                  "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                  classBadgeColor(char.class ?? ""),
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {char.class ?? "—"}
              </span>

              {char.totalLevel != null && (
                <span
                  className={[
                    "text-xs",
                    isActive
                      ? "text-[var(--color-text-secondary)]"
                      : "text-[var(--color-text-muted)]",
                  ].join(" ")}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Lv {char.totalLevel}
                </span>
              )}

              {char.isPrimary && (
                <span className="text-[8px] uppercase tracking-widest text-[var(--color-gold)]/60">
                  ★
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
