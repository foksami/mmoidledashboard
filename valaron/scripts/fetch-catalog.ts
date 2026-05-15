/**
 * Populates itemsCatalog with all equippable gear.
 * Run once: npx tsx scripts/fetch-catalog.ts
 * Takes ~15 min due to rate limiting (272 items × inspect).
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { itemsCatalog } from "../lib/schema"

const dbPath = process.env.DB_PATH ?? "./valaron.db"
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")

// Add columns missing from older migrations (safe no-op if already present)
try { sqlite.exec("ALTER TABLE items_catalog ADD COLUMN image_url TEXT") } catch {}

const db = drizzle(sqlite)

const BASE = "https://api.idle-mmo.com/v1"
const GEAR_TYPES = ["helmet", "chestplate", "gauntlets", "boots", "sword", "bow", "dagger", "shield"]
// 3.5s between calls → ~17/min, safely under the 20/min limit
const DELAY_MS = 3500

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function apiFetch<T>(path: string): Promise<T> {
  const key = process.env.IDLEMMO_API_KEY
  if (!key) throw new Error("IDLEMMO_API_KEY not set")
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  })
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? 30)
    console.log(`  Rate limited — waiting ${retryAfter + 2}s…`)
    await sleep((retryAfter + 2) * 1000)
    return apiFetch<T>(path)
  }
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

interface SearchItem {
  hashed_id: string
  name: string
  type: string
  quality: string
}

interface ItemDetail {
  hashed_id: string
  name: string
  type: string
  quality: string
  vendor_price: number | null
  is_tradeable: boolean
  stats: Record<string, number> | null
  requirements: Record<string, number> | null
  upgrade_requirements: unknown | null
}

async function main() {
  const now = new Date().toISOString()
  let total = 0

  for (const gearType of GEAR_TYPES) {
    console.log(`\n=== ${gearType.toUpperCase()} ===`)
    let page = 1
    let lastPage = 1

    while (page <= lastPage) {
      await sleep(DELAY_MS)
      const data = await apiFetch<{ items: SearchItem[]; pagination: { last_page: number } }>(
        `/item/search?type=${gearType}&page=${page}`
      )
      lastPage = data.pagination.last_page
      const items = data.items ?? []
      console.log(`  Page ${page}/${lastPage}: ${items.length} items`)

      for (const item of items) {
        await sleep(DELAY_MS)
        try {
          const detail = await apiFetch<{ item: ItemDetail }>(`/item/${item.hashed_id}/inspect`)
          const d = detail.item

          await db
            .insert(itemsCatalog)
            .values({
              hashedId: d.hashed_id,
              name: d.name,
              type: d.type,
              quality: d.quality,
              vendorPrice: d.vendor_price ?? null,
              isTradeable: d.is_tradeable,
              stats: d.stats ? JSON.stringify(d.stats) : null,
              requirements: d.requirements ? JSON.stringify(d.requirements) : null,
              upgradeRequirements: d.upgrade_requirements
                ? JSON.stringify(d.upgrade_requirements)
                : null,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: itemsCatalog.hashedId,
              set: {
                name: d.name,
                quality: d.quality,
                stats: d.stats ? JSON.stringify(d.stats) : null,
                requirements: d.requirements ? JSON.stringify(d.requirements) : null,
                updatedAt: now,
              },
            })

          console.log(`    ✓ ${d.name} (${d.quality}) req=${JSON.stringify(d.requirements)}`)
          total++
        } catch (e) {
          console.error(`    ✗ ${item.name}: ${e}`)
        }
      }

      page++
    }
  }

  console.log(`\nDone! Stored ${total} items in catalog.`)
  sqlite.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
