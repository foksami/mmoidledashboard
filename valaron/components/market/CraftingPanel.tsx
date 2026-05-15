"use client"
// components/market/CraftingPanel.tsx
import React, { useState, useMemo } from "react"
import type { CraftingRecipeRow } from "@/lib/queries"
import { fmtNum } from "@/lib/fmt"

type SortKey = "profit" | "buy_order" | "vendor" | "level"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "profit",    label: "Market"    },
  { key: "buy_order", label: "Buy order" },
  { key: "vendor",    label: "Vendor"    },
  { key: "level",     label: "Level"     },
]

const SKILL_LABEL: Record<string, string> = {
  forging:  "Forging",
  alchemy:  "Alchemy",
  cooking:  "Cooking",
  weaving:  "Weaving",
  crafting: "Crafting",
}

function ProfitBadge({ value }: { value: number | null }) {
  if (value == null)
    return <span className="text-[10px] text-[var(--color-text-dim)]">—</span>
  const color =
    value > 0 ? "text-[var(--color-green)]"
    : value < 0 ? "text-red-400"
    : "text-[var(--color-text-dim)]"
  return (
    <span className={`text-[10px] font-semibold ${color}`} style={{ fontFamily: "var(--font-mono)" }}>
      {value > 0 ? "+" : ""}{fmtNum(value)}g
    </span>
  )
}

/** Badge indicating whether recipe is permanent or consumed per craft */
function UsesBadge({ isPermanent, vendorPrice }: { isPermanent: boolean; vendorPrice: number | null }) {
  if (isPermanent) {
    return (
      <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-blue)]/10 text-[var(--color-blue)] font-semibold">
        permanent
      </span>
    )
  }
  return (
    <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-surface-hover)] text-[var(--color-text-dim)]" title="Recipe is consumed per craft">
      ×1{vendorPrice ? ` (${fmtNum(vendorPrice)}g)` : ""}
    </span>
  )
}

interface Props {
  rows: CraftingRecipeRow[]
  /** skill name (lowercase) → level */
  skillLevels?: Map<string, number>
}

