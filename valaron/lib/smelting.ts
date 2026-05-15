/**
 * Smelting recipes — sourced from in-game smelting UI.
 * Every bar needs 1x [ore] + 1x Coal Ore.
 */

export interface SmeltingRecipe {
  barHashedId: string
  barName: string
  quality: string
  smeltLevel: number
  smeltTimeSec: number
  expPerBar: number
  oreHashedId: string      // the specific ore (not coal)
  oreName: string
  coalHashedId: string     // always Coal Ore
}

/** Coal Ore — used in every recipe */
export const COAL_ORE_ID = "7eA59WrBQRXJYzb62qKv"

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  {
    barHashedId: "Ro31P7kZL6A5YveGxXOy",
    barName:     "Tin Bar",
    quality:     "STANDARD",
    smeltLevel:  1,
    smeltTimeSec: 10.9,
    expPerBar:   3,
    oreHashedId: "oZwey82VNA6YD0dXM3gO",
    oreName:     "Tin Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "brz9RZnWN7WDNKAp0Mdl",
    barName:     "Copper Bar",
    quality:     "STANDARD",
    smeltLevel:  5,
    smeltTimeSec: 13.6,
    expPerBar:   6,
    oreHashedId: "JZdg5V3PQoKQEyWq0zlB",
    oreName:     "Copper Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "bAB1E9poQqPVLnakeJj5",
    barName:     "Iron Bar",
    quality:     "REFINED",
    smeltLevel:  10,
    smeltTimeSec: 20.9,
    expPerBar:   12,
    oreHashedId: "JVM29l7kQZAL80q6WDGp",
    oreName:     "Iron Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "ZjlPA8v9NMgnLEyMe2Oa",
    barName:     "Lead Bar",
    quality:     "REFINED",
    smeltLevel:  15,
    smeltTimeSec: 24.5,
    expPerBar:   17,
    oreHashedId: "93R0qXalLljNAbn8DBgr",
    oreName:     "Lead Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "P1vlVrzjLrZ9Lao8mGKM",
    barName:     "Steel Bar",
    quality:     "PREMIUM",
    smeltLevel:  25,
    smeltTimeSec: 28.2,
    expPerBar:   24,
    oreHashedId: "1rZXlwg5Yv8Qk9joDmGe",
    oreName:     "Steel Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "Z6aDoyRnLyDMYpV5AGXm",
    barName:     "Mercury Bar",
    quality:     "PREMIUM",
    smeltLevel:  40,
    smeltTimeSec: 32.7,
    expPerBar:   31,
    oreHashedId: "q9pwa0kxLBJLgVj136l4",
    oreName:     "Mercury Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "27gw0k38L4pwLWevJxyK",
    barName:     "Chromite Bar",
    quality:     "EPIC",
    smeltLevel:  60,
    smeltTimeSec: 36.4,
    expPerBar:   40,
    oreHashedId: "zvjoJW96Y85L3RaAylwE",
    oreName:     "Chromite Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "O2xMjGdBN51PN9P1nyrv",
    barName:     "Uranium Bar",
    quality:     "EPIC",
    smeltLevel:  70,
    smeltTimeSec: 40,
    expPerBar:   46,
    oreHashedId: "PjVDJez3LDvNKWO08Gaq",
    oreName:     "Uranium Ore",
    coalHashedId: COAL_ORE_ID,
  },
  {
    barHashedId: "dgBq1boWYegrQkJ3rXaD",
    barName:     "Mystic Bar",
    quality:     "EPIC",
    smeltLevel:  90,
    smeltTimeSec: 50,
    expPerBar:   63,
    oreHashedId: "0kK49j1VN9yNq6B2doap",
    oreName:     "Mystic Ore",
    coalHashedId: COAL_ORE_ID,
  },
]

export const SMELTING_BAR_IDS = SMELTING_RECIPES.map((r) => r.barHashedId)

/** All unique item IDs needed for market data (bars + ores + coal) */
export const SMELTING_ALL_IDS = Array.from(new Set([
  ...SMELTING_BAR_IDS,
  ...SMELTING_RECIPES.map((r) => r.oreHashedId),
  COAL_ORE_ID,
]))
