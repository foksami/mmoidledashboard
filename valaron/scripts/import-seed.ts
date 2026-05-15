/**
 * Imports seed data from data/seed.json into the local DB.
 * Safe to run multiple times — uses upsert (ON CONFLICT DO UPDATE) for all tables.
 *
 * Prerequisites:
 *   npm run migrate   ← must run first to create tables
 *
 * Usage:
 *   npx tsx scripts/import-seed.ts
 *   npx tsx scripts/import-seed.ts --file /path/to/seed.json
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const dbPath = process.env.DB_PATH ?? "./valaron.db"
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")

const args = process.argv.slice(2)
const fileIdx = args.indexOf("--file")
const seedPath = fileIdx !== -1 ? args[fileIdx + 1] : "./data/seed.json"
const absPath = resolve(seedPath)

if (!existsSync(absPath)) {
  console.error(`\n✗ Seed file not found: ${absPath}`)
  console.error("  Ask a teammate to share their seed.json or download it from the repo.")
  process.exit(1)
}

console.log(`\nImporting seed data into ${dbPath}…\n`)

const seed = JSON.parse(readFileSync(absPath, "utf8"))

if (seed.version !== 1) {
  console.warn(`  Warning: seed version ${seed.version} (expected 1) — proceeding anyway`)
}

const { items_catalog = [], crafting_recipes = [], market_daily = [] } = seed.tables ?? {}

// ── items_catalog ─────────────────────────────────────────────────────────────
const upsertCatalog = sqlite.prepare(`
  INSERT INTO items_catalog
    (hashed_id, name, type, quality, vendor_price, is_tradeable, image_url, stats, requirements, upgrade_requirements, updated_at)
  VALUES
    (@hashed_id, @name, @type, @quality, @vendor_price, @is_tradeable, @image_url, @stats, @requirements, @upgrade_requirements, @updated_at)
  ON CONFLICT(hashed_id) DO UPDATE SET
    name = excluded.name,
    type = excluded.type,
    quality = excluded.quality,
    vendor_price = excluded.vendor_price,
    is_tradeable = excluded.is_tradeable,
    image_url = excluded.image_url,
    stats = excluded.stats,
    requirements = excluded.requirements,
    upgrade_requirements = excluded.upgrade_requirements,
    updated_at = excluded.updated_at
`)

const insertCatalog = sqlite.transaction((rows: any[]) => {
  let ok = 0
  for (const r of rows) { upsertCatalog.run(r); ok++ }
  return ok
})

const catalogOk = insertCatalog(items_catalog)
console.log(`  items_catalog:    ${catalogOk} upserted`)

// ── crafting_recipes ──────────────────────────────────────────────────────────
const upsertRecipe = sqlite.prepare(`
  INSERT INTO crafting_recipes
    (recipe_item_id, recipe_item_name, output_item_id, output_item_name, skill, level_required, max_uses, exp_per_craft, materials, recipe_vendor_price, fetched_at)
  VALUES
    (@recipe_item_id, @recipe_item_name, @output_item_id, @output_item_name, @skill, @level_required, @max_uses, @exp_per_craft, @materials, @recipe_vendor_price, @fetched_at)
  ON CONFLICT(recipe_item_id) DO UPDATE SET
    recipe_item_name = excluded.recipe_item_name,
    output_item_id = excluded.output_item_id,
    output_item_name = excluded.output_item_name,
    skill = excluded.skill,
    level_required = excluded.level_required,
    max_uses = excluded.max_uses,
    exp_per_craft = excluded.exp_per_craft,
    materials = excluded.materials,
    recipe_vendor_price = excluded.recipe_vendor_price,
    fetched_at = excluded.fetched_at
`)

const insertRecipes = sqlite.transaction((rows: any[]) => {
  let ok = 0
  for (const r of rows) { upsertRecipe.run(r); ok++ }
  return ok
})

const recipesOk = insertRecipes(crafting_recipes)
console.log(`  crafting_recipes: ${recipesOk} upserted`)

// ── market_daily ──────────────────────────────────────────────────────────────
const upsertMarket = sqlite.prepare(`
  INSERT INTO market_daily
    (item_hashed_id, date, avg_price, total_sold, buy_avg_price, buy_total_sold, fetched_at)
  VALUES
    (@item_hashed_id, @date, @avg_price, @total_sold, @buy_avg_price, @buy_total_sold, @fetched_at)
  ON CONFLICT(item_hashed_id, date) DO UPDATE SET
    avg_price     = excluded.avg_price,
    total_sold    = excluded.total_sold,
    buy_avg_price = COALESCE(excluded.buy_avg_price, buy_avg_price),
    buy_total_sold = COALESCE(excluded.buy_total_sold, buy_total_sold),
    fetched_at    = excluded.fetched_at
`)

const insertMarket = sqlite.transaction((rows: any[]) => {
  let ok = 0
  for (const r of rows) { upsertMarket.run(r); ok++ }
  return ok
})

const marketOk = insertMarket(market_daily)
const uniqueItems = new Set(market_daily.map((r: any) => r.item_hashed_id)).size
console.log(`  market_daily:     ${marketOk} upserted (${uniqueItems} items)`)

console.log(`\n✓ Import complete — exported at ${seed.exportedAt ?? "unknown"}`)
console.log("  You can now run: npm run dev")

sqlite.close()
