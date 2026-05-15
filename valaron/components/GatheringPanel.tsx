"use client"
// components/GatheringPanel.tsx
import React, { useState } from "react"
import type { GatheringMarketRow } from "@/lib/queries"
import { fmtNum } from "@/lib/fmt"

const QUALITY_COLOR: Record<string, string> = {
  STANDARD:  "text-[var(--color-text-muted)]",
  REFINED:   "text-green-400",
  PREMIUM:   "text-[var(--color-blue)]",
  EPIC:      "text-[var(--color-purple)]",
  LEGENDARY: "text-[var(--color-gold)]",
  MYTHIC:    "text-pink-400",
}

const SKILL_ICON: Record<string, string> = {
  mining: "⛏",
  woodcutting: "🪓",
}

type SortKey = "price" | "demand" | "level"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "price",  label: "Price"  },
  { key: "demand", label: "Demand" },
  { key: "level",  label: "Level"  },
]

function sortItems(
  items: GatheringMarketRow[],
  key: SortKey,
  miningLevel: number,
  woodcuttingLevel: number
): GatheringMarketRow[] {
  const canGather = (i: GatheringMarketRow) =>
    (i.skill === "mining" ? miningLevel : woodcuttingLevel) >= i.reqLevel
  const copy = [...items]
  copy.sort((a, b) => {
    if (key === "level") return a.reqLevel - b.reqLevel
    const aAccess = canGather(a) ? 0 : 1
    const bAccess = canGather(b) ? 0 : 1
    if (aAccess !== bAccess) return aAccess - bAccess
    if (key === "price") return (b.avgPrice ?? 0) - (a.avgPrice ?? 0)
    return (b.marketValue ?? 0) - (a.marketValue ?? 0)
  })
  return copy
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, field }: {
  data: Array<{ avgPrice: number | null; totalSold: number | null }>
  field: "avgPrice" | "totalSold"
}) {
  const values = data.map((d) => d[field] ?? 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values.filter((v) => v > 0), 0)
  const range = max - min || 1
  const W = 48
  const H = 16
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-[var(--color-text-dim)]"
      />
    </svg>
  )
}

// ── Delta badge ───────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null
  const up = delta > 0
  const flat = delta === 0
  const color = flat
    ? "text-[var(--color-text-dim)]"
    : up
    ? "text-[var(--color-green)]"
    : "text-red-400"
  const arrow = flat ? "→" : up ? "↑" : "↓"
  return (
    <span className={`text-[9px] font-semibold ${color} flex-shrink-0`}>
      {arrow}{Math.abs(delta)}%
    </span>
  )
}

// ── Bar ───────────────────────────────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-0.5 w-full bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  items: GatheringMarketRow[]
  miningLevel: number
  woodcuttingLevel: number
}

