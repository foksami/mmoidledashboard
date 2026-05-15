/** Static config for all gatherable resources (ores + logs). */

export type GatheringSkill = "mining" | "woodcutting"

export interface GatheringItem {
  hashedId: string
  name: string
  skill: GatheringSkill
  reqLevel: number
  quality: string
  vendorPrice: number
}

/** vendor_price → required skill level (same pattern for both mining and woodcutting) */
const VENDOR_TO_LEVEL: Record<number, number> = {
  1: 1, 2: 10, 3: 20, 5: 30, 7: 40, 9: 50, 11: 60, 13: 70, 17: 80,
}

function req(vendorPrice: number): number {
  return VENDOR_TO_LEVEL[vendorPrice] ?? 1
}

export const GATHERING_ITEMS: GatheringItem[] = [
  // Mining
  { hashedId: "7eA59WrBQRXJYzb62qKv", name: "Coal Ore",     skill: "mining",      reqLevel: req(1),  quality: "STANDARD", vendorPrice: 1 },
  { hashedId: "oZwey82VNA6YD0dXM3gO", name: "Tin Ore",      skill: "mining",      reqLevel: req(1),  quality: "STANDARD", vendorPrice: 1 },
  { hashedId: "JZdg5V3PQoKQEyWq0zlB", name: "Copper Ore",   skill: "mining",      reqLevel: req(2),  quality: "STANDARD", vendorPrice: 2 },
  { hashedId: "JVM29l7kQZAL80q6WDGp", name: "Iron Ore",     skill: "mining",      reqLevel: req(3),  quality: "REFINED",  vendorPrice: 3 },
  { hashedId: "93R0qXalLljNAbn8DBgr", name: "Lead Ore",     skill: "mining",      reqLevel: req(5),  quality: "REFINED",  vendorPrice: 5 },
  { hashedId: "1rZXlwg5Yv8Qk9joDmGe", name: "Steel Ore",   skill: "mining",      reqLevel: req(7),  quality: "PREMIUM",  vendorPrice: 7 },
  { hashedId: "q9pwa0kxLBJLgVj136l4", name: "Mercury Ore",  skill: "mining",      reqLevel: req(9),  quality: "PREMIUM",  vendorPrice: 9 },
  { hashedId: "zvjoJW96Y85L3RaAylwE", name: "Chromite Ore", skill: "mining",      reqLevel: req(11), quality: "EPIC",     vendorPrice: 11 },
  { hashedId: "PjVDJez3LDvNKWO08Gaq", name: "Uranium Ore",  skill: "mining",      reqLevel: req(13), quality: "EPIC",     vendorPrice: 13 },
  { hashedId: "0kK49j1VN9yNq6B2doap", name: "Mystic Ore",   skill: "mining",      reqLevel: req(17), quality: "EPIC",     vendorPrice: 17 },
  // Woodcutting
  { hashedId: "7eA59WrBQRpYzb62qKvp", name: "Oak Log",      skill: "woodcutting", reqLevel: req(1),  quality: "STANDARD", vendorPrice: 1 },
  { hashedId: "ElzPeorXNVjNaW0kv53J", name: "Yew Log",      skill: "woodcutting", reqLevel: req(2),  quality: "STANDARD", vendorPrice: 2 },
  { hashedId: "XyeZRGx9YjKLB80gWlPa", name: "Spruce Log",   skill: "woodcutting", reqLevel: req(3),  quality: "REFINED",  vendorPrice: 3 },
  { hashedId: "Ro31P7kZL6AYveGxXOy5", name: "Birch Log",    skill: "woodcutting", reqLevel: req(5),  quality: "REFINED",  vendorPrice: 5 },
  { hashedId: "brz9RZnWN7aLKAp0Mdle", name: "Banyan Log",   skill: "woodcutting", reqLevel: req(7),  quality: "PREMIUM",  vendorPrice: 7 },
  { hashedId: "bAB1E9poQqkYnakeJj56", name: "Maple Log",    skill: "woodcutting", reqLevel: req(9),  quality: "PREMIUM",  vendorPrice: 9 },
  { hashedId: "ZjlPA8v9NMXQEyMe2OaW", name: "Willow Log",   skill: "woodcutting", reqLevel: req(11), quality: "EPIC",     vendorPrice: 11 },
  { hashedId: "P1vlVrzjLrRLao8mGKM2", name: "Mahogany Log", skill: "woodcutting", reqLevel: req(13), quality: "EPIC",     vendorPrice: 13 },
  { hashedId: "Z6aDoyRnLykNpV5AGXmk", name: "Mystical Log", skill: "woodcutting", reqLevel: req(17), quality: "EPIC",     vendorPrice: 17 },
]

export const GATHERING_IDS = new Set(GATHERING_ITEMS.map((i) => i.hashedId))
