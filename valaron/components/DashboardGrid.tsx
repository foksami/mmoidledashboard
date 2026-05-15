"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type PanelDef = {
  id: string
  title: string
  icon?: React.ReactNode
  badge?: string | number
  badgeColor?: string
  accent?: boolean
  content: React.ReactNode
  /** Optional content shown only when the panel is collapsed */
  collapsedContent?: React.ReactNode
}

const STORAGE_KEY = "dashboard-layout"

function loadLayout(leftIds: string[], rightIds: string[]) {
  if (typeof window === "undefined") return { leftOrder: leftIds, rightOrder: rightIds, collapsed: [] as string[] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { leftOrder: leftIds, rightOrder: rightIds, collapsed: [] as string[] }
    const parsed = JSON.parse(raw)
    const savedLeft: string[] = parsed.leftOrder ?? []
    const savedRight: string[] = parsed.rightOrder ?? []
    const allValid = new Set([...leftIds, ...rightIds])

    // Remove panels that no longer exist
    const cleanLeft = savedLeft.filter((id) => allValid.has(id))
    const cleanRight = savedRight.filter((id) => allValid.has(id))

    // New panels (never saved yet) → add to their default column
    const savedAll = new Set([...cleanLeft, ...cleanRight])
    const newLeft = leftIds.filter((id) => !savedAll.has(id))
    const newRight = rightIds.filter((id) => !savedAll.has(id))

    return {
      leftOrder: [...cleanLeft, ...newLeft],
      rightOrder: [...cleanRight, ...newRight],
      collapsed: (parsed.collapsed ?? []) as string[],
    }
  } catch {
    return { leftOrder: leftIds, rightOrder: rightIds, collapsed: [] as string[] }
  }
}

function saveLayout(leftOrder: string[], rightOrder: string[], collapsed: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ leftOrder, rightOrder, collapsed }))
  } catch {}
}

// ── drag handle icon ──────────────────────────────────────────────────────────

function DragDots() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
      <circle cx="2.5" cy="3"  r="1.4" />
      <circle cx="7.5" cy="3"  r="1.4" />
      <circle cx="2.5" cy="8"  r="1.4" />
      <circle cx="7.5" cy="8"  r="1.4" />
      <circle cx="2.5" cy="13" r="1.4" />
      <circle cx="7.5" cy="13" r="1.4" />
    </svg>
  )
}

// ── chevron ───────────────────────────────────────────────────────────────────

function Chevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 260ms cubic-bezier(0.4,0,0.2,1)" }}
    >
      <path d="M2 4.5 L6 8.5 L10 4.5" />
    </svg>
  )
}

// ── single draggable + collapsible panel ─────────────────────────────────────

function SortablePanel({
  def,
  collapsed,
  onToggle,
  overlay = false,
}: {
  def: PanelDef
  collapsed: boolean
  onToggle: (id: string) => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: def.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
    zIndex: overlay ? 999 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        // Base card
        "group relative flex flex-col",
        "rounded-xl overflow-hidden",
        "bg-[var(--color-bg-panel)]",
        // Border — subtle with gold hover state
        "border border-[var(--color-border-subtle)]",
        "hover:border-[var(--color-border-accent)]/25",
        // Depth
        "shadow-[0_4px_24px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.03)_inset]",
        "hover:shadow-[0_8px_40px_rgba(0,0,0,0.65),0_0_0_1px_rgba(200,149,64,0.12),0_1px_0_rgba(255,255,255,0.04)_inset]",
        "transition-[border-color,box-shadow] duration-300",
        overlay ? "shadow-[0_16px_64px_rgba(0,0,0,0.8),0_0_0_1px_rgba(200,149,64,0.3)]" : "",
      ].filter(Boolean).join(" ")}
    >
      {/* Gold gradient top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200,149,64,0.7) 30%, rgba(240,193,74,1) 50%, rgba(200,149,64,0.7) 70%, transparent 100%)" }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[rgba(0,0,0,0.18)]">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="flex-shrink-0 text-[var(--color-border-subtle)] hover:text-[var(--color-text-muted)] cursor-grab active:cursor-grabbing transition-colors duration-150 touch-none px-0.5"
          aria-label="Drag to reorder"
          tabIndex={-1}
          suppressHydrationWarning
        >
          <DragDots />
        </button>

        {/* Clickable: icon + title */}
        <button
          onClick={() => onToggle(def.id)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-90 transition-opacity"
        >
          {def.icon && (
            <span className="text-[var(--color-text-muted)] flex-shrink-0 text-sm leading-none">
              {def.icon}
            </span>
          )}
          <h3
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-dim)] truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {def.title}
          </h3>
        </button>

        {/* Badge + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {def.badge !== undefined && (
            <span
              className={`text-[11px] font-semibold tracking-wide ${def.badgeColor ?? "text-[var(--color-text-muted)]"}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {def.badge}
            </span>
          )}
          <button
            onClick={() => onToggle(def.id)}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] transition-colors"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <Chevron collapsed={collapsed} />
          </button>
        </div>
      </div>

      {/* Thin separator */}
      <div className="h-px bg-[var(--color-border-subtle)] opacity-60" />

      {/* Content — animated collapse via CSS grid trick */}
      <div className={`panel-collapse-wrap ${collapsed ? "closed" : "open"}`}>
        <div className="panel-collapse-inner">
          <div className="px-4 py-4">{def.content}</div>
        </div>
      </div>

      {/* Collapsed preview — only shown when collapsed */}
      {def.collapsedContent && collapsed && (
        <div className="px-4 py-2.5 border-t border-[var(--color-border-subtle)]/50">
          {def.collapsedContent}
        </div>
      )}
    </div>
  )
}

