"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { GoalProgress } from "@/lib/queries"
import { fmtNum, fmtDate } from "@/lib/fmt"
import { addGoal, deleteGoal } from "@/app/actions"

interface GoalTrackerPanelProps {
  goals: GoalProgress[]
  hashedId: string
  availableSkills: string[]
  availableStats: string[]
}

function formatEta(hours: number): string {
  if (hours < 1 / 60) return "<1m"
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(hours / 24)
  const h = Math.round(hours % 24)
  return h > 0 ? `${d}d ${h}h` : `${d}d`
}

function metricLabel(metric: string, args: Record<string, string>): string {
  switch (metric) {
    case "skill_level": return `${args.skill ?? "?"} level`
    case "skill_xp":    return `${args.skill ?? "?"} XP`
    case "stat_level":  return `${args.stat ?? "?"} level`
    case "gold":        return "gold"
    case "total_level": return "total level"
    default:            return metric
  }
}

const inputCls = "w-full bg-[var(--color-bg-inner)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
const selectCls = inputCls + " cursor-pointer appearance-none"

// ── Add form ──────────────────────────────────────────────────────────────────

function AddGoalForm({
  hashedId,
  availableSkills,
  availableStats,
  onDone,
}: {
  hashedId: string
  availableSkills: string[]
  availableStats: string[]
  onDone: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [metric, setMetric] = useState("skill_level")
  const [isPending, startTransition] = useTransition()

  const needsSkill = metric === "skill_level" || metric === "skill_xp"
  const needsStat  = metric === "stat_level"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("hashedId", hashedId)
    startTransition(async () => {
      await addGoal(fd)
      router.refresh()
      setOpen(false)
      onDone()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-gold)] transition-colors group"
      >
        <span className="w-5 h-5 rounded-md border border-[var(--color-border-subtle)] flex items-center justify-center group-hover:border-[var(--color-gold)]/40 transition-colors text-sm leading-none">+</span>
        <span>Add goal</span>
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-3"
    >
      {/* Name */}
      <input
        name="name"
        required
        placeholder="Goal name"
        className={inputCls}
      />

      {/* Metric + target on same row */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <select
            name="metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className={selectCls}
          >
            <option value="skill_level">Skill level</option>
            <option value="skill_xp">Skill XP</option>
            <option value="stat_level">Stat level</option>
            <option value="gold">Gold</option>
            <option value="total_level">Total level</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] text-[10px]">▾</span>
        </div>

        <input
          name="target"
          type="number"
          required
          min={1}
          placeholder="Target"
          className={`${inputCls} w-24`}
        />
      </div>

      {/* Skill dropdown */}
      {needsSkill && (
        <div className="relative">
          <select name="skill" required className={selectCls}>
            <option value="">— pick skill —</option>
            {availableSkills.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] text-[10px]">▾</span>
        </div>
      )}

      {/* Stat dropdown */}
      {needsStat && (
        <div className="relative">
          <select name="stat" required className={selectCls}>
            <option value="">— pick stat —</option>
            {availableStats.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] text-[10px]">▾</span>
        </div>
      )}

      {/* Deadline */}
      <input
        name="deadline"
        type="date"
        className={inputCls}
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Goal row ──────────────────────────────────────────────────────────────────

function GoalRow({ goal }: { goal: GoalProgress }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteGoal(goal.id)
      router.refresh()
    })
  }

  return (
    <div className={`flex flex-col gap-1.5 transition-opacity duration-200 ${isPending ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--color-text-primary)] truncate">{goal.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-mono)" }}>
            {fmtNum(goal.current)} / {fmtNum(goal.target)} {metricLabel(goal.metric, goal.metricArgs)}
          </span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-red)] text-sm leading-none disabled:opacity-40 transition-colors w-4 text-center"
            title="Remove goal"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[var(--color-bg-inner)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${goal.pct}%`,
              background: goal.pct >= 80
                ? "linear-gradient(90deg, #c89540 0%, #f0c14a 100%)"
                : "var(--color-blue)",
              boxShadow: goal.pct >= 80 ? "0 0 6px rgba(240,193,74,0.4)" : undefined,
            }}
          />
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)] min-w-[3ch] text-right tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
          {goal.pct}%
        </span>
      </div>

      {goal.etaHours !== null && (
        <span className="text-[10px] text-[var(--color-text-dim)]" style={{ fontFamily: "var(--font-mono)" }}>
          ETA {formatEta(goal.etaHours)}
          {goal.deadline && ` · due ${fmtDate(goal.deadline)}`}
        </span>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GoalTrackerPanel({ goals, hashedId, availableSkills, availableStats }: GoalTrackerPanelProps) {
  const active = goals.filter((g) => !g.completedAt)
  const done   = goals.filter((g) => g.completedAt)

  return (
    <div className="flex flex-col gap-3">
      {active.length === 0 && done.length === 0 && (
        <p className="text-xs text-[var(--color-text-dim)]">No goals yet.</p>
      )}

      {active.map((g) => (
        <GoalRow key={g.id} goal={g} />
      ))}

      {done.length > 0 && (
        <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-1 flex flex-col gap-1">
          {done.map((g) => (
            <CompletedRow key={g.id} goal={g} />
          ))}
        </div>
      )}

      <AddGoalForm
        hashedId={hashedId}
        availableSkills={availableSkills}
        availableStats={availableStats}
        onDone={() => {}}
      />
    </div>
  )
}

function CompletedRow({ goal }: { goal: GoalProgress }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--color-green)]">✓</span>
        <span className="text-xs text-[var(--color-text-dim)] line-through">{goal.name}</span>
      </div>
      <button
        onClick={() => startTransition(async () => { await deleteGoal(goal.id); router.refresh() })}
        disabled={isPending}
        className="text-[var(--color-text-dim)] hover:text-[var(--color-red)] text-sm leading-none disabled:opacity-40 transition-colors"
      >
        ×
      </button>
    </div>
  )
}
