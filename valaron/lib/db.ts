import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? "./valaron.db";

// Singleton — reuse connection across hot-reloads in dev
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> | undefined };

function createDb() {
  const sqlite = new Database(path.resolve(process.cwd(), DB_PATH));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export type DB = typeof db;