export function GatheringPanel({ items, miningLevel, woodcuttingLevel }: Props) {
  const [sort, setSort] = useState<SortKey>("price")
  // "compact" shows just the row; "chart" shows mini sparkline below
  const [expanded, setExpanded] = useState<string | null>(null)

  if (items.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No gathering data.</p>
  }

  const sorted = sortItems(items, sort, miningLevel, woodcuttingLevel)
  const maxPrice  = Math.max(...items.map((i) => i.avgPrice ?? 0), 1)
  const maxDemand = Math.max(...items.map((i) => i.marketValue ?? 0), 1)
  const maxLevel  = Math.max(...items.map((i) => i.reqLevel), 1)

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
      <div
        className="grid gap-2 pb-1.5 border-b border-[var(--color-border-subtle)] mb-1"
        style={{ gridTemplateColumns: "1fr 3.5rem 3rem 4rem" }}
      >
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Item</span>
        <span className={`text-[9px] uppercase tracking-widest text-right transition-colors ${sort === "price" ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-dim)]"}`}>
          Price 7d
        </span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)] text-right">Vol/day</span>
        <span className={`text-[9px] uppercase tracking-widest text-right transition-colors ${sort === "demand" ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-dim)]"}`}>
          Mkt val
        </span>
      </div>

      {sorted.map((item) => {
        const myLevel = item.skill === "mining" ? miningLevel : woodcuttingLevel
        const canGather = myLevel >= item.reqLevel
        const qColor = QUALITY_COLOR[item.quality] ?? QUALITY_COLOR.STANDARD
        const isOpen = expanded === item.hashedId
        const t = item.trend

        const barValue = sort === "price" ? (item.avgPrice ?? 0)
          : sort === "demand" ? (item.marketValue ?? 0)
          : item.reqLevel
        const barMax = sort === "price" ? maxPrice : sort === "demand" ? maxDemand : maxLevel
        const barColor = sort === "level"
          ? "bg-[var(--color-blue)]/40"
          : canGather ? "bg-[var(--color-green)]/40" : "bg-[var(--color-gold)]/30"

        // daily avg vol for display
        const avgDailyVol = t?.history14d.length
          ? Math.round(t.history14d.reduce((s, d) => s + (d.totalSold ?? 0), 0) / t.history14d.length)
          : item.totalSold

        return (
          <div
            key={item.hashedId}
            className="flex flex-col gap-0.5 py-2 border-b border-[var(--color-border-subtle)] last:border-b-0 last:pb-0 first:pt-0"
          >
            {/* Main row — click to toggle sparkline */}
            <button
              className="w-full text-left"
              onClick={() => setExpanded(isOpen ? null : item.hashedId)}
            >
              <div
                className="grid gap-2 items-center"
                style={{ gridTemplateColumns: "1fr 3.5rem 3rem 4rem" }}
              >
                {/* Name + level + trend */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] flex-shrink-0">{SKILL_ICON[item.skill]}</span>
                  <span className={`text-xs font-medium leading-tight truncate ${canGather ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-dim)]"}`}>
                    {item.name}
                  </span>
                  <span
                    className={`text-[9px] font-semibold flex-shrink-0 px-1 py-0.5 rounded ${
                      canGather
                        ? "text-[var(--color-green)] bg-[var(--color-green)]/10"
                        : "text-[var(--color-text-dim)] bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    lv{item.reqLevel}
                  </span>
                </div>

                {/* Price + 7d delta */}
                <div className="flex items-center justify-end gap-1">
                  <DeltaBadge delta={t?.priceDelta7d ?? null} />
                  <span
                    className={`text-[10px] ${sort === "price" ? "font-semibold" : ""} ${qColor}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.avgPrice != null ? `${item.avgPrice}g` : "—"}
                  </span>
                </div>

                {/* Avg daily volume */}
                <span
                  className="text-[10px] text-right text-[var(--color-text-secondary)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {avgDailyVol != null ? fmtNum(avgDailyVol) : "—"}
                </span>

                {/* Market value */}
                <span
                  className={`text-[10px] text-right ${sort === "demand" ? "font-semibold" : ""} text-[var(--color-gold)]`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {item.marketValue != null ? fmtNum(item.marketValue) : "—"}
                </span>
              </div>

              {/* Bar */}
              <div className="mt-0.5">
                <Bar value={barValue} max={barMax} color={barColor} />
              </div>
            </button>

            {/* Expanded sparklines */}
            {isOpen && t && t.history14d.length > 1 && (
              <div className="mt-2 pl-5 flex flex-col gap-1.5">
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
                      Price 14d
                    </span>
                    <Sparkline data={t.history14d} field="avgPrice" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
                      Volume 14d
                    </span>
                    <Sparkline data={t.history14d} field="totalSold" />
                  </div>
                  <div className="flex flex-col gap-1 ml-auto text-right">
                    {t.priceDelta7d != null && (
                      <div>
                        <span className="text-[9px] text-[var(--color-text-dim)]">price 7d </span>
                        <DeltaBadge delta={t.priceDelta7d} />
                      </div>
                    )}
                    {t.volumeDelta7d != null && (
                      <div>
                        <span className="text-[9px] text-[var(--color-text-dim)]">vol 7d </span>
                        <DeltaBadge delta={t.volumeDelta7d} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function GatheringCollapsed({ items, miningLevel, woodcuttingLevel }: Props) {
  const best = [...items]
    .filter((i) => {
      const myLevel = i.skill === "mining" ? miningLevel : woodcuttingLevel
      return myLevel >= i.reqLevel && i.avgPrice != null
    })
    .sort((a, b) => (b.avgPrice ?? 0) - (a.avgPrice ?? 0))[0]

  if (!best) {
    return <span className="text-xs text-[var(--color-text-dim)]">No accessible resources</span>
  }

  const trend = best.trend
  return (
    <span className="text-xs text-[var(--color-text-dim)]">
      Best:{" "}
      <span className="text-[var(--color-text-secondary)]">{best.name}</span>
      {best.avgPrice != null && (
        <> · <span className="text-[var(--color-gold)]">{best.avgPrice}g</span></>
      )}
      {trend?.priceDelta7d != null && trend.priceDelta7d !== 0 && (
        <> {trend.priceDelta7d > 0 ? "↑" : "↓"}{Math.abs(trend.priceDelta7d)}%</>
      )}
    </span>
  )
}