export function CraftingPanel({ rows, skillLevels = new Map() }: Props) {
  const [sort, setSort] = useState<SortKey>("profit")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showLocked, setShowLocked] = useState(false)
  const [activeSkill, setActiveSkill] = useState<string>("all")

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No crafting data. Run <code className="text-xs">npm run recipes:fetch</code> to seed recipes.
      </p>
    )
  }

  const canCraft = (r: CraftingRecipeRow) => {
    if (r.levelRequired == null) return true
    const skillKey = (r.skill ?? "crafting").toLowerCase()
    return (skillLevels.get(skillKey) ?? 0) >= r.levelRequired
  }

  // Build skill tab list from available recipes
  const skillTabs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      const k = (r.skill ?? "crafting").toLowerCase()
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([skill, count]) => ({ skill, label: SKILL_LABEL[skill] ?? skill, count }))
  }, [rows])

  const skillFiltered = activeSkill === "all"
    ? rows
    : rows.filter((r) => (r.skill ?? "crafting").toLowerCase() === activeSkill)

  const visible = showLocked
    ? skillFiltered
    : skillFiltered.filter((r) => r.profitPerCraft != null || canCraft(r))

  const activeProfitValue = (r: CraftingRecipeRow) => {
    if (sort === "buy_order") return r.profitBuyOrder
    if (sort === "vendor")    return r.profitVendor
    return r.profitPerCraft
  }

  const sorted = [...visible].sort((a, b) => {
    if (sort === "level") return (a.levelRequired ?? 0) - (b.levelRequired ?? 0)
    // profit sorts: accessible first, then by chosen profit desc
    const aA = canCraft(a) ? 0 : 1
    const bA = canCraft(b) ? 0 : 1
    if (aA !== bA) return aA - bA
    return (activeProfitValue(b) ?? -Infinity) - (activeProfitValue(a) ?? -Infinity)
  })

  const lockedCount = skillFiltered.filter((r) => !canCraft(r)).length

  return (
    <div className="flex flex-col gap-0">
      {/* Skill tabs */}
      {skillTabs.length > 1 && (
        <div className="flex items-center gap-0.5 mb-2 flex-wrap">
          <button
            onClick={() => setActiveSkill("all")}
            className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
              activeSkill === "all"
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            All ({rows.length})
          </button>
          {skillTabs.map(({ skill, label, count }) => (
            <button
              key={skill}
              onClick={() => setActiveSkill(skill)}
              className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
                activeSkill === skill
                  ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Sort + locked toggle */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1">
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
        {lockedCount > 0 && (
          <button
            onClick={() => setShowLocked(!showLocked)}
            className={`ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
              showLocked
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
                : "text-[var(--color-text-dim)]"
            }`}
          >
            {showLocked ? `Hide locked (${lockedCount})` : `Show locked (${lockedCount})`}
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="grid gap-2 pb-1.5 border-b border-[var(--color-border-subtle)] mb-1"
           style={{ gridTemplateColumns: "1fr 3rem 5rem" }}>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Recipe</span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)] text-right">Lv</span>
        <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-secondary)] text-right">
          {sort === "buy_order" ? "Buy ord." : sort === "vendor" ? "Vendor" : sort === "level" ? "Profit" : "Market"}
        </span>
      </div>

      {sorted.map((row) => {
        const accessible = canCraft(row)
        const isOpen = expanded === row.recipeItemId
        const displayProfit = activeProfitValue(row)

        return (
          <div
            key={row.recipeItemId}
            className="flex flex-col gap-0.5 py-2 border-b border-[var(--color-border-subtle)] last:border-b-0 last:pb-0 first:pt-0"
          >
            <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : row.recipeItemId)}>
              <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 3rem 5rem" }}>
                {/* Name + badges */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] flex-shrink-0">⚒️</span>
                  <span className={`text-xs font-medium leading-tight truncate ${accessible ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-dim)]"}`}>
                    {row.outputItemName ?? row.recipeItemName}
                  </span>
                  <UsesBadge isPermanent={row.isPermanent} vendorPrice={row.recipeVendorPrice} />
                </div>

                {/* Level */}
                <span className={`text-[10px] text-right font-semibold ${accessible ? "text-[var(--color-green)]" : "text-[var(--color-text-dim)]"}`}>
                  {row.levelRequired ?? "—"}
                </span>

                {/* Profit */}
                <div className="flex justify-end">
                  <ProfitBadge value={displayProfit} />
                </div>
              </div>
            </button>

            {/* Expanded: breakdown */}
            {isOpen && (
              <div className="mt-1.5 pl-5 flex flex-col gap-1.5">
                {/* Skill + exp */}
                <div className="text-[9px] text-[var(--color-text-dim)]">
                  {row.skill && <span className="capitalize">{row.skill.toLowerCase()}</span>}
                  {row.expPerCraft != null && <> · {fmtNum(row.expPerCraft)} EXP/craft</>}
                </div>

                {/* Materials */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Materials</span>
                  {row.materials.map((m) => (
                    <div key={m.hashedItemId} className="flex items-center gap-1 text-[9px]">
                      <span className="text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-mono)" }}>
                        ×{m.quantity}
                      </span>
                      <span className="text-[var(--color-text-muted)]">{m.itemName}</span>
                      {m.unitPrice != null ? (
                        <span className="ml-auto text-[var(--color-text-secondary)]" style={{ fontFamily: "var(--font-mono)" }}>
                          {fmtNum(m.unitPrice)}g × {m.quantity} = {fmtNum(m.totalCost!)}g
                        </span>
                      ) : (
                        <span className="ml-auto text-[var(--color-text-dim)]">no price</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Recipe cost note for consumable recipes */}
                {!row.isPermanent && row.recipeVendorPrice != null && (
                  <div className="text-[9px] text-[var(--color-text-dim)]">
                    + {fmtNum(row.recipeVendorPrice)}g recipe (consumed per craft)
                  </div>
                )}

                {/* Permanent recipe note */}
                {row.isPermanent && row.recipeVendorPrice != null && (
                  <div className="text-[9px] text-[var(--color-blue)]/80">
                    Recipe: {fmtNum(row.recipeVendorPrice)}g one-time unlock — not added to craft cost
                  </div>
                )}

                {/* Cost summary */}
                <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-dim)]">
                  {row.materialCost != null && (
                    <span>Mats: <span className="text-red-400">{fmtNum(row.materialCost)}g</span></span>
                  )}
                  {row.craftCost > 0 && (
                    <span>+ Recipe: <span className="text-red-400">{fmtNum(row.craftCost)}g</span></span>
                  )}
                </div>

                {/* Output price options + profits */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">Sell options</span>
                  {row.outputPrice != null && (
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[var(--color-text-muted)]">Market (list)</span>
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                        <span className="text-[var(--color-gold)]">{fmtNum(row.outputPrice)}g</span>
                        <ProfitBadge value={row.profitPerCraft} />
                      </span>
                    </div>
                  )}
                  {row.outputBuyPrice != null && (
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[var(--color-text-muted)]">Buy order (instant)</span>
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                        <span className="text-[var(--color-gold)]">{fmtNum(row.outputBuyPrice)}g</span>
                        <ProfitBadge value={row.profitBuyOrder} />
                      </span>
                    </div>
                  )}
                  {row.outputVendorPrice != null && (
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[var(--color-text-muted)]">Vendor (instant)</span>
                      <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                        <span className="text-[var(--color-text-secondary)]">{fmtNum(row.outputVendorPrice)}g</span>
                        <ProfitBadge value={row.profitVendor} />
                      </span>
                    </div>
                  )}
                  {row.outputPrice == null && row.outputBuyPrice == null && row.outputVendorPrice == null && (
                    <span className="text-[9px] text-[var(--color-text-dim)]">no price data — run market:crafting</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
