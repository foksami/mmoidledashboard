/**
 * Fetches all recipe items from IdleMMO API and stores them in crafting_recipes.
 * Paginates through /items?type=recipe (≈19 pages, 370 items) then
 * inspects each recipe item for its crafting details.
 *
 * Usage:
 *   npx tsx scripts/fetch-crafting-recipes.ts
 *
 * Rate limit: 18 req/min → 3.5s delay between requests.
 * Typical run time: ~25 min for 370 recipes.
 *   Use --skip-fetch to only re-process already-fetched raw data.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { craftingRecipes, itemsCatalog } from "../lib/schema"
import { eq } from "drizzle-orm"

const dbPath = process.env.DB_PATH ?? "./valaron.db"
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
const db = drizzle(sqlite)

const BASE = "https://api.idle-mmo.com/v1"
const DELAY_MS = 3500

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function apiFetch<T>(path: string): Promise<T> {
  const key = process.env.IDLEMMO_API_KEY
  if (!key) throw new Error("IDLEMMO_API_KEY not set")
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "User-Agent": "Valaron/0.1 (Contact: michalfoksa@gmail.com)",
    },
  })
  if (res.status === 429) {
    const wait = Number(res.headers.get("retry-after") ?? 30) + 2
    console.log(`  Rate limited — waiting ${wait}s…`)
    await sleep(wait * 1000)
    return apiFetch<T>(path)
  }
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

interface ItemsPage {
  data: Array<{
    hashed_id: string
    name: string
    vendor_price: number
    is_tradeable: boolean
  }>
  meta: { current_page: number; last_page: number; total: number }
}

interface RecipeDetail {
  hashed_id: string
  name: string
  type: string
  crafting?: {
    skill: string
    level_required: number
    max_uses: number
    experience: number
    result: { hashed_item_id: string; item_name: string }
    materials: Array<{ hashed_item_id: string; item_name: string; quantity: number }>
  }
  vendor_price?: number
}

async function fetchAllRecipeItems(): Promise<Array<{ hashedId: string; name: string; vendorPrice: number }>> {
  const items: Array<{ hashedId: string; name: string; vendorPrice: number }> = []
  let page = 1
  let lastPage = 1

  do {
    console.log(`  Fetching items page ${page}/${lastPage}…`)
    const res = await apiFetch<ItemsPage>(`/items?type=recipe&page=${page}`)
    for (const item of res.data) {
      items.push({ hashedId: item.hashed_id, name: item.name, vendorPrice: item.vendor_price ?? 0 })
    }
    lastPage = res.meta.last_page
    page++
    if (page <= lastPage) await sleep(DELAY_MS)
  } while (page <= lastPage)

  return items
}

async function fetchRecipeDetail(hashedId: string): Promise<RecipeDetail> {
  return apiFetch<RecipeDetail>(`/items/${hashedId}`)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  // --- Phase 1: list all recipe items ---
  console.log("\n[1/2] Listing all recipe items…")
  const recipeItems = await fetchAllRecipeItems()
  console.log(`  Found ${recipeItems.length} recipe items\n`)

  // --- Phase 2: inspect each recipe ---
  console.log("[2/2] Fetching recipe details…\n")
  let ok = 0
  let fail = 0
  const now = new Date().toISOString()

  for (let i = 0; i < recipeItems.length; i++) {
    const { hashedId, name, vendorPrice } = recipeItems[i]
    await sleep(DELAY_MS)

    try {
      const detail = await fetchRecipeDetail(hashedId)
      const c = detail.crafting

      if (!c) {
        console.log(`  – ${name}: no crafting data, skipping`)
        continue
      }

      const materialsJson = JSON.stringify(
        c.materials.map((m) => ({
          hashedItemId: m.hashed_item_id,
          itemName: m.item_name,
          quantity: m.quantity,
        }))
      )

      if (!dryRun) {
        await db
          .insert(craftingRecipes)
          .values({
            recipeItemId: hashedId,
            recipeItemName: name,
            outputItemId: c.result.hashed_item_id,
            outputItemName: c.result.item_name,
            skill: c.skill,
            levelRequired: c.level_required,
            maxUses: c.max_uses,
            expPerCraft: c.experience,
            materials: materialsJson,
            recipeVendorPrice: vendorPrice,
            fetchedAt: now,
          })
          .onConflictDoUpdate({
            target: craftingRecipes.recipeItemId,
            set: {
              recipeItemName: name,
              outputItemId: c.result.hashed_item_id,
              outputItemName: c.result.item_name,
              skill: c.skill,
              levelRequired: c.level_required,
              maxUses: c.max_uses,
              expPerCraft: c.experience,
              materials: materialsJson,
              recipeVendorPrice: vendorPrice,
              fetchedAt: now,
            },
          })
      }

      const useLabel = c.max_uses === 0 ? "permanent" : `×${c.max_uses}`
      console.log(
        `  ✓ [${i + 1}/${recipeItems.length}] ${name} → ${c.result.item_name} | ${c.skill} lv${c.level_required} | ${useLabel} | ${c.materials.length} mats`
      )
      ok++
    } catch (e) {
      console.error(`  ✗ ${name}: ${e}`)
      fail++
    }
  }

  const total = await db.select().from(craftingRecipes).all()
  console.log(`\n✓ Done — ${ok} upserted, ${fail} failed`)
  console.log(`  DB: ${total.length} recipes total`)
  sqlite.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
