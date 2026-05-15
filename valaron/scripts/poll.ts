/**
 * Polling script — run with: npx tsx scripts/poll.ts
 * Pulls all characters + snapshots and writes to SQLite.
 * Run once manually or loop with: watch -n 60 npx tsx scripts/poll.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq, and, isNull } from "drizzle-orm";
import path from "path";
import * as schema from "../lib/schema";
import {
  getAuthCheck,
  getCharacterInfo,
  getCharacterAction,
  getCharacterAlts,
} from "../lib/idlemmo";

const DB_PATH = process.env.DB_PATH ?? "./valaron.db";
const sqlite = new Database(path.resolve(process.cwd(), DB_PATH));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

// Run migrations on first start
migrate(db, { migrationsFolder: path.resolve(process.cwd(), "./drizzle") });

async function upsertCharacter(hashedId: string, numericId: number, name: string, cls: string, isPrimary: boolean) {
  const existing = await db.query.characters.findFirst({
    where: eq(schema.characters.hashedId, hashedId),
  });

  if (!existing) {
    await db.insert(schema.characters).values({
      hashedId,
      numericId,
      name,
      class: cls,
      isPrimary,
      createdAt: new Date().toISOString(),
    });
    console.log(`  + Registered character: ${name} (${hashedId})`);
  }
}

async function pollCharacter(hashedId: string) {
  const now = new Date().toISOString();

  const [info, action] = await Promise.all([
    getCharacterInfo(hashedId),
    getCharacterAction(hashedId),
  ]);

  // Update class if missing
  await db
    .update(schema.characters)
    .set({ class: info.class })
    .where(eq(schema.characters.hashedId, hashedId));

  // Character snapshot
  await db.insert(schema.characterSnapshots).values({
    hashedId,
    takenAt: now,
    totalLevel: info.total_level,
    gold: info.gold,
    tokens: info.tokens,
    shards: info.shards,
    currentStatus: info.current_status,
    locationName: info.location?.name ?? null,
    raw: JSON.stringify(info),
  });

  // Skill snapshots
  for (const [skillName, skill] of Object.entries(info.skills)) {
    await db.insert(schema.skillSnapshots).values({
      hashedId,
      takenAt: now,
      skillName,
      level: skill.level,
      experience: skill.experience,
    });
  }

  // Stat snapshots
  for (const [statName, stat] of Object.entries(info.stats)) {
    await db.insert(schema.statSnapshots).values({
      hashedId,
      takenAt: now,
      statName,
      level: stat.level,
      experience: stat.experience,
    });
  }

  // Action log + activity session tracking
  const lastAction = await db.query.actionLog.findFirst({
    where: eq(schema.actionLog.hashedId, hashedId),
    orderBy: (t, { desc }) => [desc(t.detectedAt)],
  });

  const actionChanged =
    !lastAction ||
    lastAction.actionType !== (action.type ?? null) ||
    lastAction.actionTitle !== (action.title ?? null) ||
    lastAction.startedAt !== (action.started_at ?? null);

  if (actionChanged) {
    if (action.type) {
      await db.insert(schema.actionLog).values({
        hashedId,
        actionType: action.type,
        actionTitle: action.title,
        startedAt: action.started_at,
        expiresAt: action.expires_at,
        detectedAt: now,
      });
    }

    // Close the previous open session (if any)
    const openSession = await db.query.activitySessions.findFirst({
      where: and(
        eq(schema.activitySessions.hashedId, hashedId),
        isNull(schema.activitySessions.endedAt)
      ),
      orderBy: (t, { desc }) => [desc(t.startedAt)],
    });

    if (openSession) {
      const durationSec = Math.floor(
        (new Date(now).getTime() - new Date(openSession.startedAt).getTime()) / 1000
      );
      const xpSnap = JSON.stringify(
        Object.fromEntries(Object.entries(info.skills).map(([k, v]) => [k, v.experience]))
      );
      await db
        .update(schema.activitySessions)
        .set({ endedAt: now, goldEnd: info.gold, xpSnapEnd: xpSnap, durationSec })
        .where(eq(schema.activitySessions.id, openSession.id));
    }

    // Open a new session for the incoming action
    if (action.type) {
      const xpSnap = JSON.stringify(
        Object.fromEntries(Object.entries(info.skills).map(([k, v]) => [k, v.experience]))
      );
      await db.insert(schema.activitySessions).values({
        hashedId,
        actionType: action.type,
        actionTitle: action.title ?? null,
        startedAt: now,
        goldStart: info.gold,
        xpSnapStart: xpSnap,
      });
    }
  }

  return { info, action };
}

async function main() {
  console.log(`[${new Date().toISOString()}] Valaron poll starting...`);

  const auth = await getAuthCheck();
  if (!auth.authenticated) {
    console.error("API key invalid");
    process.exit(1);
  }

  const primaryHashedId = auth.character.hashed_id;
  console.log(`  Primary: ${auth.character.name} (${primaryHashedId})`);

  // Register primary character
  await upsertCharacter(
    primaryHashedId,
    auth.character.id,
    auth.character.name,
    "",
    true
  );

  // Get alts (includes siblings, not the primary)
  const alts = await getCharacterAlts(primaryHashedId);
  for (const alt of alts) {
    await upsertCharacter(alt.hashed_id, alt.id, alt.name, alt.class, false);
  }

  // Build full character list
  const allHashedIds = [primaryHashedId, ...alts.map((a) => a.hashed_id)];

  // Poll each character
  for (const hashedId of allHashedIds) {
    try {
      const { info, action } = await pollCharacter(hashedId);
      const actionStr = action.type ? `${action.type}:${action.title}` : "IDLE";
      console.log(
        `  ✓ ${info.name} lv${info.total_level} | gold:${info.gold} | ${actionStr}`
      );
    } catch (err) {
      console.error(`  ✗ Failed for ${hashedId}:`, err);
    }
  }

  console.log(`[${new Date().toISOString()}] Poll complete.\n`);
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
