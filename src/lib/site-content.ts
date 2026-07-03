import "server-only";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { siteContent } from "@/db/schema";
import { landing, type LandingContent } from "@/content/landing";

export type { LandingContent };

const ROW_ID = 1;

/**
 * Read the stored landing content (row id=1) and MERGE it over the defaults so
 * any field missing from the stored JSON falls back to the default — we never
 * render a blank landing. If no row exists yet, return the defaults verbatim.
 */
export async function getLandingContent(): Promise<LandingContent> {
  const rows = await db
    .select()
    .from(siteContent)
    .where(eq(siteContent.id, ROW_ID))
    .limit(1);

  const row = rows[0];
  if (!row) return landing;

  let stored: Partial<LandingContent> = {};
  try {
    stored = JSON.parse(row.data) as Partial<LandingContent>;
  } catch {
    // Corrupt JSON → fall back entirely to defaults rather than throw.
    return landing;
  }

  // Shallow merge is enough: each top-level field is either replaced wholesale
  // (name/headline/gallery/socials/…) or absent (→ default). Arrays are stored
  // in full when edited, so a stored gallery/socials replaces the default array.
  return { ...landing, ...stored };
}

/** Upsert the full landing content into row id=1. */
export async function saveLandingContent(next: LandingContent): Promise<void> {
  const data = JSON.stringify(next);
  await db
    .insert(siteContent)
    .values({ id: ROW_ID, data })
    .onConflictDoUpdate({
      target: siteContent.id,
      // The column default only applies on insert, so bump updatedAt explicitly
      // on update using the same SQLite expression.
      set: { data, updatedAt: sql`(datetime('now'))` },
    });
}
