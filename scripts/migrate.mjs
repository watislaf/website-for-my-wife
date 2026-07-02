/**
 * Migration script — applies the SQL migrations in drizzle/ to the target DB.
 *
 * Plain ESM JavaScript so it runs with bare `node` in production (Heroku prunes
 * devDeps; the standalone build doesn't bundle tsx) — uses only PRODUCTION deps.
 * Does NOT import @/db (no server-only workaround needed); migrate just applies
 * the drizzle/*.sql files, so no schema import is required.
 *
 * Uses the SAME url logic as src/db/index.ts:
 *   - TURSO_DATABASE_URL when set (remote Turso, with TURSO_AUTH_TOKEN)
 *   - otherwise a local file: DB (dev — no Turso account needed)
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url =
  process.env.TURSO_DATABASE_URL ??
  "file:" + (process.env.DATABASE_PATH ?? "./data/app.db");

const client = createClient({
  url,
  authToken: process.env.TURSO_DATABASE_URL
    ? process.env.TURSO_AUTH_TOKEN
    : undefined,
});

const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("migrated");
} catch (err) {
  console.error(err);
  process.exit(1);
}
