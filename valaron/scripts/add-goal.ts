/**
 * Add a goal via CLI.
 * Examples:
 *   npx tsx scripts/add-goal.ts --name "Woodcutting 50" --metric skill_level --skill woodcutting --target 50
 *   npx tsx scripts/add-goal.ts --name "1M gold" --metric gold --target 1000000
 *   npx tsx scripts/add-goal.ts --name "Fishing XP 500k" --metric skill_xp --skill fishing --target 500000
 *   npx tsx scripts/add-goal.ts --name "Total level 200" --metric total_level --target 200
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { characters, goals } from "../lib/schema"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

const dbPath = process.env.DB_PATH ?? "./valaron.db"
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
const db = drizzle(sqlite)

const args = process.argv.slice(2)
function arg(flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : undefined
}

const name = arg("--name")
const metric = arg("--metric")
const target = arg("--target")
const skill = arg("--skill")
const stat = arg("--stat")
const deadline = arg("--deadline")
const charArg = arg("--char") // hashed_id, defaults to primary

if (!name || !metric || !target) {
  console.error("Usage: npx tsx scripts/add-goal.ts --name <name> --metric <metric> --target <number> [--skill <name>] [--char <hashed_id>]")
  console.error("Metrics: skill_level, skill_xp, stat_level, gold, total_level")
  process.exit(1)
}

const metricArgs: Record<string, string> = {}
if (skill) metricArgs.skill = skill
if (stat) metricArgs.stat = stat

async function main() {
  // Find character
  let hashedId = charArg
  if (!hashedId) {
    const primary = await db.select().from(characters).where(eq(characters.isPrimary, true)).limit(1)
    hashedId = primary[0]?.hashedId
  }
  if (!hashedId) {
    console.error("No character found. Run poll first.")
    process.exit(1)
  }

  const id = randomUUID()
  await db.insert(goals).values({
    id,
    hashedId,
    name,
    metric,
    metricArgs: Object.keys(metricArgs).length > 0 ? JSON.stringify(metricArgs) : null,
    target: Number(target),
    deadline: deadline ?? null,
    createdAt: new Date().toISOString(),
  })

  console.log(`✓ Goal created: "${name}" → ${metric} ${target}`)
  sqlite.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
