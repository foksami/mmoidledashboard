"use client"
// components/SmeltingPanel.tsx
import React, { useState } from "react"
import type { SmeltingRow } from "@/lib/queries"
import { fmtNum } from "@/lib/fmt"

const QUALITY_COLOR: Record<string, string> = {
  STANDARD:  "text-[var(--color-text-muted)]",
  REFINED:   "text-green-400",
  PREMIUM:   "text-[var(--color-blue)]",
  EPIC:      "text-[var(--color-purple)]",
  LEGENDARY: "text-[var(--color-gold)]",
  MYTHIC:    "text-pink-400",
}

type SortKey = "profit_h" | "profit_bar" | "level"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "profit_h",   label: "Profit/h"  },
  { key: "profit_bar", label: "Per bar"   },
  { key: "level",      label: "Level"     },
]

function ProfitBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[10px] text-[var(--color-text-dim)]">—</span>
  const color = value > 0 ? "text-[var(--color-green)]" : value < 0 ? "text-red-400" : "text-[var(--color-text-dim)]"
  return (
    <span className={`text-[10px] font-semibold ${color}`} style={{ fontFamily: "var(--font-mono)" }}>
      {value > 0 ? "+" : ""}{value}g
    </span>
  )
}

function Bar({ value, max, positive }: { value: number; max: number; positive: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((Math.abs(value) / max) * 100)) : 0
  return (
    <div className="h-0.5 w-full bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${positive ? "bg-[var(--color-green)]/50" : "bg-red-500/40"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

interface Props {
  rows: SmeltingRow[]
  smeltingLevel: number
}

export function SmeltingPanel({ rows, smeltingLevel }: Props) {
  const [sort, setSort] = useState<SortKey>("profit_h")
  const [expanded, setExpanded] = useState<string | null>(null)

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No smelting data.</p>
  }

  const canSmelt = (r: SmeltingRow) => smeltingLevel >= r.recipe.smeltLevel

  const sorted = [...rows].sort((a, b) => {
    if (sort === "level") return a.recipe.smeltLevel - b.recipe.smeltLevel
    // accessible first
    const aA = canSmelt(a) ? 0 : 1
    const bA = canSmelt(b) ? 0 : 1
    if (aA !== bA) return aA - bA
    if (sort === "profit_bar") return (b.profitPerBar ?? -Infinity) - (a.profitPerBar ?? -Infinity)
    return (b.profitPerHour ?? -Infinity) - (a.profitPerHour ?? -Infinity)
  })

  // max for bar scaling — use absolute profit/h
  const maxProfitH = Math.max(...rows.map((r) => Math.abs(r.profitPerHour ?? 0)), 1)

  return (
    <div className="flex flex-col gap-0">
      {/* Sort tabs */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)] mr-1">Sort</span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
              sort === key
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="grid gap-2 pb-1.5 border-b border-[var(--color-border-subtle)] mb-1"
           style={{ gridTemplateColumns: "1fr 3rem 3.5rem 4rem" }}>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Bar</span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)] text-right">+/bar</span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)] text-right">Bars/h</span>
        <span className={`text-[9px] uppercase tracking-widest text-right transition-colors ${sort === "profit_h" ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-dim)]"}`}>
          Profit/h
        </span>
      </div>

      {sorted.map((row) => {
        const { recipe } = row
        const accessible = canSmelt(row)
        const qColor = QUALITY_COLOR[recipe.quality] ?? QUALITY_COLOR.STANDARD
        const isOpen = expanded === recipe.barHashedId
        const profitPos = (row.profitPerHour ?? 0) >= 0

        return (
          <div key={recipe.barHashedId}
               className="flex flex-col gap-0.5 py-2 border-b border-[var(--color-border-subtle)] last:border-b-0 last:pb-0 first:pt-0">
            <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : recipe.barHashedId)}>
              <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 3rem 3.5rem 4rem" }}>
                {/* Name + level */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] flex-shrink-0">🔨</span>
                  <span className={`text-xs font-medium leading-tight truncate ${accessible ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-dim)]"}`}>
                    {recipe.barName}
                  </span>
                  <span className={`text-[9px] font-semibold flex-shrink-0 px-1 py-0.5 rounded ${
                    accessible
                      ? "text-[var(--color-green)] bg-[var(--color-green)]/10"
                      : "text-[var(--color-text-dim)] bg-[var(--color-surface-hover)]"
                  }`}>
                    lv{recipe.smeltLevel}
                  </span>
                </div>

                {/* Profit per bar */}
                <div className="flex justify-end">
                  <ProfitBadge value={row.profitPerBar} />
                </div>

                {/* Bars per hour */}
                <span className="text-[10px] text-right text-[var(--color-text-secondary)]"
                      style={{ fontFamily: "var(--font-mono)" }}>
                  {row.barsPerHour}/h
                </span>

                {/* Profit per hour */}
                <span className={`text-[10px] text-right font-semibold ${sort === "profit_h" ? "" : "font-normal"} ${
                  row.profitPerHour == null ? "text-[var(--color-text-dim)]"
                  : row.profitPerHour >= 0 ? "text-[var(--color-green)]"
                  : "text-red-400"
                }`} style={{ fontFamily: "var(--font-mono)" }}>
                  {row.profitPerHour != null ? (row.profitPerHour >= 0 ? "+" : "") + fmtNum(row.profitPerHour) + "g" : "—"}
                </span>
              </div>

              {/* Profit bar */}
              {row.profitPerHour != null && (
                <div className="mt-0.5">
                  <Bar value={row.profitPerHour} max={maxProfitH} positive={profitPos} />
                </div>
              )}
            </button>

            {/* Expanded: cost breakdown */}
            {isOpen && (
              <div className="mt-1.5 pl-5 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Cost</span>
                  <span className="text-[9px] text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-mono)" }}>
                    {recipe.oreName}: <span className={qColor}>{row.orePrice != null ? row.orePrice + "g" : "—"}</span>
                  </span>
                  <span className="text-[9px] text-[var(--color-text-dim)]">+</span>
                  <span className="text-[9px] text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-mono)" }}>
                    Coal: <span className="text-[var(--color-text-muted)]">{row.coalPrice != null ? row.coalPrice + "g" : "—"}</span>
                  </span>
                  <span className="text-[9px] text-[var(--color-text-dim)]">→</span>
                  <span className="text-[9px] text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-mono)" }}>
                    {recipe.barName}: <span className="text-[var(--color-gold)]">{row.barPrice != null ? row.barPrice + "g" : "—"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-[var(--color-text-dim)]">
                    {recipe.smeltTimeSec}s/bar · {recipe.expPerBar} EXP · {fmtNum(row.expPerHour)} EXP/h
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SmeltingCollapsed({ rows, smeltingLevel }: Props) {
  const best = [...rows]
    .filter((r) => smeltingLevel >= r.recipe.smeltLevel && r.profitPerHour != null)
    .sort((a, b) => (b.profitPerHour ?? 0) - (a.profitPerHour ?? 0))[0]

  if (!best) {
    return <span className="text-xs text-[var(--color-text-dim)]">No smelting data</span>
  }

  const profitable = (best.profitPerHour ?? 0) >= 0
  return (
    <span className="text-xs text-[var(--color-text-dim)]">
      Best: <span className="text-[var(--color-text-secondary)]">{best.recipe.barName}</span>
      {best.profitPerHour != null && (
        <> · <span className={profitable ? "text-[var(--color-green)]" : "text-red-400"}>
          {profitable ? "+" : ""}{fmtNum(best.profitPerHour)}g/h
        </span></>
      )}
    </span>
  )
}
