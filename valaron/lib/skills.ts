/**
 * IdleMMO skill metadata — which stats each skill grants XP to.
 * Source: wiki.idle-mmo.com/skills/overview + /character/stats
 */

export type StatKey = "strength" | "defence" | "speed" | "dexterity"

export interface StatMeta {
  label: string
  /** in-game attribute name */
  attribute: string
  /** effect per level gained */
  effectPerLevel: string
}

export const STATS: Record<StatKey, StatMeta> = {
  strength:  { label: "Strength",  attribute: "Attack Power", effectPerLevel: "+2.4 Attack Power / lv" },
  defence:   { label: "Defence",   attribute: "Protection",   effectPerLevel: "+2.4 Protection / lv"   },
  speed:     { label: "Speed",     attribute: "Agility",      effectPerLevel: "+2.4 Agility / lv"      },
  dexterity: { label: "Dexterity", attribute: "Accuracy",     effectPerLevel: "+2.4 Accuracy / lv"     },
}

export interface SkillMeta {
  label: string
  /** Stats this skill grants XP to while training */
  grants: StatKey[]
  /** Combat only: player chooses stance each fight */
  stanceChoice?: boolean
}

export const SKILL_META: Record<string, SkillMeta> = {
  woodcutting:        { label: "Woodcutting",        grants: ["strength"] },
  mining:             { label: "Mining",              grants: ["strength", "defence"] },
  fishing:            { label: "Fishing",             grants: ["dexterity"] },
  alchemy:            { label: "Alchemy",             grants: ["speed"] },
  smelting:           { label: "Smelting",            grants: ["speed"] },
  cooking:            { label: "Cooking",             grants: ["dexterity"] },
  forge:              { label: "Forge",               grants: ["strength"] },
  construction:       { label: "Construction",        grants: ["strength"] },
  combat:             { label: "Combat",              grants: ["strength", "defence", "speed", "dexterity"], stanceChoice: true },
  dungeoneering:      { label: "Dungeoneering",       grants: [] },
  "shadow-mastery":   { label: "Shadow Mastery",      grants: [] },
  "hunting-mastery":  { label: "Hunting Mastery",     grants: [] },
  bartering:          { label: "Bartering",           grants: [] },
  "pet-mastery":      { label: "Pet Mastery",         grants: [] },
  "guild-mastery":    { label: "Guild Mastery",       grants: [] },
  meditation:         { label: "Meditation",          grants: [] },
  "yule-mastery":     { label: "Yule Mastery",        grants: [] },
  "springtide-mastery": { label: "Springtide Mastery", grants: [] },
  "lunar-mastery":    { label: "Lunar Mastery",       grants: [] },
}

/**
 * Combat stances — player picks one per fight to focus stat XP.
 * Balanced splits evenly across all 4 stats (remainder XP is lost).
 */
export const COMBAT_STANCES = [
  { key: "balanced",   label: "Balanced",   grants: ["strength", "defence", "speed", "dexterity"] as StatKey[] },
  { key: "offensive",  label: "Offensive",  grants: ["strength"]   as StatKey[] },
  { key: "defensive",  label: "Defensive",  grants: ["defence"]    as StatKey[] },
  { key: "agile",      label: "Agile",      grants: ["speed"]      as StatKey[] },
  { key: "dexterous",  label: "Dexterous",  grants: ["dexterity"]  as StatKey[] },
]
