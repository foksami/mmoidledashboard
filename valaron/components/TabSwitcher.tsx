"use client"
// components/TabSwitcher.tsx
import React, { useState, createContext, useContext } from "react"

export type TabId = "main" | "market"

interface TabCtx {
  active: TabId
  setActive: (t: TabId) => void
}

const Ctx = createContext<TabCtx>({ active: "main", setActive: () => {} })

export function useTab() {
  return useContext(Ctx)
}

const TABS: { id: TabId; label: string }[] = [
  { id: "main",   label: "Main"   },
  { id: "market", label: "Market" },
]

interface Props {
  children: React.ReactNode
}

export function TabSwitcher({ children }: Props) {
  const [active, setActive] = useState<TabId>("main")

  return (
    <Ctx.Provider value={{ active, setActive }}>
      {children}
    </Ctx.Provider>
  )
}

export function TabBar() {
  const { active, setActive } = useTab()

  return (
    <div className="flex items-center gap-1">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          className={`text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded transition-colors ${
            active === id
              ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
              : "text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Renders children only when tab matches */
export function TabPanel({ id, children }: { id: TabId; children: React.ReactNode }) {
  const { active } = useTab()
  if (active !== id) return null
  return <>{children}</>
}
