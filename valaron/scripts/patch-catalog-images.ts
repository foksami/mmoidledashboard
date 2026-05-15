/**
 * Patches imageUrl into itemsCatalog using the /item/search endpoint.
 * Much faster than re-running fetch-catalog — search returns image_url
 * without needing individual inspect calls (~14 requests total).
 *
 * Run: npx tsx scripts/patch-catalog-images.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import path from "path"
import { itemsCatalog } from "../lib/schema"
import { eq } from "drizzle-orm"

const dbPath = process.env.DB_PATH ?? "./valaron.db"
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
const db = drizzle(sqlite)

// Apply pending migrations (adds image_url column if not yet present)
migrate(db, { migrationsFolder: path.resolve(process.cwd(), "./drizzle") })

const BASE = "https://api.idle-mmo.com/v1"
const GEAR_TYPES = ["helmet", "chestplate", "gauntlets", "boots", "sword", "bow", "dagger", "shield"]
const DELAY_MS = 2000

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function apiFetch<T>(path: string): Promise<T> {
  const key = process.env.IDLEMMO_API_KEY
  if (!key) throw new Error("IDLEMMO_API_KEY not set")
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
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

interface SearchItem {
  hashed_id: string
  name: string
  image_url: string
}

async function main() {
  let updated = 0

  for (const gearType of GEAR_TYPES) {
    let page = 1
    let lastPage = 1

    while (page <= lastPage) {
      await sleep(DELAY_MS)
      const data = await apiFetch<{ items: SearchItem[]; pagination: { last_page: number } }>(
        `/item/search?type=${gearType}&page=${page}`
      )
      lastPage = data.pagination.last_page

      for (const item of data.items ?? []) {
        if (!item.image_url) continue
        await db
          .update(itemsCatalog)
          .set({ imageUrl: item.image_url })
          .where(eq(itemsCatalog.hashedId, item.hashed_id))
        updated++
      }

      console.log(`${gearType} p${page}/${lastPage} — ${data.items?.length ?? 0} items`)
      page++
    }
  }

  console.log(`\nDone! Updated ${updated} image URLs.`)
  sqlite.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
