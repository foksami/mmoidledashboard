import { sqliteTable, text, integer, real, index, unique } from "drizzle-orm/sqlite-core";

export const characters = sqliteTable("characters", {
  hashedId: text("hashed_id").primaryKey(),
  numericId: integer("numeric_id").notNull(),
  name: text("name").notNull(),
  class: text("class"),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  createdAt: text("created_at"),
});

export const characterSnapshots = sqliteTable(
  "character_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hashedId: text("hashed_id")
      .notNull()
      .references(() => characters.hashedId, { onDelete: "cascade" }),
    takenAt: text("taken_at").notNull(),
    totalLevel: integer("total_level"),
    gold: integer("gold"),
    tokens: integer("tokens"),
    shards: integer("shards"),
    currentStatus: text("current_status"),
    locationName: text("location_name"),
    raw: text("raw"),
  },
  (t) => [index("char_snap_idx").on(t.hashedId, t.takenAt)]
);

export const skillSnapshots = sqliteTable(
  "skill_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hashedId: text("hashed_id")
      .notNull()
      .references(() => characters.hashedId, { onDelete: "cascade" }),
    takenAt: text("taken_at").notNull(),
    skillName: text("skill_name").notNull(),
    level: integer("level"),
    experience: integer("experience"),
  },
  (t) => [index("skill_snap_idx").on(t.hashedId, t.skillName, t.takenAt)]
);

export const statSnapshots = sqliteTable(
  "stat_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hashedId: text("hashed_id")
      .notNull()
      .references(() => characters.hashedId, { onDelete: "cascade" }),
    takenAt: text("taken_at").notNull(),
    statName: text("stat_name").notNull(),
    level: integer("level"),
    experience: integer("experience"),
  },
  (t) => [index("stat_snap_idx").on(t.hashedId, t.statName, t.takenAt)]
);

export const actionLog = sqliteTable(
  "action_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hashedId: text("hashed_id")
      .notNull()
      .references(() => characters.hashedId, { onDelete: "cascade" }),
    actionType: text("action_type"),
    actionTitle: text("action_title"),
    startedAt: text("started_at"),
    expiresAt: text("expires_at"),
    detectedAt: text("detected_at").notNull(),
  },
  (t) => [index("action_log_idx").on(t.hashedId, t.detectedAt)]
);

export const marketSnapshots = sqliteTable(
  "market_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemHashedId: text("item_hashed_id").notNull(),
    takenAt: text("taken_at").notNull(),
    averagePrice: integer("average_price"),
    totalSold: integer("total_sold"),
    tier: integer("tier").default(1),
    latestPrice: integer("latest_price"),
    latestSoldAt: text("latest_sold_at"),
  },
  (t) => [index("market_snap_idx").on(t.itemHashedId, t.takenAt)]
);

/**
 * Daily market data per item — one row per (item, date).
 * Populated by scripts/fetch-market-daily.ts from the IdleMMO market-history endpoint.
 * The API returns up to 30 days of daily history per item.
 */
export const marketDaily = sqliteTable(
  "market_daily",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemHashedId: text("item_hashed_id").notNull(),
    date: text("date").notNull(),          // YYYY-MM-DD
    avgPrice: integer("avg_price"),        // average price that day
    totalSold: integer("total_sold"),      // units sold that day
    fetchedAt: text("fetched_at").notNull(), // when we wrote this row
  },
  (t) => [
    unique("market_daily_uniq").on(t.itemHashedId, t.date),
    index("market_daily_item_date_idx").on(t.itemHashedId, t.date),
  ]
);

export const itemsCatalog = sqliteTable("items_catalog", {
  hashedId: text("hashed_id").primaryKey(),
  name: text("name"),
  type: text("type"),
  quality: text("quality"),
  vendorPrice: integer("vendor_price"),
  isTradeable: integer("is_tradeable", { mode: "boolean" }),
  imageUrl: text("image_url"),
  stats: text("stats"),
  requirements: text("requirements"),
  upgradeRequirements: text("upgrade_requirements"),
  updatedAt: text("updated_at"),
});

export const activitySessions = sqliteTable(
  "activity_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hashedId: text("hashed_id")
      .notNull()
      .references(() => characters.hashedId, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    actionTitle: text("action_title"),
    startedAt: text("started_at").notNull(),
    endedAt: text("ended_at"),
    goldStart: integer("gold_start"),
    goldEnd: integer("gold_end"),
    xpSnapStart: text("xp_snap_start"),
    xpSnapEnd: text("xp_snap_end"),
    durationSec: integer("duration_sec"),
  },
  (t) => [index("activity_sess_idx").on(t.hashedId, t.startedAt)]
);

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  hashedId: text("hashed_id")
    .notNull()
    .references(() => characters.hashedId, { onDelete: "cascade" }),
  name: text("name"),
  metric: text("metric"),
  metricArgs: text("metric_args"),
  target: real("target"),
  deadline: text("deadline"),
  createdAt: text("created_at"),
  completedAt: text("completed_at"),
});

/**
 * Crafting recipes fetched from the IdleMMO items API (type=recipe).
 * materials: JSON array of {hashedItemId, itemName, quantity}
 * maxUses: 0 = permanent unlock (buy once, craft forever), 1+ = consumed per craft
 */
export const craftingRecipes = sqliteTable("crafting_recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeItemId: text("recipe_item_id").notNull().unique(),
  recipeItemName: text("recipe_item_name"),
  outputItemId: text("output_item_id").notNull(),
  outputItemName: text("output_item_name"),
  skill: text("skill"),
  levelRequired: integer("level_required"),
  maxUses: integer("max_uses"),          // 0=permanent, 1+=consumed per craft
  expPerCraft: integer("exp_per_craft"),
  materials: text("materials"),          // JSON: [{hashedItemId, itemName, quantity}]
  recipeVendorPrice: integer("recipe_vendor_price"),
  fetchedAt: text("fetched_at").notNull(),
});

export const aiBriefs = sqliteTable("ai_briefs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hashedId: text("hashed_id")
    .notNull()
    .references(() => characters.hashedId, { onDelete: "cascade" }),
  generatedAt: text("generated_at").notNull(),
  scope: text("scope"),
  summary: text("summary"),
  actions: text("actions"),
  contextUsed: text("context_used"),
});
