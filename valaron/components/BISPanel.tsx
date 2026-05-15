import React from "react"
import Image from "next/image"
import type { BISSlot, BISItem } from "@/lib/queries"
import { CoinIcon } from "@/components/ui/CoinIcon"
import { fmtNum } from "@/lib/fmt"

interface BISPanelProps {
  slots: BISSlot[]
}

const SLOT_LABEL: Record<string, string> = {
  HELMET: "Helmet",
  CHESTPLATE: "Chestplate",
  GAUNTLETS: "Gauntlets",
  BOOTS: "Boots",
  SWORD: "Sword",
  BOW: "Bow",
  DAGGER: "Dagger",
  SHIELD: "Shield",
}

const QUALITY_STYLE: Record<string, { text: string; border: string; bg: string }> = {
  STANDARD: { text: "text-[var(--color-text-muted)]",  border: "border-[var(--color-border-subtle)]", bg: "" },
  REFINED:  { text: "text-green-400",                  border: "border-green-400/40",                 bg: "bg-green-400/5" },
  PREMIUM:  { text: "text-[var(--color-blue)]",        border: "border-[var(--color-blue)]/40",       bg: "bg-[var(--color-blue)]/5" },
  EPIC:     { text: "text-[var(--color-purple)]",      border: "border-[var(--color-purple)]/40",     bg: "bg-[var(--color-purple)]/5" },
  LEGENDARY:{ text: "text-[var(--color-gold)]",        border: "border-[var(--color-gold)]/40",       bg: "bg-[var(--color-gold)]/5" },
  MYTHIC:   { text: "text-pink-400",                   border: "border-pink-400/40",                  bg: "bg-pink-400/5" },
}

function qualityStyle(q: string) {
  return QUALITY_STYLE[q] ?? QUALITY_STYLE.STANDARD
}

function QualityBadge({ quality }: { quality: string }) {
  const s = qualityStyle(quality)
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${s.text} ${s.border}`}>
      {quality}
    </span>
  )
}

function ItemImage({ item, size = 64 }: { item: BISItem; size?: number }) {
  const s = qualityStyle(item.quality)
  if (item.imageUrl) {
    return (
      <div
        className={`flex-shrink-0 rounded border ${s.border} ${s.bg} overflow-hidden flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={size}
          height={size}
          className="object-contain w-full h-full"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div
      className={`flex-shrink-0 rounded border ${s.border} ${s.bg} flex items-center justify-center text-xl`}
      style={{ width: size, height: size }}
    >
      📦
    </div>
  )
}

function ItemCard({ item, label }: { item: BISItem; label?: string }) {
  return (
    <div className="flex gap-2.5 min-w-0">
      <ItemImage item={item} size={60} />
      <div className="flex flex-col gap-1 min-w-0 justify-center">
        {label && (
          <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">{label}</span>
        )}
        <QualityBadge quality={item.quality} />
        <span className="text-xs font-medium text-[var(--color-text-primary)] leading-tight line-clamp-2">
          {item.name}
        </span>
        {Object.keys(item.stats).length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {Object.entries(item.stats).map(([k, v]) => (
              <span
                key={k}
                className="text-[10px] text-[var(--color-text-dim)] capitalize"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {k.replace(/_/g, " ")} <span className="text-[var(--color-text-secondary)]">+{v}</span>
              </span>
            ))}
          </div>
        )}
        {item.marketPrice != null && (
          <span
            className="flex items-center gap-1 text-[10px] text-[var(--color-gold)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <CoinIcon amount={item.marketPrice} />
            {fmtNum(item.marketPrice)}
          </span>
        )}
      </div>
    </div>
  )
}

function RequirementBar({ label, current, required }: { label: string; current: number; required: number }) {
  const pct = Math.min(100, Math.round((current / required) * 100))
  const met = current >= required
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] capitalize ${met ? "text-[var(--color-text-dim)]" : "text-[var(--color-text-secondary)]"}`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {label}
        </span>
        <span
          className={`text-[10px] tabular-nums ${met ? "text-[var(--color-text-dim)]" : "text-[var(--color-red)]"}`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {current}/{required}
        </span>
      </div>
      <div className="h-1 bg-[var(--color-bg-inner)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: met
              ? "var(--color-green)"
              : pct >= 80
              ? "linear-gradient(90deg, #c89540 0%, #f0c14a 100%)"
              : "var(--color-blue)",
          }}
        />
      </div>
    </div>
  )
}

function SlotCard({ slot }: { slot: BISSlot }) {
  const hasEquipped = slot.equipped !== null
  const hasUpgrade = slot.nextTier !== null

  if (!hasEquipped && !hasUpgrade) return null

  return (
    <div className="flex flex-col gap-3 py-4 border-b border-[var(--color-border-subtle)] last:border-b-0 last:pb-0 first:pt-0">
      {/* Slot label row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {SLOT_LABEL[slot.slotType] ?? slot.slotType}
        </span>
        {hasUpgrade && Object.keys(slot.missing).length === 0 && (
          <span className="text-[10px] text-[var(--color-green)] font-semibold tracking-wide">✓ upgrade ready</span>
        )}
        {!hasUpgrade && hasEquipped && (
          <span className="text-[10px] text-[var(--color-text-dim)]">max tier</span>
        )}
      </div>

      {/* Two-column: equipped | upgrade */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: equipped */}
        <div className="flex flex-col gap-2">
          {hasEquipped ? (
            <ItemCard item={slot.equipped!} label="equipped" />
          ) : (
            <div className="flex items-center h-full">
              <span className="text-xs text-[var(--color-text-dim)] italic">nothing yet</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--color-border-subtle)]" />

          {/* Right: upgrade + requirements */}
          {hasUpgrade ? (
            <div className="pl-3 flex flex-col gap-2">
              <ItemCard item={slot.nextTier!} label="upgrade" />

              {/* Requirements */}
              {Object.keys(slot.requirements).length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {Object.entries(slot.requirements).map(([skill, { current, required }]) => (
                    <RequirementBar
                      key={skill}
                      label={skill.replace(/_/g, " ")}
                      current={current}
                      required={required}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="pl-3 flex items-center h-full">
              <span className="text-xs text-[var(--color-text-dim)] italic">—</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UpgradeCostSummary({ slots }: { slots: BISSlot[] }) {
  const items = slots
    .map((s) => s.nextTier)
    .filter((i): i is NonNullable<typeof i> => i !== null && i.marketPrice !== null)
  if (items.length === 0) return null
  const total = items.reduce((sum, i) => sum + (i.marketPrice ?? 0), 0)
  return (
    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)] mt-1">
      <span className="text-xs text-[var(--color-text-muted)]">
        Total upgrade cost ({items.length} items)
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold text-[var(--color-gold)]" style={{ fontFamily: "var(--font-mono)" }}>
        <CoinIcon amount={total} size={13} />
        {fmtNum(total)}
      </span>
    </div>
  )
}

export function BISPanel({ slots }: BISPanelProps) {
  if (slots.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No gear data. Run{" "}
        <code className="text-[var(--color-text-secondary)] bg-[var(--color-bg-inner)] px-1 rounded">
          npx tsx scripts/fetch-catalog.ts
        </code>{" "}
        to populate.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {slots.map((slot) => (
        <SlotCard key={slot.slotType} slot={slot} />
      ))}
      <UpgradeCostSummary slots={slots} />
    </div>
  )
}
