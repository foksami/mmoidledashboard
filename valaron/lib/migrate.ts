import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? "./valaron.db";

const sqlite = new Database(path.resolve(process.cwd(), DB_PATH));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./drizzle" });

console.log("✓ Migrations applied");
sqlite.close();
