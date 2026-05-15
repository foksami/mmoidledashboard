"use client"
// components/market/GearPricesPanel.tsx
import React, { useState } from "react"
import type { GearMarketGroup, GearMarketItem } from "@/lib/queries"
import { fmtNum } from "@/lib/fmt"

const QUALITY_COLOR: Record<string, string> = {
  STANDARD:  "text-[var(--color-text-muted)]",
  REFINED:   "text-green-400",
  PREMIUM:   "text-[var(--color-blue)]",
  EPIC:      "text-[var(--color-purple)]",
  LEGENDARY: "text-[var(--color-gold)]",
  MYTHIC:    "text-pink-400",
}

const SLOT_EMOJI: Record<string, string> = {
  HELMET:     "🪖",
  CHESTPLATE: "🥋",
  GAUNTLETS:  "🧤",
  BOOTS:      "👢",
  SWORD:      "⚔️",
  BOW:        "🏹",
  DAGGER:     "🗡️",
  SHIELD:     "🛡️",
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
      {label.replace(/_/g, " ")} {value}
    </span>
  )
}

function ReqChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-dim)]">
      lv{value} {label.replace(/_/g, " ")}
    </span>
  )
}

function GearRow({ item }: { item: GearMarketItem }) {
  const [open, setOpen] = useState(false)
  const qColor = QUALITY_COLOR[item.quality] ?? QUALITY_COLOR.STANDARD
  const hasStats = Object.keys(item.stats).length > 0
  const hasReqs = Object.keys(item.requirements).length > 0

  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-[var(--color-border-subtle)] last:border-b-0 last:pb-0 first:pt-0">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 4.5rem 4.5rem" }}>
          {/* Name + quality */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-xs font-medium truncate ${qColor}`}>{item.name}</span>
          </div>
          {/* Market price */}
          <span
            className="text-[10px] text-right font-semibold text-[var(--color-gold)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {item.marketPrice != null ? fmtNum(item.marketPrice) + "g" : "—"}
          </span>
          {/* Volume */}
          <span
            className="text-[10px] text-right text-[var(--color-text-dim)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {item.lastSold != null ? fmtNum(item.lastSold) : "—"}
          </span>
        </div>
      </button>

      {open && (
        <div className="pl-2 flex flex-col gap-1 mt-0.5">
          {hasStats && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(item.stats).map(([k, v]) => (
                <StatChip key={k} label={k} value={v} />
              ))}
            </div>
          )}
          {hasReqs && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(item.requirements).map(([k, v]) => (
                <ReqChip key={k} label={k} value={v} />
              ))}
            </div>
          )}
          {item.vendorPrice != null && (
            <span className="text-[9px] text-[var(--color-text-dim)]">
              Vendor: {fmtNum(item.vendorPrice)}g
              {item.marketDate && (
                <> · Data: {item.marketDate}</>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  groups: GearMarketGroup[]
}

export function GearPricesPanel({ groups }: Props) {
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)

  if (groups.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No gear data. Run <code className="text-xs">npm run market:gear</code> to fetch prices.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {groups.map((group) => {
        const isOpen = expandedSlot === group.slot || expandedSlot === null
        const emoji = SLOT_EMOJI[group.slot] ?? "⚙️"
        const hasData = group.items.some((i) => i.marketPrice != null)

        return (
          <div key={group.slot} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
            {/* Slot header */}
            <button
              className="w-full flex items-center gap-2 py-2 text-left hover:bg-[var(--color-surface-hover)] rounded px-1 -mx-1 transition-colors"
              onClick={() => setExpandedSlot(expandedSlot === group.slot ? null : group.slot)}
            >
              <span className="text-sm">{emoji}</span>
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest flex-1">
                {group.slot.toLowerCase()}
              </span>
              <span className="text-[9px] text-[var(--color-text-dim)]">
                {group.items.length} items
                {!hasData && " · no prices"}
              </span>
              <span className="text-[9px] text-[var(--color-text-dim)]">
                {expandedSlot === group.slot ? "▲" : "▼"}
              </span>
            </button>

            {/* Column headers + rows */}
            {expandedSlot === group.slot && (
              <div className="pb-2">
                <div className="grid gap-2 pb-1 border-b border-[var(--color-border-subtle)] mb-1"
                     style={{ gridTemplateColumns: "1fr 4.5rem 4.5rem" }}>
                  <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Item</span>
                  <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)] text-right">Price</span>
                  <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)] text-right">Sold/d</span>
                </div>
                {group.items.map((item) => (
                  <GearRow key={item.hashedId} item={item} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
