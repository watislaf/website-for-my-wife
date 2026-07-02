import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Remote Turso when TURSO_DATABASE_URL is set; otherwise a local file: DB so
// dev works with no Turso account. Migration is NOT run on import (libSQL's
// migrate is async) — it lives in scripts/migrate.ts (`npm run db:migrate`).
const url =
  process.env.TURSO_DATABASE_URL ??
  "file:" + (process.env.DATABASE_PATH ?? "./data/app.db");

// For a local file: url, ensure the parent directory exists. For a remote
// libsql:// url there is no local file to create.
if (url.startsWith("file:")) {
  const filePath = url.slice("file:".length);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const client = createClient({
  url,
  // undefined authToken is fine for a file: url.
  authToken: process.env.TURSO_DATABASE_URL
    ? process.env.TURSO_AUTH_TOKEN
    : undefined,
});

export const db = drizzle(client, { schema });
