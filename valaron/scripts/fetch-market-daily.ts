/**
 * Fetches 30-day daily market history for all tracked items and upserts into market_daily.
 * Tracked items: all gathering resources (ores + logs) + all gear in items_catalog.
 *
 * Usage:
 *   npx tsx scripts/fetch-market-daily.ts              # all items
 *   npx tsx scripts/fetch-market-daily.ts --gathering  # gathering only (faster, ~70s)
 *   npx tsx scripts/fetch-market-daily.ts --gear       # gear catalog only
 *
 * Rate limit: 18 req/min → 3.5s delay between requests.
 * Typical run time: ~70s (19 gathering) or ~16min (272 gear).
 *
 * Run daily via cron or after fetch-catalog.ts.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { sql } from "drizzle-orm"
import { marketDaily, itemsCatalog } from "../lib/schema"
import { GATHERING_ITEMS } from "../lib/gathering"

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

interface MarketResponse {
  history_data: Array<{ date: string; average_price: number; total_sold: number }>
  latest_sold: Array<{ price_per_item: number; sold_at: string }>
}

async function fetchAndStore(hashedId: string, name: string): Promise<void> {
  const data = await apiFetch<MarketResponse>(
    `/item/${hashedId}/market-history?tier=1&type=listings`
  )

  const history = data.history_data ?? []
  if (history.length === 0) {
    console.log(`  – ${name}: no history data`)
    return
  }

  const now = new Date().toISOString()

  // Upsert each daily row
  for (const row of history) {
    await db
      .insert(marketDaily)
      .values({
        itemHashedId: hashedId,
        date: row.date,
        avgPrice: row.average_price,
        totalSold: row.total_sold,
        fetchedAt: now,
      })
      .onConflictDoUpdate({
        target: [marketDaily.itemHashedId, marketDaily.date],
        set: {
          avgPrice: row.average_price,
          totalSold: row.total_sold,
          fetchedAt: now,
        },
      })
  }

  const latest = history.at(-1)!
  console.log(
    `  ✓ ${name}: ${history.length} days | latest ${latest.date} — ${latest.average_price}g, ${latest.total_sold.toLocaleString()} sold`
  )
}

async function main() {
  const args = process.argv.slice(2)
  const onlyGathering = args.includes("--gathering")
  const onlyGear = args.includes("--gear")

  const items: Array<{ hashedId: string; name: string }> = []

  if (!onlyGear) {
    for (const g of GATHERING_ITEMS) {
      items.push({ hashedId: g.hashedId, name: g.name })
    }
  }

  if (!onlyGathering) {
    const gear = await db
      .select({ hashedId: itemsCatalog.hashedId, name: itemsCatalog.name })
      .from(itemsCatalog)
      .all()
    for (const g of gear) {
      if (!items.find((i) => i.hashedId === g.hashedId)) {
        items.push({ hashedId: g.hashedId, name: g.name ?? g.hashedId })
      }
    }
  }

  const label = onlyGathering ? "gathering items" : onlyGear ? "gear items" : "all items"
  console.log(`\nFetching 30-day market history for ${items.length} ${label}…\n`)

  let ok = 0
  let fail = 0

  for (const item of items) {
    await sleep(DELAY_MS)
    try {
      await fetchAndStore(item.hashedId, item.name)
      ok++
    } catch (e) {
      console.error(`  ✗ ${item.name}: ${e}`)
      fail++
    }
  }

  // Print coverage summary
  const rows = await db
    .select({ count: sql<number>`count(*)`, items: sql<number>`count(distinct item_hashed_id)` })
    .from(marketDaily)
    .get()

  console.log(`\n✓ Done — ${ok} fetched, ${fail} failed`)
  console.log(`  DB: ${rows?.count ?? 0} daily rows across ${rows?.items ?? 0} items`)
  sqlite.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
