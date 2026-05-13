import React from "react"
import {
  getAllCharacters,
  getPrimaryCharacter,
  getCharacterByHashedId,
  getLatestSnapshot,
  getLatestSkills,
  getLatestStats,
  getLatestAction,
  getGoldHistory,
  getTotalXpHistory,
} from "@/lib/queries"
import { Panel } from "@/components/ui/Panel"
import { SkillBar } from "@/components/ui/SkillBar"
import { MiniSparkline } from "@/components/ui/MiniSparkline"
import { CharacterSwitcher } from "@/components/CharacterSwitcher"
import { ActionCountdown } from "@/components/ActionCountdown"

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

// ── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const charParam = typeof params.char === "string" ? params.char : undefined

  // Resolve the active character
  const [allCharacters, primaryCharacter] = await Promise.all([
    getAllCharacters(),
    charParam ? getCharacterByHashedId(charParam) : getPrimaryCharacter(),
  ])

  // If the URL param didn't match any character, fall back to primary
  const activeCharacter =
    charParam && !primaryCharacter
      ? await getPrimaryCharacter()
      : primaryCharacter

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

  // Parallel data fetch
  const [snapshot, skills, stats, action, goldHistory, xpHistory] =
    await Promise.all([
      getLatestSnapshot(hashedId),
      getLatestSkills(hashedId),
      getLatestStats(hashedId),
      getLatestAction(hashedId),
      getGoldHistory(hashedId, 60),
      getTotalXpHistory(hashedId, 60),
    ])

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
      {/* Character switcher — full width top bar */}
      <CharacterSwitcher
        characters={characterTabs}
        activeHashedId={hashedId}
      />

      <div className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full flex flex-col gap-4 md:gap-6">
        {/* Top HUD */}
        <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border-subtle)] rounded-sm panel-accent px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* Name */}
            <h1
              className="text-2xl md:text-3xl font-semibold text-[var(--color-text-primary)] tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeCharacter.name}
            </h1>

            {/* Class badge */}
            {activeCharacter.class && (
              <span
                className={[
                  "text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded border",
                  badgeStyle.text,
                  badgeStyle.border,
                ].join(" ")}
              >
                {activeCharacter.class}
              </span>
            )}

            {/* Status dot + status text */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
              <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                {snapshot?.currentStatus ?? "UNKNOWN"}
              </span>
            </div>

            {/* Location */}
            {snapshot?.locationName && (
              <span className="text-sm text-[var(--color-text-dim)]">
                📍 {snapshot.locationName}
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Currency row */}
            <div className="flex items-center gap-4 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              {snapshot?.gold != null && (
                <span className="flex items-center gap-1">
                  <span className="text-[var(--color-gold)]">⬡</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {snapshot.gold.toLocaleString()}
                  </span>
                </span>
              )}
              {snapshot?.tokens != null && (
                <span className="flex items-center gap-1">
                  <span className="text-[var(--color-blue)]">◈</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {snapshot.tokens.toLocaleString()}
                  </span>
                </span>
              )}
              {snapshot?.shards != null && (
                <span className="flex items-center gap-1">
                  <span className="text-[var(--color-purple)]">◇</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {snapshot.shards.toLocaleString()}
                  </span>
                </span>
              )}
              {snapshot?.totalLevel != null && (
                <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                  <span>Lv</span>
                  <span className="text-[var(--color-gold)] font-bold">{snapshot.totalLevel}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] gap-4 md:gap-6 items-start">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Current Action */}
            <Panel title="Current Action" icon="⚡" accent>
              <ActionCountdown
                actionType={action?.actionType ?? null}
                actionTitle={action?.actionTitle ?? null}
                expiresAt={action?.expiresAt ?? null}
                startedAt={action?.startedAt ?? null}
              />
            </Panel>

            {/* Skill Matrix */}
            <Panel
              title="Skills"
              icon="📊"
              badge={sortedSkills.length > 0 ? `${sortedSkills.length} skills` : undefined}
              badgeColor="text-[var(--color-text-muted)]"
            >
              {sortedSkills.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No skill data yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {sortedSkills.map((skill) => (
                    <SkillBar
                      key={skill.skillName}
                      name={skill.skillName ?? ""}
                      level={skill.level ?? 0}
                      experience={skill.experience ?? 0}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Stats */}
            {stats.length > 0 && (
              <Panel title="Stats" icon="⚔️" accent badgeColor="text-[var(--color-gold)]">
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
              </Panel>
            )}

            {/* Gold History */}
            {goldHistory.length > 1 && (
              <Panel
                title="Gold History"
                icon="⬡"
                badge={goldHistory.length > 0 ? `${goldHistory[goldHistory.length - 1].toLocaleString()} gp` : undefined}
                badgeColor="text-[var(--color-gold)]"
              >
                <MiniSparkline
                  data={goldHistory}
                  color="#f0c14a"
                  height={56}
                  className="w-full"
                />
              </Panel>
            )}

            {/* XP History */}
            {xpHistory.length > 1 && (
              <Panel
                title="Total XP"
                icon="✦"
                badge={
                  xpHistory.length > 0
                    ? xpHistory[xpHistory.length - 1].toLocaleString()
                    : undefined
                }
                badgeColor="text-[var(--color-blue)]"
              >
                <MiniSparkline
                  data={xpHistory}
                  color="#82b3ee"
                  height={56}
                  className="w-full"
                />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
