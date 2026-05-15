/**
 * Fetches latest market prices for all gear in itemsCatalog.
 * Run after fetch-catalog.ts: npx tsx scripts/fetch-market.ts
 * ~16 min for 272 items due to rate limiting.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { itemsCatalog, marketSnapshots } from "../lib/schema"

const dbPath = process.env.DB_PATH ?? "./valaron.db"
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")

// Add new columns if the DB was created before this schema change
try { sqlite.exec("ALTER TABLE market_snapshots ADD COLUMN latest_price INTEGER") } catch {}
try { sqlite.exec("ALTER TABLE market_snapshots ADD COLUMN latest_sold_at TEXT") } catch {}

const db = drizzle(sqlite)

const BASE = "https://api.idle-mmo.com/v1"
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

interface MarketResponse {
  history_data: Array<{ date: string; average_price: number; total_sold: number }>
  latest_sold: Array<{ price_per_item: number; sold_at: string }>
  endpoint_updates_at: string
}

async function main() {
  const items = await db.select({ hashedId: itemsCatalog.hashedId, name: itemsCatalog.name }).from(itemsCatalog).all()
  if (items.length === 0) {
    console.log("Catalog is empty — run fetch-catalog.ts first.")
    process.exit(1)
  }

  console.log(`Fetching market prices for ${items.length} items…\n`)
  const now = new Date().toISOString()
  let fetched = 0
  let skipped = 0

  for (const item of items) {
    await sleep(DELAY_MS)
    try {
      const data = await apiFetch<MarketResponse>(
        `/item/${item.hashedId}/market-history?tier=1&type=listings`
      )

      const latestSold = data.latest_sold?.[0]
      const lastHistory = data.history_data?.at(-1)

      await db
        .insert(marketSnapshots)
        .values({
          itemHashedId: item.hashedId,
          takenAt: now,
          averagePrice: lastHistory?.average_price ?? null,
          totalSold: lastHistory?.total_sold ?? null,
          tier: 1,
          latestPrice: latestSold?.price_per_item ?? null,
          latestSoldAt: latestSold?.sold_at ?? null,
        })
        .onConflictDoUpdate({
          target: marketSnapshots.id,
          set: {
            averagePrice: lastHistory?.average_price ?? null,
            totalSold: lastHistory?.total_sold ?? null,
            latestPrice: latestSold?.price_per_item ?? null,
            latestSoldAt: latestSold?.sold_at ?? null,
            takenAt: now,
          },
        })

      const priceStr = latestSold ? `${latestSold.price_per_item.toLocaleString()} gp` : "no price"
      console.log(`  ✓ ${item.name}: ${priceStr}`)
      fetched++
    } catch (e) {
      console.error(`  ✗ ${item.name}: ${e}`)
      skipped++
    }
  }

  console.log(`\nDone! ${fetched} prices fetched, ${skipped} skipped.`)
  sqlite.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
