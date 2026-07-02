import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_PATH ?? "./data/app.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
// Wait instead of immediately throwing SQLITE_BUSY when another connection holds the lock.
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });

// Migrate on boot, but NOT during `next build`: page-data collection spawns many
// worker processes that each import this module, and running DDL migrations
// concurrently against a fresh DB races and throws SQLITE_BUSY. At build time
// there is no persistent DB to migrate anyway — migration happens on server boot
// (`node server.js`), where NEXT_PHASE is unset.
if (process.env.NEXT_PHASE !== "phase-production-build") {
  // Resolves drizzle/ relative to process.cwd() (project root under `next start`, /app in the Docker image).
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}
