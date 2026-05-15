import React from "react"
import {
  getAllCharacters,
  getPrimaryCharacter,
  getCharacterByHashedId,
  getCharacterByName,
  getLatestSnapshot,
  getLatestSkills,
  getLatestStats,
  getLatestAction,
  getGoldHistory,
  getTotalXpHistory,
  getAllSkillRates,
  getBISEquipment,
  getDailyDelta,
  getActivityEfficiency,
  getGoalsWithProgress,
  CLASS_STAT_PRIORITY,
} from "@/lib/queries"
import {
  getCharacterEffects,
  getCharacterAction,
  getCharacterInfo,
  getWorldBosses,
  getShrineProgress,
  getWorldLocations,
} from "@/lib/idlemmo"
import { SkillBar } from "@/components/ui/SkillBar"
import { MiniSparkline } from "@/components/ui/MiniSparkline"
import { CharacterSwitcher } from "@/components/CharacterSwitcher"
import { ActionCountdown } from "@/components/ActionCountdown"
import { EffectsPanel } from "@/components/EffectsPanel"
import { WorldBossRadar } from "@/components/WorldBossRadar"
import { ShrinePanel } from "@/components/ShrinePanel"
import { WeatherPanel } from "@/components/WeatherPanel"
import { BISPanel } from "@/components/BISPanel"
import { DailyDeltaPanel } from "@/components/DailyDeltaPanel"
import { EfficiencyPanel } from "@/components/EfficiencyPanel"
import { PetPanel } from "@/components/PetPanel"
import { GoalTrackerPanel } from "@/components/GoalTrackerPanel"
import { NextMovePanel, NextMoveCollapsed } from "@/components/NextMovePanel"
import { rankUpgrades, formatHours } from "@/lib/nextMove"
import { DashboardGrid, type PanelDef } from "@/components/DashboardGrid"
import { CoinIcon } from "@/components/ui/CoinIcon"
import { AutoRefresh } from "@/components/AutoRefresh"
import { fmtNum } from "@/lib/fmt"

// ── helpers ──────────────────────────────────────────────────────────────────

function statusDotColor(status: string | null | undefined): string {
  if (!status) return "bg-[var(--color-text-muted)]"
  const s = status.toUpperCase()
  if (s === "ONLINE") return "bg-[var(--color-green)]"
  if (s === "IDLING") return "bg-[var(--color-gold)]"
  return "bg-[var(--color-red)]"
}

function classBadgeStyle(cls: string | null | undefined): { text: string; border: string } {
  if (!cls) return { text: "text-[var(--color-text-dim)]", border: "border-[var(--color-border-subtle)]" }
  const c = cls.toUpperCase()
  if (c === "WARRIOR") return { text: "text-orange-400", border: "border-orange-400/40" }
  if (c === "RANGER") return { text: "text-[var(--color-green)]", border: "border-[var(--color-green)]/40" }
  if (c === "MAGE") return { text: "text-[var(--color-purple)]", border: "border-[var(--color-purple)]/40" }
  return { text: "text-[var(--color-text-dim)]", border: "border-[var(--color-border-subtle)]" }
}

// Always fetch fresh — action/skills change frequently
export const dynamic = "force-dynamic"

// ── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const charParam = typeof params.char === "string" ? params.char : undefined

  // Resolve the active character — look up by name first (safe), fall back to hashedId for backward compat
  const allCharacters = await getAllCharacters()
  const activeCharacter = charParam
    ? (await getCharacterByName(charParam))
      ?? (await getCharacterByHashedId(charParam))
      ?? (await getPrimaryCharacter())
    : await getPrimaryCharacter()

  // Build the tabs list
  const characterTabs = allCharacters.map((c) => ({
    hashedId: c.hashedId,
    name: c.name,
    class: c.class ?? "—",
    isPrimary: c.isPrimary ?? false,
    totalLevel: undefined as number | undefined,
  }))

  if (!activeCharacter) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-muted)] text-sm">
          No characters found. Run the poller to sync your data.
        </p>
      </main>
    )
  }

  const hashedId = activeCharacter.hashedId

  // Parallel data fetch — DB queries + live API calls
  const [snapshot, skills, stats, dbAction, goldHistory, xpHistory, skillRates, effects, worldBosses, shrine, locations, liveInfo, liveAction] =
    await Promise.all([
      getLatestSnapshot(hashedId),
      getLatestSkills(hashedId),
      getLatestStats(hashedId),
      getLatestAction(hashedId),
      getGoldHistory(hashedId, 60),
      getTotalXpHistory(hashedId, 60),
      getAllSkillRates(hashedId),
      getCharacterEffects(hashedId).catch(() => []),
      getWorldBosses().catch(() => []),
      getShrineProgress().catch(() => []),
      getWorldLocations().catch(() => []),
      getCharacterInfo(hashedId).catch(() => null),
      getCharacterAction(hashedId).catch(() => null),
    ])

  // Merge live action (always current) with DB action (has detectedAt for progress tracking)
  const liveActionType = liveAction?.type ?? null
  const liveExpiresAt = liveAction?.expires_at ?? null

  // Only reuse DB detectedAt if it's the same session — same type AND same expiresAt (±2 min)
  const sameSession = (() => {
    if (!liveActionType || !dbAction?.actionType || !liveExpiresAt || !dbAction.expiresAt) return false
    if (liveActionType.toUpperCase() !== dbAction.actionType.toUpperCase()) return false
    const diff = Math.abs(new Date(liveExpiresAt).getTime() - new Date(dbAction.expiresAt).getTime())
    return diff < 2 * 60 * 1000
  })()

  const action = {
    actionType: liveActionType ?? dbAction?.actionType ?? null,
    actionTitle: liveAction?.title ?? dbAction?.actionTitle ?? null,
    expiresAt: liveExpiresAt ?? dbAction?.expiresAt ?? null,
    // Same session → use DB detectedAt (exact start time from poller)
    // Different session + live action exists → use page render time (progress from ~0%, fills in real-time)
    // No live action → null
    detectedAt: sameSession
      ? dbAction!.detectedAt
      : liveExpiresAt != null
        ? new Date().toISOString()
        : null,
  }

  // Find active weather for the character's current location
  const now = Date.now()
  const currentLocation = locations.find(
    (l) => l.name === snapshot?.locationName
  )
  let activeWeather: { name: string; buffs: string[]; endsAt: string } | null = null
  if (currentLocation?.forecast) {
    for (const entry of currentLocation.forecast) {
      const start = new Date(entry.starts_at).getTime()
      const end = new Date(entry.ends_at).getTime()
      if (start <= now && now <= end && entry.weathers.length > 0) {
        const w = entry.weathers[0]
        activeWeather = { name: w.name, buffs: w.buffs, endsAt: entry.ends_at }
        break
      }
    }
  }

  // Combat level for boss filtering — check skills AND stats, default null = show all
  const combatLevel: number | null =
    liveInfo?.skills?.["combat"]?.level
    ?? liveInfo?.stats?.["combat"]?.level
    ?? skills.find((s) => s.skillName?.toLowerCase() === "combat")?.level
    ?? stats.find((s) => s.statName?.toLowerCase() === "combat")?.level
    ?? null

  // BIS gear, daily delta, efficiency, goals — parallel
  const [bisSlots, dailyDelta, activityEfficiency, goalProgress] = await Promise.all([
    getBISEquipment(skills, stats, activeCharacter.class),
    getDailyDelta(hashedId),
    getActivityEfficiency(hashedId),
    getGoalsWithProgress(hashedId, skills, stats, snapshot, skillRates),
  ])

  // Next Move ranking — pure computation, no extra DB calls
  const cls = activeCharacter.class?.toUpperCase() ?? ""
  const nextMoveCandidates = rankUpgrades(
    bisSlots,
    activityEfficiency,
    CLASS_STAT_PRIORITY[cls] ?? []
  )

  // Pet from raw snapshot JSON
  let activePet: { name: string; level: number; imageUrl: string | null } | null = null
  if (snapshot?.raw) {
    try {
      const raw = JSON.parse(snapshot.raw)
      if (raw.equipped_pet) {
        activePet = { name: raw.equipped_pet.name, level: raw.equipped_pet.level, imageUrl: raw.equipped_pet.image_url ?? null }
      }
    } catch {}
  }

  // Find the skill matching the current action (e.g. WOODCUTTING → "woodcutting")
  // Prefer live API data (always current) over DB snapshot (may lag behind polls)
  const actionSkillKey = action?.actionType?.toLowerCase() ?? null
  const actionSkill = actionSkillKey
    ? skills.find((s) => s.skillName?.toLowerCase() === actionSkillKey) ?? null
    : null
  const liveSkill = actionSkillKey ? liveInfo?.skills[actionSkillKey] ?? null : null
  const actionSkillLevel = liveSkill?.level ?? actionSkill?.level ?? null
  const actionSkillExperience = liveSkill?.experience ?? actionSkill?.experience ?? null
  const actionSkillRate = actionSkill?.skillName
    ? (skillRates.get(actionSkill.skillName) ?? null)
    : null

  // Patch total level into the active tab
  if (snapshot?.totalLevel) {
    const idx = characterTabs.findIndex((c) => c.hashedId === hashedId)
    if (idx !== -1) characterTabs[idx].totalLevel = snapshot.totalLevel
  }

  // Sort skills: level > 1 first (desc), then level-1 skills (by name)
  const sortedSkills = [...skills]
    .filter((s) => s.level != null && s.level > 0)
    .sort((a, b) => {
      const aLvl = a.level ?? 0
      const bLvl = b.level ?? 0
      if (aLvl > 1 && bLvl <= 1) return -1
      if (aLvl <= 1 && bLvl > 1) return 1
      if (aLvl > 1 && bLvl > 1) return bLvl - aLvl
      return (a.skillName ?? "").localeCompare(b.skillName ?? "")
    })

  const badgeStyle = classBadgeStyle(activeCharacter.class)
  const dotColor = statusDotColor(snapshot?.currentStatus)

  return (
    <div className="min-h-screen flex flex-col">
      <AutoRefresh intervalMs={3 * 60 * 1000} />
      {/* Character switcher — full width top bar */}
      <CharacterSwitcher
        characters={characterTabs}
        activeName={activeCharacter.name}
      />

      <div className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full flex flex-col gap-3 md:gap-4">
        {/* ── Top HUD ── */}
        <div
          className="relative overflow-hidden rounded-xl border border-[var(--color-border-subtle)] shadow-[0_4px_32px_rgba(0,0,0,0.6)]"
          style={{ background: "linear-gradient(135deg, #1a1510 0%, #161210 50%, #12100d 100%)" }}
        >
          {/* Gold top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(200,149,64,0.8) 30%, rgba(240,193,74,1) 50%, rgba(200,149,64,0.8) 70%, transparent)" }}
          />
          {/* Subtle radial glow from top-left */}
          <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(200,149,64,0.06) 0%, transparent 70%)" }} />

          <div className="px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            {/* Name */}
            <h1
              className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] tracking-wide"
              style={{
                fontFamily: "var(--font-display)",
                textShadow: "0 0 40px rgba(240,193,74,0.15), 0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              {activeCharacter.name}
            </h1>

            {/* Class badge */}
            {activeCharacter.class && (
              <span
                className={[
                  "text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-md border bg-black/30",
                  badgeStyle.text,
                  badgeStyle.border,
                ].join(" ")}
              >
                {activeCharacter.class}
              </span>
            )}

            {/* Status */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_6px_currentColor] flex-shrink-0`} />
              <span className="text-[11px] text-[var(--color-text-dim)] uppercase tracking-widest">
                {snapshot?.currentStatus ?? "UNKNOWN"}
              </span>
            </div>

            {/* Location */}
            {snapshot?.locationName && (
              <span className="text-sm text-[var(--color-text-dim)] flex items-center gap-1">
                <span className="text-xs opacity-60">📍</span>
                {snapshot.locationName}
              </span>
            )}

            <div className="flex-1" />

            {/* Currency + level chips */}
            <div className="flex items-center gap-3 flex-wrap" style={{ fontFamily: "var(--font-mono)" }}>
              {snapshot?.gold != null && (
                <div className="flex items-center gap-1.5 bg-black/30 border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1">
                  <CoinIcon amount={snapshot.gold} size={13} />
                  <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    {fmtNum(snapshot.gold)}
                  </span>
                </div>
              )}
              {snapshot?.tokens != null && (
                <div className="flex items-center gap-1.5 bg-black/30 border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1">
                  <span className="text-[var(--color-blue)] text-sm leading-none">◈</span>
                  <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    {fmtNum(snapshot.tokens)}
                  </span>
                </div>
              )}
              {snapshot?.shards != null && (
                <div className="flex items-center gap-1.5 bg-black/30 border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1">
                  <span className="text-[var(--color-purple)] text-sm leading-none">◇</span>
                  <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    {fmtNum(snapshot.shards)}
                  </span>
                </div>
              )}
              {snapshot?.totalLevel != null && (
                <div
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 border"
                  style={{ background: "rgba(240,193,74,0.08)", borderColor: "rgba(240,193,74,0.25)" }}
                >
                  <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-widest">Lv</span>
                  <span
                    className="text-sm font-bold text-[var(--color-gold)]"
                    style={{ textShadow: "0 0 12px rgba(240,193,74,0.4)" }}
                  >
                    {snapshot.totalLevel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Draggable + collapsible panel grid */}
        {(() => {
          const leftPanels: PanelDef[] = [
            {
              id: "action",
              title: "Current Action",
              icon: "⚡",
              accent: true,
              content: (
                <ActionCountdown
                  actionType={action?.actionType ?? null}
                  actionTitle={action?.actionTitle ?? null}
                  expiresAt={action?.expiresAt ?? null}
                  detectedAt={action?.detectedAt ?? null}
                  skillLevel={actionSkillLevel}
                  skillExperience={actionSkillExperience}
                  skillXpRate={actionSkillRate}
                />
              ),
            },
            {
              id: "bosses",
              title: "World Bosses",
              icon: "☠",
              content: <WorldBossRadar bosses={worldBosses} combatLevel={combatLevel ?? undefined} />,
              collapsedContent: (() => {
                const available = worldBosses
                  .filter((b) => combatLevel === null || b.level <= combatLevel)
                  .sort((a, b) => b.level - a.level)
                  .slice(0, 2)
                if (available.length === 0) return <span className="text-xs text-[var(--color-text-dim)]">No bosses in range</span>
                return (
                  <div className="flex flex-col gap-1">
                    {available.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs text-[var(--color-text-secondary)] truncate block">{b.name}</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">📍 {b.location.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-[var(--color-text-dim)]" style={{ fontFamily: "var(--font-mono)" }}>Lv {b.level}</span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                            b.status === "IN_PROGRESS" ? "text-[var(--color-red)]" :
                            b.status === "READY_FOR_LOBBY" ? "text-[var(--color-green)]" :
                            "text-[var(--color-gold)]"
                          }`}>
                            {b.status === "IN_PROGRESS" ? "Battle" : b.status === "READY_FOR_LOBBY" ? "Open" : "Soon"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })(),
            },
            {
              id: "skills",
              title: "Skills",
              icon: "📊",
              badge: sortedSkills.length > 0 ? `${sortedSkills.length} skills` : undefined,
              badgeColor: "text-[var(--color-text-muted)]",
              content:
                sortedSkills.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No skill data yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {sortedSkills.map((skill) => {
                      const key = skill.skillName?.toLowerCase() ?? ""
                      const live = liveInfo?.skills[key] ?? null
                      const isActive = key === actionSkillKey
                      return (
                        <SkillBar
                          key={skill.skillName}
                          name={skill.skillName ?? ""}
                          level={live?.level ?? skill.level ?? 0}
                          experience={live?.experience ?? skill.experience ?? 0}
                          delta={isActive ? (skillRates.get(skill.skillName ?? "") ?? undefined) : undefined}
                        />
                      )
                    })}
                  </div>
                ),
            },
            {
              id: "bis",
              title: "Best in Slot",
              icon: "⚔️",
              badge: bisSlots.length > 0 ? `${bisSlots.length} slots` : undefined,
              badgeColor: "text-[var(--color-text-muted)]",
              content: <BISPanel slots={bisSlots} />,
            },
            {
              id: "next-move",
              title: "Next Move",
              icon: "🎯",
              badge: nextMoveCandidates[0]?.alreadyUnlockable
                ? "ready"
                : nextMoveCandidates[0]?.totalHours != null
                ? formatHours(nextMoveCandidates[0].totalHours)
                : undefined,
              badgeColor: nextMoveCandidates[0]?.alreadyUnlockable
                ? "text-[var(--color-green)]"
                : "text-[var(--color-text-muted)]",
              content: <NextMovePanel candidates={nextMoveCandidates} />,
              collapsedContent: <NextMoveCollapsed candidates={nextMoveCandidates} />,
            },
            {
              id: "efficiency",
              title: "Activity Efficiency",
              icon: "📈",
              badge: "7d",
              badgeColor: "text-[var(--color-text-muted)]",
              content: <EfficiencyPanel activities={activityEfficiency} />,
            },
          ]

          const rightPanels: PanelDef[] = [
            {
              id: "daily",
              title: "Last 24h",
              icon: "📅",
              content: <DailyDeltaPanel delta={dailyDelta} />,
            },
            {
              id: "goals",
              title: "Goals",
              icon: "🎯",
              content: (
                <GoalTrackerPanel
                  goals={goalProgress}
                  hashedId={hashedId}
                  availableSkills={skills.map((s) => s.skillName ?? "").filter(Boolean).sort()}
                  availableStats={stats.map((s) => s.statName ?? "").filter(Boolean).sort()}
                />
              ),
            },
            ...(activePet
              ? [{ id: "pet", title: "Pet", icon: "🐾", content: <PetPanel pet={activePet} /> } satisfies PanelDef]
              : []),
            ...(stats.length > 0
              ? [
                  {
                    id: "stats",
                    title: "Stats",
                    icon: "⚔️",
                    accent: true,
                    badgeColor: "text-[var(--color-gold)]",
                    content: (
                      <div className="flex flex-col gap-3">
                        {stats
                          .filter((s) => s.level != null && s.level > 0)
                          .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
                          .map((stat) => (
                            <SkillBar
                              key={stat.statName}
                              name={stat.statName ?? ""}
                              level={stat.level ?? 0}
                              experience={stat.experience ?? 0}
                            />
                          ))}
                      </div>
                    ),
                  } satisfies PanelDef,
                ]
              : []),
            ...(effects.length > 0
              ? [{ id: "effects", title: "Active Effects", icon: "✦", accent: true, content: <EffectsPanel effects={effects} /> } satisfies PanelDef]
              : []),
            {
              id: "weather",
              title: "Weather",
              icon: "🌤",
              content: <WeatherPanel weather={activeWeather} locationName={snapshot?.locationName} />,
            },
            ...(shrine.length > 0
              ? [{ id: "shrine", title: "Shrine", icon: "🕯", content: <ShrinePanel tiers={shrine} /> } satisfies PanelDef]
              : []),
            ...(goldHistory.length > 1
              ? [
                  {
                    id: "gold",
                    title: "Gold History",
                    icon: <CoinIcon amount={goldHistory[goldHistory.length - 1]} size={14} />,
                    badge: fmtNum(goldHistory[goldHistory.length - 1]) + " gp",
                    badgeColor: "text-[var(--color-gold)]",
                    content: <MiniSparkline data={goldHistory} color="#f0c14a" height={56} className="w-full" />,
                  } satisfies PanelDef,
                ]
              : []),
            ...(xpHistory.length > 1
              ? [
                  {
                    id: "xp",
                    title: "Total XP",
                    icon: "✦",
                    badge: fmtNum(xpHistory[xpHistory.length - 1]),
                    badgeColor: "text-[var(--color-blue)]",
                    content: <MiniSparkline data={xpHistory} color="#82b3ee" height={56} className="w-full" />,
                  } satisfies PanelDef,
                ]
              : []),
          ]

          return <DashboardGrid leftPanels={leftPanels} rightPanels={rightPanels} />
        })()}
      </div>
    </div>
  )
}