// ── column ────────────────────────────────────────────────────────────────────

function Column({
  columnId,
  ids,
  panels,
  collapsed,
  onToggle,
}: {
  columnId: string
  ids: string[]
  panels: Map<string, PanelDef>
  collapsed: Set<string>
  onToggle: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={[
          "flex flex-col gap-3 md:gap-4 min-h-24 rounded-xl transition-colors duration-200",
          isOver ? "bg-[rgba(200,149,64,0.04)]" : "",
        ].join(" ")}
      >
        {ids.map((id) => {
          const def = panels.get(id)
          if (!def) return null
          return (
            <SortablePanel
              key={id}
              def={def}
              collapsed={collapsed.has(id)}
              onToggle={onToggle}
            />
          )
        })}
      </div>
    </SortableContext>
  )
}

// ── main export ───────────────────────────────────────────────────────────────

export function DashboardGrid({
  leftPanels,
  rightPanels,
}: {
  leftPanels: PanelDef[]
  rightPanels: PanelDef[]
}) {
  const leftIds = leftPanels.map((p) => p.id)
  const rightIds = rightPanels.map((p) => p.id)
  const allPanels = new Map([...leftPanels, ...rightPanels].map((p) => [p.id, p]))

  const [leftOrder, setLeftOrder] = useState<string[]>(leftIds)
  const [rightOrder, setRightOrder] = useState<string[]>(rightIds)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const saved = loadLayout(leftIds, rightIds)
    setLeftOrder(saved.leftOrder)
    setRightOrder(saved.rightOrder)
    setCollapsed(new Set(saved.collapsed))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = useCallback(
    (left: string[], right: string[], col: Set<string>) => saveLayout(left, right, [...col]),
    []
  )

  const toggleCollapse = useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        persist(leftOrder, rightOrder, next)
        return next
      })
    },
    [leftOrder, rightOrder, persist]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const aId = active.id as string
    const oId = over.id as string
    if (aId === oId) return

    const aInLeft = leftOrder.includes(aId)

    // Dropped on a column droppable zone (empty space at bottom of column)
    if (oId === "col-left" || oId === "col-right") {
      const targetLeft = oId === "col-left"
      if (aInLeft === targetLeft) return
      if (aInLeft) {
        const nL = leftOrder.filter((id) => id !== aId)
        const nR = [...rightOrder, aId]
        setLeftOrder(nL); setRightOrder(nR); persist(nL, nR, collapsed)
      } else {
        const nR = rightOrder.filter((id) => id !== aId)
        const nL = [...leftOrder, aId]
        setLeftOrder(nL); setRightOrder(nR); persist(nL, nR, collapsed)
      }
      return
    }

    const oInLeft = leftOrder.includes(oId)

    if (aInLeft && oInLeft) {
      // Same column — left
      const next = arrayMove(leftOrder, leftOrder.indexOf(aId), leftOrder.indexOf(oId))
      setLeftOrder(next); persist(next, rightOrder, collapsed)
    } else if (!aInLeft && !oInLeft) {
      // Same column — right
      const next = arrayMove(rightOrder, rightOrder.indexOf(aId), rightOrder.indexOf(oId))
      setRightOrder(next); persist(leftOrder, next, collapsed)
    } else if (aInLeft && !oInLeft) {
      // Left → Right: insert after hovered item
      const nL = leftOrder.filter((id) => id !== aId)
      const idx = rightOrder.indexOf(oId)
      const nR = [...rightOrder.slice(0, idx + 1), aId, ...rightOrder.slice(idx + 1)]
      setLeftOrder(nL); setRightOrder(nR); persist(nL, nR, collapsed)
    } else {
      // Right → Left: insert after hovered item
      const nR = rightOrder.filter((id) => id !== aId)
      const idx = leftOrder.indexOf(oId)
      const nL = [...leftOrder.slice(0, idx + 1), aId, ...leftOrder.slice(idx + 1)]
      setLeftOrder(nL); setRightOrder(nR); persist(nL, nR, collapsed)
    }
  }

  const overlayDef = activeId ? allPanels.get(activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] gap-3 md:gap-4 items-start">
        <Column columnId="col-left"  ids={leftOrder}  panels={allPanels} collapsed={collapsed} onToggle={toggleCollapse} />
        <Column columnId="col-right" ids={rightOrder} panels={allPanels} collapsed={collapsed} onToggle={toggleCollapse} />
      </div>

      <DragOverlay>
        {overlayDef && (
          <SortablePanel
            def={overlayDef}
            collapsed={collapsed.has(overlayDef.id)}
            onToggle={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
