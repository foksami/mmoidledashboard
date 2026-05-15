/**
 * Exports market data + catalogs to data/seed.json for sharing with teammates.
 * Running this gives everyone a headstart — they import instead of running
 * 40 min of API calls.
 *
 * What's included:
 *   - items_catalog  (all gear)
 *   - crafting_recipes (all recipes, if fetched)
 *   - market_daily (all rows, no date filter — full history)
 *
 * Usage:
 *   npx tsx scripts/export-seed.ts
 *   npx tsx scripts/export-seed.ts --out /tmp/seed.json
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { writeFileSync } from "fs"
import { resolve } from "path"

const dbPath = process.env.DB_PATH ?? "./valaron.db"
const sqlite = new Database(dbPath)

const args = process.argv.slice(2)
const outIdx = args.indexOf("--out")
const outPath = outIdx !== -1 ? args[outIdx + 1] : "./data/seed.json"

console.log(`\nExporting seed data from ${dbPath}…\n`)

const catalog = sqlite.prepare("SELECT * FROM items_catalog").all()
console.log(`  items_catalog:    ${catalog.length} rows`)

const recipes = sqlite.prepare("SELECT * FROM crafting_recipes").all()
console.log(`  crafting_recipes: ${recipes.length} rows`)

const market = sqlite.prepare("SELECT * FROM market_daily ORDER BY item_hashed_id, date").all()
console.log(`  market_daily:     ${market.length} rows (${new Set(market.map((r: any) => r.item_hashed_id)).size} items)`)

// Find date range
const dates = market.map((r: any) => r.date).sort()
const oldest = dates[0]?.slice(0, 10) ?? "—"
const newest = dates[dates.length - 1]?.slice(0, 10) ?? "—"
console.log(`  market date range: ${oldest} → ${newest}`)

const seed = {
  exportedAt: new Date().toISOString(),
  version: 1,
  tables: {
    items_catalog: catalog,
    crafting_recipes: recipes,
    market_daily: market,
  },
}

const absOut = resolve(outPath)
writeFileSync(absOut, JSON.stringify(seed, null, 2), "utf8")

const sizeMB = (Buffer.byteLength(JSON.stringify(seed)) / 1024 / 1024).toFixed(1)
console.log(`\n✓ Written to ${absOut} (${sizeMB} MB)`)
console.log(`  Teammates can now run: npm run seed:import`)

sqlite.close()
