/**
 * Migration script — applies the SQL migrations in drizzle/ to the target DB.
 *
 * libSQL's migrate() is async, so it can't run cleanly at sync module import;
 * it lives here and is invoked explicitly via `npm run db:migrate`.
 *
 * Builds its own libSQL client with the SAME url logic as src/db/index.ts
 * (rather than importing the server-only `@/db`) so it runs cleanly as a
 * standalone tsx script:
 *   - TURSO_DATABASE_URL when set (remote Turso, with TURSO_AUTH_TOKEN)
 *   - otherwise a local file: DB (dev — no Turso account needed)
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";

const url =
  process.env.TURSO_DATABASE_URL ??
  "file:" + (process.env.DATABASE_PATH ?? "./data/app.db");

if (url.startsWith("file:")) {
  const filePath = url.slice("file:".length);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const client = createClient({
  url,
  authToken: process.env.TURSO_DATABASE_URL
    ? process.env.TURSO_AUTH_TOKEN
    : undefined,
});

const db = drizzle(client);

async function main() {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("migrated");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
